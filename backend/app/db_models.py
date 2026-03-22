"""SQLAlchemy ORM models for electoral backend."""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

try:
    from app.database import Base
except ModuleNotFoundError:
    from database import Base


class CatalogoNivelTerritorial(Base):
    __tablename__ = "catalogo_niveles_territoriales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(64), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)


class CatalogoTipoJurisdiccion(Base):
    __tablename__ = "catalogo_tipos_jurisdiccion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(64), nullable=False)


class JurisdiccionORM(Base):
    __tablename__ = "jurisdicciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo_divipola: Mapped[str | None] = mapped_column(String(16), unique=True)
    nombre: Mapped[str] = mapped_column(String(128), nullable=False)
    nivel: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(32), nullable=False, default="territorial")
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("jurisdicciones.id", ondelete="SET NULL"), index=True)
    geometria_ref: Mapped[str | None] = mapped_column(Text)
    center_lat: Mapped[float | None] = mapped_column(Float)
    center_lon: Mapped[float | None] = mapped_column(Float)
    zoom: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    parent = relationship("JurisdiccionORM", remote_side=[id], backref="children")

    __table_args__ = (
        UniqueConstraint("nombre", "nivel", "parent_id", name="uq_jurisdiccion_nombre_nivel_parent"),
    )


class TerritorioZonaORM(Base):
    __tablename__ = "territorio_zona"

    codigo: Mapped[str] = mapped_column(String(3), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class TerritorioDepartamentoORM(Base):
    __tablename__ = "territorio_departamento"

    codigo: Mapped[str] = mapped_column(String(2), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(128), nullable=False)
    zona_codigo: Mapped[str | None] = mapped_column(ForeignKey("territorio_zona.codigo", ondelete="SET NULL"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    zona = relationship("TerritorioZonaORM")


class TerritorioMunicipioORM(Base):
    __tablename__ = "territorio_municipio"

    codigo: Mapped[str] = mapped_column(String(5), primary_key=True)
    departamento_codigo: Mapped[str] = mapped_column(ForeignKey("territorio_departamento.codigo", ondelete="CASCADE"), index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    departamento = relationship("TerritorioDepartamentoORM")


class PuestoORM(Base):
    __tablename__ = "puestos_electorales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo_puesto: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    jurisdiccion_id: Mapped[int | None] = mapped_column(ForeignKey("jurisdicciones.id", ondelete="SET NULL"), index=True)
    departamento_codigo: Mapped[str] = mapped_column(String(2), index=True, nullable=False)
    municipio_codigo: Mapped[str] = mapped_column(String(5), index=True, nullable=False)
    departamento: Mapped[str] = mapped_column(String(128), nullable=False)
    municipio: Mapped[str] = mapped_column(String(128), nullable=False)
    puesto: Mapped[str] = mapped_column(String(256), nullable=False)
    comuna: Mapped[str | None] = mapped_column(String(128))
    zona_codigo: Mapped[str | None] = mapped_column(String(3), index=True)
    puesto_codigo: Mapped[str | None] = mapped_column(String(8))
    direccion: Mapped[str | None] = mapped_column(String(256))
    mujeres: Mapped[int | None] = mapped_column(Integer)
    hombres: Mapped[int | None] = mapped_column(Integer)
    total: Mapped[int | None] = mapped_column(Integer)
    mesas: Mapped[int | None] = mapped_column(Integer)
    latitud: Mapped[float] = mapped_column(Float, nullable=False)
    longitud: Mapped[float] = mapped_column(Float, nullable=False)
    anio: Mapped[int | None] = mapped_column(Integer, index=True)
    corporacion: Mapped[str | None] = mapped_column(String(32), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    jurisdiccion = relationship("JurisdiccionORM")

    __table_args__ = (
        Index("ix_puestos_latitud_longitud", "latitud", "longitud"),
    )


class PersonaORM(Base):
    __tablename__ = "personas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre_completo: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    documento: Mapped[str | None] = mapped_column(String(32), unique=True)
    rol: Mapped[str | None] = mapped_column(String(64), index=True)
    jurisdiccion_id: Mapped[int | None] = mapped_column(ForeignKey("jurisdicciones.id", ondelete="SET NULL"), index=True)
    anio: Mapped[int | None] = mapped_column(Integer, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    jurisdiccion = relationship("JurisdiccionORM")


class TerritorioStatsCacheORM(Base):
    __tablename__ = "territorio_stats_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tipo: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    codigo: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    nombre: Mapped[str | None] = mapped_column(String(128))
    puestos_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mesas_sum: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_sum: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mujeres_sum: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hombres_sum: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("tipo", "codigo", name="uq_territorio_stats_cache_tipo_codigo"),
    )
