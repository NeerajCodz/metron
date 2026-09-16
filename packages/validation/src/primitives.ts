import { z } from "zod";

export const hexSchema = z.string().regex(/^0x[0-9a-fA-F]*$/, "Expected 0x-prefixed hex");
export const bytes32Schema = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Expected 32-byte hex value");
export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Expected 20-byte EVM address");
export const unsignedIntegerStringSchema = z
  .string()
  .regex(/^\d+$/, "Expected unsigned integer string");
export const signedIntegerStringSchema = z
  .string()
  .regex(/^-?\d+$/, "Expected signed integer string");
export const decimalStringSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d+)?$/, "Expected non-negative decimal string");
export const basisPointsSchema = z.number().int().min(0).max(10_000);
export const chainIdSchema = z.number().int().positive();
export const unixSecondsSchema = z.number().int().nonnegative();
export const nonEmptyIdSchema = z.string().trim().min(1).max(128);

export function hasUniqueValues<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}
