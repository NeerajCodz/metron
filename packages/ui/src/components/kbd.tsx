import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode | undefined;
}

export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <kbd ref={ref} className={cn("metron-kbd", className)} {...props}>
        {children}
      </kbd>
    );
  },
);
Kbd.displayName = "Kbd";

export interface KbdGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const KbdGroup = forwardRef<HTMLDivElement, KbdGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("metron-kbd-group", className)}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
      {...props}
    >
      {children}
    </div>
  ),
);
KbdGroup.displayName = "KbdGroup";
