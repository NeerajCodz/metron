import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/cn.js";

export type BadgeVariant =
  | "neutral"
  | "accent"
  | "sand"
  | "crimson"
  | "success"
  | "warning"
  | "danger"
  | "liquid-glass"
  | "solid"
  | "outline";

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children: ReactNode;
  variant?: BadgeVariant | undefined;
  leadingIcon?: ReactNode | undefined;
}

export function Badge({
  children,
  variant = "neutral",
  leadingIcon,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cn("metron-badge", `metron-badge--${variant}`, className)}
    >
      {leadingIcon !== undefined && leadingIcon !== null ? (
        <span className="metron-badge__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span className="metron-badge__label">{children}</span>
    </span>
  );
}
