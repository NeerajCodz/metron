import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/cn.js";

export type MarkerTone = "sand" | "crimson" | "success" | "pearl";

export interface MarkerProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: MarkerTone | undefined;
  pulse?: boolean | undefined;
}

export const Marker = forwardRef<HTMLSpanElement, MarkerProps>(
  ({ tone = "sand", pulse = false, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn(
          "metron-marker",
          `metron-marker--${tone}`,
          pulse && "metron-marker--pulse",
          className,
        )}
        {...props}
      />
    );
  },
);
Marker.displayName = "Marker";

export const PulseMarker = forwardRef<HTMLSpanElement, Omit<MarkerProps, "pulse">>(
  (props, ref) => <Marker ref={ref} pulse={true} {...props} />,
);
PulseMarker.displayName = "PulseMarker";
