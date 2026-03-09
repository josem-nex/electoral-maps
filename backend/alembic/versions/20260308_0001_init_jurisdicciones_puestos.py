"""Initial schema for jurisdicciones, puestos and catalog tables.

Revision ID: 20260308_0001
Revises:
Create Date: 2026-03-08
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260308_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "catalogo_niveles_territoriales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.String(length=32), nullable=False),
        sa.Column("nombre", sa.String(length=64), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo"),
    )
    op.create_index(op.f("ix_catalogo_niveles_territoriales_id"), "catalogo_niveles_territoriales", ["id"], unique=False)

    op.create_table(
        "catalogo_tipos_jurisdiccion",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.String(length=32), nullable=False),
        sa.Column("nombre", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo"),
    )
    op.create_index(op.f("ix_catalogo_tipos_jurisdiccion_id"), "catalogo_tipos_jurisdiccion", ["id"], unique=False)

    op.create_table(
        "jurisdicciones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo_divipola", sa.String(length=16), nullable=True),
        sa.Column("nombre", sa.String(length=128), nullable=False),
        sa.Column("nivel", sa.String(length=32), nullable=False),
        sa.Column("tipo", sa.String(length=32), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("geometria_ref", sa.Text(), nullable=True),
        sa.Column("center_lat", sa.Float(), nullable=True),
        sa.Column("center_lon", sa.Float(), nullable=True),
        sa.Column("zoom", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["jurisdicciones.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo_divipola"),
        sa.UniqueConstraint("nombre", "nivel", "parent_id", name="uq_jurisdiccion_nombre_nivel_parent"),
    )
    op.create_index(op.f("ix_jurisdicciones_id"), "jurisdicciones", ["id"], unique=False)
    op.create_index(op.f("ix_jurisdicciones_nivel"), "jurisdicciones", ["nivel"], unique=False)
    op.create_index(op.f("ix_jurisdicciones_parent_id"), "jurisdicciones", ["parent_id"], unique=False)

    op.create_table(
        "puestos_electorales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo_puesto", sa.String(length=32), nullable=False),
        sa.Column("jurisdiccion_id", sa.Integer(), nullable=True),
        sa.Column("departamento_codigo", sa.String(length=2), nullable=False),
        sa.Column("municipio_codigo", sa.String(length=5), nullable=False),
        sa.Column("departamento", sa.String(length=128), nullable=False),
        sa.Column("municipio", sa.String(length=128), nullable=False),
        sa.Column("puesto", sa.String(length=256), nullable=False),
        sa.Column("comuna", sa.String(length=128), nullable=True),
        sa.Column("direccion", sa.String(length=256), nullable=True),
        sa.Column("mujeres", sa.Integer(), nullable=True),
        sa.Column("hombres", sa.Integer(), nullable=True),
        sa.Column("total", sa.Integer(), nullable=True),
        sa.Column("mesas", sa.Integer(), nullable=True),
        sa.Column("latitud", sa.Float(), nullable=False),
        sa.Column("longitud", sa.Float(), nullable=False),
        sa.Column("anio", sa.Integer(), nullable=True),
        sa.Column("corporacion", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["jurisdiccion_id"], ["jurisdicciones.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo_puesto"),
    )
    op.create_index(op.f("ix_puestos_electorales_anio"), "puestos_electorales", ["anio"], unique=False)
    op.create_index(op.f("ix_puestos_electorales_corporacion"), "puestos_electorales", ["corporacion"], unique=False)
    op.create_index(op.f("ix_puestos_electorales_departamento_codigo"), "puestos_electorales", ["departamento_codigo"], unique=False)
    op.create_index(op.f("ix_puestos_electorales_id"), "puestos_electorales", ["id"], unique=False)
    op.create_index(op.f("ix_puestos_electorales_jurisdiccion_id"), "puestos_electorales", ["jurisdiccion_id"], unique=False)
    op.create_index(op.f("ix_puestos_electorales_municipio_codigo"), "puestos_electorales", ["municipio_codigo"], unique=False)
    op.create_index("ix_puestos_latitud_longitud", "puestos_electorales", ["latitud", "longitud"], unique=False)

    op.create_table(
        "personas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre_completo", sa.String(length=160), nullable=False),
        sa.Column("documento", sa.String(length=32), nullable=True),
        sa.Column("rol", sa.String(length=64), nullable=True),
        sa.Column("jurisdiccion_id", sa.Integer(), nullable=True),
        sa.Column("anio", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["jurisdiccion_id"], ["jurisdicciones.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("documento"),
    )
    op.create_index(op.f("ix_personas_anio"), "personas", ["anio"], unique=False)
    op.create_index(op.f("ix_personas_id"), "personas", ["id"], unique=False)
    op.create_index(op.f("ix_personas_jurisdiccion_id"), "personas", ["jurisdiccion_id"], unique=False)
    op.create_index(op.f("ix_personas_nombre_completo"), "personas", ["nombre_completo"], unique=False)
    op.create_index(op.f("ix_personas_rol"), "personas", ["rol"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_personas_rol"), table_name="personas")
    op.drop_index(op.f("ix_personas_nombre_completo"), table_name="personas")
    op.drop_index(op.f("ix_personas_jurisdiccion_id"), table_name="personas")
    op.drop_index(op.f("ix_personas_id"), table_name="personas")
    op.drop_index(op.f("ix_personas_anio"), table_name="personas")
    op.drop_table("personas")

    op.drop_index("ix_puestos_latitud_longitud", table_name="puestos_electorales")
    op.drop_index(op.f("ix_puestos_electorales_municipio_codigo"), table_name="puestos_electorales")
    op.drop_index(op.f("ix_puestos_electorales_jurisdiccion_id"), table_name="puestos_electorales")
    op.drop_index(op.f("ix_puestos_electorales_id"), table_name="puestos_electorales")
    op.drop_index(op.f("ix_puestos_electorales_departamento_codigo"), table_name="puestos_electorales")
    op.drop_index(op.f("ix_puestos_electorales_corporacion"), table_name="puestos_electorales")
    op.drop_index(op.f("ix_puestos_electorales_anio"), table_name="puestos_electorales")
    op.drop_table("puestos_electorales")

    op.drop_index(op.f("ix_jurisdicciones_parent_id"), table_name="jurisdicciones")
    op.drop_index(op.f("ix_jurisdicciones_nivel"), table_name="jurisdicciones")
    op.drop_index(op.f("ix_jurisdicciones_id"), table_name="jurisdicciones")
    op.drop_table("jurisdicciones")

    op.drop_index(op.f("ix_catalogo_tipos_jurisdiccion_id"), table_name="catalogo_tipos_jurisdiccion")
    op.drop_table("catalogo_tipos_jurisdiccion")

    op.drop_index(op.f("ix_catalogo_niveles_territoriales_id"), table_name="catalogo_niveles_territoriales")
    op.drop_table("catalogo_niveles_territoriales")
