import type { ComponentPropsWithoutRef, CSSProperties } from "react";

import { cn } from "../lib/cn.js";

export type SkeletonVariant = "text" | "card" | "control";
export type SkeletonAnimation = "pulse" | "wave" | "none";

export interface SkeletonProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children" | "aria-hidden" | "role"
  > {
  variant?: SkeletonVariant;
  animation?: SkeletonAnimation;
  lines?: number;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}

export function Skeleton({
  variant = "text",
  animation = "pulse",
  lines = 1,
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  const lineCount = Number.isFinite(lines)
    ? Math.max(1, Math.floor(lines))
    : 1;
  const skeletonStyle: CSSProperties = {
    ...style,
    ...(width !== undefined ? { width } : null),
    ...(height !== undefined ? { height } : null),
  };

  return (
    <div
      className={cn("metron-skeleton", `metron-skeleton--${variant}`, className)}
      data-animation={animation}
      style={skeletonStyle}
      {...props}
      aria-hidden="true"
      role="presentation"
    >
      {variant === "text" &&
        Array.from({ length: lineCount }, (_, index) => (
          <span
            className="metron-skeleton__line"
            data-last={index === lineCount - 1 || undefined}
            key={index}
          />
        ))}
    </div>
  );
}
