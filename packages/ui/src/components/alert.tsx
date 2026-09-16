import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export type AlertVariant = "default" | "destructive" | "liquid-glass";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant | undefined;
  icon?: ReactNode | undefined;
  children?: ReactNode | undefined;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = "default", icon, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("metron-alert", `metron-alert--${variant}`, className)}
        role="alert"
        {...props}
      >
        {icon && (
          <div aria-hidden="true" style={{ flexShrink: 0, marginTop: "0.125rem" }}>
            {icon}
          </div>
        )}
        <div className="metron-alert-content">{children}</div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export const AlertTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("metron-alert-title", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("metron-alert-description", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";
