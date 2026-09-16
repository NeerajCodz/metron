from __future__ import annotations

from decimal import Decimal

from metron_ai.models import CascadeRequest, CascadeResponse, CascadeRound

_BPS = Decimal(10_000)


def simulate_cascade(request: CascadeRequest, generated_at: int) -> CascadeResponse:
    remaining_depth = request.market_depth_usd
    selling = request.forced_selling_usd
    total_consumed = Decimal("0")
    cumulative_impact = Decimal("0")
    newly_liquidatable: list[str] = []
    affected = set[str]()
    secondary_exposure = Decimal("0")
    round_records: list[CascadeRound] = []
    termination_reason = "no_selling" if selling <= 0 else "max_rounds"

    for round_index in range(request.max_rounds):
        if selling <= 0:
            termination_reason = "no_selling" if round_index == 0 else "fixed_point"
            break
        if remaining_depth <= 0:
            termination_reason = "depth_exhausted"
            break
        consumed = min(selling, remaining_depth)
        remaining_depth -= consumed
        total_consumed += consumed
        utilization = consumed / request.market_depth_usd
        incremental_impact = min(Decimal(100_000), utilization * Decimal(request.price_impact_slope_bps))
        cumulative_impact = min(Decimal(100_000), cumulative_impact + incremental_impact)
        round_exposure = Decimal("0")
        round_liquidations: list[str] = []
        for position in request.positions:
            if position.position_id in affected:
                continue
            shocked_collateral = position.collateral_usd * max(Decimal("0"), Decimal("1") - cumulative_impact / _BPS)
            health = Decimal("100") if position.debt_usd == 0 else shocked_collateral * Decimal(position.liquidation_threshold_bps) / _BPS / position.debt_usd
            if health < Decimal("1"):
                affected.add(position.position_id)
                newly_liquidatable.append(position.position_id)
                round_liquidations.append(position.position_id)
                round_exposure += position.debt_usd
        secondary_exposure += round_exposure
        generated_selling = round_exposure * Decimal(request.propagation_factor_bps) / _BPS
        unresolved = max(Decimal("0"), selling - consumed)
        round_records.append(
            CascadeRound(
                round_index=round_index,
                consumed_depth_usd=consumed,
                remaining_depth_usd=remaining_depth,
                incremental_impact_bps=int(incremental_impact.to_integral_value()),
                cumulative_impact_bps=int(cumulative_impact.to_integral_value()),
                generated_selling_usd=generated_selling,
                unresolved_selling_usd=unresolved,
                liquidated_position_ids=round_liquidations,
            )
        )
        selling = generated_selling + unresolved
        if round_exposure <= 0:
            termination_reason = "fixed_point"
            break
    else:
        termination_reason = "depth_exhausted" if remaining_depth <= 0 and selling > 0 else "max_rounds"

    return CascadeResponse(
        trace_id=request.trace_id,
        generated_at=generated_at,
        market_id=request.market_id,
        venue_id=request.venue_id,
        forced_selling_volume_usd=request.forced_selling_usd,
        consumed_depth_usd=total_consumed,
        remaining_depth_usd=remaining_depth,
        secondary_price_impact_bps=int(cumulative_impact.to_integral_value()),
        newly_liquidatable_positions=newly_liquidatable,
        affected_position_count=len(newly_liquidatable),
        secondary_exposure_usd=secondary_exposure.quantize(Decimal("0.000001")),
        rounds=len(round_records),
        round_records=round_records,
        unresolved_selling_usd=selling,
        termination_reason=termination_reason,
        converged=termination_reason == "fixed_point",
    )
