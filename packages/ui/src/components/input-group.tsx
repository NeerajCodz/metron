import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-input-group", className)} {...props}>
        {children}
      </div>
    );
  },
);
InputGroup.displayName = "InputGroup";

export interface InputGroupAddonProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-input-group-addon", className)} {...props}>
        {children}
      </div>
    );
  },
);
InputGroupAddon.displayName = "InputGroupAddon";

export const InputGroupText = InputGroupAddon;
