import { MARKET_OBSERVATION_SCHEMA_VERSION } from "@metron/types";
import { z } from "zod";

import {
  chainIdSchema,
  decimalStringSchema,
  nonEmptyIdSchema,
  unixMillisecondsSchema,
} from "./primitives.js";

export const observationQualitySchema = z.enum(["valid", "stale", "invalid"]);
export const observationSourceSchema = z.enum(["indexer", "adapter", "oracle", "provider", "simulation"]);

export const marketObservationSchema = z.strictObject({
  observationId: nonEmptyIdSchema,
  schemaVersion: z.literal(MARKET_OBSERVATION_SCHEMA_VERSION),
  chainId: chainIdSchema,
  protocol: nonEmptyIdSchema,
  metric: nonEmptyIdSchema,
  value: decimalStringSchema,
  unit: nonEmptyIdSchema,
  observedAtMs: unixMillisecondsSchema,
  blockNumber: z.number().int().nonnegative(),
  source: observationSourceSchema,
  sourceReference: nonEmptyIdSchema,
  quality: observationQualitySchema,
  traceId: nonEmptyIdSchema,
  asset: nonEmptyIdSchema.optional(),
  quoteAsset: nonEmptyIdSchema.optional(),
  pair: nonEmptyIdSchema.optional(),
});
