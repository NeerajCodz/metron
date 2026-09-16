from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from metron_ai.models import (
    Ambiguity,
    ExtractionEvidence,
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
_CHAIN_NAMES = {
    "ethereum": 1,
    "mainnet": 1,
    "sepolia": 11155111,
    "arbitrum": 42161,
    "arbitrum sepolia": 421614,
    "base": 8453,
    "base sepolia": 84532,
    "optimism": 10,
    "optimism sepolia": 11155420,
}
_PROTOCOL_NAMES = {
    "aave": "aave-v3",
    "aave v3": "aave-v3",
    "uniswap": "uniswap-v4",
    "uniswap v4": "uniswap-v4",
    "chainlink": "chainlink",
    "layerzero": "layerzero-v2",
}


def _labeled_bps(text: str, labels: tuple[str, ...], default: int | None = None) -> int | None:
    label = "|".join(re.escape(item) for item in labels)
    match = re.search(rf"(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:{label})", text, re.IGNORECASE)
    if not match:
        return default
    try:
        value = Decimal(match.group(1)) * Decimal(100)
    except InvalidOperation:
        return default
    if value < 0 or value > 10_000:
        return default
    return int(value)


def _labeled_percent(text: str, labels: tuple[str, ...]) -> Decimal | None:
    label = "|".join(re.escape(item) for item in labels)
    match = re.search(rf"(\d+(?:\.\d+)?)\s*%\s*(?:{label})", text, re.IGNORECASE)
    if not match:
        return None
    try:
        return Decimal(match.group(1))
    except InvalidOperation:
        return None


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
    normalized = text.lower()
    percentages = [Decimal(value) for value in _PERCENT.findall(text)]
    target_apy = _labeled_bps(normalized, ("apy", "yield"))
    max_drawdown = _labeled_bps(normalized, ("drawdown",))
    max_il = _labeled_bps(normalized, ("impermanent loss", "il"))
    max_slippage = _labeled_bps(normalized, ("slippage",))
    protocols = list(
        dict.fromkeys(protocol for name, protocol in _PROTOCOL_NAMES.items() if name in normalized)
    )
    chains = [int(value) for value in _CHAIN.findall(text)]
    for name, chain_id in sorted(_CHAIN_NAMES.items(), key=lambda item: len(item[0]), reverse=True):
        if name in normalized and chain_id not in chains:
            chains.append(chain_id)
    assets = list(dict.fromkeys(match.lower() for match in _ADDRESS.findall(text)))
    if "eth" in normalized:
        assets.append("ETH")
    if "usdc" in normalized:
        assets.append("USDC")
    if any(token in normalized for token in ("protect", "liquidation", "deleverage")):
        intent_type = "protection"
    elif any(token in normalized for token in ("borrow", "loan", "lending")):
        intent_type = "lending"
    elif any(
        token in normalized for token in ("lp", "liquidity", "pool", "impermanent loss", "uniswap")
    ):
        intent_type = "liquidity"
    elif any(token in normalized for token in ("stable yield", "stablecoin")):
        intent_type = "stable_yield"
    else:
        intent_type = "yield"
    target_delta_wad: int | None = None
    if any(
        token in normalized
        for token in ("delta neutral", "delta-neutral", "net delta zero", "zero delta")
    ):
        target_delta_wad = 0
    else:
        delta_match = re.search(r"delta\s*(?:of|at|to)?\s*(-?\d+(?:\.\d+)?)\s*%", normalized)
        if delta_match:
            target_delta_wad = int(Decimal(delta_match.group(1)) * Decimal(10**16))
    ambiguities: list[Ambiguity] = []
    if len(percentages) > 1 and max_drawdown is None and max_il is None:
        ambiguities.append(
            Ambiguity(
                field="percentages",
                reason_code="unlabeled",
                alternatives=[str(value) for value in percentages],
            )
        )
    if not protocols:
        ambiguities.append(Ambiguity(field="protocols", reason_code="missing"))
    if not assets:
        ambiguities.append(Ambiguity(field="assets", reason_code="missing"))
    evidence = [
        ExtractionEvidence(field="target_apy_min_bps", value=str(target_apy), confidence_bps=9_000)
        for target_apy in [target_apy]
        if target_apy is not None
    ]
    risk: dict[str, int] = {}
    if max_drawdown is not None:
        risk["max_drawdown_bps"] = max_drawdown
    if max_slippage is not None:
        risk["max_slippage_bps"] = max_slippage
    if max_il is not None:
        risk["max_impermanent_loss_bps"] = max_il
    return IntentDraftResponse(
        trace_id=request.trace_id,
        intent_type=intent_type,
        objective={} if target_apy is None else {"target_apy_min_bps": target_apy},
        risk=risk,
        exposure={} if target_delta_wad is None else {"target_delta_wad": target_delta_wad},
        automation={
            "rebalance": "rebalance" in normalized or "automatically" in normalized,
            "recovery": any(token in normalized for token in ("protect", "recover", "deleverage")),
            "emergency_unwind": "emergency" in normalized or "unwind" in normalized,
        },
        assets=assets,
        chains=chains,
        protocols=protocols,
        ambiguities=ambiguities,
        evidence=evidence,
        source_text=text,
        requires_approval=True,
    )


def recommend_threshold(request: ThresholdRequest) -> ThresholdResponse:
    bound = min(request.user_max_probability_bps, request.administrator_max_probability_bps)
    regime_adjustments = {
        "stable": 0,
        "trending": bound // 20,
        "recovery": bound // 20,
        "high_volatility": bound // 10,
        "liquidity_stress": bound // 8,
        "flash_crash": bound // 5,
    }
    regime_adjustment = regime_adjustments.get(request.market_regime or "stable", 0)
    market_adjustment = max(request.liquidity_stress_bps, request.protocol_risk_bps) // 4
    fallback_reason = None
    if request.observation_quality != "valid":
        intervention_level = min(bound, request.current_liquidation_probability_bps)
        fallback_reason = f"observation_quality_{request.observation_quality}"
    else:
        intervention_level = max(
            0, bound - request.hysteresis_bps - max(regime_adjustment, market_adjustment)
        )
    return ThresholdResponse(
        trace_id=request.trace_id,
        recommended_intervention_bps=intervention_level,
        intervention_required=request.current_liquidation_probability_bps >= intervention_level,
        rationale=[
            f"user_bound_bps={request.user_max_probability_bps}",
            f"administrator_bound_bps={request.administrator_max_probability_bps}",
            f"hysteresis_bps={request.hysteresis_bps}",
            f"market_regime={request.market_regime or 'stable'}",
            f"liquidity_stress_bps={request.liquidity_stress_bps}",
            f"protocol_risk_bps={request.protocol_risk_bps}",
            "the lower of user and administrator bounds remains authoritative",
        ],
        policy_id=request.policy_id,
        policy_version=request.policy_version,
        evaluation_time_ms=request.evaluation_time_ms or 0,
        adjustment_terms={"regime": regime_adjustment, "market": market_adjustment},
        selected_cap_bps=bound,
        fallback_reason=fallback_reason,
    )


def parse_scenario_draft(request: ScenarioDraftRequest) -> ScenarioDraftResponse:
    text = request.text.lower()
    crash = _labeled_percent(text, ("crash", "drop", "price shock"))
    depeg = _labeled_percent(text, ("depeg", "stablecoin"))
    liquidity = _labeled_percent(text, ("liquidity", "depth"))
    ambiguities = [
        Ambiguity(field=field, reason_code="missing")
        for field, value in (
            ("eth_price_shock_bps", crash),
            ("stablecoin_depeg_bps", depeg),
            ("dex_liquidity_shock_bps", liquidity),
        )
        if value is None
    ]
    scenario = StressScenario(
        eth_price_shock_bps=-int((crash or Decimal(0)) * 100),
        stablecoin_depeg_bps=int((depeg or Decimal(0)) * 100),
        dex_liquidity_shock_bps=int((liquidity or Decimal(0)) * 100),
        volatility_multiplier_bps=20_000 if "volatil" in text else 10_000,
        gas_multiplier_bps=20_000 if "gas" in text else 10_000,
        lending_utilization_shock_bps=500 if "utilization" in text else 0,
    )
    return ScenarioDraftResponse(
        trace_id=request.trace_id,
        scenario=scenario,
        source_text=request.text,
        ambiguities=ambiguities,
        requires_approval=True,
    )
