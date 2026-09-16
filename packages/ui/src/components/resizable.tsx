import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface ResizablePanelGroupProps extends HTMLAttributes<HTMLDivElement> {
  direction?: "horizontal" | "vertical" | undefined;
  children?: ReactNode | undefined;
}

export const ResizablePanelGroup = forwardRef<HTMLDivElement, ResizablePanelGroupProps>(
  ({ direction = "horizontal", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "metron-resizable-group",
          `metron-resizable-group--${direction}`,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ResizablePanelGroup.displayName = "ResizablePanelGroup";

export interface ResizablePanelProps extends HTMLAttributes<HTMLDivElement> {
  defaultSize?: number | undefined;
  minSize?: number | undefined;
  maxSize?: number | undefined;
  children?: ReactNode | undefined;
}

export const ResizablePanel = forwardRef<HTMLDivElement, ResizablePanelProps>(
  ({ defaultSize, className, style, children, ...props }, ref) => {
    const customStyle: CSSProperties = {
      ...style,
      ...(defaultSize ? { flexGrow: defaultSize } : {}),
    };

    return (
      <div
        ref={ref}
        className={cn("metron-resizable-panel", className)}
        style={customStyle}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ResizablePanel.displayName = "ResizablePanel";

export interface ResizableHandleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  withHandle?: boolean | undefined;
}

export const ResizableHandle = forwardRef<HTMLButtonElement, ResizableHandleProps>(
  ({ withHandle = true, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label="Resize panel"
        className={cn(
          "metron-resizable-handle",
          withHandle && "metron-resizable-handle--with-handle",
          className,
        )}
        type="button"
        {...props}
      />
    );
  },
);
ResizableHandle.displayName = "ResizableHandle";
