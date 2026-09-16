import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface TooltipProviderProps {
  children: ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

export interface TooltipProps {
  content?: ReactNode | undefined;
  side?: "top" | "bottom" | "left" | "right" | undefined;
  children: ReactNode;
}

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const sideStyle =
    side === "top"
      ? { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
      : side === "bottom"
        ? { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
        : side === "left"
          ? { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" }
          : { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" };

  return (
    <div
      onBlur={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {children}
      {visible && content && (
        <div
          className="metron-tooltip-content"
          role="tooltip"
          style={{ position: "absolute", ...sideStyle }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

export const TooltipTrigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <div ref={ref} style={{ display: "inline-flex" }} {...props}>
      {children}
    </div>
  ),
);
TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-tooltip-content", className)} role="tooltip" {...props}>
      {children}
    </div>
  ),
);
TooltipContent.displayName = "TooltipContent";
