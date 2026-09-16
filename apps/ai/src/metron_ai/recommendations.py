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
    if match:
        return int(float(match.group(1)) * 100)
    return default


def _labeled_percent(text: str, labels: tuple[str, ...]) -> float:
    label = "|".join(re.escape(item) for item in labels)
    match = re.search(rf"(\d+(?:\.\d+)?)\s*%\s*(?:of\s+)?(?:{label})", text, re.IGNORECASE)
    return float(match.group(1)) if match else 0.0


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
    percentages = [float(value) for value in _PERCENT.findall(text)]
    target_apy = _labeled_bps(
        normalized, ("apy", "yield"), int(percentages[0] * 100) if percentages else 0
    )
    max_drawdown = _labeled_bps(normalized, ("drawdown",), 1_000)
    max_il = _labeled_bps(normalized, ("impermanent loss", "il"), None)
    max_slippage = _labeled_bps(normalized, ("slippage",), 100)
    protocols = list(
        dict.fromkeys(protocol for name, protocol in _PROTOCOL_NAMES.items() if name in normalized)
    )
    chains = [int(value) for value in _CHAIN.findall(text)]
    for name, chain_id in sorted(_CHAIN_NAMES.items(), key=lambda item: len(item[0]), reverse=True):
        if name in normalized and chain_id not in chains:
            chains.append(chain_id)
    chains = chains or [1]
    assets = list(dict.fromkeys(match.lower() for match in _ADDRESS.findall(text)))
    if "eth" in normalized and "ETH" not in assets:
        assets.append("ETH")
    if "usdc" in normalized and "USDC" not in assets:
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
            target_delta_wad = int(float(delta_match.group(1)) * 10**16)

    ambiguities: list[str] = []
    if len(percentages) > 1 and max_drawdown == 1_000 and max_il is None:
        ambiguities.append("unlabelled percentages require user confirmation")
    if not protocols:
        ambiguities.append("no protocol was specified")
    if not assets:
        ambiguities.append("no asset was specified")

    return IntentDraftResponse(
        trace_id=request.trace_id,
        intent_type=intent_type,
        objective={"target_apy_min_bps": target_apy},
        risk={
            "max_drawdown_bps": max_drawdown,
            "max_slippage_bps": max_slippage,
            **({"max_impermanent_loss_bps": max_il} if max_il is not None else {}),
        },
        exposure=({"target_delta_wad": target_delta_wad} if target_delta_wad is not None else {}),
        automation={
            "rebalance": "rebalance" in normalized or "automatically" in normalized,
            "recovery": any(token in normalized for token in ("protect", "recover", "deleverage")),
            "emergency_unwind": "emergency" in normalized or "unwind" in normalized,
        },
        assets=assets,
        chains=chains,
        protocols=protocols,
        ambiguities=ambiguities,
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
    )


def parse_scenario_draft(request: ScenarioDraftRequest) -> ScenarioDraftResponse:
    text = request.text.lower()
    crash = _labeled_percent(text, ("crash", "drop", "price shock"))
    depeg = _labeled_percent(text, ("depeg", "stablecoin"))
    liquidity = _labeled_percent(text, ("liquidity", "depth"))
    scenario = StressScenario(
        eth_price_shock_bps=-int(crash * 100),
        stablecoin_depeg_bps=int(depeg * 100),
        dex_liquidity_shock_bps=int(liquidity * 100),
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
