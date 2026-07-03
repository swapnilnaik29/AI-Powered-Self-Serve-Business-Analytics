from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import json


class Settings(BaseSettings):
    app_name: str = "Self-Serve Analytics BI"
    app_version: str = "1.0.0"
    debug: bool = False

    database_url: str = "sqlite:///./data/analytics.db"

    jwt_secret_key: str = "change-this-to-a-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.0
    llm_max_tokens: int = 1024

    cors_origins: List[str] = ["http://localhost:4200", "http://127.0.0.1:4200"]

    embedding_model_name: str = "all-MiniLM-L6-v2"

    rate_limit_per_minute: int = 30

    # Payments data for DuckDB in-memory analytics
    payments_db_path: str = "data/payments.db"
    payments_row_count: int = 15000

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


_settings: Optional[Settings] = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
