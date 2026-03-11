"""Add persistent cache table for territorial analytics.

Revision ID: 20260310_0002
Revises: 20260308_0001
Create Date: 2026-03-10
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260310_0002"
down_revision = "20260308_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "territorio_stats_cache",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=32), nullable=False),
        sa.Column("codigo", sa.String(length=32), nullable=False),
        sa.Column("nombre", sa.String(length=128), nullable=True),
        sa.Column("puestos_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mesas_sum", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_sum", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("mujeres_sum", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("hombres_sum", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tipo", "codigo", name="uq_territorio_stats_cache_tipo_codigo"),
    )
    op.create_index(op.f("ix_territorio_stats_cache_id"), "territorio_stats_cache", ["id"], unique=False)
    op.create_index(op.f("ix_territorio_stats_cache_tipo"), "territorio_stats_cache", ["tipo"], unique=False)
    op.create_index(op.f("ix_territorio_stats_cache_codigo"), "territorio_stats_cache", ["codigo"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_territorio_stats_cache_codigo"), table_name="territorio_stats_cache")
    op.drop_index(op.f("ix_territorio_stats_cache_tipo"), table_name="territorio_stats_cache")
    op.drop_index(op.f("ix_territorio_stats_cache_id"), table_name="territorio_stats_cache")
    op.drop_table("territorio_stats_cache")
