from __future__ import annotations

from metron_ai.models import (
    ExplanationRequest,
    ExplanationResponse,
    PositionAnswerRequest,
    PositionAnswerResponse,
)


def explain(request: ExplanationRequest) -> ExplanationResponse:
    return ExplanationResponse(
        trace_id=request.trace_id,
        observed_data=list(request.observed_data),
        deterministic_calculations=list(request.deterministic_calculations),
        model_predictions=list(request.model_predictions),
        scenario_assumptions=list(request.scenario_assumptions),
    )


def answer_position(request: PositionAnswerRequest) -> PositionAnswerResponse:
    question = request.question.lower()
    source = {**request.indexed_data, **request.simulation_outputs}
    provenance = [
        *(f"indexed_data.{key}" for key in request.indexed_data),
        *(f"simulation_outputs.{key}" for key in request.simulation_outputs),
    ]
    requested_fields = (
        ("liquidation", "liquidation_probability_bps"),
        ("health", "health_factor_wad"),
        ("delta", "net_delta_wad"),
        ("yield", "yield_bps"),
        ("slippage", "slippage_bps"),
        ("impermanent loss", "impermanent_loss_bps"),
        ("gas", "gas_usd"),
        ("regime", "regime"),
    )
    for keyword, field in requested_fields:
        if keyword in question:
            if field not in source:
                return PositionAnswerResponse(
                    trace_id=request.trace_id,
                    answer=f"I cannot answer without {field}.",
                    provenance=provenance,
                    refusal_reason=f"MISSING_REQUIRED_FIELD:{field}",
                )
            return PositionAnswerResponse(
                trace_id=request.trace_id,
                answer=f"The supplied {field} is {source[field]}.",
                provenance=provenance,
            )

    values = ", ".join(f"{key}={value}" for key, value in sorted(source.items()))
    return PositionAnswerResponse(
        trace_id=request.trace_id,
        answer=f"The supplied position data is: {values}.",
        provenance=provenance,
    )
