from functools import lru_cache
from typing import Any
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict, EnvSettingsSource, DotEnvSettingsSource
from pydantic.fields import FieldInfo


class _CsvFriendlyEnvSource(EnvSettingsSource):
    def prepare_field_value(self, field_name: str, field: FieldInfo, value: Any, value_is_complex: bool) -> Any:
        if field_name == "cors_origins" and isinstance(value, str):
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


class _CsvFriendlyDotEnvSource(DotEnvSettingsSource):
    def prepare_field_value(self, field_name: str, field: FieldInfo, value: Any, value_is_complex: bool) -> Any:
        if field_name == "cors_origins" and isinstance(value, str):
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    jwt_secret: str
    jwt_alg: str = "HS256"
    jwt_expires_min: int = 60
    database_url: str = "sqlite:///./app.db"
    chroma_dir: str = "./chroma"
    upload_dir: str = "./uploads"
    max_upload_mb: int = 20

    llm_provider: str = "gemini"  # "gemini" or "openai"

    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4o-mini"
    openai_embed_model: str = "text-embedding-3-small"

    gemini_api_key: str | None = None
    gemini_chat_model: str = "gemini-1.5-flash"
    gemini_embed_model: str = "models/text-embedding-004"

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    @classmethod
    def settings_customise_sources(cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings):
        return (
            init_settings,
            _CsvFriendlyEnvSource(settings_cls),
            _CsvFriendlyDotEnvSource(settings_cls),
            file_secret_settings,
        )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
