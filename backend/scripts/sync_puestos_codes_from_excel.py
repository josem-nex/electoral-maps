#!/usr/bin/env python3
"""Sincroniza dd/mm/zz/pp de puestos_electorales desde INFO_X_Puesto.xlsx."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import text

sys.path.append(str(Path(__file__).parent.parent))

from app.data_loader import load_puestos_electorales
from app.database import SessionLocal
from app.db_models import TerritorioDepartamentoORM, TerritorioMunicipioORM


def _safe_zone_code(value: object) -> str | None:
    if value is None:
        return None
    raw = str(value).replace(".0", "").strip()
    if not raw:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return None
    return digits.zfill(2)


def _safe_puesto_code(value: object) -> str | None:
    if value is None:
        return None
    raw = str(value).replace(".0", "").strip()
    if not raw:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return None
    return digits.zfill(2)


def build_excel_index() -> dict[str, dict[str, str | None]]:
    puestos = load_puestos_electorales().copy()

    index: dict[str, dict[str, str | None]] = {}

    for row in puestos.itertuples(index=False):
        codigo_puesto = str(getattr(row, "codigo_puesto", "")).strip()
        if not codigo_puesto:
            continue

        dd = str(getattr(row, "departamento_codigo", "")).strip().zfill(2)
        mm = str(getattr(row, "municipio_codigo", "")).strip().zfill(5)
        zz = _safe_zone_code(getattr(row, "zz", None))
        pp = _safe_puesto_code(getattr(row, "pp", None))

        index[codigo_puesto] = {
            "departamento_codigo": dd,
            "municipio_codigo": mm,
            "zona_codigo": zz,
            "puesto_codigo": pp,
        }

    return index


def sync_codes(dry_run: bool = False) -> dict[str, object]:
    excel_index = build_excel_index()

    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT id, codigo_puesto, departamento_codigo, municipio_codigo, zona_codigo, puesto_codigo
                FROM puestos_electorales
                """
            )
        ).fetchall()

        corrected = 0
        unchanged = 0
        not_found = 0
        mismatch_samples: list[dict[str, str]] = []
        not_found_samples: list[str] = []

        for row in rows:
            row_id, codigo_puesto, dd_db, mm_db, zz_db, pp_db = row
            codigo_key = str(codigo_puesto).strip()
            expected = excel_index.get(codigo_key)
            if expected is None:
                not_found += 1
                if len(not_found_samples) < 20:
                    not_found_samples.append(codigo_key)
                continue

            dd_expected = str(expected["departamento_codigo"] or "").zfill(2)
            mm_expected = str(expected["municipio_codigo"] or "").zfill(5)
            zz_expected = expected["zona_codigo"]
            pp_expected = expected["puesto_codigo"]

            dd_current = str(dd_db or "").strip().zfill(2)
            mm_current = str(mm_db or "").strip().zfill(5)
            zz_current = str(zz_db).strip().zfill(2) if zz_db not in (None, "") else None
            pp_current = str(pp_db).strip().zfill(2) if pp_db not in (None, "") else None

            if (
                dd_current == dd_expected
                and mm_current == mm_expected
                and zz_current == zz_expected
                and pp_current == pp_expected
            ):
                unchanged += 1
                continue

            corrected += 1
            if len(mismatch_samples) < 20:
                mismatch_samples.append(
                    {
                        "codigo_puesto": codigo_key,
                        "dd_db": dd_current,
                        "dd_excel": dd_expected,
                        "mm_db": mm_current,
                        "mm_excel": mm_expected,
                    }
                )

            if not dry_run:
                db.execute(
                    text(
                        """
                        UPDATE puestos_electorales
                        SET departamento_codigo = :dd,
                            municipio_codigo = :mm,
                            zona_codigo = :zz,
                            puesto_codigo = :pp
                        WHERE id = :row_id
                        """
                    ),
                    {
                        "dd": dd_expected,
                        "mm": mm_expected,
                        "zz": zz_expected,
                        "pp": pp_expected,
                        "row_id": row_id,
                    },
                )

        if not dry_run:
            db.commit()

        # Post-sync validations against territorial catalogs
        missing_dept_catalog = db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM puestos_electorales p
                LEFT JOIN territorio_departamento d ON d.codigo = p.departamento_codigo
                WHERE d.codigo IS NULL
                """
            )
        ).scalar_one()

        missing_mun_catalog = db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM puestos_electorales p
                LEFT JOIN territorio_municipio m ON m.codigo = p.municipio_codigo
                WHERE m.codigo IS NULL
                """
            )
        ).scalar_one()

        invalid_mun_parent = db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM puestos_electorales p
                JOIN territorio_municipio m ON m.codigo = p.municipio_codigo
                WHERE m.departamento_codigo <> p.departamento_codigo
                """
            )
        ).scalar_one()

        return {
            "total_db_rows": len(rows),
            "excel_rows": len(excel_index),
            "corrected": corrected,
            "unchanged": unchanged,
            "not_found_in_excel": not_found,
            "not_found_samples": not_found_samples,
            "mismatch_samples": mismatch_samples,
            "missing_department_catalog": int(missing_dept_catalog or 0),
            "missing_municipio_catalog": int(missing_mun_catalog or 0),
            "invalid_municipio_parent": int(invalid_mun_parent or 0),
        }
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincronizar dd/mm/zz/pp de puestos desde Excel")
    parser.add_argument("--dry-run", action="store_true", help="No escribe cambios en BD")
    args = parser.parse_args()

    report = sync_codes(dry_run=args.dry_run)

    mode = "DRY-RUN" if args.dry_run else "APLICADO"
    print(f"✅ Sync puestos ({mode})")
    print(f"   Filas en BD: {report['total_db_rows']}")
    print(f"   Códigos en Excel: {report['excel_rows']}")
    print(f"   Corregidos: {report['corrected']}")
    print(f"   Sin cambios: {report['unchanged']}")
    print(f"   No encontrados en Excel: {report['not_found_in_excel']}")
    print(f"   Sin catálogo departamento: {report['missing_department_catalog']}")
    print(f"   Sin catálogo municipio: {report['missing_municipio_catalog']}")
    print(f"   Municipio con padre inválido: {report['invalid_municipio_parent']}")

    if report["mismatch_samples"]:
        print("\nMuestras de corrección:")
        for item in report["mismatch_samples"][:10]:
            print(
                f"   {item['codigo_puesto']}: dd {item['dd_db']}→{item['dd_excel']} | "
                f"mm {item['mm_db']}→{item['mm_excel']}"
            )

    if report["not_found_samples"]:
        print("\nMuestras no encontradas en Excel:")
        for code in report["not_found_samples"][:10]:
            print(f"   {code}")

    has_validation_errors = (
        report["missing_department_catalog"] > 0
        or report["missing_municipio_catalog"] > 0
        or report["invalid_municipio_parent"] > 0
    )

    if has_validation_errors:
        print("\n❌ Validación de integridad post-sync falló")
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
