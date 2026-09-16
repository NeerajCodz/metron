from __future__ import annotations

import re

from metron_ai.models import (
    IntentDraftRequest,
    IntentDraftResponse,
    RecommendationRequest,
    RecommendationResponse,
    ScenarioDraftRequest,
    ScenarioDraftResponse,
    StressScenario,
    ThresholdRequest,
    ThresholdResponse,
)

_ADDRESS = re.compile(r"0x[a-fA-F0-9]{40}")
_PERCENT = re.compile(r"(\d+(?:\.\d+)?)\s*%")
_CHAIN = re.compile(r"\b(?:chain|on)\s+(\d+)\b", re.IGNORECASE)


def recommend(request: RecommendationRequest) -> RecommendationResponse:
    allowed = set(request.allowed_action_types)
    eligible = [action for action in request.candidate_action_types if action in allowed]
    if not eligible:
        raise ValueError("no candidate is permitted by user policy")
    def score(action: str) -> tuple[int, int, str]:
        accepted = request.accepted_history.get(action, 0)
        rejected = request.rejected_history.get(action, 0)
        return (accepted - rejected, accepted, action)
    selected = max(eligible, key=score)
    accepted = request.accepted_history.get(selected, 0)
    rejected = request.rejected_history.get(selected, 0)
    return RecommendationResponse(
        trace_id=request.trace_id,
        recommended_action_type=selected,
        rationale=[
            "candidate is explicitly allowed by the current user policy",
            f"accepted_history={accepted}",
            f"rejected_history={rejected}",
            "history changes ranking only within the supplied policy envelope",
        ],
    )


def parse_intent_draft(request: IntentDraftRequest) -> IntentDraftResponse:
    text = request.text
    percentages = [float(value) for value in _PERCENT.findall(text)]
    target_apy = int(percentages[0] * 100) if percentages else 0
    drawdown = int(percentages[1] * 100) if len(percentages) > 1 else 1_000
    chains = [int(value) for value in _CHAIN.findall(text)] or [1]
    assets = list(dict.fromkeys(match.lower() for match in _ADDRESS.findall(text)))
    return IntentDraftResponse(
        trace_id=request.trace_id,
        objective={"target_apy_min_bps": target_apy},
        risk={"max_drawdown_bps": drawdown, "max_slippage_bps": 100},
        assets=assets,
        chains=chains,
        source_text=text,
        requires_approval=True,
    )

def recommend_threshold(request: ThresholdRequest) -> ThresholdResponse:
    bound = min(request.user_max_probability_bps, request.administrator_max_probability_bps)
    intervention_level = max(0, bound - request.hysteresis_bps)
    return ThresholdResponse(
        trace_id=request.trace_id,
        recommended_intervention_bps=intervention_level,
        intervention_required=request.current_liquidation_probability_bps >= intervention_level,
        rationale=[
            f"user_bound_bps={request.user_max_probability_bps}",
            f"administrator_bound_bps={request.administrator_max_probability_bps}",
            f"hysteresis_bps={request.hysteresis_bps}",
            "the lower of user and administrator bounds is authoritative",
        ],
    )

def parse_scenario_draft(request: ScenarioDraftRequest) -> ScenarioDraftResponse:
    text = request.text.lower()
    percentages = [float(value) for value in _PERCENT.findall(text)]
    price_shock = -int(percentages[0] * 100) if "crash" in text and percentages else 0
    depeg = int(percentages[1] * 100) if "depeg" in text and len(percentages) > 1 else 0
    liquidity = int(percentages[2] * 100) if "liquidity" in text and len(percentages) > 2 else 0
    scenario = StressScenario(
        eth_price_shock_bps=price_shock,
        stablecoin_depeg_bps=depeg,
        dex_liquidity_shock_bps=liquidity,
        volatility_multiplier_bps=20_000 if "volatil" in text else 10_000,
        gas_multiplier_bps=20_000 if "gas" in text else 10_000,
        lending_utilization_shock_bps=500 if "utilization" in text else 0,
    )
    return ScenarioDraftResponse(
        trace_id=request.trace_id,
        scenario=scenario,
        source_text=request.text,
        requires_approval=True,
    )
