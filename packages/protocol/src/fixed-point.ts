export const WAD = 10n ** 18n;
export const BPS_SCALE = 10_000n;
export const UINT256_MAX = (1n << 256n) - 1n;

export function mulDivDown(x: bigint, y: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new RangeError("denominator must be non-zero");
  }
  return (x * y) / denominator;
}

export function mulDivUp(x: bigint, y: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new RangeError("denominator must be non-zero");
  }
  const product = x * y;
  if (product === 0n) {
    return 0n;
  }
  return (product - 1n) / denominator + 1n;
}

export function clamp(value: bigint, minimum: bigint, maximum: bigint): bigint {
  if (minimum > maximum) {
    throw new RangeError("minimum must not exceed maximum");
  }
  if (value < minimum) {
    return minimum;
  }
  if (value > maximum) {
    return maximum;
  }
  return value;
}

export function absolute(value: bigint): bigint {
  return value < 0n ? -value : value;
}
