from __future__ import annotations

from decimal import Decimal

from metron_ai.models import CascadeRequest, CascadeResponse

_BPS = Decimal(10_000)


def simulate_cascade(request: CascadeRequest, generated_at: int) -> CascadeResponse:
    remaining_depth = request.market_depth_usd
    selling = request.forced_selling_usd
    total_consumed = Decimal("0")
    cumulative_impact = Decimal("0")
    newly_liquidatable: list[str] = []
    affected = set[str]()
    secondary_exposure = Decimal("0")
    rounds = 0
    converged = False

    for _ in range(request.max_rounds):
        if selling <= 0 or remaining_depth <= 0:
            converged = True
            break
        consumed = min(selling, remaining_depth)
        remaining_depth -= consumed
        total_consumed += consumed
        utilization = consumed / request.market_depth_usd
        cumulative_impact = min(
            Decimal(100_000),
            cumulative_impact + utilization * Decimal(request.price_impact_slope_bps),
        )
        rounds += 1

        round_exposure = Decimal("0")
        for position in request.positions:
            if position.position_id in affected:
                continue
            shocked_collateral = position.collateral_usd * max(
                Decimal("0"), Decimal("1") - cumulative_impact / _BPS
            )
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
                affected.add(position.position_id)
                newly_liquidatable.append(position.position_id)
                round_exposure += position.debt_usd

        secondary_exposure += round_exposure
        selling = round_exposure * Decimal(request.propagation_factor_bps) / _BPS
        if round_exposure <= 0:
            converged = True
            break
    else:
        converged = selling <= 0 or remaining_depth <= 0

    return CascadeResponse(
        trace_id=request.trace_id,
        generated_at=generated_at,
        forced_selling_volume_usd=request.forced_selling_usd,
        consumed_depth_usd=total_consumed,
        secondary_price_impact_bps=int(cumulative_impact.to_integral_value()),
        newly_liquidatable_positions=newly_liquidatable,
        affected_position_count=len(newly_liquidatable),
        secondary_exposure_usd=secondary_exposure.quantize(Decimal("0.000001")),
        rounds=rounds,
        converged=converged,
    )
