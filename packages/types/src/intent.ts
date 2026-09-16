import type {
  Address,
  BasisPoints,
  Bytes32,
  ChainId,
  IntentId,
  PercentageBps,
  UnixSeconds,
  VersionedPayload,
} from "./primitives.js";

export const INTENT_SCHEMA_VERSION = "1.0.0" as const;

export type IntentStatus =
  "draft" | "published" | "authorized" | "auctioning" | "settled" | "cancelled" | "expired";

export interface IntentObjective {
  targetApyMinBps?: BasisPoints;
  targetApyMaxBps?: BasisPoints;
}

export interface IntentRiskLimits {
  maxDrawdownBps: PercentageBps;
  maxImpermanentLossBps?: PercentageBps;
  maxLiquidationProbabilityBps?: PercentageBps;
  minHealthFactorWad?: string;
  maxSlippageBps: BasisPoints;
  maxCapitalMoveBps: PercentageBps;
  maxCollateralSaleBps: PercentageBps;
  maxRepaymentAmount?: string;
  maxGasFeeUsd?: string;
}

export interface IntentExposure {
  targetDeltaWad: string;
  deltaToleranceWad: string;
}

export interface IntentAutomationPolicy {
  rebalance: boolean;
  recovery: boolean;
  emergencyUnwind: boolean;
}

export interface IntentPrivacyPolicy {
  privateParameters: boolean;
  zkOwnershipRequired: boolean;
  zkCollateralRequired: boolean;
}

export interface IntentInput extends VersionedPayload {
  owner: Address;
  nonce: string;
  expiresAt: UnixSeconds;
  objective: IntentObjective;
  risk: IntentRiskLimits;
  exposure: IntentExposure;
  chains: ChainId[];
  protocols: string[];
  assets: Address[];
  automation: IntentAutomationPolicy;
  privacy: IntentPrivacyPolicy;
}

export interface CanonicalIntent extends IntentInput {
  schemaVersion: typeof INTENT_SCHEMA_VERSION;
  chains: ChainId[];
  protocols: string[];
  assets: Address[];
}

export interface IntentRecord {
  intentId: IntentId;
  owner: Address;
  status: IntentStatus;
  version: number;
  commitment: Bytes32;
  canonicalIntent?: CanonicalIntent;
  createdAt: UnixSeconds;
  updatedAt: UnixSeconds;
}
