import type { CSSProperties, HTMLAttributes } from "react";

type CustomProperties = CSSProperties & Record<`--${string}`, string | number>;

export type SparklineDatum = number | { label?: string; value: number };

export interface SparklineChartProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Values are rendered from left to right, with the latest value on the right. */
  data: readonly SparklineDatum[];
  color?: string;
  height?: number;
  width?: number | string;
  label?: string;
  valueFormatter?: (value: number, index: number) => string;
}

interface NormalizedSparklineDatum {
  label?: string;
  value: number;
}

function normalizeSparklineData(data: readonly SparklineDatum[]): NormalizedSparklineDatum[] {
  return data.map((datum) => {
    if (typeof datum === "number") {
      return { value: Number.isFinite(datum) ? datum : 0 };
    }

    return {
      label: datum.label,
      value: Number.isFinite(datum.value) ? datum.value : 0,
    };
  });
}

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function defaultValue(value: number): string {
  return numberFormatter.format(value);
}

function chartWidth(width: number | string | undefined): number | string {
  if (typeof width === "number" && Number.isFinite(width) && width > 0) return width;
  if (typeof width === "string" && width.trim().length > 0) return width;
  return "100%";
}

/**
 * A compact, dependency-free trend chart. It intentionally uses semantic list
 * items rather than SVG so it remains crisp at any size and works in constrained
 * dashboard layouts.
 */
export function SparklineChart({
  data,
  color = "var(--web-crimson, #c21f3b)",
  height = 56,
  width,
  label,
  valueFormatter = defaultValue,
  className,
  style,
  ...props
}: SparklineChartProps) {
  let minimum = 0;
  let maximum = 1;
  if (points.length > 0) {
    minimum = points[0]?.value ?? 0;
    maximum = minimum;
    for (const point of points) {
      minimum = Math.min(minimum, point.value);
      maximum = Math.max(maximum, point.value);
    }
  }
  const range = maximum - minimum || 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 56;
  const lastValue = points.at(-1)?.value;
  const firstValue = points[0]?.value;
  const change =
    firstValue !== undefined && lastValue !== undefined ? lastValue - firstValue : undefined;
  const fallbackLabel = label
    ? `${label}${lastValue === undefined ? ": no data" : `: ${valueFormatter(lastValue, points.length - 1)}`}`
    : lastValue === undefined
      ? "No trend data"
      : `Trend ending at ${valueFormatter(lastValue, points.length - 1)}`;
  const accessibleLabel = props["aria-label"] ?? fallbackLabel;

  const rootStyle: CSSProperties = {
    display: "grid",
    gap: "0.55rem",
    width: chartWidth(width),
    minWidth: 0,
    margin: 0,
    ...style,
  };

  const listStyle: CustomProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))`,
    alignItems: "end",
    gap: points.length > 18 ? "2px" : "3px",
    width: "100%",
    height: safeHeight,
    minHeight: 24,
    margin: 0,
    padding: "0 1px",
    borderBottom: "1px solid var(--web-border, rgb(242 241 237 / 13%))",
    listStyle: "none",
    "--spark-color": color,
  };

  return (
    <figure className={className} style={rootStyle} aria-label={accessibleLabel} {...props}>
      <ol aria-hidden="true" style={listStyle}>
        {points.length === 0 ? (
          <li
            style={{
              gridColumn: "1 / -1",
              alignSelf: "center",
              height: 2,
              backgroundColor: "var(--web-border-strong, rgb(242 241 237 / 24%))",
            }}
          />
        ) : (
          points.map((point, index) => {
            const ratio = (point.value - minimum) / range;
            const normalizedRatio = Math.min(1, Math.max(0, ratio));
            const barHeight = `${Math.max(4, normalizedRatio * 100)}%`;
            const itemLabel = point.label
              ? `${point.label}: ${valueFormatter(point.value, index)}`
              : valueFormatter(point.value, index);
            const barStyle: CustomProperties = {
              position: "relative",
              display: "block",
              width: "min(0.7rem, 72%)",
              height: "var(--spark-height)",
              minHeight: 2,
              borderRadius: "999px 999px 2px 2px",
              backgroundColor: "var(--spark-color)",
              opacity: index === points.length - 1 ? 1 : 0.72,
              "--spark-height": barHeight,
              "--spark-color": color,
            };

            return (
              <li
                key={`${point.label ?? "point"}-${index}`}
                title={itemLabel}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  minWidth: 0,
                  height: "100%",
                }}
              >
                <span style={barStyle} />
              </li>
            );
          })
        )}
      </ol>
      <span
        aria-hidden="true"
        style={{
          overflow: "hidden",
          width: 1,
          height: 1,
          padding: 0,
          border: 0,
          margin: -1,
          position: "absolute",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {change === undefined
          ? "No trend values available."
          : `${label ? `${label}. ` : ""}From ${valueFormatter(firstValue ?? 0, 0)} to ${valueFormatter(lastValue ?? 0, points.length - 1)} (${change >= 0 ? "up" : "down"} ${valueFormatter(Math.abs(change), points.length - 1)}).`}
      </span>
    </figure>
  );
}

export interface AllocationDatum {
  label: string;
  value: number;
  color?: string;
  description?: string;
}

export interface AllocationChartProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Allocation slices. `items`, `segments`, and `allocations` are accepted as aliases for data integrations. */
  data?: readonly AllocationDatum[];
  items?: readonly AllocationDatum[];
  segments?: readonly AllocationDatum[];
  allocations?: readonly AllocationDatum[];
  total?: number;
  height?: number;
  label?: string;
  showLegend?: boolean;
  valueFormatter?: (value: number, percentage: number) => string;
}

const allocationPalette = [
  "var(--web-crimson, #c21f3b)",
  "var(--web-success, #52d69a)",
  "#d8a860",
  "#8e9bb1",
  "#b86e9c",
];

function allocationValue(value: number, percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

/** A responsive stacked allocation bar with a text legend and no chart dependency. */
export function AllocationChart({
  data,
  items,
  segments,
  allocations,
  total,
  height = 14,
  label = "Allocation",
  showLegend = true,
  valueFormatter = allocationValue,
  className,
  style,
  ...props
}: AllocationChartProps) {
  const source = data ?? items ?? segments ?? allocations ?? [];
  const normalized = source.map((item) => ({
    ...item,
    value: Number.isFinite(item.value) && item.value > 0 ? item.value : 0,
  }));
  const sum = normalized.reduce((accumulator, item) => accumulator + item.value, 0);
  const requestedTotal = typeof total === "number" && Number.isFinite(total) && total > 0 ? total : 0;
  const chartTotal = Math.max(sum, requestedTotal, 1);
  const readableValues = normalized.map((item) => {
    const percentage = (item.value / chartTotal) * 100;
    return `${item.label} ${valueFormatter(item.value, percentage)}`;
  });
  const accessibleLabel = props["aria-label"] ?? `${label}: ${readableValues.join(", ") || "no data"}`;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 14;

  const rootStyle: CSSProperties = {
    display: "grid",
    gap: "0.8rem",
    width: "100%",
    minWidth: 0,
    margin: 0,
    ...style,
  };

  const barStyle: CSSProperties = {
    display: "flex",
    width: "100%",
    height: safeHeight,
    minHeight: 8,
    overflow: "hidden",
    border: "1px solid var(--web-border, rgb(242 241 237 / 13%))",
    borderRadius: 999,
    backgroundColor: "var(--web-surface-raised, #17191e)",
  };

  return (
    <figure className={className} style={rootStyle} aria-label={accessibleLabel} {...props}>
      <div role="img" aria-label={accessibleLabel} style={barStyle}>
        {normalized.map((item, index) => {
          const percentage = (item.value / chartTotal) * 100;
          const segmentStyle: CustomProperties = {
            display: "block",
            flex: `0 0 ${percentage}%`,
            minWidth: percentage > 0 ? 3 : 0,
            backgroundColor: item.color ?? allocationPalette[index % allocationPalette.length],
            "--allocation-value": `${percentage}%`,
          };

          return <span key={`${item.label}-${index}`} title={`${item.label}: ${valueFormatter(item.value, percentage)}`} style={segmentStyle} />;
        })}
      </div>
      {showLegend ? (
        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(12rem, 100%), 1fr))",
            gap: "0.45rem 1rem",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {normalized.map((item, index) => {
            const percentage = (item.value / chartTotal) * 100;
            return (
              <li
                key={`${item.label}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "0.55rem minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: "0.5rem",
                  minWidth: 0,
                  color: "var(--web-text-muted, rgb(242 241 237 / 62%))",
                  fontSize: "0.75rem",
                  lineHeight: 1.3,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "0.55rem",
                    height: "0.55rem",
                    borderRadius: "50%",
                    backgroundColor: item.color ?? allocationPalette[index % allocationPalette.length],
                  }}
                />
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.description}>
                  {item.label}
                </span>
                <strong style={{ color: "var(--web-text, #f2f1ed)", fontSize: "0.72rem", fontWeight: 650 }}>
                  {valueFormatter(item.value, percentage)}
                </strong>
              </li>
            );
          })}
        </ul>
      ) : null}
    </figure>
  );
}
