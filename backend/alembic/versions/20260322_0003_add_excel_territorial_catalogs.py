"""Add Excel-driven territorial catalogs and puesto code columns.

Revision ID: 20260322_0003
Revises: 20260310_0002
Create Date: 2026-03-22
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260322_0003"
down_revision = "20260310_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "territorio_zona",
        sa.Column("codigo", sa.String(length=3), nullable=False),
        sa.Column("nombre", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("codigo"),
    )

    op.create_table(
        "territorio_departamento",
        sa.Column("codigo", sa.String(length=2), nullable=False),
        sa.Column("nombre", sa.String(length=128), nullable=False),
        sa.Column("zona_codigo", sa.String(length=3), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["zona_codigo"], ["territorio_zona.codigo"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("codigo"),
    )
    op.create_index(
        "ix_territorio_departamento_zona_codigo",
        "territorio_departamento",
        ["zona_codigo"],
        unique=False,
    )

    op.create_table(
        "territorio_municipio",
        sa.Column("codigo", sa.String(length=5), nullable=False),
        sa.Column("departamento_codigo", sa.String(length=2), nullable=False),
        sa.Column("nombre", sa.String(length=160), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["departamento_codigo"], ["territorio_departamento.codigo"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("codigo"),
    )
    op.create_index(
        "ix_territorio_municipio_departamento_codigo",
        "territorio_municipio",
        ["departamento_codigo"],
        unique=False,
    )

    op.add_column("puestos_electorales", sa.Column("zona_codigo", sa.String(length=3), nullable=True))
    op.add_column("puestos_electorales", sa.Column("puesto_codigo", sa.String(length=8), nullable=True))
    op.create_index(
        "ix_puestos_electorales_zona_codigo",
        "puestos_electorales",
        ["zona_codigo"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_puestos_electorales_zona_codigo", table_name="puestos_electorales")
    op.drop_column("puestos_electorales", "puesto_codigo")
    op.drop_column("puestos_electorales", "zona_codigo")

    op.drop_index("ix_territorio_municipio_departamento_codigo", table_name="territorio_municipio")
    op.drop_table("territorio_municipio")

    op.drop_index("ix_territorio_departamento_zona_codigo", table_name="territorio_departamento")
    op.drop_table("territorio_departamento")

    op.drop_table("territorio_zona")
