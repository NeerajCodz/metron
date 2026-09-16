from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import time

import structlog
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from metron_ai.explain import explain
from metron_ai.models import (
    ExplanationRequest,
    ExplanationResponse,
    LiquidationPrediction,
    LiquidationRequest,
    RegimePrediction,
    RegimeRequest,
    SimulationRequest,
    SimulationResponse,
)
from metron_ai.risk_model import predict_liquidation, predict_regime
from metron_ai.settings import get_settings
from metron_ai.simulator import run_simulation

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


def require_service_token(service_token: str | None) -> None:
    settings = get_settings()
    expected = settings.service_token.get_secret_value() if settings.service_token else None
    if expected is None:
        raise HTTPException(status_code=503, detail="AI service token is not configured")
    if service_token != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health", response_model=HealthResponse, tags=["operations"])
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", service="metron-ai", environment=settings.environment)


@app.post("/v1/risk/liquidation", response_model=LiquidationPrediction, tags=["risk"])
async def liquidation_prediction(
    request: LiquidationRequest, x_metron_service_token: str | None = Header(default=None)
) -> LiquidationPrediction:
    require_service_token(x_metron_service_token)
    return predict_liquidation(request, int(time()))


@app.post("/v1/risk/regime", response_model=RegimePrediction, tags=["risk"])
async def regime_prediction(
    request: RegimeRequest, x_metron_service_token: str | None = Header(default=None)
) -> RegimePrediction:
    require_service_token(x_metron_service_token)
    return predict_regime(request, int(time()))


@app.post("/v1/simulations/stress", response_model=SimulationResponse, tags=["simulation"])
async def stress_simulation(
    request: SimulationRequest, x_metron_service_token: str | None = Header(default=None)
) -> SimulationResponse:
    require_service_token(x_metron_service_token)
    return run_simulation(request, int(time()))


@app.post("/v1/explanations", response_model=ExplanationResponse, tags=["explanations"])
async def explanation(
    request: ExplanationRequest, x_metron_service_token: str | None = Header(default=None)
) -> ExplanationResponse:
    require_service_token(x_metron_service_token)
    return explain(request)
