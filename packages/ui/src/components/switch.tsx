"use client";

import {
  useId,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

function hasContent(value: ReactNode): boolean {
  return value !== undefined && value !== null && value !== false;
}

function joinIds(...ids: Array<string | undefined>): string | undefined {
  const value = ids.filter((id): id is string => Boolean(id)).join(" ");
  return value || undefined;
}

export type SwitchProps = Omit<
  ComponentPropsWithRef<"input">,
  "children" | "type"
> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  loading?: boolean;
  loadingLabel?: ReactNode;
  containerClassName?: string;
};

/** A native checkbox with switch presentation and full form participation. */
export function Switch({
  label,
  description,
  error,
  loading = false,
  loadingLabel = "Updating",
  containerClassName,
  className,
  id,
  disabled = false,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-busy": ariaBusy,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const controlId = id ?? `metron-switch-${generatedId.replaceAll(":", "")}`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const showDescription = hasContent(description);
  const showError = hasContent(error);
  const describedBy = joinIds(
    ariaDescribedBy,
    showDescription ? descriptionId : undefined,
    showError ? errorId : undefined,
  );
  const isDisabled = disabled || loading;

  return (
    <div
      className={cn(
        "metron-switch",
        isDisabled && "metron-switch--disabled",
        loading && "metron-switch--loading",
        showError && "metron-switch--invalid",
        containerClassName,
      )}
      data-invalid={showError || undefined}
    >
      <label className="metron-switch__label" htmlFor={controlId}>
        <span className="metron-switch__control">
          <input
            {...props}
            id={controlId}
            className={cn("metron-switch__input", className)}
            type="checkbox"
            role="switch"
            disabled={isDisabled}
            aria-describedby={describedBy}
            aria-invalid={ariaInvalid ?? (showError || undefined)}
            aria-busy={loading ? true : ariaBusy}
          />
          <span className="metron-switch__track" aria-hidden="true">
            <span className="metron-switch__thumb" />
          </span>
        </span>
        <span className="metron-switch__copy">
          <span className="metron-switch__text">{label}</span>
          {showDescription ? (
            <span className="metron-switch__description" id={descriptionId}>
              {description}
            </span>
          ) : null}
          {loading ? (
            <span className="metron-switch__status" role="status">
              {loadingLabel}
            </span>
          ) : null}
        </span>
      </label>
      {showError ? (
        <div className="metron-switch__error" id={errorId} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
