#!/usr/bin/env python3
"""
Script de ingesta de resultados electorales desde CSV.

Uso (desde raíz del proyecto o desde backend/):
    python backend/scripts/importar_resultados_electorales.py \\
        --anio 2022 --csv data/MMVs/mmv_2022.csv

Extensible para años futuros cambiando --anio y --csv.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# ── path setup ───────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.config import settings  # noqa: E402
from app.db_models import (  # noqa: E402
    ResultadosDepartamentoORM,
    ResultadosMunicipioORM,
    ResultadosPaisORM,
    ResultadosPuestoORM,
)

# ── constants ─────────────────────────────────────────────────────────────────
CHUNK_SIZE = 200_000
CAN_NULO = "996"
CAN_BLANCO = "997"
CAN_TOTAL_MESA = "998"
CAN_LISTA = "000"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def strip_leading_zero(zona: str) -> str:
    """Elimina el cero más a la izquierda si existe, rellena a mín. 2 chars."""
    zona = zona.strip()
    if zona and zona[0] == "0":
        zona = zona[1:]
    return zona.zfill(2)


def normalize_text(s: str) -> str:
    """Minúsculas sin tildes para matching de nombres."""
    s = s.strip().lower()
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def build_codigo_puesto(dep: str, mun: str, zona: str, puesto: str) -> str:
    return dep.strip() + mun.strip() + strip_leading_zero(zona) + puesto.strip()


# ── DB lookup ─────────────────────────────────────────────────────────────────

def normalize_puesto_name(s: str) -> str:
    """Normaliza nombre de puesto para matching: minúsculas, sin tildes, sin puntuación extra."""
    s = normalize_text(s).replace(".", " ").replace(",", " ")
    return " ".join(s.split())


def load_puesto_lookup(engine) -> tuple[dict, dict, dict]:
    """
    by_code:   {codigo_puesto -> {dep_codigo, mun_codigo}}
    by_name:   {(dep_codigo, mun_3chars, normed_name) -> codigo_puesto}  ← exact match
    by_mun:    {(dep_codigo, mun_3chars) -> [(codigo_puesto, normed_name, raw_name)]}  ← fuzzy
    """
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT codigo_puesto, departamento_codigo, municipio_codigo, puesto FROM puestos_electorales")
        ).fetchall()

    by_code: dict[str, dict] = {}
    by_name: dict[tuple, str] = {}
    by_mun: dict[tuple, list] = {}

    for codigo_puesto, dep_codigo, municipio_codigo, puesto_nombre in rows:
        by_code[codigo_puesto] = {"dep_codigo": dep_codigo, "mun_codigo": municipio_codigo}
        mun_solo = municipio_codigo[len(dep_codigo):]
        normed = normalize_puesto_name(puesto_nombre)
        key = (dep_codigo.strip(), mun_solo.strip(), normed)
        by_name[key] = codigo_puesto
        mun_key = (dep_codigo.strip(), mun_solo.strip())
        by_mun.setdefault(mun_key, []).append((codigo_puesto, normed, puesto_nombre))

    return by_code, by_name, by_mun


def resolve_puesto_by_name(
    dep: str,
    mun: str,
    nombre_csv: str,
    by_name: dict,
    by_mun: dict,
) -> str | None:
    """
    Intenta encontrar el codigo_puesto en la BD usando el nombre del puesto del CSV.
    Estrategias en orden de confianza:
      1. Exact normalized match
      2. Único puesto en el municipio (cualquier nombre)
      3. Substring (uno contiene al otro) ≥ 0.92
      4. Fuzzy (Jaccard tokens + SequenceMatcher) ≥ 0.75
    Devuelve codigo_puesto BD o None.
    """
    from difflib import SequenceMatcher

    normed_csv = normalize_puesto_name(nombre_csv) if nombre_csv and nombre_csv != r"\N" else ""
    mun_key = (dep, mun)
    candidates = by_mun.get(mun_key, [])

    if not candidates:
        return None

    # Exact
    if normed_csv:
        exact_key = (dep, mun, normed_csv)
        if exact_key in by_name:
            return by_name[exact_key]

    # Unique in municipality → always safe match
    if len(candidates) == 1:
        return candidates[0][0]

    if not normed_csv:
        return None

    toks_csv = set(normed_csv.split())
    best_score, best_cp = 0.0, None

    for cp, normed_db, _ in candidates:
        # Substring containment
        if normed_csv in normed_db or normed_db in normed_csv:
            score = 0.92
        else:
            toks_db = set(normed_db.split())
            union = toks_csv | toks_db
            jaccard = len(toks_csv & toks_db) / len(union) if union else 0
            seq = SequenceMatcher(None, normed_csv, normed_db).ratio()
            score = max(jaccard * 0.9 + seq * 0.1, seq)

        if score > best_score:
            best_score, best_cp = score, cp

    return best_cp if best_score >= 0.75 else None


def load_territorial_names(engine) -> tuple[dict, dict]:
    """dep_names: {codigo -> nombre}, mun_names: {codigo -> (nombre, dep_codigo)}"""
    with engine.connect() as conn:
        dep_rows = conn.execute(text("SELECT codigo, nombre FROM territorio_departamento")).fetchall()
        mun_rows = conn.execute(
            text("SELECT codigo, nombre, departamento_codigo FROM territorio_municipio")
        ).fetchall()

    dep_names = {r[0]: r[1] for r in dep_rows}
    mun_names = {r[0]: (r[1], r[2]) for r in mun_rows}
    return dep_names, mun_names


# ── accumulators ──────────────────────────────────────────────────────────────
# Estructura por nivel:
#   totals_acc[nivel_key] = {votos_nulos, votos_blancos, votos_validos}
#   partido_acc[partido_key] = {votos_validos, candidatos: {can_codigo: {nombre, votos}}}
#
# nivel_key para pais:    (corp_codigo,)
# nivel_key para dep:     (dep_codigo, corp_codigo)
# nivel_key para mun:     (mun_codigo, corp_codigo)
# nivel_key para puesto:  (codigo_puesto, corp_codigo)
#
# partido_key para pais:   (corp_codigo, par_codigo, par_nombre, corp_nombre)
# partido_key para dep:    (dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre)
# partido_key para mun:    (mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre)
# partido_key para puesto: (codigo_puesto, mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre)


def _add_totals(store: dict, key: tuple, tipo: str, votos: int) -> None:
    if key not in store:
        store[key] = {"votos_nulos": 0, "votos_blancos": 0, "votos_validos": 0}
    if tipo == "nulo":
        store[key]["votos_nulos"] += votos
    elif tipo == "blanco":
        store[key]["votos_blancos"] += votos
    else:
        store[key]["votos_validos"] += votos


def _add_partido(store: dict, key: tuple, can_codigo: str, can_nombre: str, votos: int) -> None:
    if key not in store:
        store[key] = {"votos_validos": 0, "candidatos": defaultdict(lambda: {"nombre": "", "votos": 0})}
    store[key]["votos_validos"] += votos
    if can_codigo != CAN_LISTA:
        cand = store[key]["candidatos"][can_codigo]
        cand["nombre"] = can_nombre
        cand["votos"] += votos


def top5(candidatos: dict) -> list:
    return [
        {"codigo": k, "nombre": v["nombre"], "votos": v["votos"]}
        for k, v in sorted(candidatos.items(), key=lambda x: -x[1]["votos"])[:5]
    ]


def classify_can(can_str: str, formato: str) -> str:
    """Clasifica un código CAN en tipo de voto.

    Formatos 2022/2026 (SENADO/CAMARA): 996=nulo, 997=blanco, 998=total_mesa.
    Formatos nuevos (pres-xlsx, territoriales): 996=blanco, 997=nulo, 998=total_mesa.
    """
    normalized = can_str.strip().lstrip("0") or "0"
    if formato in _NEW_FORMATS:
        if normalized == "997": return "nulo"
        if normalized == "996": return "blanco"
        if normalized == "998": return "total_mesa"
    else:
        if normalized == "996": return "nulo"
        if normalized == "997": return "blanco"
        if normalized == "998": return "total_mesa"
    return "candidato"


# ── main ingesta ──────────────────────────────────────────────────────────────

# ── column mapping for formato 2026 ──────────────────────────────────────────
COLS_2026 = {
    "Departamento_ID": "DEP",
    "Municipio_ID": "MUN",
    "Zona_ID": "ZONA",
    "Puesto_ID": "PUESTO",
    "Puesto_Nom": "PUESNOMBRE",
    "Mesa_ID": "MESA",
    "Partido_ID": "PAR",
    "Partido_Nom": "PARNOMBRE",
    "Candidato_ID": "CAN",
    "Candidato_Nom": "CANNOMBRE",
    "Votos": "VOTOS",
}

# ── column mapping for territoriales format (2019/2023) ──────────────────────
# CSV: comma-separated, utf-8-sig, columnas en español con código de corporación incluido.
# La corporación se lee directamente del CSV (modo multi-corp, sin --corp).
COLS_TERRITORIALES = {
    "Código Departamento": "DEP",
    "Código Municipio": "MUN",
    "Código Zona": "ZONA",
    "Código Puesto": "PUESTO",
    "Nombre Puesto": "PUESNOMBRE",
    "Mesa": "MESA",
    "Código Corporación": "CORCODIGO",
    "Nombre Corporación": "CONOMBRE",
    "Código Partido": "PAR",
    "Nombre Partido": "PARNOMBRE",
    "Código Candidato": "CAN",
    "Nombre Candidato": "CANNOMBRE",
    "Total Votos": "VOTOS",
}

# ── column mapping for pres-xlsx format (2018 xlsx) ──────────────────────────
# 1v sheet "MMV ESCRUTINIO FINAL": DEP,MUN,ZONA,PSTO,MESA,COR,CIR,PAR,PARTIDO  ,CODCAN,CANDIDATO,VOTOS
# 2v sheet only: DEP,MUN,ZONA,PUESTO,MESA,COR,CIR,PAR,CAN,CANDIDATO,VOTOS
# Valores son enteros; se zero-pad a DEP=2, MUN=3, PUESTO=2, PAR=4, CAN=3 dígitos.
COLS_PRES_XLSX = {
    "PSTO": "PUESTO",      # 1v usa PSTO, 2v ya trae PUESTO
    "CODCAN": "CAN",       # 1v usa CODCAN, 2v ya trae CAN
    "CANDIDATO": "CANNOMBRE",
    # PARTIDO (con espacios al final) → PARNOMBRE; se maneja dinámicamente
}

# ── CAN codes: standard vs new formats ───────────────────────────────────────
# Formato 2022/2026 SENADO/CAMARA: 996=nulo, 997=blanco, 998=total_mesa
# Formatos nuevos (pres-xlsx, territoriales): 996=blanco, 997=nulo, 998=total_mesa
_NEW_FORMATS = frozenset({"pres-xlsx", "territoriales"})


def run_ingesta(anio: int, csv_path: Path, engine, *,
                formato: str = "2022",
                corp_codigo: str | None = None,
                corp_nombre: str | None = None) -> None:
    log.info("Cargando lookup de puestos desde BD…")
    by_code, by_name, by_mun = load_puesto_lookup(engine)
    dep_names, mun_names = load_territorial_names(engine)

    # totals per (nivel_code, corp_codigo)
    pais_totals: dict = {}   # (corp_codigo,)
    dep_totals: dict = {}    # (dep_codigo, corp_codigo)
    mun_totals: dict = {}    # (mun_codigo, corp_codigo)
    puesto_totals: dict = {} # (codigo_puesto, corp_codigo)

    # partido votos per (nivel_code..., par_codigo, par_nombre, corp_nombre)
    pais_partidos: dict = {}   # (corp_codigo, par_codigo, par_nombre, corp_nombre)
    dep_partidos: dict = {}    # (dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre)
    mun_partidos: dict = {}    # (mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre)
    puesto_partidos: dict = {} # (codigo_puesto, mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre)

    error_lines: list[str] = []
    total_rows = 0
    skipped = 0

    log.info("Procesando datos en chunks de %d filas… (formato=%s)", CHUNK_SIZE, formato)

    # ── Cargar datos según formato ────────────────────────────────────────────
    if formato == "pres-xlsx":
        # Leer xlsx: intentar hoja "MMV ESCRUTINIO FINAL", sino hoja activa
        import openpyxl  # noqa: F401 – verifica disponibilidad
        xls = pd.ExcelFile(csv_path, engine="openpyxl")
        sheet = "MMV ESCRUTINIO FINAL" if "MMV ESCRUTINIO FINAL" in xls.sheet_names else xls.sheet_names[0]
        log.info("  Leyendo hoja '%s' de xlsx…", sheet)
        df_xlsx = pd.read_excel(xls, sheet_name=sheet, dtype=object)

        # Normalizar nombres de columna (strip espacios)
        df_xlsx.columns = [str(c).strip() for c in df_xlsx.columns]
        # Renombrar a nombres internos
        df_xlsx = df_xlsx.rename(columns=COLS_PRES_XLSX)
        # Si no hay PARNOMBRE, crear columna vacía (2v no tiene columna de partido)
        if "PARNOMBRE" not in df_xlsx.columns:
            df_xlsx["PARNOMBRE"] = ""
        # Si no hay PUESNOMBRE, crear columna vacía (xlsx no trae nombre de puesto)
        if "PUESNOMBRE" not in df_xlsx.columns:
            df_xlsx["PUESNOMBRE"] = ""
        # Convertir enteros a strings con zero-padding.
        # Valores no-numéricos (ej. "A1" para puestos en consulados) se preservan como string;
        # el lookup de puestos los tratará como no-matcheados y acumulará a niveles superiores.
        def _pad_int(x, width: int, fallback: str = "") -> str:
            if pd.isna(x) or x == "":
                return fallback
            try:
                return str(int(x)).zfill(width)
            except (ValueError, TypeError):
                return str(x)

        for col, width in [("DEP", 2), ("MUN", 3), ("ZONA", 2), ("PUESTO", 2)]:
            df_xlsx[col] = df_xlsx[col].apply(lambda x, w=width: _pad_int(x, w))
        df_xlsx["PAR"] = df_xlsx["PAR"].apply(lambda x: _pad_int(x, 4, "0000"))
        df_xlsx["CAN"] = df_xlsx["CAN"].apply(lambda x: _pad_int(x, 3, "000"))
        df_xlsx["MESA"] = df_xlsx["MESA"].apply(
            lambda x: str(int(x)) if pd.notna(x) and x != "" and isinstance(x, (int, float)) else str(x) if pd.notna(x) else ""
        )
        df_xlsx["VOTOS"] = df_xlsx["VOTOS"].apply(
            lambda x: int(x) if pd.notna(x) and x != "" else 0
        )
        df_xlsx = df_xlsx.fillna("")
        df_xlsx["VOTOS"] = df_xlsx["VOTOS"].apply(lambda x: int(x) if x != "" else 0)
        # Corporación siempre viene de --corp para pres-xlsx
        df_xlsx["CORCODIGO"] = corp_codigo or ""
        df_xlsx["CONOMBRE"] = corp_nombre or ""
        # Yield como chunks
        csv_iter = (df_xlsx.iloc[i:i + CHUNK_SIZE] for i in range(0, max(1, len(df_xlsx)), CHUNK_SIZE))

    elif formato == "territoriales":
        csv_iter = pd.read_csv(
            csv_path,
            sep=",",
            chunksize=CHUNK_SIZE,
            dtype=str,
            keep_default_na=False,
            encoding="utf-8-sig",
        )
    elif formato == "2026":
        csv_iter = pd.read_csv(
            csv_path,
            sep=",",
            chunksize=CHUNK_SIZE,
            dtype=str,
            keep_default_na=False,
            encoding="utf-8",
        )
    else:
        csv_iter = pd.read_csv(
            csv_path,
            sep=";",
            chunksize=CHUNK_SIZE,
            dtype=str,
            keep_default_na=False,
            encoding="latin-1",
        )

    # ── Iterar chunks ─────────────────────────────────────────────────────────
    for chunk_idx, chunk in enumerate(csv_iter):
        # Normalize column names
        if formato == "2026":
            chunk = chunk.rename(columns=COLS_2026)
        elif formato == "territoriales":
            chunk = chunk.rename(columns=COLS_TERRITORIALES)

        for col in ["DEP", "MUN", "ZONA", "PUESTO", "PUESNOMBRE", "CORCODIGO", "CONOMBRE",
                    "PAR", "PARNOMBRE", "CAN", "CANNOMBRE", "VOTOS"]:
            if col in chunk.columns:
                chunk[col] = chunk[col].astype(str).str.strip()

        # Filtrar por corporación cuando se provee --corp y el CSV tiene columna CORCODIGO.
        # Aplica a todos los formatos (2022, 2026, territoriales).
        if corp_codigo and "CORCODIGO" in chunk.columns:
            chunk = chunk[chunk["CORCODIGO"] == corp_codigo]

        # Drop total-mesa rows (detect via classify_can to handle all formats)
        chunk = chunk[chunk["CAN"].apply(lambda c: classify_can(str(c), formato) != "total_mesa")]
        total_rows += len(chunk)

        for row in chunk.itertuples(index=False):
            dep = row.DEP
            mun = row.MUN
            zona = row.ZONA
            puesto_raw = row.PUESTO
            # Corporación: si --corp se provee, tiene prioridad sobre el CSV en todos los formatos.
            # Solo en modo multi-corp (territoriales sin --corp) se lee del CSV.
            if corp_codigo:
                _corp_codigo = corp_codigo
                _corp_nombre = corp_nombre
            else:
                # Modo multi-corp: leer del CSV (territoriales)
                _corp_codigo = row.CORCODIGO if hasattr(row, "CORCODIGO") else ""
                _corp_nombre = row.CONOMBRE if hasattr(row, "CONOMBRE") else ""
            par_codigo = row.PAR
            par_nombre = row.PARNOMBRE
            can_codigo = str(row.CAN)
            can_nombre = row.CANNOMBRE
            try:
                votos = int(row.VOTOS)
            except (ValueError, TypeError):
                votos = 0

            if votos == 0:
                continue

            # Classify
            tipo = classify_can(can_codigo, formato)
            if tipo == "total_mesa":
                continue
            if tipo == "candidato":
                # Skip no-party rows (PAR=0000 en 2022, PAR=00000/NO ENCONTRADO en 2026/territoriales)
                par_normalized = par_codigo.lstrip("0") or "0"
                if par_normalized == "0" or par_nombre in (r"\N", "NO ENCONTRADO", "N/A", "CANDIDATOS TOTALES"):
                    continue

            # Build codigo_puesto
            codigo_puesto = build_codigo_puesto(dep, mun, zona, puesto_raw)

            # Resolve to DB puesto
            if codigo_puesto not in by_code:
                # Fallback: match by name within (dep, mun) — applies to ALL non-matching codes
                resolved_cp = resolve_puesto_by_name(dep, mun, row.PUESNOMBRE, by_name, by_mun)
                if resolved_cp:
                    codigo_puesto = resolved_cp
                else:
                    error_lines.append(
                        f"NO_MATCH|DEP={dep}|MUN={mun}|ZONA={zona}|PUESTO={puesto_raw}"
                        f"|CODE={build_codigo_puesto(dep, mun, zona, puesto_raw)}"
                        f"|NOMBRE={row.PUESNOMBRE}"
                    )
                    skipped += 1
                    # Accumulate at mun/dep/pais if territorial codes are known
                    full_mun = dep + mun
                    if dep in dep_names and full_mun in mun_names:
                        _add_totals(pais_totals, (_corp_codigo,), tipo, votos)
                        _add_totals(dep_totals, (dep, _corp_codigo), tipo, votos)
                        _add_totals(mun_totals, (full_mun, _corp_codigo), tipo, votos)
                        if tipo == "candidato":
                            _add_partido(pais_partidos, (_corp_codigo, par_codigo, par_nombre, _corp_nombre),
                                         can_codigo, can_nombre, votos)
                            _add_partido(dep_partidos, (dep, _corp_codigo, par_codigo, par_nombre, _corp_nombre),
                                         can_codigo, can_nombre, votos)
                            _add_partido(mun_partidos, (full_mun, dep, _corp_codigo, par_codigo, par_nombre, _corp_nombre),
                                         can_codigo, can_nombre, votos)
                    continue

            puesto_info = by_code[codigo_puesto]
            dep_codigo = puesto_info["dep_codigo"]
            mun_codigo = puesto_info["mun_codigo"]

            # ── Accumulate totals (nulos/blancos/validos) ──
            _add_totals(pais_totals, (_corp_codigo,), tipo, votos)
            _add_totals(dep_totals, (dep_codigo, _corp_codigo), tipo, votos)
            _add_totals(mun_totals, (mun_codigo, _corp_codigo), tipo, votos)
            _add_totals(puesto_totals, (codigo_puesto, _corp_codigo), tipo, votos)

            # ── Accumulate partido votos (only for candidato rows) ──
            if tipo == "candidato":
                _add_partido(pais_partidos, (_corp_codigo, par_codigo, par_nombre, _corp_nombre),
                             can_codigo, can_nombre, votos)
                _add_partido(dep_partidos, (dep_codigo, _corp_codigo, par_codigo, par_nombre, _corp_nombre),
                             can_codigo, can_nombre, votos)
                _add_partido(mun_partidos, (mun_codigo, dep_codigo, _corp_codigo, par_codigo, par_nombre, _corp_nombre),
                             can_codigo, can_nombre, votos)
                _add_partido(puesto_partidos, (codigo_puesto, mun_codigo, dep_codigo, _corp_codigo, par_codigo, par_nombre, _corp_nombre),
                             can_codigo, can_nombre, votos)

        if (chunk_idx + 1) % 5 == 0:
            log.info("  chunk %d | filas acumuladas: %d | omitidas: %d",
                     chunk_idx + 1, total_rows, skipped)

    log.info("Lectura completada. Total filas procesadas: %d | omitidas: %d", total_rows, skipped)

    if error_lines:
        error_path = ROOT / f"ingesta_errors_{anio}.log"
        error_path.write_text("\n".join(error_lines))
        log.warning("%d filas no encontradas → %s", len(error_lines), error_path)

    # ── Truncate and reload ────────────────────────────────────────────────
    # Siempre acotamos por corporacion_codigo cuando se provee --corp para no
    # borrar datos de otras corporaciones del mismo año.
    if corp_codigo:
        # Corp fija vía --corp: borrar solo esa corporación
        log.info("Eliminando registros previos del año %d, corporacion=%s…", anio, corp_codigo)
        with engine.begin() as conn:
            for table in ("resultados_pais", "resultados_departamento", "resultados_municipio", "resultados_puesto"):
                conn.execute(
                    text(f"DELETE FROM {table} WHERE anio = :anio AND corporacion_codigo = :corp"),
                    {"anio": anio, "corp": corp_codigo},
                )
    elif formato == "territoriales":
        # Multi-corp: borrar cada corporación encontrada en los datos procesados
        corps_found = {k[0] if isinstance(k, tuple) else k
                       for k in pais_totals.keys()}
        log.info("Eliminando registros previos del año %d, corporaciones=%s…", anio, sorted(corps_found))
        with engine.begin() as conn:
            for corp in corps_found:
                for table in ("resultados_pais", "resultados_departamento", "resultados_municipio", "resultados_puesto"):
                    conn.execute(
                        text(f"DELETE FROM {table} WHERE anio = :anio AND corporacion_codigo = :corp"),
                        {"anio": anio, "corp": corp},
                    )
    else:
        log.info("Eliminando registros previos del año %d…", anio)
        with engine.begin() as conn:
            for table in ("resultados_pais", "resultados_departamento", "resultados_municipio", "resultados_puesto"):
                conn.execute(text(f"DELETE FROM {table} WHERE anio = :anio"), {"anio": anio})

    # ── Merge entries with same partido_codigo but different nombre ─────────
    # En elecciones territoriales el mismo partido puede tener variaciones de nombre
    # entre municipios. Merge para evitar UNIQUE constraint violations.
    def _merge_partidos(store: dict, key_partido_idx: int, key_nombre_idx: int) -> dict:
        """Merge partido entries that share the same key except for par_nombre."""
        merged: dict = {}
        for key, pdata in store.items():
            # Build canonical key: replace par_nombre with empty string
            canon = list(key)
            nombre = canon[key_nombre_idx]
            canon[key_nombre_idx] = ""
            canon_key = tuple(canon)
            if canon_key not in merged:
                merged[canon_key] = {"pdata": dict(pdata), "nombre": nombre, "votos": pdata["votos_validos"]}
            else:
                # Merge votos
                merged[canon_key]["pdata"]["votos_validos"] += pdata["votos_validos"]
                # Merge candidatos
                for c_key, c_val in pdata["candidatos"].items():
                    if c_key in merged[canon_key]["pdata"]["candidatos"]:
                        merged[canon_key]["pdata"]["candidatos"][c_key]["votos"] += c_val["votos"]
                    else:
                        merged[canon_key]["pdata"]["candidatos"][c_key] = dict(c_val)
                # Keep the nombre with more votes
                if pdata["votos_validos"] > merged[canon_key]["votos"]:
                    merged[canon_key]["nombre"] = nombre
                    merged[canon_key]["votos"] = pdata["votos_validos"]
        # Rebuild dict with canonical nombre
        result: dict = {}
        for canon_key, mdata in merged.items():
            real_key = list(canon_key)
            real_key[key_nombre_idx] = mdata["nombre"]
            result[tuple(real_key)] = mdata["pdata"]
        return result

    # key indices: pais=(corp, par, par_nombre, corp_nombre) → par_nombre at [2]
    pais_partidos = _merge_partidos(pais_partidos, 1, 2)
    # dep=(dep, corp, par, par_nombre, corp_nombre) → par_nombre at [3]
    dep_partidos = _merge_partidos(dep_partidos, 2, 3)
    # mun=(mun, dep, corp, par, par_nombre, corp_nombre) → par_nombre at [4]
    mun_partidos = _merge_partidos(mun_partidos, 3, 4)
    # puesto=(puesto, mun, dep, corp, par, par_nombre, corp_nombre) → par_nombre at [5]
    puesto_partidos = _merge_partidos(puesto_partidos, 4, 5)

    # ── Insert resultados_pais ─────────────────────────────────────────────
    log.info("Insertando resultados_pais…")
    rows_pais = []
    for (corp_codigo, par_codigo, par_nombre, corp_nombre), pdata in pais_partidos.items():
        totals = pais_totals.get((corp_codigo,), {})
        rows_pais.append(ResultadosPaisORM(
            anio=anio,
            corporacion_codigo=corp_codigo,
            corporacion_nombre=corp_nombre,
            votos_total=totals.get("votos_nulos", 0) + totals.get("votos_blancos", 0) + totals.get("votos_validos", 0),
            votos_validos=totals.get("votos_validos", 0),
            votos_nulos=totals.get("votos_nulos", 0),
            votos_blancos=totals.get("votos_blancos", 0),
            partido_codigo=par_codigo,
            partido_nombre=par_nombre,
            partido_votos=pdata["votos_validos"],
            top5_candidatos=json.dumps(top5(pdata["candidatos"]), ensure_ascii=False),
        ))
    with Session(engine) as session:
        session.bulk_save_objects(rows_pais)
        session.commit()
    log.info("  ✓ resultados_pais: %d filas", len(rows_pais))

    # ── Insert resultados_departamento ────────────────────────────────────
    log.info("Insertando resultados_departamento…")
    rows_dep = []
    for (dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre), pdata in dep_partidos.items():
        totals = dep_totals.get((dep_codigo, corp_codigo), {})
        rows_dep.append(ResultadosDepartamentoORM(
            anio=anio,
            dep_codigo=dep_codigo,
            dep_nombre=dep_names.get(dep_codigo, dep_codigo),
            corporacion_codigo=corp_codigo,
            corporacion_nombre=corp_nombre,
            votos_total=totals.get("votos_nulos", 0) + totals.get("votos_blancos", 0) + totals.get("votos_validos", 0),
            votos_validos=totals.get("votos_validos", 0),
            votos_nulos=totals.get("votos_nulos", 0),
            votos_blancos=totals.get("votos_blancos", 0),
            partido_codigo=par_codigo,
            partido_nombre=par_nombre,
            partido_votos=pdata["votos_validos"],
            top5_candidatos=json.dumps(top5(pdata["candidatos"]), ensure_ascii=False),
        ))
    with Session(engine) as session:
        session.bulk_save_objects(rows_dep)
        session.commit()
    log.info("  ✓ resultados_departamento: %d filas", len(rows_dep))

    # ── Insert resultados_municipio ───────────────────────────────────────
    log.info("Insertando resultados_municipio…")
    rows_mun = []
    for (mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre), pdata in mun_partidos.items():
        totals = mun_totals.get((mun_codigo, corp_codigo), {})
        mun_info = mun_names.get(mun_codigo, (mun_codigo, dep_codigo))
        rows_mun.append(ResultadosMunicipioORM(
            anio=anio,
            mun_codigo=mun_codigo,
            mun_nombre=mun_info[0],
            dep_codigo=dep_codigo,
            corporacion_codigo=corp_codigo,
            corporacion_nombre=corp_nombre,
            votos_total=totals.get("votos_nulos", 0) + totals.get("votos_blancos", 0) + totals.get("votos_validos", 0),
            votos_validos=totals.get("votos_validos", 0),
            votos_nulos=totals.get("votos_nulos", 0),
            votos_blancos=totals.get("votos_blancos", 0),
            partido_codigo=par_codigo,
            partido_nombre=par_nombre,
            partido_votos=pdata["votos_validos"],
            top5_candidatos=json.dumps(top5(pdata["candidatos"]), ensure_ascii=False),
        ))
    with Session(engine) as session:
        session.bulk_save_objects(rows_mun)
        session.commit()
    log.info("  ✓ resultados_municipio: %d filas", len(rows_mun))

    # ── Insert resultados_puesto ──────────────────────────────────────────
    log.info("Insertando resultados_puesto…")
    rows_puesto = []
    for (codigo_puesto, mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre), pdata in puesto_partidos.items():
        totals = puesto_totals.get((codigo_puesto, corp_codigo), {})
        rows_puesto.append(ResultadosPuestoORM(
            anio=anio,
            codigo_puesto=codigo_puesto,
            mun_codigo=mun_codigo,
            dep_codigo=dep_codigo,
            corporacion_codigo=corp_codigo,
            corporacion_nombre=corp_nombre,
            votos_total=totals.get("votos_nulos", 0) + totals.get("votos_blancos", 0) + totals.get("votos_validos", 0),
            votos_validos=totals.get("votos_validos", 0),
            votos_nulos=totals.get("votos_nulos", 0),
            votos_blancos=totals.get("votos_blancos", 0),
            partido_codigo=par_codigo,
            partido_nombre=par_nombre,
            partido_votos=pdata["votos_validos"],
            top5_candidatos=json.dumps(top5(pdata["candidatos"]), ensure_ascii=False),
        ))
    with Session(engine) as session:
        session.bulk_save_objects(rows_puesto)
        session.commit()
    log.info("  ✓ resultados_puesto: %d filas", len(rows_puesto))

    log.info("✓ Ingesta completada para año %d.", anio)


# ── entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Importar resultados electorales desde CSV.")
    parser.add_argument("--anio", type=int, required=True, help="Año electoral (ej. 2022)")
    parser.add_argument("--csv", type=Path, required=True, help="Ruta al archivo CSV")
    parser.add_argument(
        "--formato",
        choices=["2022", "2026", "pres-xlsx", "territoriales"],
        default="2022",
        help=(
            "Formato del archivo: '2022' (sep=;, latin-1), '2026' (sep=,, utf-8, columnas Departamento_ID...), "
            "'pres-xlsx' (xlsx 2018, hoja MMV ESCRUTINIO FINAL), "
            "'territoriales' (sep=,, utf-8-sig, columnas en español con corporación incluida — modo multi-corp)"
        ),
    )
    parser.add_argument(
        "--corp", default=None,
        help="Código de corporación (ej. '001', 'P01'). Requerido con --formato 2026 y pres-xlsx. Ignorado con territoriales.",
    )
    parser.add_argument(
        "--corp-nom", default=None, dest="corp_nom",
        help="Nombre de corporación (ej. 'SENADO'). Requerido con --formato 2026 y pres-xlsx.",
    )
    args = parser.parse_args()

    if args.formato in ("2026", "pres-xlsx") and (not args.corp or not args.corp_nom):
        parser.error("--corp y --corp-nom son requeridos cuando --formato es '2026' o 'pres-xlsx'")

    csv_path = args.csv
    if not csv_path.is_absolute():
        csv_path = ROOT / csv_path

    if not csv_path.exists():
        log.error("Archivo CSV no encontrado: %s", csv_path)
        sys.exit(1)

    db_url = settings.database_url
    if db_url.startswith("sqlite:///./"):
        db_file = BACKEND / db_url.replace("sqlite:///./", "")
        db_url = f"sqlite:///{db_file}"

    log.info("Conectando a BD: %s", db_url)
    engine = create_engine(db_url, echo=False)

    run_ingesta(args.anio, csv_path, engine, formato=args.formato,
                corp_codigo=args.corp, corp_nombre=args.corp_nom)


if __name__ == "__main__":
    main()
