from __future__ import annotations

from decimal import Decimal

from metron_ai.models import (
    Allocation,
    LiquidityEstimateRequest,
    LiquidityEstimateResponse,
    OptimizationRequest,
    OptimizationResponse,
)

_BPS = Decimal(10_000)


def estimate_liquidity(request: LiquidityEstimateRequest) -> LiquidityEstimateResponse:
    utilization = request.trade_size_usd / request.pool_depth_usd
    impact = min(Decimal(100_000), utilization * _BPS)
    expected_slippage = impact + Decimal(request.fee_bps) + Decimal(request.volatility_bps) / 20
    failure = min(Decimal(10_000), expected_slippage * Decimal("0.35") + utilization * Decimal(500))
    decay = min(Decimal(10_000), Decimal(request.volatility_bps) / 2 + utilization * Decimal(2_000))
    return LiquidityEstimateResponse(
        trace_id=request.trace_id,
        depth_usd=request.pool_depth_usd,
        price_impact_bps=int(impact.to_integral_value()),
        expected_slippage_bps=int(expected_slippage.to_integral_value()),
        gas_usd=request.gas_usd,
        failure_probability_bps=int(failure.to_integral_value()),
        opportunity_decay_bps=int(decay.to_integral_value()),
    )


def optimize_allocation(request: OptimizationRequest) -> OptimizationResponse:
    rejected: list[dict[str, str]] = []
    eligible = []
    for opportunity in request.opportunities:
        if opportunity.risk_bps > request.max_risk_bps:
            rejected.append(
                {"opportunity_id": opportunity.opportunity_id, "reason": "RISK_LIMIT_EXCEEDED"}
            )
        else:
            utility = opportunity.expected_yield_bps - opportunity.cost_bps - opportunity.risk_bps
            delta_distance = abs(opportunity.delta_wad - request.target_delta_wad)
            eligible.append((utility, -delta_distance, opportunity))
    eligible.sort(key=lambda item: (-item[0], -item[1], item[2].opportunity_id))
    remaining = request.capital_usd
    allocations: list[Allocation] = []
    total_delta = 0
    weighted_yield = Decimal("0")
    for _, _, opportunity in eligible:
        if remaining <= 0:
            break
        amount = min(remaining, opportunity.capacity_usd)
        if amount <= 0:
            continue
        allocations.append(Allocation(opportunity_id=opportunity.opportunity_id, amount_usd=amount))
        remaining -= amount
        total_delta += int(Decimal(opportunity.delta_wad) * amount / request.capital_usd)
        weighted_yield += (
            Decimal(opportunity.expected_yield_bps - opportunity.cost_bps)
            * amount
            / request.capital_usd
        )
    if abs(total_delta - request.target_delta_wad) > request.delta_tolerance_wad:
        rejected.append({"opportunity_id": "allocation", "reason": "DELTA_TOLERANCE_UNMET"})
    return OptimizationResponse(
        trace_id=request.trace_id,
        allocations=allocations,
        expected_net_yield_bps=int(weighted_yield.to_integral_value()),
        resulting_delta_wad=total_delta,
        rejected_opportunities=rejected,
    )
