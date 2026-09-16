import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export type BackgroundPatternVariant = "grid" | "dots" | "cross" | "mesh" | "none";
export type BackgroundMask = "none" | "radial" | "top" | "fade";
export type BackgroundGlow = "none" | "center" | "crimson" | "sand" | "dual";

export interface BackgroundPatternProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BackgroundPatternVariant | undefined;
  size?: number | string | undefined;
  dotSize?: number | string | undefined;
  color?: string | undefined;
  opacity?: number | undefined;
  mask?: BackgroundMask | undefined;
  glow?: BackgroundGlow | undefined;
  className?: string | undefined;
}

export const BackgroundPattern = forwardRef<HTMLDivElement, BackgroundPatternProps>(
  (
    {
      variant = "grid",
      size = variant === "dots" ? 24 : 32,
      dotSize = "1.25px",
      color,
      opacity = 1,
      mask = "radial",
      glow = "none",
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const customStyle: CSSProperties = {
      ...style,
      ...(size ? { "--bg-size": typeof size === "number" ? `${size}px` : size } : {}),
      ...(dotSize
        ? { "--bg-dot-size": typeof dotSize === "number" ? `${dotSize}px` : dotSize }
        : {}),
      ...(color ? { "--bg-color": color } : {}),
      ...(opacity !== undefined ? { opacity } : {}),
    };

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn("metron-background__canvas", className)}
        {...props}
      >
        {glow !== "none" && (
          <div className={cn("metron-background__glow", `metron-background__glow--${glow}`)} />
        )}
        <div
          className={cn(
            "metron-background__pattern",
            `metron-background__pattern--${variant}`,
            mask !== "none" && `metron-background__mask--${mask}`,
          )}
          style={customStyle}
        />
      </div>
    );
  },
);

BackgroundPattern.displayName = "BackgroundPattern";

export interface BackgroundLayoutProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  patternVariant?: BackgroundPatternVariant | undefined;
  patternSize?: number | string | undefined;
  patternDotSize?: number | string | undefined;
  patternColor?: string | undefined;
  patternOpacity?: number | undefined;
  patternMask?: BackgroundMask | undefined;
  glow?: BackgroundGlow | undefined;
  canvasClassName?: string | undefined;
  contentClassName?: string | undefined;
}

export const BackgroundLayout = forwardRef<HTMLDivElement, BackgroundLayoutProps>(
  (
    {
      children,
      patternVariant = "dots",
      patternSize,
      patternDotSize,
      patternColor,
      patternOpacity = 1,
      patternMask = "radial",
      glow = "none",
      canvasClassName,
      contentClassName,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn("metron-background", className)} {...props}>
        <BackgroundPattern
          className={canvasClassName}
          color={patternColor}
          dotSize={patternDotSize}
          glow={glow}
          mask={patternMask}
          opacity={patternOpacity}
          size={patternSize}
          variant={patternVariant}
        />
        <div className={cn("metron-background__content", contentClassName)}>{children}</div>
      </div>
    );
  },
);

BackgroundLayout.displayName = "BackgroundLayout";
