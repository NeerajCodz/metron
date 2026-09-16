import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";
export interface QuestionnaireProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode | undefined;
  stepIndicator?: ReactNode | undefined;
  children?: ReactNode | undefined;
}

export const Questionnaire = forwardRef<HTMLDivElement, QuestionnaireProps>(
  ({ title, stepIndicator, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("metron-questionnaire", className)} {...props}>
        {(title || stepIndicator) && (
          <div className="metron-questionnaire-header">
            {stepIndicator && (
              <span className="metron-questionnaire-step-indicator">{stepIndicator}</span>
            )}
            {title && <h3 className="metron-questionnaire-title">{title}</h3>}
          </div>
        )}
        <div className="metron-questionnaire-options">{children}</div>
      </div>
    );
  },
);
Questionnaire.displayName = "Questionnaire";

export interface QuestionnaireOptionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean | undefined;
  children?: ReactNode | undefined;
}

export const QuestionnaireOption = forwardRef<HTMLButtonElement, QuestionnaireOptionProps>(
  ({ selected = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn("metron-questionnaire-option", className)}
        data-selected={selected || undefined}
        type="button"
        {...props}
      >
        <span>{children}</span>
        {selected && <span aria-hidden="true" style={{ color: "var(--metron-sand)" }}>✓</span>}
      </button>
    );
  },
);
QuestionnaireOption.displayName = "QuestionnaireOption";
