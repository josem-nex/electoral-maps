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


# ── main ingesta ──────────────────────────────────────────────────────────────

def run_ingesta(anio: int, csv_path: Path, engine) -> None:
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

    log.info("Procesando CSV en chunks de %d filas…", CHUNK_SIZE)

    csv_iter = pd.read_csv(
        csv_path,
        sep=";",
        chunksize=CHUNK_SIZE,
        dtype=str,
        keep_default_na=False,
        encoding="latin-1",
    )

    for chunk_idx, chunk in enumerate(csv_iter):
        for col in ["DEP", "MUN", "ZONA", "PUESTO", "PUESNOMBRE", "CORCODIGO", "CONOMBRE",
                    "PAR", "PARNOMBRE", "CAN", "CANNOMBRE", "VOTOS"]:
            if col in chunk.columns:
                chunk[col] = chunk[col].str.strip()

        # Drop total-mesa rows
        chunk = chunk[chunk["CAN"] != CAN_TOTAL_MESA]
        total_rows += len(chunk)

        for row in chunk.itertuples(index=False):
            dep = row.DEP
            mun = row.MUN
            zona = row.ZONA
            puesto_raw = row.PUESTO
            corp_codigo = row.CORCODIGO
            corp_nombre = row.CONOMBRE
            par_codigo = row.PAR
            par_nombre = row.PARNOMBRE
            can_codigo = row.CAN
            can_nombre = row.CANNOMBRE
            try:
                votos = int(row.VOTOS)
            except (ValueError, TypeError):
                votos = 0

            if votos == 0:
                continue

            # Classify
            if can_codigo == CAN_NULO:
                tipo = "nulo"
            elif can_codigo == CAN_BLANCO:
                tipo = "blanco"
            else:
                tipo = "candidato"
                # Skip PAR=0000 for non-special rows (no-party rows shouldn't aggregate)
                if par_codigo == "0000" or par_nombre == r"\N":
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
                        _add_totals(pais_totals, (corp_codigo,), tipo, votos)
                        _add_totals(dep_totals, (dep, corp_codigo), tipo, votos)
                        _add_totals(mun_totals, (full_mun, corp_codigo), tipo, votos)
                        if tipo == "candidato":
                            _add_partido(pais_partidos, (corp_codigo, par_codigo, par_nombre, corp_nombre),
                                         can_codigo, can_nombre, votos)
                            _add_partido(dep_partidos, (dep, corp_codigo, par_codigo, par_nombre, corp_nombre),
                                         can_codigo, can_nombre, votos)
                            _add_partido(mun_partidos, (full_mun, dep, corp_codigo, par_codigo, par_nombre, corp_nombre),
                                         can_codigo, can_nombre, votos)
                    continue

            puesto_info = by_code[codigo_puesto]
            dep_codigo = puesto_info["dep_codigo"]
            mun_codigo = puesto_info["mun_codigo"]

            # ── Accumulate totals (nulos/blancos/validos) ──
            _add_totals(pais_totals, (corp_codigo,), tipo, votos)
            _add_totals(dep_totals, (dep_codigo, corp_codigo), tipo, votos)
            _add_totals(mun_totals, (mun_codigo, corp_codigo), tipo, votos)
            _add_totals(puesto_totals, (codigo_puesto, corp_codigo), tipo, votos)

            # ── Accumulate partido votos (only for candidato rows) ──
            if tipo == "candidato":
                _add_partido(pais_partidos, (corp_codigo, par_codigo, par_nombre, corp_nombre),
                             can_codigo, can_nombre, votos)
                _add_partido(dep_partidos, (dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre),
                             can_codigo, can_nombre, votos)
                _add_partido(mun_partidos, (mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre),
                             can_codigo, can_nombre, votos)
                _add_partido(puesto_partidos, (codigo_puesto, mun_codigo, dep_codigo, corp_codigo, par_codigo, par_nombre, corp_nombre),
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
    log.info("Eliminando registros previos del año %d…", anio)
    with engine.begin() as conn:
        for table in ("resultados_pais", "resultados_departamento", "resultados_municipio", "resultados_puesto"):
            conn.execute(text(f"DELETE FROM {table} WHERE anio = :anio"), {"anio": anio})

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
    args = parser.parse_args()

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

    run_ingesta(args.anio, csv_path, engine)


if __name__ == "__main__":
    main()
