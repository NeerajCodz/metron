import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/cn.js";

export type SpinnerSize = "sm" | "md" | "lg";
export type SpinnerTone = "sand" | "crimson" | "pearl";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize | undefined;
  tone?: SpinnerTone | undefined;
}

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size = "md", tone = "sand", className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-label="Loading"
        className={cn(
          "metron-spinner",
          `metron-spinner--${size}`,
          `metron-spinner--${tone}`,
          className,
        )}
        role="status"
        {...props}
      />
    );
  },
);

Spinner.displayName = "Spinner";
