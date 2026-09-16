"use client";

import type {
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export type FeedbackVariant = "info" | "success" | "warning" | "error";

export interface InlineAlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: FeedbackVariant;
  title?: ReactNode;
  icon?: ReactNode;
}

export function InlineAlert({
  variant = "info",
  title,
  icon,
  children,
  className,
  role,
  ...props
}: InlineAlertProps) {
  const resolvedRole = role ?? (variant === "error" || variant === "warning" ? "alert" : "status");

  return (
    <div
      {...props}
      className={cn("metron-inline-alert", `metron-inline-alert--${variant}`, className)}
      role={resolvedRole}
      data-variant={variant}
    >
      {icon ? <span className="metron-inline-alert__icon">{icon}</span> : null}
      <div className="metron-inline-alert__content">
        {title ? <div className="metron-inline-alert__title">{title}</div> : null}
        <div className="metron-inline-alert__message">{children}</div>
      </div>
    </div>
  );
}

export interface ToastAction {
  label: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: ReactNode;
}

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: FeedbackVariant;
  title?: ReactNode;
  icon?: ReactNode;
  action?: ToastAction;
  onDismiss?: MouseEventHandler<HTMLButtonElement>;
  dismissLabel?: string;
  dismissIcon?: ReactNode;
}

export function Toast({
  variant = "info",
  title,
  icon,
  action,
  onDismiss,
  dismissLabel = "Dismiss notification",
  dismissIcon,
  children,
  className,
  role,
  ...props
}: ToastProps) {
  const actionLoading = action?.loading ?? false;
  const resolvedRole = role ?? (variant === "error" || variant === "warning" ? "alert" : "status");

  return (
    <div
      {...props}
      className={cn("metron-toast", `metron-toast--${variant}`, className)}
      role={resolvedRole}
      data-variant={variant}
    >
      {icon ? <span className="metron-toast__icon">{icon}</span> : null}
      <div className="metron-toast__content">
        {title ? <div className="metron-toast__title">{title}</div> : null}
        <div className="metron-toast__message">{children}</div>
        {action ? (
          <button
            className={cn(
              "metron-toast__action",
              actionLoading && "metron-toast__action--loading",
            )}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled || actionLoading}
            aria-label={action.ariaLabel}
            aria-busy={actionLoading || undefined}
          >
            {actionLoading ? (action.loadingLabel ?? "Working") : action.label}
          </button>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          className="metron-toast__dismiss"
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          {dismissIcon ?? <span aria-hidden="true">Close</span>}
        </button>
      ) : null}
    </div>
  );
}
