import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export interface ChartContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-chart-container", className)} {...props}>
      {children}
    </div>
  ),
);
ChartContainer.displayName = "ChartContainer";

export interface ChartTooltipProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
}

export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("metron-chart-tooltip", className)} {...props}>
      {children}
    </div>
  ),
);
ChartTooltip.displayName = "ChartTooltip";

export interface SparklineProps extends HTMLAttributes<SVGSVGElement> {
  data: number[];
  color?: string | undefined;
  fillColor?: string | undefined;
  strokeWidth?: number | undefined;
  height?: number | undefined;
  width?: number | undefined;
}

export const Sparkline = forwardRef<SVGSVGElement, SparklineProps>(
  (
    {
      data,
      color = "var(--metron-sand)",
      fillColor = "rgba(179, 143, 111, 0.15)",
      strokeWidth = 2,
      height = 40,
      width = 120,
      className,
      ...props
    },
    ref,
  ) => {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - strokeWidth * 2) - strokeWidth;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const areaPoints = `${points} ${width},${height} 0,${height}`;

    return (
      <svg
        ref={ref}
        className={cn("metron-sparkline", className)}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        {...props}
      >
        {fillColor && <polygon fill={fillColor} points={areaPoints} />}
        <polyline
          fill="none"
          points={points}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  },
);
Sparkline.displayName = "Sparkline";

export interface BarChartProps extends HTMLAttributes<HTMLDivElement> {
  data: { label: string; value: number }[];
  color?: string | undefined;
  height?: number | undefined;
}

export const BarChart = forwardRef<HTMLDivElement, BarChartProps>(
  ({ data, color = "var(--metron-crimson-bright)", height = 120, className, ...props }, ref) => {
    const max = Math.max(...data.map((d) => d.value), 1);

    return (
      <div
        ref={ref}
        className={cn("metron-bar-chart", className)}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "0.5rem",
          height,
          width: "100%",
          paddingTop: "1rem",
        }}
        {...props}
      >
        {data.map((item, idx) => {
          const heightPercent = (item.value / max) * 100;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
                gap: "0.35rem",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${heightPercent}%`,
                  backgroundColor: color,
                  borderRadius: "0.25rem 0.25rem 0 0",
                  minHeight: "4px",
                  boxShadow: "0 0 10px rgba(155, 23, 48, 0.3)",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "var(--metron-pearl-dim)" }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  },
);
BarChart.displayName = "BarChart";

export interface DonutChartProps extends HTMLAttributes<SVGSVGElement> {
  value: number; // 0 to 100
  color?: string | undefined;
  size?: number | undefined;
  strokeWidth?: number | undefined;
}

export const DonutChart = forwardRef<SVGSVGElement, DonutChartProps>(
  (
    {
      value,
      color = "var(--metron-sand)",
      size = 80,
      strokeWidth = 8,
      className,
      ...props
    },
    ref,
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
      <svg
        ref={ref}
        className={cn("metron-donut-chart", className)}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        {...props}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="rgba(242, 241, 237, 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
    );
  },
);
DonutChart.displayName = "DonutChart";
