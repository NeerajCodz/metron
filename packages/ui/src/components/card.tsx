import type { MotionStyle } from "motion/react";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../lib/cn.js";
import { LiquidGlass } from "./liquid-glass.js";
export interface GlassCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children?: ReactNode;
  header?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  glassClassName?: string;
}

export type MetricChangeTone = "neutral" | "positive" | "negative";

export interface MetricCardProps
  extends Omit<
    GlassCardProps,
    "children" | "description" | "footer" | "header" | "title"
  > {
  label: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  changeTone?: MetricChangeTone;
  icon?: ReactNode;
}

export type CardVariant = "carbon" | "glass" | "liquid-glass" | "solid" | "outline";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant | undefined;
  glow?: boolean | undefined;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "carbon", glow = false, children, ...props }, ref) => {
    if (variant === "liquid-glass") {
      return (
        <LiquidGlass
          className={cn("metron-card--root metron-card--liquid-glass", className)}
          glowIntensity={glow ? "lg" : "md"}
          id={props.id}
          style={props.style as MotionStyle | undefined}
        >
          <div ref={ref} className="metron-card__surface">{children}</div>
        </LiquidGlass>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "metron-card--root",
          `metron-card--${variant}`,
          glow && "metron-card--glow",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-card-header", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("metron-card-title", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("metron-card-description", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-card-content", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-card-footer", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export const CardAction = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-card__action", className)} {...props} />
  ),
);
CardAction.displayName = "CardAction";

export function GlassCard({
  children,
  header,
  title,
  description,
  action,
  footer,
  glassClassName,
  className,
  ...articleProps
}: GlassCardProps) {
  const hasHeader =
    header !== undefined ||
    title !== undefined ||
    description !== undefined ||
    action !== undefined;

  return (
    <article {...articleProps} className={cn("metron-card", className)}>
      <LiquidGlass
        className={cn("metron-card__glass", glassClassName)}
        contentClassName="metron-card__surface"
        glowIntensity="sm"
      >
        {hasHeader ? (
          <header className="metron-card__header">
            <div className="metron-card__heading">
              {header !== undefined ? (
                <div className="metron-card__eyebrow">{header}</div>
              ) : null}
              {title !== undefined ? (
                <h3 className="metron-card__title">{title}</h3>
              ) : null}
              {description !== undefined ? (
                <div className="metron-card__description">{description}</div>
              ) : null}
            </div>
            {action !== undefined ? (
              <div className="metron-card__action">{action}</div>
            ) : null}
          </header>
        ) : null}

        {children !== undefined ? (
          <div className="metron-card__body">{children}</div>
        ) : null}

        {footer !== undefined ? (
          <footer className="metron-card__footer">{footer}</footer>
        ) : null}
      </LiquidGlass>
    </article>
  );
}

export function MetricCard({
  label,
  value,
  change,
  changeTone = "neutral",
  icon,
  className,
  ...cardProps
}: MetricCardProps) {
  const metricHeader = (
    <span className="metron-metric-card__label">
      {icon !== undefined && icon !== null ? (
        <span className="metron-metric-card__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </span>
  );

  return (
    <GlassCard
      {...cardProps}
      className={cn("metron-metric-card", className)}
      header={metricHeader}
    >
      <div className="metron-metric-card__value">{value}</div>
      {change !== undefined ? (
        <div
          className={cn(
            "metron-metric-card__change",
            `metron-metric-card__change--${changeTone}`,
          )}
        >
          {change}
        </div>
      ) : null}
    </GlassCard>
  );
}
