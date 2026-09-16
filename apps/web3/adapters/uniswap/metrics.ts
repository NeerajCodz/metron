export type LpMetricsInput = {
  positionValueUsd: number;
  feesUsd: number;
  gasUsd: number;
  poolDepthUsd: number;
  entryPrice: number;
  currentPrice: number;
  lowerTick: number;
  upperTick: number;
  currentTick: number;
  elapsedSeconds: number;
};

export type LpMetrics = {
  feeAprBps: number;
  netApyBps: number;
  impermanentLossBps: number;
  impermanentLossUsd: number;
  realizedPnlUsd: number;
  rangeUtilizationBps: number;
  capitalEfficiencyBps: number;
};

const YEAR_SECONDS = 365 * 24 * 60 * 60;
const BPS = 10_000;

function nonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be non-negative`);
  return value;
}

export function computeLpMetrics(input: LpMetricsInput): LpMetrics {
  const positionValueUsd = nonNegative(input.positionValueUsd, "positionValueUsd");
  const feesUsd = nonNegative(input.feesUsd, "feesUsd");
  const gasUsd = nonNegative(input.gasUsd, "gasUsd");
  const poolDepthUsd = nonNegative(input.poolDepthUsd, "poolDepthUsd");
  const elapsedSeconds = nonNegative(input.elapsedSeconds, "elapsedSeconds");
  if (positionValueUsd === 0) throw new Error("positionValueUsd must be positive");
  if (input.entryPrice <= 0 || input.currentPrice <= 0) {
    throw new Error("prices must be positive");
  }
  if (poolDepthUsd === 0) throw new Error("poolDepthUsd must be positive");
  if (input.upperTick <= input.lowerTick) throw new Error("LP ticks must be ordered");
  if (elapsedSeconds === 0) throw new Error("elapsedSeconds must be positive");

  const priceRatio = input.currentPrice / input.entryPrice;
  const impermanentLossRatio = Math.abs((2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1);
  const impermanentLossBps = Math.round(impermanentLossRatio * BPS);
  const impermanentLossUsd = positionValueUsd * impermanentLossRatio;
  const annualization = YEAR_SECONDS / elapsedSeconds;
  const feeAprBps = Math.round((feesUsd / positionValueUsd) * annualization * BPS);
  const netApyBps = Math.round(
    ((feesUsd - gasUsd - impermanentLossUsd) / positionValueUsd) * annualization * BPS,
  );
  const rangeUtilizationBps = Math.round(
    Math.max(
      0,
      Math.min(1, (input.currentTick - input.lowerTick) / (input.upperTick - input.lowerTick)),
    ) * BPS,
  );
  const capitalEfficiencyBps = Math.round((positionValueUsd / poolDepthUsd) * BPS);

  return {
    feeAprBps,
    netApyBps,
    impermanentLossBps,
    impermanentLossUsd,
    realizedPnlUsd: feesUsd - gasUsd - impermanentLossUsd,
    rangeUtilizationBps,
    capitalEfficiencyBps,
  };
}
