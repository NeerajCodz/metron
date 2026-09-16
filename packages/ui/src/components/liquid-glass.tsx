"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type MotionStyle } from "motion/react";
import {
  useId,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export type LiquidGlassBlur = "sm" | "md" | "lg" | "xl";
export type LiquidGlassIntensity = "none" | "xs" | "sm" | "md" | "lg" | "xl";

type GlassStyle = MotionStyle & {
  "--metron-glass-radius": string;
  "--metron-glass-blur": string;
  "--metron-glass-glow": string;
  "--metron-glass-edge-shadow": string;
  "--metron-glass-filter": string;
};

export interface LiquidGlassProps
  extends Omit<HTMLMotionProps<"div">, "children" | "drag" | "onClick" | "style"> {
  children: ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
  draggable?: boolean | undefined;
  expandable?: boolean | undefined;
  expanded?: boolean | undefined;
  defaultExpanded?: boolean | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  onClick?: ((event: MouseEvent<HTMLDivElement>) => void) | undefined;
  width?: CSSProperties["width"] | undefined;
  height?: CSSProperties["height"] | undefined;
  expandedWidth?: CSSProperties["width"] | undefined;
  expandedHeight?: CSSProperties["height"] | undefined;
  blurIntensity?: LiquidGlassBlur | undefined;
  glowIntensity?: LiquidGlassIntensity | undefined;
  shadowIntensity?: LiquidGlassIntensity | undefined;
  borderRadius?: string | undefined;
  style?: MotionStyle | undefined;
}

const blurValues: Record<LiquidGlassBlur, string> = {
  sm: "12px",
  md: "20px",
  lg: "30px",
  xl: "44px",
};

const glowValues: Record<LiquidGlassIntensity, string> = {
  none: "none",
  xs: "0 10px 28px rgb(0 0 0 / 28%)",
  sm: "0 18px 48px rgb(0 0 0 / 40%)",
  md: "0 26px 72px rgb(0 0 0 / 52%)",
  lg: "0 34px 96px rgb(0 0 0 / 64%)",
  xl: "0 46px 130px rgb(0 0 0 / 72%)",
};

const edgeValues: Record<LiquidGlassIntensity, string> = {
  none: "none",
  xs: "inset 0 1px 0 rgb(255 255 255 / 18%), inset 0 -1px 0 rgb(255 255 255 / 5%)",
  sm: "inset 0 1px 1px rgb(255 255 255 / 30%), inset 0 -1px 1px rgb(255 255 255 / 8%)",
  md: "inset 1px 1px 2px rgb(255 255 255 / 38%), inset -1px -1px 2px rgb(255 255 255 / 10%)",
  lg: "inset 2px 2px 3px rgb(255 255 255 / 44%), inset -2px -2px 3px rgb(255 255 255 / 12%)",
  xl: "inset 3px 3px 5px rgb(255 255 255 / 50%), inset -3px -3px 5px rgb(255 255 255 / 14%)",
};

export function LiquidGlass({
  children,
  className,
  contentClassName,
  draggable = false,
  expandable = false,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onClick,
  width,
  height,
  expandedWidth,
  expandedHeight,
  blurIntensity = "lg",
  glowIntensity = "sm",
  shadowIntensity = "md",
  borderRadius = "var(--metron-radius-card)",
  style,
  onKeyDown,
  ...props
}: LiquidGlassProps) {
  const filterId = `metron-glass-${useId().replaceAll(":", "")}`;
  const reduceMotion = useReducedMotion();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;

  const setExpanded = (next: boolean) => {
    if (expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  const shouldIgnoreToggle = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("a, button, input, select, textarea"));

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && expandable && !shouldIgnoreToggle(event.target)) {
      setExpanded(!isExpanded);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (
      !event.defaultPrevented &&
      expandable &&
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      setExpanded(!isExpanded);
    }
  };

  const glassStyle: GlassStyle = {
    ...style,
    "--metron-glass-radius": borderRadius,
    "--metron-glass-blur": blurValues[blurIntensity],
    "--metron-glass-glow": glowValues[glowIntensity],
    "--metron-glass-edge-shadow": edgeValues[shadowIntensity],
    "--metron-glass-filter": `url("#${filterId}")`,
    ...(!expandable && width !== undefined ? { width } : {}),
    ...(!expandable && height !== undefined ? { height } : {}),
  };

  return (
    <motion.div
      {...props}
      {...(expandable
        ? {
            animate: {
              width: isExpanded ? (expandedWidth ?? width ?? "auto") : (width ?? "auto"),
              height: isExpanded ? (expandedHeight ?? height ?? "auto") : (height ?? "auto"),
            },
            "aria-expanded": isExpanded,
            role: "button",
            tabIndex: 0,
          }
        : {})}
      className={cn(
        "metron-liquid-glass",
        draggable && "metron-liquid-glass--draggable",
        expandable && "metron-liquid-glass--expandable",
        className,
      )}
      {...(draggable
        ? {
            drag: true,
            dragConstraints: { top: 0, right: 0, bottom: 0, left: 0 },
            dragElastic: 0.24,
            ...(!reduceMotion ? { whileDrag: { scale: 1.018 } } : {}),
          }
        : {})}
      {...(!reduceMotion && (draggable || expandable)
        ? { whileHover: { scale: 1.008 }, whileTap: { scale: 0.986 } }
        : {})}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={glassStyle}
      transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg aria-hidden="true" className="metron-liquid-glass__filter" focusable="false">
        <defs>
          <filter
            colorInterpolationFilters="sRGB"
            filterUnits="objectBoundingBox"
            height="140%"
            id={filterId}
            width="140%"
            x="-20%"
            y="-20%"
          >
            <feTurbulence
              baseFrequency="0.008 0.012"
              numOctaves="2"
              result="noise"
              seed="11"
              type="fractalNoise"
            />
            <feGaussianBlur in="noise" result="softNoise" stdDeviation="0.7" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="softNoise"
              scale="46"
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>
      <span aria-hidden="true" className="metron-liquid-glass__bend" />
      <span aria-hidden="true" className="metron-liquid-glass__face" />
      <span aria-hidden="true" className="metron-liquid-glass__edge" />
      <div className={cn("metron-liquid-glass__content", contentClassName)}>{children}</div>
    </motion.div>
  );
}

export const LiquidGlassCard = LiquidGlass;
