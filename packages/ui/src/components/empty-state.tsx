import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "../lib/cn.js";

export type EmptyStateHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface EmptyStateProps
  extends Omit<ComponentPropsWithoutRef<"section">, "children" | "title"> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  headingLevel?: EmptyStateHeadingLevel;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = 3,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: EmptyStateProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const Heading: `h${EmptyStateHeadingLevel}` = `h${headingLevel}`;

  return (
    <section
      className={cn("metron-empty-state", className)}
      aria-label={ariaLabel}
      aria-labelledby={
        ariaLabelledBy ?? (ariaLabel === undefined ? titleId : undefined)
      }
      aria-describedby={
        ariaDescribedBy ??
        (description !== undefined ? descriptionId : undefined)
      }
      {...props}
    >
      {icon !== undefined && (
        <div className="metron-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="metron-empty-state__copy">
        <Heading className="metron-empty-state__title" id={titleId}>
          {title}
        </Heading>
        {description !== undefined && (
          <div className="metron-empty-state__description" id={descriptionId}>
            {description}
          </div>
        )}
      </div>
      {action !== undefined && (
        <div className="metron-empty-state__action">{action}</div>
      )}
    </section>
  );
}
