import { forwardRef, type LabelHTMLAttributes } from "react";

import { cn } from "../lib/cn.js";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean | undefined;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required = false, className, children, ...props }, ref) => {
    return (
      <label ref={ref} className={cn("metron-label", className)} {...props}>
        {children}
        {required && (
          <span aria-hidden="true" className="metron-field__required">
            *
          </span>
        )}
      </label>
    );
  },
);

Label.displayName = "Label";
