"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ComponentPropsWithRef,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: true;
}

type FieldChildProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
  required?: boolean;
};

export interface FieldProps {
  label: ReactNode;
  children: ReactNode | ((props: FieldControlProps) => ReactNode);
  description?: ReactNode;
  error?: ReactNode;
  id?: string;
  className?: string;
  labelClassName?: string;
  controlClassName?: string;
  labelHidden?: boolean;
  required?: boolean;
}

function hasContent(value: ReactNode): boolean {
  return value !== undefined && value !== null && value !== false;
}

function joinIds(...ids: Array<string | undefined>): string | undefined {
  const value = ids.filter((id): id is string => Boolean(id)).join(" ");
  return value || undefined;
}

/**
 * Provides visible field messaging and explicitly passes its ARIA wiring to the
 * control. A render function is available when the control is not a direct
 * child, avoiding context or module-level field state.
 */
export function Field({
  label,
  children,
  description,
  error,
  id,
  className,
  labelClassName,
  controlClassName,
  labelHidden = false,
  required = false,
}: FieldProps) {
  const generatedId = useId();
  const directChild = isValidElement(children)
    ? (children as ReactElement<FieldChildProps>)
    : undefined;
  const controlId = id ?? directChild?.props.id ?? `metron-field-${generatedId.replaceAll(":", "")}`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const showDescription = hasContent(description);
  const showError = hasContent(error);
  const describedBy = joinIds(
    showDescription ? descriptionId : undefined,
    showError ? errorId : undefined,
  );
  const fieldControlProps: FieldControlProps = {
    id: controlId,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(showError ? { "aria-invalid": true as const } : {}),
    ...(required ? { required: true as const } : {}),
  };

  let control: ReactNode;
  if (typeof children === "function") {
    control = children(fieldControlProps);
  } else if (directChild) {
    const childDescribedBy = joinIds(
      directChild.props["aria-describedby"],
      fieldControlProps["aria-describedby"],
    );
    const childInvalid = showError
      ? true
      : directChild.props["aria-invalid"];
    control = cloneElement(directChild, {
      id: fieldControlProps.id,
      ...(childDescribedBy ? { "aria-describedby": childDescribedBy } : {}),
      ...(childInvalid !== undefined ? { "aria-invalid": childInvalid } : {}),
      ...(required || directChild.props.required ? { required: true } : {}),
    });
  } else {
    control = children;
  }

  return (
    <div
      className={cn("metron-field", showError && "metron-field--invalid", className)}
      data-invalid={showError || undefined}
    >
      <label
        className={cn(
          "metron-field__label",
          labelHidden && "metron-sr-only",
          labelClassName,
        )}
        htmlFor={controlId}
      >
        {label}
        {required ? (
          <span className="metron-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div className={cn("metron-field__control", controlClassName)}>{control}</div>
      {showDescription ? (
        <div className="metron-field__description" id={descriptionId}>
          {description}
        </div>
      ) : null}
      {showError ? (
        <div className="metron-field__error" id={errorId} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export type InputProps = ComponentPropsWithRef<"input"> & {
  field?: FieldControlProps;
};

export function Input({
  field,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  required,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      id={id ?? field?.id}
      className={cn("metron-input", className)}
      aria-describedby={joinIds(field?.["aria-describedby"], ariaDescribedBy)}
      aria-invalid={ariaInvalid ?? field?.["aria-invalid"]}
      required={required ?? field?.required}
    />
  );
}

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
  field?: FieldControlProps;
};

export function Textarea({
  field,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  required,
  ...props
}: TextareaProps) {
  return (
    <textarea
      {...props}
      id={id ?? field?.id}
      className={cn("metron-textarea", className)}
      aria-describedby={joinIds(field?.["aria-describedby"], ariaDescribedBy)}
      aria-invalid={ariaInvalid ?? field?.["aria-invalid"]}
      required={required ?? field?.required}
    />
  );
}

export type SelectProps = ComponentPropsWithRef<"select"> & {
  field?: FieldControlProps;
};

export function Select({
  field,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  required,
  children,
  ...props
}: SelectProps) {
  return (
    <select
      {...props}
      id={id ?? field?.id}
      className={cn("metron-select", className)}
      aria-describedby={joinIds(field?.["aria-describedby"], ariaDescribedBy)}
      aria-invalid={ariaInvalid ?? field?.["aria-invalid"]}
      required={required ?? field?.required}
    >
      {children}
    </select>
  );
}
