#!/usr/bin/env python3
"""Refresca la cache persistente de estadísticas territoriales."""
from __future__ import annotations

import sys
from pathlib import Path

# Agregar parent dir al path para importar módulos de app
sys.path.append(str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.territorial_stats_cache import refresh_territorio_stats_cache


def main() -> int:
    db = SessionLocal()
    try:
        counts = refresh_territorio_stats_cache(
            db=db,
        )
        total = sum(counts.values())
        print("✅ Cache territorial refrescada")
        print(f"   Total registros actualizados: {total}")
        print(
            "   Desglose -> "
            f"pais: {counts['pais']}, "
            f"zona: {counts['zona']}, "
            f"departamento: {counts['departamento']}, "
            f"municipio: {counts['municipio']}"
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
