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

interface AccordionContextValue {
  value: string[];
  onItemToggle: (itemValue: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple" | undefined;
  value?: string | string[] | undefined;
  defaultValue?: string | string[] | undefined;
  onValueChange?: ((value: string | string[]) => void) | undefined;
  collapsible?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      type = "single",
      value: controlledValue,
      defaultValue,
      onValueChange,
      collapsible = true,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const toArray = (val: string | string[] | undefined): string[] => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    };

    const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(() =>
      toArray(defaultValue),
    );

    const isControlled = controlledValue !== undefined;
    const currentValues = isControlled ? toArray(controlledValue) : uncontrolledValue;

    const onItemToggle = (itemValue: string) => {
      let nextValues: string[];
      const isOpen = currentValues.includes(itemValue);

      if (type === "single") {
        if (isOpen) {
          nextValues = collapsible ? [] : currentValues;
        } else {
          nextValues = [itemValue];
        }
      } else {
        if (isOpen) {
          nextValues = currentValues.filter((v) => v !== itemValue);
        } else {
          nextValues = [...currentValues, itemValue];
        }
      }

      if (!isControlled) {
        setUncontrolledValue(nextValues);
      }

      if (onValueChange) {
        onValueChange(type === "single" ? (nextValues[0] ?? "") : nextValues);
      }
    };

    return (
      <AccordionContext.Provider value={{ value: currentValues, onItemToggle }}>
        <div ref={ref} className={cn("metron-accordion", className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  },
);
Accordion.displayName = "Accordion";

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
  triggerId: string;
  contentId: string;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, disabled = false, className, children, ...props }, ref) => {
    const accordion = useContext(AccordionContext);
    const triggerId = `metron-accordion-trigger-${useId().replaceAll(":", "")}`;
    const contentId = `metron-accordion-content-${useId().replaceAll(":", "")}`;
    const isOpen = Boolean(accordion?.value.includes(value));

    return (
      <AccordionItemContext.Provider value={{ value, isOpen, triggerId, contentId }}>
        <div
          ref={ref}
          className={cn("metron-accordion-item", className)}
          data-disabled={disabled || undefined}
          data-state={isOpen ? "open" : "closed"}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  },
);
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const accordion = useContext(AccordionContext);
    const item = useContext(AccordionItemContext);

    if (!item) return null;

    return (
      <button
        ref={ref}
        aria-controls={item.contentId}
        aria-expanded={item.isOpen}
        className={cn("metron-accordion-trigger", className)}
        id={item.triggerId}
        onClick={() => accordion?.onItemToggle(item.value)}
        type="button"
        {...props}
      >
        <span>{children}</span>
        <span aria-hidden="true" className="metron-accordion-chevron">
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
    );
  },
);
AccordionTrigger.displayName = "AccordionTrigger";

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const item = useContext(AccordionItemContext);

    if (!item || !item.isOpen) return null;

    return (
      <div
        ref={ref}
        aria-labelledby={item.triggerId}
        className={cn("metron-accordion-content", className)}
        id={item.contentId}
        role="region"
        {...props}
      >
        {children}
      </div>
    );
  },
);
AccordionContent.displayName = "AccordionContent";
