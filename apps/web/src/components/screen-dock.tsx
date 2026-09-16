import { useCallback, useRef, type KeyboardEvent } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  LayoutDashboard,
  Network,
  Settings2,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

export interface ScreenDockScreen {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface ScreenDockProps {
  screens: readonly ScreenDockScreen[];
  activeScreen: string;
  onSelect: (screenId: string) => void;
  /** Optional accessible label for the navigation landmark. */
  ariaLabel?: string;
}

const iconByScreenId: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  dashboard: LayoutDashboard,
  portfolio: BarChart3,
  activity: Activity,
  strategies: Network,
  strategy: Network,
  automation: Bot,
  risk: ShieldAlert,
  settings: Settings2,
};

function screenIcon(screen: ScreenDockScreen): LucideIcon {
  return screen.icon ?? iconByScreenId[screen.id.toLowerCase()] ?? LayoutDashboard;
}

/**
 * A compact, keyboard-friendly view switcher intended to sit above the lower
 * right edge of an application shell. The dock does not own navigation state;
 * selecting an item is reported through `onSelect`.
 */
export function ScreenDock({
  screens,
  activeScreen,
  onSelect,
  ariaLabel = "Application views",
}: ScreenDockProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const moveFocus = useCallback(
    (index: number) => {
      if (screens.length === 0) return;

      for (let offset = 0; offset < screens.length; offset += 1) {
        const nextIndex = (index + offset + screens.length) % screens.length;
        if (!screens[nextIndex].disabled) {
          buttonRefs.current[nextIndex]?.focus();
          return;
        }
      }
    },
    [screens],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          moveFocus(index + 1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          moveFocus(index - 1);
          break;
        case "Home":
          event.preventDefault();
          moveFocus(0);
          break;
        case "End":
          event.preventDefault();
          moveFocus(screens.length - 1);
          break;
      }
    },
    [moveFocus, screens.length],
  );

  if (screens.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        zIndex: 40,
        width: "min(22rem, calc(100vw - 2rem))",
        padding: "0.4rem",
        border: "1px solid var(--dock-border, rgba(148, 163, 184, 0.2))",
        borderRadius: "1rem",
        background: "var(--dock-background, rgba(15, 23, 42, 0.9))",
        boxShadow: "var(--dock-shadow, 0 18px 45px rgba(2, 6, 23, 0.3))",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(5.7rem, 1fr))",
          gap: "0.25rem",
        }}
      >
        {screens.map((screen, index) => {
          const Icon = screenIcon(screen);
          const isActive = screen.id === activeScreen;
          return (
            <div role="listitem" key={screen.id}>
              <button
                ref={(element) => {
                  buttonRefs.current[index] = element;
                }}
                type="button"
                disabled={screen.disabled}
                aria-current={isActive ? "page" : undefined}
                aria-label={screen.description ? `${screen.label}: ${screen.description}` : screen.label}
                title={screen.description}
                onClick={() => onSelect(screen.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                style={{
                  display: "flex",
                  width: "100%",
                  minHeight: "3.15rem",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.45rem",
                  padding: "0.55rem 0.65rem",
                  border: "1px solid transparent",
                  borderRadius: "0.7rem",
                  color: isActive
                    ? "var(--dock-active-foreground, #f8fafc)"
                    : "var(--dock-foreground, #94a3b8)",
                  background: isActive
                    ? "var(--dock-active-background, rgba(59, 130, 246, 0.2))"
                    : "transparent",
                  font: "inherit",
                  fontSize: "0.72rem",
                  fontWeight: isActive ? 650 : 550,
                  letterSpacing: "0.01em",
                  lineHeight: 1.2,
                  cursor: screen.disabled ? "not-allowed" : "pointer",
                  opacity: screen.disabled ? 0.42 : 1,
                  transition: "background 140ms ease, color 140ms ease, border-color 140ms ease",
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.25 : 1.9} aria-hidden="true" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {screen.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
