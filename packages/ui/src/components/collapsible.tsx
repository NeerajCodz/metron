import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface CollapsibleContextValue {
  open: boolean;
  onToggle: () => void;
  disabled: boolean;
  contentId: string;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export interface CollapsibleProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(
  (
    {
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      disabled = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const contentId = `metron-collapsible-${useId().replaceAll(":", "")}`;

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const onToggle = () => {
      if (disabled) return;
      const next = !open;
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    };

    return (
      <CollapsibleContext.Provider value={{ open, onToggle, disabled, contentId }}>
        <div
          ref={ref}
          className={cn("metron-collapsible", className)}
          data-state={open ? "open" : "closed"}
          {...props}
        >
          {children}
        </div>
      </CollapsibleContext.Provider>
    );
  },
);
Collapsible.displayName = "Collapsible";

export interface CollapsibleTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = useContext(CollapsibleContext);
    if (!context) return null;

    return (
      <button
        ref={ref}
        aria-controls={context.contentId}
        aria-expanded={context.open}
        className={cn("metron-collapsible-trigger", className)}
        disabled={context.disabled}
        onClick={context.onToggle}
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export interface CollapsibleContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = useContext(CollapsibleContext);
    if (!context || !context.open) return null;

    return (
      <div
        ref={ref}
        className={cn("metron-collapsible-content", className)}
        id={context.contentId}
        {...props}
      >
        {children}
      </div>
    );
  },
);
CollapsibleContent.displayName = "CollapsibleContent";
