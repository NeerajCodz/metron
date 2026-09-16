from __future__ import annotations

from decimal import Decimal

from metron_ai.models import ScenarioResult, SimulationRequest, SimulationResponse
from metron_ai.risk_model import _base_probability

_BPS = Decimal(10_000)
_WAD = Decimal(10**18)


def _scaled(value: Decimal, shock_bps: int) -> Decimal:
    return max(Decimal("0"), value * (Decimal(10_000 + shock_bps) / _BPS))


def run_simulation(request: SimulationRequest, generated_at: int) -> SimulationResponse:
    results: list[ScenarioResult] = []
    for index, scenario in enumerate(request.scenarios):
        collateral = _scaled(request.features.collateral_usd, scenario.eth_price_shock_bps)
        collateral = _scaled(collateral, -scenario.dex_liquidity_shock_bps // 4)
        debt = _scaled(request.features.debt_usd, -scenario.stablecoin_depeg_bps)
        threshold = max(
            0,
            min(
                10_000,
                request.features.liquidation_threshold_bps
                - scenario.lending_utilization_shock_bps // 2,
            ),
        )
        health = Decimal("100") if debt == 0 else collateral * Decimal(threshold) / _BPS / debt
        health_wad = int((health * _WAD).to_integral_value())
        delta_scale = Decimal(10_000 + scenario.eth_price_shock_bps) / _BPS
        net_delta = int((Decimal(request.features.net_delta_wad) * delta_scale).to_integral_value())
        shocked = request.features.model_copy(
            update={
                "collateral_usd": collateral,
                "debt_usd": debt,
                "liquidation_threshold_bps": threshold,
                "volatility_bps": min(
                    1_000_000,
                    request.features.volatility_bps
                    * max(1, scenario.volatility_multiplier_bps)
                    // 10_000,
                ),
                "stablecoin_deviation_bps": (
                    request.features.stablecoin_deviation_bps + scenario.stablecoin_depeg_bps
                ),
                "health_factor_wad": health_wad,
            },
        )
        probability = int(
            (_base_probability(type("Request", (), {"features": shocked})()) * _BPS)
            .to_integral_value()
        )
        loss = max(
            0,
            min(
                100_000,
                int(
                    (
                        max(Decimal("0"), Decimal("1") - health) * _BPS
                        + Decimal(max(0, scenario.gas_multiplier_bps - 10_000)) / 2
                    ).to_integral_value()
                ),
            ),
        )
        results.append(
            ScenarioResult(
                scenario_index=index,
                health_factor_wad=health_wad,
                net_delta_wad=net_delta,
                liquidation_probability_bps=max(0, min(10_000, probability)),
                estimated_loss_bps=loss,
                assumptions=[
                    f"eth_price_shock_bps={scenario.eth_price_shock_bps}",
                    f"stablecoin_depeg_bps={scenario.stablecoin_depeg_bps}",
                    f"dex_liquidity_shock_bps={scenario.dex_liquidity_shock_bps}",
                    f"gas_multiplier_bps={scenario.gas_multiplier_bps}",
                ],
            )
        )
    return SimulationResponse(
        trace_id=request.trace_id,
        position_id=request.position_id,
        generated_at=generated_at,
        scenarios=results,
    )
