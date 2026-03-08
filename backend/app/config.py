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
    
settings = Settings()
