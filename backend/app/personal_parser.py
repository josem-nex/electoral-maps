"""Parser for jurados/testigos Excel and CSV files."""
from __future__ import annotations

import io
import re
import unicodedata
from dataclasses import dataclass, field
from difflib import get_close_matches
from typing import Literal

import pandas as pd
from sqlalchemy.orm import Session

try:
    from app.db_models import PersonalElectoralORM, PuestoORM
except ModuleNotFoundError:
    from db_models import PersonalElectoralORM, PuestoORM


TipoPersonal = Literal["jurado", "testigo"]

# Column name normalization: strip, upper, remove accents, collapse spaces
def _norm_col(name: object) -> str:
    if name is None:
        return ""
    s = str(name).strip().upper()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"[^A-Z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _norm_val(value: object) -> str:
    """Normalize a cell value to a clean string (empty if null/nan)."""
    if value is None:
        return ""
    if isinstance(value, float):
        import math
        if math.isnan(value):
            return ""
    return re.sub(r"\s+", " ", str(value).strip().upper())


@dataclass
class ParseResult:
    tipo: TipoPersonal
    insertados: int = 0
    omitidos: int = 0
    errores: list[dict] = field(default_factory=list)
    filas: list[dict] = field(default_factory=list)  # rows ready to insert


# Columns that identify each file type after normalization
_JURADO_COLS = {"NIVEL EDUCATIVO", "DIRECCION"}
_TESTIGO_COLS = {"PUESTO DE VOTACION OPCION 1"}


def _detect_tipo(cols_norm: set[str], tipo_override: TipoPersonal | None) -> TipoPersonal | None:
    if tipo_override:
        return tipo_override
    has_jurado = bool(cols_norm & _JURADO_COLS)
    has_testigo = bool(cols_norm & _TESTIGO_COLS)
    if has_jurado and not has_testigo:
        return "jurado"
    if has_testigo and not has_jurado:
        return "testigo"
    return None  # ambiguous


def _load_df(file_bytes: bytes, filename: str) -> pd.DataFrame:
    fname = filename.lower()
    if fname.endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
    # .xlsx or .xls — try to read the first sheet named "Formulario", else first sheet
    # dtype=str preserves leading zeros in codes
    xl = pd.ExcelFile(io.BytesIO(file_bytes))
    sheet = "Formulario" if "Formulario" in xl.sheet_names else xl.sheet_names[0]
    return xl.parse(sheet, header=0, dtype=str, keep_default_na=False)


def _build_puesto_lookup(db: Session) -> tuple[
    dict[tuple[str, str, str], str],
    dict[tuple[str, str], list[str]],
]:
    """Return (name_lookup, mun_names_index).

    name_lookup:   {(dep_codigo, mun_codigo, norm_puesto_name): codigo_puesto}
    mun_names_index: {(dep_codigo, mun_codigo): [norm_puesto_name, ...]}
    """
    rows = db.query(
        PuestoORM.departamento_codigo,
        PuestoORM.municipio_codigo,
        PuestoORM.puesto,
        PuestoORM.codigo_puesto,
    ).all()

    lookup: dict[tuple[str, str, str], str] = {}
    mun_index: dict[tuple[str, str], list[str]] = {}
    for dep, mun, nombre, codigo in rows:
        norm = _norm_col(nombre)
        lookup[(dep, mun, norm)] = codigo
        mun_index.setdefault((dep, mun), []).append(norm)
    return lookup, mun_index


def _build_dep_lookup(db: Session) -> dict[str, str]:
    """Return {norm_dep_name: departamento_codigo}."""
    from app.db_models import TerritorioDepartamentoORM
    rows = db.query(TerritorioDepartamentoORM.codigo, TerritorioDepartamentoORM.nombre).all()
    return {_norm_col(nombre): codigo for codigo, nombre in rows}


def _build_mun_lookup(db: Session) -> dict[tuple[str, str], str]:
    """Return {(dep_codigo, norm_mun_name): mun_codigo}."""
    from app.db_models import TerritorioMunicipioORM
    rows = db.query(
        TerritorioMunicipioORM.departamento_codigo,
        TerritorioMunicipioORM.nombre,
        TerritorioMunicipioORM.codigo,
    ).all()
    return {(dep, _norm_col(nombre)): codigo for dep, nombre, codigo in rows}


def parse_personal_file(
    file_bytes: bytes,
    filename: str,
    db: Session,
    tipo_override: TipoPersonal | None = None,
) -> ParseResult:
    """Parse an xlsx/csv file and resolve each row to a codigo_puesto.

    Returns a ParseResult with:
    - tipo: detected type
    - filas: list of dicts ready to insert as PersonalElectoralORM rows
    - errores: rows that could not be resolved
    """
    df = _load_df(file_bytes, filename)

    # Build column map: norm → original header (handle duplicates: keep first)
    col_map: dict[str, str] = {}
    for col in df.columns:
        norm = _norm_col(col)
        if norm and norm not in col_map:
            col_map[norm] = col

    cols_norm = set(col_map.keys())

    tipo = _detect_tipo(cols_norm, tipo_override)
    if tipo is None:
        raise ValueError(
            "No se pudo detectar el tipo de archivo (jurado o testigo). "
            "Proporcione tipo_override='jurado' o tipo_override='testigo'."
        )

    result = ParseResult(tipo=tipo)

    # Direct-code path (not part of the public spec): if the file has a column
    # named "CODIGO", its value is used as codigo_puesto directly instead of
    # resolving by DEPARTAMENTO + MUNICIPIO + PUESTO name. This was added to
    # support internal exports that already carry the canonical code, bypassing
    # the name-resolution step. The spec only requires the name-resolution path;
    # do not remove this without checking that no active exports rely on it.
    has_codigo_col = "CODIGO" in cols_norm

    # Build lookup tables once
    puesto_lookup, mun_puesto_index = _build_puesto_lookup(db)
    dep_lookup = _build_dep_lookup(db)
    mun_lookup = _build_mun_lookup(db)

    # Valid codigo_puesto set for direct-code validation
    valid_codigos: set[str] = set(puesto_lookup.values()) if has_codigo_col else set()

    def get(norm_col: str, row: pd.Series) -> str:
        """Get raw cell value (preserves original text for display/storage)."""
        orig = col_map.get(norm_col)
        if orig is None:
            return ""
        return _norm_val(row.get(orig, ""))

    def get_norm(norm_col: str, row: pd.Series) -> str:
        """Get normalized cell value for lookups (removes accents, collapses spaces)."""
        orig = col_map.get(norm_col)
        if orig is None:
            return ""
        return _norm_col(row.get(orig, ""))

    for idx, row in df.iterrows():
        fila_num = int(idx) + 2  # 1-based + header row

        dep_raw = get("DEPARTAMENTO", row)
        mun_raw = get("MUNICIPIO", row)
        puesto_col = "PUESTO DE VOTACION OPCION 1" if tipo == "testigo" else "PUESTO"
        puesto_raw = get(puesto_col, row)

        # Normalized versions for lookups
        dep_norm = get_norm("DEPARTAMENTO", row)
        mun_norm = get_norm("MUNICIPIO", row)
        puesto_norm = _norm_col(puesto_raw)
        cedula = get("CEDULA", row)

        if not dep_raw and not mun_raw and not cedula:
            # blank row — skip silently
            continue

        # ── Resolve codigo_puesto ──────────────────────────────────────────────
        codigo_raw = get("CODIGO", row).strip() if has_codigo_col else ""

        if has_codigo_col and codigo_raw:
            # Direct code path: validate the code exists in DB
            if codigo_raw not in valid_codigos:
                result.errores.append({
                    "fila": fila_num,
                    "razon": f"Código de puesto no encontrado en la base de datos: '{codigo_raw}'",
                })
                result.omitidos += 1
                continue
            codigo_puesto = codigo_raw
        else:
            # Name-resolution path: DEPARTAMENTO → MUNICIPIO → PUESTO name
            dep_codigo = dep_lookup.get(dep_norm)
            if not dep_codigo:
                result.errores.append({
                    "fila": fila_num,
                    "razon": f"Departamento no encontrado: '{dep_raw}'",
                })
                result.omitidos += 1
                continue

            mun_codigo = mun_lookup.get((dep_codigo, mun_norm))
            if not mun_codigo:
                result.errores.append({
                    "fila": fila_num,
                    "razon": f"Municipio no encontrado: '{mun_raw}' en {dep_raw}",
                })
                result.omitidos += 1
                continue

            codigo_puesto = puesto_lookup.get((dep_codigo, mun_codigo, puesto_norm))
            if not codigo_puesto:
                # Suggest near matches within the same municipio
                candidates_norm = mun_puesto_index.get((dep_codigo, mun_codigo), [])
                close = get_close_matches(puesto_norm, candidates_norm, n=3, cutoff=0.6)
                razon = f"Puesto no encontrado: '{puesto_raw}' en {mun_raw}, {dep_raw}"
                if close:
                    razon += f" — ¿Quiso decir: {', '.join(close)}?"
                result.errores.append({"fila": fila_num, "razon": razon})
                result.omitidos += 1
                continue

        if not cedula:
            result.errores.append({
                "fila": fila_num,
                "razon": "Cédula vacía",
            })
            result.omitidos += 1
            continue

        fila: dict = {
            "tipo": tipo,
            "cedula": cedula,
            "primer_nombre": get("PRIMER NOMBRE", row),
            "segundo_nombre": get("SEGUNDO NOMBRE", row) or None,
            "primer_apellido": get("PRIMER APELLIDO", row),
            "segundo_apellido": get("SEGUNDO APELLIDO", row) or None,
            "telefono": get("TELEFONO", row) or None,
            "celular": get("CELULAR", row) or None,
            "correo": get("CORREO", row) or None,
            "codigo_puesto": codigo_puesto,
            "referenciado_por": get("REFERENCIADO POR", row) or None,
        }

        if tipo == "jurado":
            fila["direccion"] = get("DIRECCION", row) or None
            fila["nivel_educativo"] = get("NIVEL EDUCATIVO", row) or None

        result.filas.append(fila)

    return result
