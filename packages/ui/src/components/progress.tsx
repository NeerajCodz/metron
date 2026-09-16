import { useId, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export type ProgressTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type ProgressSize = "sm" | "md" | "lg";

interface ProgressStyle extends CSSProperties {
  "--metron-progress-value": string;
}

export interface ProgressProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    | "children"
    | "role"
    | "aria-valuemin"
    | "aria-valuemax"
    | "aria-valuenow"
  > {
  label: ReactNode;
  value: number;
  max?: number;
  valueLabel?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  tone?: ProgressTone;
  size?: ProgressSize;
}

export function Progress({
  label,
  value,
  max = 100,
  valueLabel,
  helperText,
  error,
  tone = "neutral",
  size = "md",
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-valuetext": ariaValueText,
  ...props
}: ProgressProps) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const descriptionId = `${generatedId}-description`;
  const validMax = Number.isFinite(max) && max > 0 ? max : 100;
  const finiteValue = Number.isFinite(value) ? value : 0;
  const normalizedValue = Math.min(Math.max(finiteValue, 0), validMax);
  const percentage = (normalizedValue / validMax) * 100;
  const description = error ?? helperText;
  const describedBy = [
    ariaDescribedBy,
    description !== undefined ? descriptionId : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;
  const progressStyle = {
    ...style,
    "--metron-progress-value": `${percentage}%`,
  } satisfies ProgressStyle;

  return (
    <div
      className={cn("metron-progress", className)}
      data-size={size}
      data-tone={error !== undefined ? "danger" : tone}
      {...props}
    >
      <div className="metron-progress__header">
        <span className="metron-progress__label" id={labelId}>
          {label}
        </span>
        {valueLabel !== undefined && (
          <span className="metron-progress__value">{valueLabel}</span>
        )}
      </div>
      <div
        className="metron-progress__track"
        role="progressbar"
        aria-label={ariaLabel}
        aria-labelledby={
          ariaLabelledBy ?? (ariaLabel === undefined ? labelId : undefined)
        }
        aria-describedby={describedBy}
        aria-invalid={error !== undefined || undefined}
        aria-valuemin={0}
        aria-valuemax={validMax}
        aria-valuenow={normalizedValue}
        aria-valuetext={ariaValueText}
        style={progressStyle}
      >
        <span className="metron-progress__fill" />
      </div>
      {description !== undefined && (
        <div
          className={cn(
            "metron-progress__description",
            error !== undefined && "metron-progress__description--error",
          )}
          id={descriptionId}
        >
          {description}
        </div>
      )}
    </div>
  );
}
