import type { Address } from "@metron/types";
import {
  calculateHealthFactorWad,
  calculateNetDeltaWad,
  isDeltaRebalanceEligible,
  type CollateralValue,
  type DeltaComponent,
} from "@metron/protocol";

export interface SimulationCollateral extends CollateralValue {
  asset: Address;
}

export interface PositionSimulationInput {
  collateral: readonly SimulationCollateral[];
  debtUsdWad: bigint;
  deltaComponents: readonly DeltaComponent[];
  targetDeltaWad: bigint;
  deltaToleranceWad: bigint;
  minimumHealthFactorWad: bigint;
  collateralShockBps?: bigint;
}

export interface PositionSimulationResult {
  projectedCollateralUsdWad: bigint;
  projectedDebtUsdWad: bigint;
  projectedHealthFactorWad: bigint;
  projectedDeltaWad: bigint;
  deltaOutsideTolerance: boolean;
  healthFactorSafe: boolean;
  safe: boolean;
  failureReasons: readonly ("collateral_shock" | "health_factor" | "delta_tolerance")[];
}

export function simulatePosition(input: PositionSimulationInput): PositionSimulationResult {
  const shockBps = input.collateralShockBps ?? 0n;
  if (shockBps < 0n || shockBps > 10_000n)
    throw new RangeError("collateral shock must be between 0 and 10000 bps");
  if (input.debtUsdWad < 0n) throw new RangeError("debt must be non-negative");
  if (input.minimumHealthFactorWad < 0n)
    throw new RangeError("minimum health factor must be non-negative");

  const projectedCollateral = input.collateral.map((item) => {
    const value = (item.valueUsdWad * (10_000n - shockBps)) / 10_000n;
    return { valueUsdWad: value, liquidationThresholdBps: item.liquidationThresholdBps };
  });
  const projectedCollateralUsdWad = projectedCollateral.reduce(
    (sum, item) => sum + item.valueUsdWad,
    0n,
  );
  const projectedHealthFactorWad = calculateHealthFactorWad(projectedCollateral, input.debtUsdWad);
  const projectedDeltaWad = calculateNetDeltaWad(input.deltaComponents);
  const deltaOutsideTolerance = isDeltaRebalanceEligible(
    projectedDeltaWad,
    input.targetDeltaWad,
    input.deltaToleranceWad,
  );
  const healthFactorSafe = projectedHealthFactorWad >= input.minimumHealthFactorWad;
  const failureReasons: PositionSimulationResult["failureReasons"] = [
    ...(!healthFactorSafe ? ["health_factor" as const] : []),
    ...(deltaOutsideTolerance ? ["delta_tolerance" as const] : []),
  ];

  return {
    projectedCollateralUsdWad,
    projectedDebtUsdWad: input.debtUsdWad,
    projectedHealthFactorWad,
    projectedDeltaWad,
    deltaOutsideTolerance,
    healthFactorSafe,
    safe: healthFactorSafe && !deltaOutsideTolerance,
    failureReasons,
  };
}
