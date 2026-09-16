import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed?: boolean | undefined;
  defaultPressed?: boolean | undefined;
  onPressedChange?: ((pressed: boolean) => void) | undefined;
  children?: ReactNode | undefined;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      pressed: controlledPressed,
      defaultPressed = false,
      onPressedChange,
      disabled = false,
      className,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
    const isControlled = controlledPressed !== undefined;
    const isPressed = isControlled ? controlledPressed : uncontrolledPressed;

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (disabled) return;
      const next = !isPressed;
      if (!isControlled) {
        setUncontrolledPressed(next);
      }
      onPressedChange?.(next);
    };

    return (
      <button
        ref={ref}
        aria-pressed={isPressed}
        className={cn("metron-toggle", className)}
        data-state={isPressed ? "on" : "off"}
        disabled={disabled}
        onClick={handleClick}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);

Toggle.displayName = "Toggle";
