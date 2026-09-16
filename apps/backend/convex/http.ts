import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { auditEventSchema, marketObservationSchema } from "@metron/validation";
import { httpRouter } from "convex/server";
import { rejectSigningFields } from "./simulations.js";
function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requireInternalToken(request: Request): void {
  const expected = process.env.METRON_INTERNAL_TOKEN;
  const provided = request.headers.get("x-metron-internal-token");
  if (!expected || !provided || provided !== expected) throw new Error("unauthorized");
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("JSON object required");
  return body as Record<string, unknown>;
}

function stringField(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

function numberField(body: Record<string, unknown>, name: string): number {
  const value = body[name];
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    throw new Error(`${name} must be an integer`);
  return value;
}

function responseFromError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "request failed";
  if (message === "unauthorized") return unauthorized();
  return jsonResponse({ error: message }, 400);
}

const internalAction = (handler: Parameters<typeof httpAction>[0]) =>
  httpAction(async (ctx, request) => {
    try {
      requireInternalToken(request);
      return await handler(ctx, request);
    } catch (error) {
      return responseFromError(error);
    }
  });

const router = httpRouter();
router.route({
  path: "/internal/indexer/market-observation",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const parsed = marketObservationSchema.parse(await readJson(request));
    const observation = {
      observationId: parsed.observationId,
      schemaVersion: parsed.schemaVersion,
      chainId: parsed.chainId,
      protocol: parsed.protocol,
      metric: parsed.metric,
      value: parsed.value,
      unit: parsed.unit,
      observedAtMs: parsed.observedAtMs,
      blockNumber: parsed.blockNumber,
      source: parsed.source,
      sourceReference: parsed.sourceReference,
      quality: parsed.quality,
      traceId: parsed.traceId,
      ...(parsed.asset === undefined ? {} : { asset: parsed.asset }),
      ...(parsed.quoteAsset === undefined ? {} : { quoteAsset: parsed.quoteAsset }),
      ...(parsed.pair === undefined ? {} : { pair: parsed.pair }),
    };
    return jsonResponse(await ctx.runMutation(internal.marketObservations.ingest, observation));
  }),
});

router.route({
  path: "/internal/indexer/audit-event",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const event = auditEventSchema.parse(await readJson(request));
    return jsonResponse(
      await ctx.runMutation(internal.auditEvents.ingest, {
        eventId: event.eventId,
        schemaVersion: event.schemaVersion,
        eventType: event.eventType,
        status: event.status,
        timestampMs: event.timestampMs,
        traceId: event.traceId,
        ownerAddress: event.ownerAddress,
        ...(event.intentId === undefined ? {} : { intentId: event.intentId }),
        ...(event.positionId === undefined ? {} : { positionId: event.positionId }),
        ...(event.eventType === "execution" ? { executionKey: event.executionId } : {}),
        ...(event.eventType === "cross_chain" ? { messageId: event.messageId } : {}),
        detailsJson: JSON.stringify(event.details),
      }),
    );
  }),
});

router.route({
  path: "/internal/indexer/transaction",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.indexing.recordChainTransaction, {
        chainId: numberField(body, "chainId"),
        transactionHash: stringField(body, "transactionHash"),
        blockNumber: numberField(body, "blockNumber"),
        blockHash: stringField(body, "blockHash"),
        transactionIndex: numberField(body, "transactionIndex"),
        status: body.status as "confirmed" | "reverted" | "orphaned",
        ...(body.traceId === undefined ? {} : { traceId: stringField(body, "traceId") }),
      }),
    );
  }),
});

router.route({
  path: "/internal/indexer/cursor",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.indexing.advanceCursor, {
        chainId: numberField(body, "chainId"),
        stream: stringField(body, "stream"),
        blockNumber: numberField(body, "blockNumber"),
        blockHash: stringField(body, "blockHash"),
        confirmations: numberField(body, "confirmations"),
      }),
    );
  }),
});

router.route({
  path: "/internal/solver/commit",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.solvers.commitBid, {
        intentId: stringField(body, "intentId") as never,
        solverId: stringField(body, "solverId"),
        commitment: stringField(body, "commitment"),
        traceId: stringField(body, "traceId"),
      }),
    );
  }),
});

router.route({
  path: "/internal/solver/reveal",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.solvers.revealBid, {
        intentId: stringField(body, "intentId") as never,
        solverId: stringField(body, "solverId"),
        salt: stringField(body, "salt"),
        routeJson: stringField(body, "routeJson"),
      }),
    );
  }),
});

router.route({
  path: "/internal/solver/select",
  method: "POST",
  handler: internalAction(async (ctx, request) => {
    const body = await readJson(request);
    return jsonResponse(
      await ctx.runMutation(internal.solvers.selectWinner, {
        intentId: stringField(body, "intentId") as never,
      }),
    );
  }),
});
const simulationStartAction = internalAction(async (ctx, request) => {
  const body = await readJson(request);
  rejectSigningFields(body);
  const participants = body.participants;
  if (participants !== undefined && !Array.isArray(participants)) throw new Error("participants must be an array");
  return jsonResponse(
    await ctx.runMutation(internal.simulations.startInternal, {
      sessionId: stringField(body, "sessionId"),
      ownerSubject: stringField(body, "ownerSubject"),
      ...(body.ownerAddress === undefined ? {} : { ownerAddress: stringField(body, "ownerAddress") }),
      scenarioJson: stringField(body, "scenarioJson"),
      traceId: stringField(body, "traceId"),
      idempotencyKey: stringField(body, "idempotencyKey"),
      ...(body.maxParticipants === undefined ? {} : { maxParticipants: numberField(body, "maxParticipants") }),
      ...(body.maxTurns === undefined ? {} : { maxTurns: numberField(body, "maxTurns") }),
      ...(body.coordinatorProvider === undefined ? {} : { coordinatorProvider: stringField(body, "coordinatorProvider") }),
      ...(body.coordinatorModel === undefined ? {} : { coordinatorModel: stringField(body, "coordinatorModel") }),
      ...(body.observationIds === undefined ? {} : { observationIds: body.observationIds as never }),
      ...(participants === undefined ? {} : { participants: participants as never }),
    }),
  );
});

router.route({ path: "/internal/simulation/start", method: "POST", handler: simulationStartAction });

const simulationTurnAction = internalAction(async (ctx, request) => {
  const body = await readJson(request);
  rejectSigningFields(body);
  return jsonResponse(
    await ctx.runMutation(internal.simulations.submitTurnInternal, {
      ownerSubject: stringField(body, "ownerSubject"),
      sessionId: stringField(body, "sessionId"),
      eventId: stringField(body, "eventId"),
      idempotencyKey: stringField(body, "idempotencyKey"),
      turn: numberField(body, "turn"),
      participantId: stringField(body, "participantId"),
      ...(body.traceId === undefined ? {} : { traceId: stringField(body, "traceId") }),
      ...(body.eventType === undefined ? {} : { eventType: stringField(body, "eventType") }),
      ...(body.inputJson === undefined ? {} : { inputJson: stringField(body, "inputJson") }),
      ...(body.outputJson === undefined ? {} : { outputJson: stringField(body, "outputJson") }),
      ...(body.observationIds === undefined ? {} : { observationIds: body.observationIds as never }),
      ...(body.resultJson === undefined ? {} : { resultJson: stringField(body, "resultJson") }),
    }),
  );
});

router.route({ path: "/internal/simulation/turn", method: "POST", handler: simulationTurnAction });

const simulationProposalAction = internalAction(async (ctx, request) => {
  const body = await readJson(request);
  rejectSigningFields(body);
  return jsonResponse(
    await ctx.runMutation(internal.simulations.recordProposalInternal, {
      ownerSubject: stringField(body, "ownerSubject"),
      sessionId: stringField(body, "sessionId"),
      proposalId: stringField(body, "proposalId"),
      ...(body.solverId === undefined ? {} : { solverId: stringField(body, "solverId") }),
      ...(body.participantId === undefined ? {} : { participantId: stringField(body, "participantId") }),
      proposalType: stringField(body, "proposalType"),
      provider: stringField(body, "provider"),
      model: stringField(body, "model"),
      proposalJson: stringField(body, "proposalJson"),
      ...(body.rationaleJson === undefined ? {} : { rationaleJson: stringField(body, "rationaleJson") }),
      ...(body.status === undefined ? {} : { status: body.status as never }),
      ...(body.traceId === undefined ? {} : { traceId: stringField(body, "traceId") }),
      idempotencyKey: stringField(body, "idempotencyKey"),
      ...(body.observationIds === undefined ? {} : { observationIds: body.observationIds as never }),
    }),
  );
});

router.route({ path: "/internal/simulation/proposal", method: "POST", handler: simulationProposalAction });

const simulationStatusAction = internalAction(async (ctx, request) => {
  const body = request.method === "GET"
    ? Object.fromEntries(new URL(request.url).searchParams.entries()) as Record<string, unknown>
    : await readJson(request);
  rejectSigningFields(body);
  const limit = body.limit === undefined
    ? undefined
    : request.method === "GET"
      ? Number.parseInt(String(body.limit), 10)
      : numberField(body, "limit");
  if (limit !== undefined && !Number.isSafeInteger(limit)) throw new Error("limit must be an integer");
  return jsonResponse(
    await ctx.runQuery(internal.simulations.getStatusInternal, {
      sessionId: stringField(body, "sessionId"),
      ownerSubject: stringField(body, "ownerSubject"),
      ...(limit === undefined ? {} : { limit }),
    }),
  );
});

router.route({ path: "/internal/simulation/status", method: "POST", handler: simulationStatusAction });
router.route({ path: "/internal/simulation/status", method: "GET", handler: simulationStatusAction });


export default router;
