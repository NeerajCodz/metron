from __future__ import annotations

from decimal import Decimal

from metron_ai.models import CascadeRequest, CascadeResponse

_BPS = Decimal(10_000)


def simulate_cascade(request: CascadeRequest, generated_at: int) -> CascadeResponse:
    consumed = min(request.forced_selling_usd, request.market_depth_usd)
    utilization = consumed / request.market_depth_usd
    impact = min(
        Decimal(100_000),
        utilization * Decimal(request.price_impact_slope_bps),
    )
    impact_bps = int(impact.to_integral_value())
    newly_liquidatable: list[str] = []
    secondary_exposure = Decimal("0")
    for position in request.positions:
        shocked_collateral = position.collateral_usd * max(Decimal("0"), Decimal(1) - impact / _BPS)
        health = (
            Decimal("100")
            if position.debt_usd == 0
            else (
                shocked_collateral
                * Decimal(position.liquidation_threshold_bps)
                / _BPS
                / position.debt_usd
            )
        )
        if health < Decimal("1"):
            newly_liquidatable.append(position.position_id)
            secondary_exposure += position.debt_usd
    return CascadeResponse(
        trace_id=request.trace_id,
        generated_at=generated_at,
        forced_selling_volume_usd=request.forced_selling_usd,
        consumed_depth_usd=consumed,
        secondary_price_impact_bps=impact_bps,
        newly_liquidatable_positions=newly_liquidatable,
        affected_position_count=len(newly_liquidatable),
        secondary_exposure_usd=secondary_exposure.quantize(Decimal("0.000001")),
    )
