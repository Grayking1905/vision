"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./vision.db"
    secret_key: str = "vision-secret-key"
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    upload_folder: str = "./data/uploads"
    model_folder: str = "./data/models"
    max_content_length: int = 200 * 1024 * 1024
    api_base: str = "/api/v1"
    debug: bool = True

    model_config = {"env_file": ".env"}

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
