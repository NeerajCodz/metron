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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
