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

type BlurIntensity = "sm" | "md" | "lg" | "xl";
type GlowIntensity = "none" | "sm" | "md" | "lg";
type GlassStyle = MotionStyle & {
  "--metron-glass-radius": string;
  "--metron-glass-blur": string;
  "--metron-glass-glow": string;
};

export interface LiquidGlassProps
  extends Omit<HTMLMotionProps<"div">, "children" | "drag" | "onClick" | "style"> {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  draggable?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  expandedWidth?: CSSProperties["width"];
  expandedHeight?: CSSProperties["height"];
  blurIntensity?: BlurIntensity;
  glowIntensity?: GlowIntensity;
  borderRadius?: string;
  style?: MotionStyle;
}

const blurValues: Record<BlurIntensity, string> = {
  sm: "12px",
  md: "20px",
  lg: "28px",
  xl: "40px",
};

const glowValues: Record<GlowIntensity, string> = {
  none: "none",
  sm: "0 18px 48px rgb(0 0 0 / 34%)",
  md: "0 26px 72px rgb(0 0 0 / 46%), 0 0 36px rgb(113 0 20 / 14%)",
  lg: "0 34px 96px rgb(0 0 0 / 54%), 0 0 52px rgb(113 0 20 / 22%)",
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
  glowIntensity = "md",
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
      drag={draggable}
      dragConstraints={draggable ? { top: 0, right: 0, bottom: 0, left: 0 } : undefined}
      dragElastic={draggable ? 0.24 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={glassStyle}
      transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.2, 0.8, 0.2, 1] }}
      whileDrag={reduceMotion ? undefined : { scale: 1.018 }}
      whileHover={reduceMotion || (!draggable && !expandable) ? undefined : { scale: 1.008 }}
      whileTap={reduceMotion || (!draggable && !expandable) ? undefined : { scale: 0.986 }}
    >
      <svg aria-hidden="true" className="metron-liquid-glass__filter" focusable="false">
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              baseFrequency="0.009 0.014"
              numOctaves="1"
              result="noise"
              seed="7"
              type="fractalNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="12"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <span
        aria-hidden="true"
        className="metron-liquid-glass__bend"
        style={{ filter: `url(#${filterId})` }}
      />
      <span aria-hidden="true" className="metron-liquid-glass__face" />
      <span aria-hidden="true" className="metron-liquid-glass__edge" />
      <div className={cn("metron-liquid-glass__content", contentClassName)}>{children}</div>
    </motion.div>
  );
}
