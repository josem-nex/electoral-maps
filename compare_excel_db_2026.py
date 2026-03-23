#!/usr/bin/env python3
"""
Compare Excel files vs database for 2026 electoral data.
Aggregates votos_nulos, votos_blancos, votos_validos, votos_total from Excel
and compares against resultados_departamento in electoral.db.
"""

import os
import sqlite3
from pathlib import Path
import openpyxl

BASE_DIR = Path("/home/nex/work/colombia/electoral-maps")
DB_PATH = BASE_DIR / "backend" / "electoral.db"

SENADO_DIR = BASE_DIR / "data/MMVs/SENADO_Excels_Departamentos"
CAMARA_DIR = BASE_DIR / "data/MMVs/CAMARA_Excels_Departamentos"

CORP_MAP = {
    SENADO_DIR: "001",
    CAMARA_DIR: "002",
}

CORP_NAMES = {
    "001": "SENADO",
    "002": "CAMARA",
}


def parse_int(val):
    """Parse a value that may be int or zero-padded string."""
    if val is None:
        return None
    try:
        return int(str(val).strip())
    except (ValueError, TypeError):
        return None


def aggregate_excel(filepath: Path):
    """
    Read an xlsx file and return (dep_codigo, votos_nulos, votos_blancos, votos_validos, votos_total).
    """
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active

    # Read header row
    headers = None
    votos_nulos = 0
    votos_blancos = 0
    votos_validos = 0
    dep_codigo = None

    # Column indices (0-based)
    col_dep_id = None
    col_partido_id = None
    col_partido_nom = None
    col_candidato_id = None
    col_votos = None

    for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
        if row_idx == 0:
            # Parse headers
            headers = [str(h).strip() if h is not None else "" for h in row]
            col_dep_id = headers.index("Departamento_ID")
            col_partido_id = headers.index("Partido_ID")
            col_partido_nom = headers.index("Partido_Nom")
            col_candidato_id = headers.index("Candidato_ID")
            col_votos = headers.index("Votos")
            continue

        # Data row
        raw_dep = row[col_dep_id]
        raw_cid = row[col_candidato_id]
        raw_pid = row[col_partido_id]
        raw_pnom = row[col_partido_nom]
        raw_votos = row[col_votos]

        # Parse candidato_id
        cid = parse_int(raw_cid)
        if cid is None:
            continue

        # Skip total_mesa rows (998)
        if cid == 998:
            continue

        votos = parse_int(raw_votos)
        if votos is None:
            votos = 0

        # Get dep_codigo (zero-pad to 2 chars)
        if dep_codigo is None and raw_dep is not None:
            dep_int = parse_int(raw_dep)
            if dep_int is not None:
                dep_codigo = str(dep_int).zfill(2)

        # votos_nulos: Candidato_ID == 996
        if cid == 996:
            votos_nulos += votos
            continue

        # votos_blancos: Candidato_ID == 997
        if cid == 997:
            votos_blancos += votos
            continue

        # For valid candidate rows (not 996, 997, 998):
        # Skip if Partido_ID == 0 AND Partido_Nom == "NO ENCONTRADO"
        pid = parse_int(raw_pid)
        pnom = str(raw_pnom).strip() if raw_pnom is not None else ""

        if pid == 0 and pnom == "NO ENCONTRADO":
            # Skip — not a real vote
            continue

        votos_validos += votos

    wb.close()

    votos_total = votos_nulos + votos_blancos + votos_validos

    return dep_codigo, votos_nulos, votos_blancos, votos_validos, votos_total


def query_db(corp_codigo: str) -> dict:
    """
    Query resultados_departamento for 2026 and return dict:
    dep_codigo -> (votos_total, votos_validos, votos_nulos, votos_blancos)
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT dep_codigo, MAX(votos_total), MAX(votos_validos), MAX(votos_nulos), MAX(votos_blancos)
        FROM resultados_departamento
        WHERE anio=2026 AND corporacion_codigo=?
        GROUP BY dep_codigo
        """,
        (corp_codigo,),
    )
    rows = cur.fetchall()
    conn.close()
    result = {}
    for dep_codigo, vt, vv, vn, vb in rows:
        result[dep_codigo] = {
            "votos_total": vt or 0,
            "votos_validos": vv or 0,
            "votos_nulos": vn or 0,
            "votos_blancos": vb or 0,
        }
    return result


def compare_all():
    all_diffs = []

    for excel_dir, corp_codigo in CORP_MAP.items():
        corp_name = CORP_NAMES[corp_codigo]
        print(f"\n{'='*70}")
        print(f"  {corp_name} (corp_codigo={corp_codigo})")
        print(f"{'='*70}")

        # Get DB data
        db_data = query_db(corp_codigo)

        # Collect Excel files
        xlsx_files = sorted(excel_dir.glob("*.xlsx"))
        print(f"  Found {len(xlsx_files)} Excel files, {len(db_data)} DB departments\n")

        # Header
        print(f"  {'Dep':>4}  {'Metric':<15} {'Excel':>12} {'DB':>12} {'Diff':>10}")
        print(f"  {'-'*4}  {'-'*15} {'-'*12} {'-'*12} {'-'*10}")

        excel_by_dep = {}
        for xlsx_file in xlsx_files:
            dep_codigo, vn, vb, vv, vt = aggregate_excel(xlsx_file)
            if dep_codigo is None:
                print(f"  WARNING: Could not determine dep_codigo for {xlsx_file.name}")
                continue
            excel_by_dep[dep_codigo] = {
                "votos_total": vt,
                "votos_validos": vv,
                "votos_nulos": vn,
                "votos_blancos": vb,
                "filename": xlsx_file.name,
            }

        # All dep_codigos from both sources
        all_deps = sorted(set(list(excel_by_dep.keys()) + list(db_data.keys())))

        significant_diffs = []

        for dep in all_deps:
            xls = excel_by_dep.get(dep)
            db = db_data.get(dep)

            marker = " *** DEP 88 (CONSULADOS)" if dep == "88" else ""

            if xls is None:
                print(f"  {dep:>4}  {'[MISSING IN EXCEL]':<15}")
                continue
            if db is None:
                print(f"  {dep:>4}  {'[MISSING IN DB]':<15}  (file: {xls['filename']})")
                continue

            metrics = ["votos_total", "votos_validos", "votos_nulos", "votos_blancos"]
            has_sig_diff = False
            rows_out = []

            for m in metrics:
                xval = xls[m]
                dval = db[m]
                diff = xval - dval
                flag = " <<<" if abs(diff) > 100 else ""
                rows_out.append(
                    f"  {dep:>4}  {m:<15} {xval:>12,} {dval:>12,} {diff:>+10,}{flag}"
                )
                if abs(diff) > 100:
                    has_sig_diff = True

            # Print the 4 metric rows with separator
            if dep == "88":
                print(f"\n  *** CONSULADOS (dep=88){marker} ***")
            for r in rows_out:
                print(r)
            print()

            if has_sig_diff:
                significant_diffs.append({
                    "corp": corp_name,
                    "dep": dep,
                    "xls": xls,
                    "db": db,
                })
                all_diffs.append({
                    "corp": corp_name,
                    "dep": dep,
                    "xls": xls,
                    "db": db,
                })

        # Summary of significant diffs for this corp
        if significant_diffs:
            print(f"\n  --- Departments with significant differences (>100 votes) ---")
            for sd in significant_diffs:
                dep = sd["dep"]
                xls = sd["xls"]
                db = sd["db"]
                dt = xls["votos_total"] - db["votos_total"]
                dv = xls["votos_validos"] - db["votos_validos"]
                dn = xls["votos_nulos"] - db["votos_nulos"]
                db_ = xls["votos_blancos"] - db["votos_blancos"]
                print(
                    f"    Dep {dep}: total_diff={dt:+,}  validos_diff={dv:+,}  "
                    f"nulos_diff={dn:+,}  blancos_diff={db_:+,}"
                )
        else:
            print(f"\n  All departments match within 100 votes threshold.")

    # Global summary
    print(f"\n\n{'='*70}")
    print("  GLOBAL SUMMARY")
    print(f"{'='*70}")
    if all_diffs:
        print(f"  {len(all_diffs)} department(s) with significant differences (>100 votes):\n")
        for sd in all_diffs:
            dep = sd["dep"]
            corp = sd["corp"]
            xls = sd["xls"]
            db = sd["db"]
            dt = xls["votos_total"] - db["votos_total"]
            print(
                f"    [{corp}] Dep {dep}: "
                f"Excel total={xls['votos_total']:,}  DB total={db['votos_total']:,}  "
                f"diff={dt:+,}"
            )
    else:
        print("  No significant differences found.")

    print()


if __name__ == "__main__":
    compare_all()
