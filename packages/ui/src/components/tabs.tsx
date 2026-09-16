import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((val: string) => void) | undefined;
  children?: ReactNode | undefined;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: controlledValue,
      defaultValue = "",
      onValueChange,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const handleVal = (next: string) => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    return (
      <TabsContext.Provider value={{ value, onValueChange: handleVal }}>
        <div ref={ref} className={cn("metron-tabs", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = "Tabs";

export const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("metron-tabs-list", className)} role="tablist" {...props} />
  ),
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children?: ReactNode | undefined;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, children, onClick, ...props }, ref) => {
    const context = useContext(TabsContext);
    const isActive = context?.value === value;

    return (
      <button
        ref={ref}
        aria-selected={isActive}
        className={cn("metron-tabs-trigger", className)}
        data-state={isActive ? "active" : "inactive"}
        onClick={(e) => {
          onClick?.(e);
          context?.onValueChange(value);
        }}
        role="tab"
        type="button"
        {...props}
      >
        {children}
      </button>
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children?: ReactNode | undefined;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (context?.value !== value) return null;

    return (
      <div
        ref={ref}
        className={cn("metron-tabs-content", className)}
        role="tabpanel"
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = "TabsContent";
