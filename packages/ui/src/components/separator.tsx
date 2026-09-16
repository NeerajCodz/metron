import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/cn.js";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical" | undefined;
  decorative?: boolean | undefined;
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = "horizontal", decorative = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-orientation={decorative ? undefined : orientation}
        className={cn("metron-separator", `metron-separator--${orientation}`, className)}
        role={decorative ? "none" : "separator"}
        {...props}
      />
    );
  },
);

Separator.displayName = "Separator";
