import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn.js";

export type StatTone = "neutral" | "accent" | "positive" | "negative";

export interface StatProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  trend?: ReactNode;
  tone?: StatTone;
}

export function Stat({
  label,
  value,
  detail,
  icon,
  trend,
  tone = "neutral",
  className,
  ...props
}: StatProps) {
  return (
    <div
      className={cn("metron-stat", className)}
      data-tone={tone}
      {...props}
    >
      {icon !== undefined && (
        <span className="metron-stat__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <dl className="metron-stat__data">
        <div className="metron-stat__pair">
          <dt className="metron-stat__label">{label}</dt>
          <dd className="metron-stat__value">{value}</dd>
        </div>
      </dl>
      {(detail !== undefined || trend !== undefined) && (
        <div className="metron-stat__footer">
          {detail !== undefined && (
            <span className="metron-stat__detail">{detail}</span>
          )}
          {trend !== undefined && (
            <span className="metron-stat__trend">{trend}</span>
          )}
        </div>
      )}
    </div>
  );
}

export type DataListLayout = "stacked" | "inline" | "responsive";

export interface DataListProps extends ComponentPropsWithoutRef<"dl"> {
  layout?: DataListLayout;
  divided?: boolean;
}

export function DataList({
  layout = "responsive",
  divided = true,
  className,
  children,
  ...props
}: DataListProps) {
  return (
    <dl
      className={cn("metron-data-list", className)}
      data-layout={layout}
      data-divided={divided || undefined}
      {...props}
    >
      {children}
    </dl>
  );
}

export interface DataListItemProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}

export function DataListItem({
  label,
  value,
  description,
  icon,
  className,
  ...props
}: DataListItemProps) {
  return (
    <div className={cn("metron-data-list__item", className)} {...props}>
      <dt className="metron-data-list__term">
        {icon !== undefined && (
          <span className="metron-data-list__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </dt>
      <dd className="metron-data-list__definition">
        <span className="metron-data-list__value">{value}</span>
        {description !== undefined && (
          <span className="metron-data-list__description">{description}</span>
        )}
      </dd>
    </div>
  );
}

export type TimelineStatus = "complete" | "current" | "upcoming" | "error";
export type TimelineOrientation = "vertical" | "horizontal";

export interface TimelineItem {
  id?: string | number;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  status: TimelineStatus;
  statusLabel?: string;
}

export interface TimelineProps
  extends Omit<ComponentPropsWithoutRef<"ol">, "children"> {
  items: readonly TimelineItem[];
  orientation?: TimelineOrientation;
}

const timelineStatusLabels: Record<TimelineStatus, string> = {
  complete: "Completed",
  current: "Current",
  upcoming: "Upcoming",
  error: "Error",
};

export function Timeline({
  items,
  orientation = "vertical",
  className,
  ...props
}: TimelineProps) {
  return (
    <ol
      className={cn("metron-timeline", className)}
      data-orientation={orientation}
      {...props}
    >
      {items.map((item, index) => (
        <li
          className="metron-timeline__item"
          data-status={item.status}
          aria-current={item.status === "current" ? "step" : undefined}
          key={item.id ?? index}
        >
          <div className="metron-timeline__rail" aria-hidden="true">
            <span className="metron-timeline__marker">{item.icon}</span>
          </div>
          <div className="metron-timeline__content">
            <div className="metron-timeline__heading">
              <span className="metron-timeline__title">{item.title}</span>
              {item.meta !== undefined && (
                <span className="metron-timeline__meta">{item.meta}</span>
              )}
            </div>
            <span className="metron-sr-only">
              {item.statusLabel ?? timelineStatusLabels[item.status]}
            </span>
            {item.description !== undefined && (
              <div className="metron-timeline__description">
                {item.description}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
