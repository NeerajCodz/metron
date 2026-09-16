import type {
  BasisPoints,
  ModelMetadata,
  PercentageBps,
  PositionId,
  PredictionId,
  TraceContext,
  UnixMilliseconds,
  VersionedPayload,
} from "./primitives.js";

export const RISK_SCHEMA_VERSION = "1.0.0" as const;

export type Horizon = "1h" | "6h" | "24h" | "7d";
export const RISK_HORIZONS: readonly Horizon[] = ["1h", "6h", "24h", "7d"];

export type MarketRegime =
  | "stable"
  | "trending"
  | "high_volatility"
  | "liquidity_stress"
  | "flash_crash"
  | "recovery";

export type EvidenceKind = "observation" | "calculation" | "prediction" | "scenario";
export interface AiEvidence {
  evidenceId: string;
  kind: EvidenceKind;
  sourceReference: string;
  observedAtMs?: UnixMilliseconds;
  traceId: string;
  content: Record<string, string | number | boolean | null>;
}

export type ExplanationAnswerKind = "value" | "trend" | "driver" | "comparison" | "scenario_impact";
export type ExplanationRefusalCode =
  | "unsupported_answer_kind"
  | "missing_evidence"
  | "stale_evidence"
  | "conflicting_evidence"
  | "untrusted_source";

export interface TypedExplanation {
  answerKind: ExplanationAnswerKind;
  answer: string;
  evidence: AiEvidence[];
  missingEvidenceIds: string[];
  refusalCode?: ExplanationRefusalCode;
}

export interface LiquidationPrediction extends VersionedPayload, ModelMetadata, TraceContext {
  schemaVersion: typeof RISK_SCHEMA_VERSION;
  predictionId: PredictionId;
  horizons: Partial<Record<Horizon, PercentageBps>>;
  confidenceBps: BasisPoints;
  fallbackUsed: boolean;
}

export interface RegimePrediction extends VersionedPayload, ModelMetadata, TraceContext {
  schemaVersion: typeof RISK_SCHEMA_VERSION;
  probabilitiesBps: Record<MarketRegime, PercentageBps>;
  selectedRegime: MarketRegime;
  fallbackUsed: boolean;
}

export interface StressScenario extends VersionedPayload {
  schemaVersion: typeof RISK_SCHEMA_VERSION;
  ethPriceShockBps: number;
  stablecoinDepegBps: number;
  dexLiquidityShockBps: number;
  volatilityMultiplierBps: number;
  gasMultiplierBps: number;
  lendingUtilizationShockBps: number;
}

export interface RiskExplanation {
  observedData: AiEvidence[];
  deterministicCalculations: AiEvidence[];
  modelPredictions: AiEvidence[];
  scenarioAssumptions: AiEvidence[];
}

export interface RiskSnapshot {
  snapshotId: string;
  positionId: PositionId;
  regime: MarketRegime;
  healthFactorWad?: string;
  netDeltaWad: string;
  liquidationProbabilityBps: PercentageBps;
  stablecoinDeviationBps: number;
  protocolRiskBps: PercentageBps;
  explanation: RiskExplanation;
  observedAtMs: UnixMilliseconds;
}
