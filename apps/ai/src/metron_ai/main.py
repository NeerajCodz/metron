from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from time import time

import structlog
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from metron_ai.cascade import simulate_cascade
from metron_ai.explain import explain
from metron_ai.models import (
    CascadeRequest,
    CascadeResponse,
    ExplanationRequest,
    ExplanationResponse,
    IntentDraftRequest,
    IntentDraftResponse,
    LiquidationPrediction,
    LiquidationRequest,
    LiquidityEstimateRequest,
    LiquidityEstimateResponse,
    OptimizationRequest,
    OptimizationResponse,
    RecommendationRequest,
    RecommendationResponse,
    RecoveryRequest,
    RecoveryResponse,
    RegimePrediction,
    RegimeRequest,
    ScenarioDraftRequest,
    ScenarioDraftResponse,
    SimulationRequest,
    SimulationResponse,
    ThresholdRequest,
    ThresholdResponse,
)
from metron_ai.optimization import estimate_liquidity, optimize_allocation
from metron_ai.recommendations import (
    parse_intent_draft,
    parse_scenario_draft,
    recommend,
    recommend_threshold,
)
from metron_ai.recovery import rank_recovery
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


@app.post("/v1/liquidation/predict", response_model=LiquidationPrediction, tags=["risk"])
@app.post("/v1/risk/liquidation", response_model=LiquidationPrediction, tags=["risk"])
async def liquidation_prediction(
    request: LiquidationRequest, x_metron_service_token: str | None = Header(default=None)
) -> LiquidationPrediction:
    require_service_token(x_metron_service_token)
    return predict_liquidation(request, int(time()))


@app.post("/v1/regime/classify", response_model=RegimePrediction, tags=["risk"])
@app.post("/v1/risk/regime", response_model=RegimePrediction, tags=["risk"])
async def regime_prediction(
    request: RegimeRequest, x_metron_service_token: str | None = Header(default=None)
) -> RegimePrediction:
    require_service_token(x_metron_service_token)
    return predict_regime(request, int(time()))


@app.post("/v1/stress/simulate", response_model=SimulationResponse, tags=["simulation"])
@app.post("/v1/simulations/stress", response_model=SimulationResponse, tags=["simulation"])
async def stress_simulation(
    request: SimulationRequest, x_metron_service_token: str | None = Header(default=None)
) -> SimulationResponse:
    require_service_token(x_metron_service_token)
    return run_simulation(request, int(time()))


@app.post("/v1/recovery/rank", response_model=RecoveryResponse, tags=["recovery"])
async def recovery_rank(
    request: RecoveryRequest, x_metron_service_token: str | None = Header(default=None)
) -> RecoveryResponse:
    require_service_token(x_metron_service_token)
    return rank_recovery(request, int(time()))


@app.post("/v1/cascade/simulate", response_model=CascadeResponse, tags=["simulation"])
async def cascade_simulation(
    request: CascadeRequest, x_metron_service_token: str | None = Header(default=None)
) -> CascadeResponse:
    require_service_token(x_metron_service_token)
    return simulate_cascade(request, int(time()))


@app.post("/v1/recommendations", response_model=RecommendationResponse, tags=["recommendations"])
async def recommendation(
    request: RecommendationRequest, x_metron_service_token: str | None = Header(default=None)
) -> RecommendationResponse:
    require_service_token(x_metron_service_token)
    return recommend(request)


@app.post(
    "/v1/recommendations/threshold",
    response_model=ThresholdResponse,
    tags=["recommendations"],
)
async def threshold_recommendation(
    request: ThresholdRequest, x_metron_service_token: str | None = Header(default=None)
) -> ThresholdResponse:
    require_service_token(x_metron_service_token)
    return recommend_threshold(request)


@app.post("/v1/intent/parse", response_model=IntentDraftResponse, tags=["drafts"])
async def intent_draft(
    request: IntentDraftRequest, x_metron_service_token: str | None = Header(default=None)
) -> IntentDraftResponse:
    require_service_token(x_metron_service_token)
    return parse_intent_draft(request)

@app.post("/v1/scenario/parse", response_model=ScenarioDraftResponse, tags=["drafts"])
async def scenario_draft(
    request: ScenarioDraftRequest, x_metron_service_token: str | None = Header(default=None)
) -> ScenarioDraftResponse:
    require_service_token(x_metron_service_token)
    return parse_scenario_draft(request)


@app.post("/v1/liquidity/estimate", response_model=LiquidityEstimateResponse, tags=["optimization"])
async def liquidity_estimate(
    request: LiquidityEstimateRequest, x_metron_service_token: str | None = Header(default=None)
) -> LiquidityEstimateResponse:
    require_service_token(x_metron_service_token)
    return estimate_liquidity(request)


@app.post("/v1/optimization/allocate", response_model=OptimizationResponse, tags=["optimization"])
async def allocation_optimization(
    request: OptimizationRequest, x_metron_service_token: str | None = Header(default=None)
) -> OptimizationResponse:
    require_service_token(x_metron_service_token)
    return optimize_allocation(request)

@app.post("/v1/explain", response_model=ExplanationResponse, tags=["explanations"])
@app.post("/v1/explanations", response_model=ExplanationResponse, tags=["explanations"])
async def explanation(
    request: ExplanationRequest, x_metron_service_token: str | None = Header(default=None)
) -> ExplanationResponse:
    require_service_token(x_metron_service_token)
    return explain(request)
