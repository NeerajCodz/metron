import type { ChainId, DecimalString, TraceId, VersionedPayload } from "./primitives.js";

export const MARKET_OBSERVATION_SCHEMA_VERSION = "market-observation-v1" as const;

export type ObservationQuality = "valid" | "stale" | "invalid";
export type ObservationSourceType = "indexer" | "adapter" | "oracle" | "provider" | "simulation";

export interface MarketObservation extends VersionedPayload {
  observationId: string;
  schemaVersion: typeof MARKET_OBSERVATION_SCHEMA_VERSION;
  chainId: ChainId;
  protocol: string;
  metric: string;
  value: DecimalString;
  unit: string;
  observedAtMs: number;
  blockNumber: number;
  source: ObservationSourceType;
  sourceReference: string;
  quality: ObservationQuality;
  traceId: TraceId;
  asset?: string;
  quoteAsset?: string;
  pair?: string;
}
