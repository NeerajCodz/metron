import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from "react";

import { cn } from "../../lib/cn.js";

export type LandingGlassDepth = "quiet" | "raised" | "strong";

export interface LandingGlassProps extends HTMLAttributes<HTMLDivElement> {
  depth?: LandingGlassDepth | undefined;
}

export const LandingGlass = forwardRef<HTMLDivElement, LandingGlassProps>(function LandingGlass(
  { className, depth = "raised", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("metron-landing-glass", `metron-landing-glass--${depth}`, className)}
      {...props}
    />
  );
});

export type LandingActionVariant = "primary" | "glass" | "text";

export interface LandingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LandingActionVariant | undefined;
}

export const LandingButton = forwardRef<HTMLButtonElement, LandingButtonProps>(function LandingButton(
  { className, type = "button", variant = "primary", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("metron-landing-action", `metron-landing-action--${variant}`, className)}
      {...props}
    />
  );
});

export interface LandingLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: LandingActionVariant | undefined;
}

export const LandingLink = forwardRef<HTMLAnchorElement, LandingLinkProps>(function LandingLink(
  { className, variant = "primary", ...props },
  ref,
) {
  return (
    <a
      ref={ref}
      className={cn("metron-landing-action", `metron-landing-action--${variant}`, className)}
      {...props}
    />
  );
});

export interface LandingSectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
  index?: string | undefined;
  title: string;
  description?: string | undefined;
}

export function LandingSectionHeading({
  className,
  index,
  title,
  description,
  ...props
}: LandingSectionHeadingProps) {
  return (
    <div className={cn("metron-landing-heading", className)} {...props}>
      {index ? <span className="metron-landing-heading__index">{index}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
