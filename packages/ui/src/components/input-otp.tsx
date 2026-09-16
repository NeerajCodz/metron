import {
  forwardRef,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn.js";

export interface InputOTPProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  maxLength?: number | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const InputOTP = forwardRef<HTMLDivElement, InputOTPProps>(
  (
    {
      maxLength = 6,
      value: controlledValue,
      defaultValue = "",
      onChange,
      disabled = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;
    const hiddenInputRef = useRef<HTMLInputElement | null>(null);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value.slice(0, maxLength);
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onChange?.(next);
    };

    return (
      <div
        ref={ref}
        className={cn("metron-input-otp", className)}
        onClick={() => hiddenInputRef.current?.focus()}
        {...props}
      >
        <input
          ref={hiddenInputRef}
          aria-label="One time password"
          autoComplete="one-time-code"
          disabled={disabled}
          maxLength={maxLength}
          onChange={handleInputChange}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          type="text"
          value={value}
        />
        {children ?? (
          <InputOTPGroup>
            {Array.from({ length: maxLength }).map((_, index) => (
              <InputOTPSlot
                key={index}
                char={value[index] ?? ""}
                isActive={value.length === index}
              />
            ))}
          </InputOTPGroup>
        )}
      </div>
    );
  },
);
InputOTP.displayName = "InputOTP";

export interface InputOTPGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const InputOTPGroup = forwardRef<HTMLDivElement, InputOTPGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-input-otp-group", className)} {...props}>
        {children}
      </div>
    );
  },
);
InputOTPGroup.displayName = "InputOTPGroup";

export interface InputOTPSlotProps extends HTMLAttributes<HTMLDivElement> {
  char?: string | undefined;
  isActive?: boolean | undefined;
}

export const InputOTPSlot = forwardRef<HTMLDivElement, InputOTPSlotProps>(
  ({ char = "", isActive = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("metron-input-otp-slot", className)}
        data-active={isActive || undefined}
        {...props}
      >
        {char}
      </div>
    );
  },
);
InputOTPSlot.displayName = "InputOTPSlot";

export interface InputOTPSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const InputOTPSeparator = forwardRef<HTMLDivElement, InputOTPSeparatorProps>(
  ({ className, children = "–", ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn("metron-input-otp-separator", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
InputOTPSeparator.displayName = "InputOTPSeparator";
