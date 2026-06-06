from __future__ import annotations

from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: AnyHttpUrl = Field(alias="SUPABASE_URL")
    supabase_publishable_key: str = Field(alias="SUPABASE_PUBLISHABLE_KEY")
    supabase_database_url: str = Field("", alias="SUPABASE_DATABASE_URL")
    frontend_origin: str = Field("http://localhost:5173", alias="FRONTEND_ORIGIN")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
