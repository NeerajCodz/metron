from __future__ import annotations

from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from metron_ai.models import RecoveryAction, RecoveryRequest, RecoveryResponse
from metron_ai.risk_model import _base_probability

_BPS = Decimal(10_000)
_WAD = Decimal(10**18)
_ACTION_TYPES = (
    "repay_debt",
    "sell_collateral",
    "swap_collateral",
    "adjust_hedge",
    "withdraw_liquidity",
    "recenter_liquidity",
    "reserve_repayment",
    "combined",
    "move_to_safe_state",
)


def _action_id(request: RecoveryRequest, action_type: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"metron:recovery:{request.trace_id}:{action_type}"))


def _health(collateral: Decimal, debt: Decimal, threshold_bps: int) -> Decimal:
    return Decimal("100") if debt == 0 else collateral * Decimal(threshold_bps) / _BPS / debt


def _usd(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.000001"))


def rank_recovery(request: RecoveryRequest, generated_at: int) -> RecoveryResponse:
    features = request.features
    policy = request.policy
    base_health = _health(
        features.collateral_usd,
        features.debt_usd,
        features.liquidation_threshold_bps,
    )
    candidates: list[RecoveryAction] = []
    rejected: list[dict[str, list[str] | str]] = []
    for action_type in _ACTION_TYPES:
        reasons: list[str] = []
        if action_type not in policy.allowed_action_types:
            reasons.append("USER_POLICY_DISALLOWS_ACTION")
        if action_type in {"adjust_hedge"} and not policy.allow_hedging:
            reasons.append("HEDGING_DISABLED")
        if (
            action_type in {"withdraw_liquidity", "recenter_liquidity"}
            and not policy.allow_liquidity_withdrawal
        ):
            reasons.append("LIQUIDITY_WITHDRAWAL_DISABLED")
        sale_bps = {
            "sell_collateral": min(policy.max_collateral_sale_bps, 2_000),
            "swap_collateral": min(policy.max_collateral_sale_bps, 1_000),
            "combined": min(policy.max_collateral_sale_bps, 1_500),
        }.get(action_type)
        if sale_bps is not None and sale_bps > policy.max_collateral_sale_bps:
            reasons.append("COLLATERAL_SALE_LIMIT_EXCEEDED")
        if reasons:
            rejected.append({"action_id": _action_id(request, action_type), "reasons": reasons})
            continue
        repay_bps = {
            "repay_debt": 2_000,
            "reserve_repayment": 1_500,
            "combined": 1_000,
        }.get(action_type, 0)
        debt_repaid = features.debt_usd * Decimal(repay_bps) / _BPS
        sold = features.collateral_usd * Decimal(sale_bps or 0) / _BPS
        resulting_debt = max(Decimal("0"), features.debt_usd - debt_repaid)
        resulting_collateral = max(Decimal("0"), features.collateral_usd - sold)
        if action_type == "move_to_safe_state":
            resulting_debt = Decimal("0")
        resulting_health = _health(
            resulting_collateral,
            resulting_debt,
            features.liquidation_threshold_bps,
        )
        resulting_delta = features.net_delta_wad
        if action_type in {"adjust_hedge", "combined", "move_to_safe_state"}:
            resulting_delta = int(Decimal(resulting_delta) * Decimal("0.35"))
        risk_features = features.model_copy(
            update={"health_factor_wad": int(resulting_health * _WAD)}
        )
        risk_request = type("RiskRequest", (), {"features": risk_features})()
        probability = int(
            (_base_probability(risk_request) * _BPS).to_integral_value()
        )
        expected_cost = _usd(
            features.collateral_usd * Decimal("0.0005")
            + resulting_debt * Decimal("0.0002")
        )
        expected_loss = _usd(sold * Decimal("0.01") + expected_cost)
        if action_type in {"swap_collateral", "combined"}:
            expected_loss = _usd(
                expected_loss + sold * Decimal(policy.max_slippage_bps) / (_BPS * 100)
            )
        candidates.append(
            RecoveryAction(
                action_id=_action_id(request, action_type),
                type=action_type,
                chain_id=request.chain_id,
                asset=request.asset,
                amount=str(int((debt_repaid + sold).to_integral_value())),
                collateral_sale_bps=sale_bps,
                max_slippage_bps=policy.max_slippage_bps,
                expected_cost_usd=expected_cost,
                expected_loss_usd=expected_loss,
                resulting_health_factor_wad=max(
                    0, int((resulting_health * _WAD).to_integral_value())
                ),
                resulting_delta_wad=resulting_delta,
                post_action_liquidation_probability_bps=max(0, min(10_000, probability)),
                protocol=request.protocol,
            )
        )
    candidates.sort(
        key=lambda candidate: (
            candidate.post_action_liquidation_probability_bps,
            abs(candidate.resulting_delta_wad),
            candidate.expected_loss_usd,
            candidate.action_id,
        )
    )
    if not candidates and base_health > Decimal("1.2"):
        return RecoveryResponse(
            trace_id=request.trace_id,
            position_id=request.position_id,
            generated_at=generated_at,
            candidates=[],
            rejected=rejected,
            fallback_used=True,
        )
    return RecoveryResponse(
        trace_id=request.trace_id,
        position_id=request.position_id,
        generated_at=generated_at,
        candidates=candidates,
        rejected=rejected,
        fallback_used=False,
    )
