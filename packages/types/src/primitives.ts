export type Hex = `0x${string}`;
export type Address = Hex;
export type TransactionHash = Hex;
export type Bytes32 = Hex;

export type ChainId = number;
export type UnixSeconds = number;
export type UnixMilliseconds = number;
export type BasisPoints = number;
export type PercentageBps = number;
export type DecimalString = string;
export type TokenAmount = string;
export type UsdAmount = string;

export type TraceId = string;
export type IntentId = string;
export type PositionId = string;
export type PositionComponentId = string;
export type StrategyId = string;
export type SolverId = string;
export type RouteId = string;
export type ExecutionId = string;
export type PredictionId = string;

export interface VersionedPayload {
  schemaVersion: string;
}

export interface TraceContext {
  traceId: TraceId;
  intentId?: IntentId;
  positionId?: PositionId;
  chainId?: ChainId;
}

export interface ModelMetadata {
  modelVersion: string;
  featureSchemaVersion: string;
  generatedAt: UnixSeconds;
  datasetFingerprint?: string;
  featureFingerprint?: string;
  artifactVersion?: string;
  fallbackReason?: string;
  predictionSource?: "model" | "deterministic" | "mixed";
  sourceByHorizon?: Record<string, "model" | "deterministic">;
}
