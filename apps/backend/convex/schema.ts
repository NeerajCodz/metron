import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const intentStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("authorized"),
  v.literal("auctioning"),
  v.literal("settled"),
  v.literal("cancelled"),
  v.literal("expired"),
);

const positionStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("restricted"),
  v.literal("emergency"),
  v.literal("unwinding"),
  v.literal("closed"),
  v.literal("failed"),
);

const executionStatus = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("confirmed"),
  v.literal("failed"),
  v.literal("expired"),
);

const crossChainState = v.union(
  v.literal("created"),
  v.literal("source_locked"),
  v.literal("message_sent"),
  v.literal("destination_received"),
  v.literal("destination_executed"),
  v.literal("ack_sent"),
  v.literal("confirmed"),
  v.literal("expired"),
  v.literal("failed"),
  v.literal("recovery_required"),
);

const severity = v.union(v.literal("info"), v.literal("warning"), v.literal("critical"));

export default defineSchema({
  users: defineTable({
    externalSubject: v.string(),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_external_subject", ["externalSubject"]),

  wallets: defineTable({
    userId: v.id("users"),
    address: v.string(),
    chainIds: v.array(v.number()),
    label: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_address", ["address"]),

  intents: defineTable({
    ownerAddress: v.string(),
    walletId: v.optional(v.id("wallets")),
    status: intentStatus,
    currentVersion: v.number(),
    commitment: v.string(),
    traceId: v.string(),
    expiresAt: v.number(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerAddress"])
    .index("by_status", ["status"])
    .index("by_trace", ["traceId"])
    .index("by_owner_and_status", ["ownerAddress", "status"]),

  intentVersions: defineTable({
    intentId: v.id("intents"),
    version: v.number(),
    schemaVersion: v.string(),
    canonicalJson: v.string(),
    commitment: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_intent_and_version", ["intentId", "version"]),

  strategies: defineTable({
    intentId: v.id("intents"),
    routeId: v.string(),
    solverId: v.string(),
    scoreVersion: v.string(),
    routeJson: v.string(),
    scoreJson: v.string(),
    selected: v.boolean(),
    validityDeadline: v.number(),
    createdAt: v.number(),
  })
    .index("by_intent", ["intentId"])
    .index("by_route", ["routeId"])
    .index("by_intent_and_selected", ["intentId", "selected"]),

  positions: defineTable({
    intentId: v.id("intents"),
    strategyId: v.id("strategies"),
    ownerAddress: v.string(),
    status: positionStatus,
    coordinationChainId: v.number(),
    netValueUsd: v.string(),
    netDeltaWad: v.string(),
    healthFactorWad: v.optional(v.string()),
    liquidationProbabilityBps: v.optional(v.number()),
    lastRiskSnapshotId: v.optional(v.id("riskSnapshots")),
    traceId: v.string(),
    latestBlockByChain: v.record(v.string(), v.number()),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerAddress"])
    .index("by_intent", ["intentId"])
    .index("by_status", ["status"])
    .index("by_trace", ["traceId"]),

  positionComponents: defineTable({
    positionId: v.id("positions"),
    componentKey: v.string(),
    componentType: v.union(
      v.literal("vault"),
      v.literal("lending"),
      v.literal("liquidity"),
      v.literal("hedge"),
      v.literal("cross_chain"),
      v.literal("insurance"),
    ),
    chainId: v.number(),
    protocol: v.string(),
    contractAddress: v.string(),
    assetAddresses: v.array(v.string()),
    valueUsd: v.string(),
    deltaWad: v.string(),
    healthFactorWad: v.optional(v.string()),
    metadataJson: v.string(),
    blockNumber: v.number(),
    updatedAt: v.number(),
  })
    .index("by_position", ["positionId"])
    .index("by_position_and_component", ["positionId", "componentKey"])
    .index("by_chain", ["chainId"]),

  solverRegistry: defineTable({
    solverId: v.string(),
    operatorAddress: v.string(),
    endpoint: v.optional(v.string()),
    enabled: v.boolean(),
    reputationBps: v.number(),
    registeredAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_solver", ["solverId"])
    .index("by_operator", ["operatorAddress"])
    .index("by_enabled", ["enabled"]),

  solverBidCommits: defineTable({
    intentId: v.id("intents"),
    solverId: v.string(),
    commitment: v.string(),
    traceId: v.string(),
    committedAt: v.number(),
  })
    .index("by_intent", ["intentId"])
    .index("by_intent_and_solver", ["intentId", "solverId"])
    .index("by_commitment", ["commitment"]),

  solverBidReveals: defineTable({
    intentId: v.id("intents"),
    solverId: v.string(),
    routeId: v.string(),
    salt: v.string(),
    routeJson: v.string(),
    scoreJson: v.optional(v.string()),
    valid: v.boolean(),
    rejectionReasons: v.array(v.string()),
    revealedAt: v.number(),
  })
    .index("by_intent", ["intentId"])
    .index("by_intent_and_solver", ["intentId", "solverId"])
    .index("by_route", ["routeId"]),

  executions: defineTable({
    intentId: v.id("intents"),
    positionId: v.optional(v.id("positions")),
    strategyId: v.optional(v.id("strategies")),
    executionKey: v.string(),
    actionType: v.string(),
    status: executionStatus,
    chainId: v.number(),
    transactionHash: v.optional(v.string()),
    failureCode: v.optional(v.string()),
    traceId: v.string(),
    submittedAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_execution_key", ["executionKey"])
    .index("by_intent", ["intentId"])
    .index("by_position", ["positionId"])
    .index("by_status", ["status"])
    .index("by_trace", ["traceId"]),

  chainTransactions: defineTable({
    chainId: v.number(),
    transactionHash: v.string(),
    blockNumber: v.number(),
    blockHash: v.string(),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    status: v.union(v.literal("confirmed"), v.literal("reverted"), v.literal("orphaned")),
    traceId: v.optional(v.string()),
    observedAtMs: v.number(),
  })
    .index("by_chain_and_hash", ["chainId", "transactionHash"])
    .index("by_chain_and_block", ["chainId", "blockNumber"]),

  crossChainMessages: defineTable({
    messageId: v.string(),
    messageVersion: v.number(),
    sourceChainId: v.number(),
    destinationChainId: v.number(),
    sourceContract: v.string(),
    destinationContract: v.string(),
    intentId: v.optional(v.id("intents")),
    positionId: v.optional(v.id("positions")),
    actionType: v.string(),
    payloadHash: v.string(),
    nonce: v.string(),
    expiry: v.number(),
    state: crossChainState,
    sourceTransactionHash: v.optional(v.string()),
    destinationTransactionHash: v.optional(v.string()),
    failureCode: v.optional(v.string()),
    traceId: v.string(),
    updatedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_state", ["state"])
    .index("by_position", ["positionId"])
    .index("by_expiry", ["expiry"])
    .index("by_trace", ["traceId"]),

  riskSnapshots: defineTable({
    positionId: v.id("positions"),
    regime: v.string(),
    healthFactorWad: v.optional(v.string()),
    netDeltaWad: v.string(),
    liquidationProbabilityBps: v.number(),
    stablecoinDeviationBps: v.number(),
    protocolRiskBps: v.number(),
    explanationJson: v.string(),
    traceId: v.string(),
    observedAtMs: v.number(),
  })
    .index("by_position", ["positionId"])
    .index("by_position_and_time", ["positionId", "observedAtMs"])
    .index("by_trace", ["traceId"]),
  aiPredictions: defineTable({
    positionId: v.optional(v.id("positions")),
    predictionType: v.string(),
    requestSchemaVersion: v.string(),
    responseSchemaVersion: v.string(),
    modelVersion: v.string(),
    featureSchemaVersion: v.string(),
    requestJson: v.string(),
    responseJson: v.string(),
    confidenceBps: v.optional(v.number()),
    fallbackUsed: v.boolean(),
    fallbackReason: v.optional(v.string()),
    predictionSource: v.optional(v.union(v.literal("model"), v.literal("deterministic"), v.literal("mixed"))),
    datasetFingerprint: v.optional(v.string()),
    featureFingerprint: v.optional(v.string()),
    artifactVersion: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    traceId: v.string(),
    generatedAt: v.number(),
  })
    .index("by_position", ["positionId"])
    .index("by_type", ["predictionType"])
    .index("by_trace", ["traceId"]),
  simulationSessions: defineTable({
    sessionId: v.string(),
    ownerSubject: v.string(),
    ownerAddress: v.optional(v.string()),
    scenarioJson: v.string(),
    status: v.union(
      v.literal("created"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    traceId: v.string(),
    idempotencyKey: v.string(),
    maxParticipants: v.number(),
    maxTurns: v.number(),
    participantCount: v.number(),
    turnCount: v.number(),
    coordinatorProvider: v.optional(v.string()),
    coordinatorModel: v.optional(v.string()),
    observationIds: v.array(v.string()),
    resultJson: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_owner", ["ownerSubject"])
    .index("by_owner_and_idempotency", ["ownerSubject", "idempotencyKey"])
    .index("by_trace", ["traceId"]),

  simulationParticipants: defineTable({
    participantId: v.string(),
    sessionId: v.string(),
    participantType: v.union(v.literal("deterministic_bot"), v.literal("ai_agent")),
    role: v.string(),
    displayName: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    toolsJson: v.optional(v.string()),
    configJson: v.optional(v.string()),
    traceId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participant", ["participantId"])
    .index("by_session", ["sessionId"])
    .index("by_session_and_participant", ["sessionId", "participantId"]),

  simulationEvents: defineTable({
    eventId: v.string(),
    sessionId: v.string(),
    turn: v.number(),
    eventType: v.string(),
    participantId: v.optional(v.string()),
    traceId: v.string(),
    idempotencyKey: v.string(),
    inputJson: v.optional(v.string()),
    outputJson: v.optional(v.string()),
    resultJson: v.optional(v.string()),
    observationIds: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_session_and_turn", ["sessionId", "turn"])
    .index("by_session_and_idempotency", ["sessionId", "idempotencyKey"])
    .index("by_trace", ["traceId"]),

  solverProposals: defineTable({
    proposalId: v.string(),
    sessionId: v.string(),
    solverId: v.optional(v.string()),
    participantId: v.optional(v.string()),
    proposalType: v.string(),
    provider: v.string(),
    model: v.string(),
    proposalJson: v.string(),
    rationaleJson: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    traceId: v.string(),
    idempotencyKey: v.string(),
    observationIds: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_proposal", ["proposalId"])
    .index("by_session", ["sessionId"])
    .index("by_session_and_idempotency", ["sessionId", "idempotencyKey"])
    .index("by_trace", ["traceId"]),


  alerts: defineTable({
    positionId: v.optional(v.id("positions")),
    alertType: v.string(),
    severity,
    state: v.union(v.literal("open"), v.literal("acknowledged"), v.literal("resolved")),
    message: v.string(),
    traceId: v.string(),
    openedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_position", ["positionId"])
    .index("by_state", ["state"])
    .index("by_severity", ["severity"]),

  notifications: defineTable({
    userId: v.optional(v.id("users")),
    ownerAddress: v.string(),
    notificationType: v.string(),
    severity,
    title: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
    traceId: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerAddress"])
    .index("by_owner_and_read", ["ownerAddress", "readAt"])
    .index("by_trace", ["traceId"]),

  marketObservations: defineTable({
    observationId: v.string(),
    schemaVersion: v.literal("market-observation-v1"),
    chainId: v.number(),
    protocol: v.string(),
    metric: v.string(),
    value: v.string(),
    unit: v.string(),
    observedAtMs: v.number(),
    blockNumber: v.number(),
    source: v.union(
      v.literal("indexer"),
      v.literal("adapter"),
      v.literal("oracle"),
      v.literal("provider"),
      v.literal("simulation"),
    ),
    sourceReference: v.string(),
    quality: v.union(v.literal("valid"), v.literal("stale"), v.literal("invalid")),
    traceId: v.string(),
    asset: v.optional(v.string()),
    quoteAsset: v.optional(v.string()),
    pair: v.optional(v.string()),
  })
    .index("by_observation", ["observationId"])
    .index("by_protocol_metric_time", ["chainId", "protocol", "metric", "observedAtMs"])
    .index("by_source_observation", ["source", "observationId"])
    .index("by_asset_time", ["asset", "observedAtMs"])
    .index("by_chain_block", ["chainId", "blockNumber"]),

  auditEvents: defineTable({
    eventId: v.string(),
    schemaVersion: v.literal("audit-event-v1"),
    eventType: v.string(),
    status: v.string(),
    timestampMs: v.number(),
    traceId: v.string(),
    ownerAddress: v.string(),
    intentId: v.optional(v.string()),
    positionId: v.optional(v.string()),
    executionKey: v.optional(v.string()),
    messageId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    participantId: v.optional(v.string()),
    detailsJson: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_owner_time", ["ownerAddress", "timestampMs"])
    .index("by_intent_time", ["intentId", "timestampMs"])
    .index("by_position_time", ["positionId", "timestampMs"])
    .index("by_trace_time", ["traceId", "timestampMs"]),
  indexerCursors: defineTable({
    chainId: v.number(),
    stream: v.string(),
    blockNumber: v.number(),
    blockHash: v.string(),
    confirmations: v.number(),
    updatedAt: v.number(),
  }).index("by_chain_and_stream", ["chainId", "stream"]),
});
