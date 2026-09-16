import {
  ThinkingOrb as ThinkingOrbPrimitive,
  type OrbState,
  type OrbTheme,
  type ThinkingOrbProps as ThinkingOrbPrimitiveProps,
} from "thinking-orbs";
import type { CSSProperties } from "react";

import { cn } from "../lib/cn.js";

export type ThinkingOrbState = OrbState;
export type ThinkingOrbTheme = OrbTheme;

export interface ThinkingOrbProps extends Omit<ThinkingOrbPrimitiveProps, "theme"> {
  /** Use the dark-tuned palette for Metron's dark control-room surfaces. */
  dark?: boolean;
  /** Explicit package theme override. */
  theme?: OrbTheme;
  className?: string;
  style?: CSSProperties;
}

/**
 * Metron's AI/agent thinking indicator. The `dark` convenience prop maps to
 * thinking-orbs' theme API while preserving its tuned canvas behavior.
 */
export function ThinkingOrb({
  dark = true,
  theme,
  className,
  ...props
}: ThinkingOrbProps) {
  return (
    <ThinkingOrbPrimitive
      {...props}
      className={cn("metron-thinking-orb", className)}
      theme={theme ?? (dark ? "dark" : "light")}
    />
  );
}
