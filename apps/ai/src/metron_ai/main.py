from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from pydantic import BaseModel

from metron_ai.settings import get_settings

logger = structlog.get_logger()


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


@asynccontextmanager
async def lifespan(_application: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logger.info("service_started", service="metron-ai", environment=settings.environment)
    yield
    logger.info("service_stopped", service="metron-ai")


app = FastAPI(
    title="Metron AI",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse, tags=["operations"])
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", service="metron-ai", environment=settings.environment)
