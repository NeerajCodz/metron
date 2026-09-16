import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export interface EmptyProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode | undefined;
  children?: ReactNode | undefined;
}

export const Empty = forwardRef<HTMLDivElement, EmptyProps>(
  ({ icon, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("metron-empty-state", className)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
      }}
      {...props}
    >
      {icon && (
        <div aria-hidden="true" style={{ marginBottom: "1rem", opacity: 0.7 }}>
          {icon}
        </div>
      )}
      {children}
    </div>
  ),
);
Empty.displayName = "Empty";

export const EmptyTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("metron-empty-state__title", className)}
      style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: 650, color: "var(--metron-pearl)" }}
      {...props}
    />
  ),
);
EmptyTitle.displayName = "EmptyTitle";

export const EmptyDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("metron-empty-state__description", className)}
    style={{ margin: "0 0 1.25rem", maxWidth: "42ch", fontSize: "0.875rem", color: "var(--metron-pearl-muted)" }}
    {...props}
  />
));
EmptyDescription.displayName = "EmptyDescription";

export const EmptyAction = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={className} {...props} />
  ),
);
EmptyAction.displayName = "EmptyAction";
