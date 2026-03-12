"""Configuration settings for the electoral maps API."""
import json
from pathlib import Path
from typing import Annotated, Any, List

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        case_sensitive=False,
    )
    
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: Annotated[List[str], NoDecode] = ["http://localhost:5173", "http://localhost:3000"]
    data_dir: Path = Path(__file__).resolve().parents[2] / "data"
    database_url: str = "sqlite:///./electoral.db"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> List[str]:
        if isinstance(value, list):
            return value
        if not isinstance(value, str):
            return ["http://localhost:5173", "http://localhost:3000"]

        raw_value = value.strip()
        if not raw_value:
            return []

        if raw_value.startswith("["):
            parsed = json.loads(raw_value)
            if isinstance(parsed, list):
                return [str(origin).strip() for origin in parsed if str(origin).strip()]

        return [origin.strip() for origin in raw_value.split(",") if origin.strip()]

    @field_validator("data_dir", mode="before")
    @classmethod
    def resolve_data_dir(cls, value: Any) -> Path:
        backend_dir = Path(__file__).resolve().parents[1]
        default_data_dir = backend_dir.parent / "data"

        if value is None:
            return default_data_dir

        raw_value = str(value).strip()
        if not raw_value:
            return default_data_dir

        data_path = Path(raw_value).expanduser()
        if not data_path.is_absolute():
            data_path = (backend_dir / data_path).resolve()

        if data_path.exists():
            return data_path

        if default_data_dir.exists():
            return default_data_dir

        return data_path
    
settings = Settings()
