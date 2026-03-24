"""Add personal_electoral table for jurados and testigos.

Revision ID: 20260323_0004
Revises: 20260322_0003
Create Date: 2026-03-23
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260323_0004"
down_revision = "befef4721bb7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "personal_electoral",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=16), nullable=False),
        sa.Column("cedula", sa.String(length=32), nullable=False),
        sa.Column("primer_nombre", sa.String(length=64), nullable=False),
        sa.Column("segundo_nombre", sa.String(length=64), nullable=True),
        sa.Column("primer_apellido", sa.String(length=64), nullable=False),
        sa.Column("segundo_apellido", sa.String(length=64), nullable=True),
        sa.Column("telefono", sa.String(length=32), nullable=True),
        sa.Column("celular", sa.String(length=32), nullable=True),
        sa.Column("correo", sa.String(length=128), nullable=True),
        sa.Column("codigo_puesto", sa.String(length=32), nullable=False),
        sa.Column("direccion", sa.String(length=256), nullable=True),
        sa.Column("nivel_educativo", sa.String(length=64), nullable=True),
        sa.Column("referenciado_por", sa.String(length=160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["codigo_puesto"], ["puestos_electorales.codigo_puesto"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cedula", "tipo", "codigo_puesto", name="uq_personal_cedula_tipo_puesto"),
    )
    op.create_index("ix_personal_electoral_id", "personal_electoral", ["id"])
    op.create_index("ix_personal_electoral_tipo", "personal_electoral", ["tipo"])
    op.create_index("ix_personal_electoral_cedula", "personal_electoral", ["cedula"])
    op.create_index("ix_personal_electoral_codigo_puesto", "personal_electoral", ["codigo_puesto"])
    op.create_index("ix_personal_tipo_codigo_puesto", "personal_electoral", ["tipo", "codigo_puesto"])


def downgrade() -> None:
    op.drop_index("ix_personal_tipo_codigo_puesto", table_name="personal_electoral")
    op.drop_index("ix_personal_electoral_codigo_puesto", table_name="personal_electoral")
    op.drop_index("ix_personal_electoral_cedula", table_name="personal_electoral")
    op.drop_index("ix_personal_electoral_tipo", table_name="personal_electoral")
    op.drop_index("ix_personal_electoral_id", table_name="personal_electoral")
    op.drop_table("personal_electoral")
