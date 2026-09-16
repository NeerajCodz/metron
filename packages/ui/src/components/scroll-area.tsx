import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-scroll-area", className)} {...props}>
        <div className="metron-scroll-area-viewport">{children}</div>
      </div>
    );
  },
);

ScrollArea.displayName = "ScrollArea";

export interface ScrollBarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | undefined;
}

export const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ orientation = "vertical", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "metron-scroll-bar",
          `metron-scroll-bar--${orientation}`,
          className,
        )}
        {...props}
      />
    );
  },
);

ScrollBar.displayName = "ScrollBar";
