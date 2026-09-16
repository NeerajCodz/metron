import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type PointerEvent,
} from "react";

import { cn } from "../lib/cn.js";

export interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: number[] | undefined;
  defaultValue?: number[] | undefined;
  onValueChange?: ((value: number[]) => void) | undefined;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  disabled?: boolean | undefined;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value: controlledValue,
      defaultValue = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      className,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState<number[]>(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;
    const currentValue = value[0] ?? min;

    const percentage = Math.max(0, Math.min(100, ((currentValue - min) / (max - min)) * 100));

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const clientX = event.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + ratio * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const next = [Math.max(min, Math.min(max, steppedValue))];

      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    };

    return (
      <div
        ref={ref}
        aria-disabled={disabled || undefined}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={currentValue}
        className={cn("metron-slider", className)}
        onPointerDown={handlePointerDown}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        {...props}
      >
        <div className="metron-slider-track">
          <div className="metron-slider-range" style={{ width: `${percentage}%` }} />
        </div>
        <div className="metron-slider-thumb" style={{ position: "absolute", left: `calc(${percentage}% - 0.625rem)` }} />
      </div>
    );
  },
);

Slider.displayName = "Slider";
