from typing import Optional

from pydantic import Field, computed_field
from pydantic_settings import SettingsConfigDict

from configs.dataset_config import DatabaseConfig
from configs.mail_config import MailConfig
from configs.redis_config import RedisConfig


class LazyConfig(MailConfig, DatabaseConfig, RedisConfig):
    model_config = SettingsConfigDict(frozen=True, extra="ignore")
    DEBUG: bool = Field(default=False, description="whether to enable debug mode.")

    CELERY_BACKEND: str = Field(
        description="Celery backend, available values are `database`, `redis`",
        default="database",
    )

    CELERY_BROKER_URL: Optional[str] = Field(
        description="CELERY_BROKER_URL", default=None
    )

    @computed_field
    @property
    def CELERY_RESULT_BACKEND(self) -> str | None:
        return (
            "db+{}".format(self.SQLALCHEMY_DATABASE_URI)
            if self.CELERY_BACKEND == "database"
            else self.CELERY_BROKER_URL
        )

    @computed_field
    @property
    def BROKER_USE_SSL(self) -> bool:
        return (
            self.CELERY_BROKER_URL.startswith("rediss://")
            if self.CELERY_BROKER_URL
            else False
        )


lazy_config = LazyConfig()
