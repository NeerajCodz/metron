import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export type BubbleVariant = "assistant" | "user" | "liquid-glass";

export interface BubbleProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BubbleVariant | undefined;
  children?: ReactNode | undefined;
}

export const Bubble = forwardRef<HTMLDivElement, BubbleProps>(
  ({ variant = "assistant", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("metron-bubble", `metron-bubble--${variant}`, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Bubble.displayName = "Bubble";
