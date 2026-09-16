from __future__ import annotations

from metron_ai.models import ExplanationRequest, ExplanationResponse


def explain(request: ExplanationRequest) -> ExplanationResponse:
    return ExplanationResponse(
        trace_id=request.trace_id,
        observed_data=list(request.observed_data),
        deterministic_calculations=list(request.deterministic_calculations),
        model_predictions=list(request.model_predictions),
        scenario_assumptions=list(request.scenario_assumptions),
    )
