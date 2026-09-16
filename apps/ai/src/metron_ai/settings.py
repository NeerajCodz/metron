from functools import lru_cache

from pydantic import AnyHttpUrl, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="METRON_AI_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    log_level: str = "INFO"
    backend_url: AnyHttpUrl | None = None
    service_token: SecretStr | None = Field(default=None, min_length=32)
    model_artifact_directory: str = "artifacts/models"
    default_provider: str = "gemini"
    default_model: str = "gemini-2.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com"
    gemini_api_key: SecretStr | None = Field(default=None, min_length=1)
    openai_api_key: SecretStr | None = Field(default=None, min_length=1)
    anthropic_api_key: SecretStr | None = Field(default=None, min_length=1)
    request_timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    max_output_chars: int = Field(default=4000, ge=64, le=16_000)
    require_models: bool = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
