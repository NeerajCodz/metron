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
    if "liquidation" in question and "liquidation_probability_bps" in source:
        answer = (
            "The supplied liquidation probability is "
            f"{source['liquidation_probability_bps']} bps."
        )
    elif "health" in question and "health_factor_wad" in source:
        answer = f"The supplied health factor is {source['health_factor_wad']} wad."
    elif "delta" in question and "net_delta_wad" in source:
        answer = f"The supplied net delta is {source['net_delta_wad']} wad."
    else:
        values = ", ".join(f"{key}={value}" for key, value in sorted(source.items()))
        answer = f"The supplied position data is: {values}."
    provenance = [
        *(f"indexed_data.{key}" for key in request.indexed_data),
        *(f"simulation_outputs.{key}" for key in request.simulation_outputs),
    ]
    return PositionAnswerResponse(
        trace_id=request.trace_id, answer=answer, provenance=provenance
    )
