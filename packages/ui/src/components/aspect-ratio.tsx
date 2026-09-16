import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  ratio?: number | undefined;
  children?: ReactNode | undefined;
}

export const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 16 / 9, className, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("metron-aspect-ratio", className)}
        style={{
          paddingBottom: `${(1 / ratio) * 100}%`,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

AspectRatio.displayName = "AspectRatio";
