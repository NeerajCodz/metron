from __future__ import annotations

from metron_ai.models import (
    ExplanationEvidence,
    ExplanationRequest,
    ExplanationResponse,
    PositionAnswerRequest,
    PositionAnswerResponse,
)


def explain(request: ExplanationRequest) -> ExplanationResponse:
    required_kinds = {
        "value": {"observation"},
        "trend": {"observation", "calculation"},
        "driver": {"observation", "calculation"},
        "comparison": {"observation", "calculation"},
        "scenario_impact": {"observation", "scenario"},
    }
    evidence = list(request.evidence)
    if not evidence:
        evidence = [
            ExplanationEvidence(
                evidence_id=f"{kind}-{index}",
                kind=kind,
                source_reference=f"{kind}.{index}",
                trace_id=request.trace_id,
                content={"text": value},
            )
            for kind, values in (
                ("observation", request.observed_data),
                ("calculation", request.deterministic_calculations),
                ("prediction", request.model_predictions),
                ("scenario", request.scenario_assumptions),
            )
            for index, value in enumerate(values)
        ]
    available = {item.kind for item in evidence if item.quality == "valid"}
    missing = sorted(required_kinds[request.answer_kind] - available)
    refusal = "missing_evidence" if missing else None
    missing_ids = [f"required:{kind}" for kind in missing]
    answer = (
        "I cannot answer without the required grounded evidence."
        if refusal
        else "; ".join(
            f"{item.source_reference}: {item.content.get('text', item.content)}"
            for item in evidence
            if item.quality == "valid"
        )
    )
    return ExplanationResponse(
        trace_id=request.trace_id,
        answer_kind=request.answer_kind,
        answer=answer,
        observed_data=list(request.observed_data),
        deterministic_calculations=list(request.deterministic_calculations),
        model_predictions=list(request.model_predictions),
        scenario_assumptions=list(request.scenario_assumptions),
        evidence=evidence,
        missing_evidence_ids=missing_ids,
        refusal_code=refusal,
    )


def answer_position(request: PositionAnswerRequest) -> PositionAnswerResponse:
    question = request.question.lower()
    conflicting = set(request.indexed_data).intersection(request.simulation_outputs)
    if any(request.indexed_data[key] != request.simulation_outputs[key] for key in conflicting):
        return PositionAnswerResponse(
            trace_id=request.trace_id,
            answer="I cannot answer because indexed and simulated evidence conflicts.",
            provenance=[
                *(f"indexed_data.{key}" for key in request.indexed_data),
                *(f"simulation_outputs.{key}" for key in request.simulation_outputs),
            ],
            refusal_reason="CONFLICTING_EVIDENCE",
        )
    source = {**request.simulation_outputs, **request.indexed_data}
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
