import type {
  BasisPoints,
  ModelMetadata,
  PercentageBps,
  PositionId,
  PredictionId,
  TraceContext,
  UnixSeconds,
  VersionedPayload,
} from "./primitives.js";

export const RISK_SCHEMA_VERSION = "1.0.0" as const;

export type MarketRegime =
  "stable" | "trending" | "high_volatility" | "liquidity_stress" | "flash_crash" | "recovery";

export interface LiquidationPrediction extends VersionedPayload, ModelMetadata, TraceContext {
  schemaVersion: typeof RISK_SCHEMA_VERSION;
  predictionId: PredictionId;
  positionId: PositionId;
  horizons: Record<string, PercentageBps>;
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
  observedData: string[];
  deterministicCalculations: string[];
  modelPredictions: string[];
  scenarioAssumptions: string[];
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
  observedAt: UnixSeconds;
}
