import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  LoaderCircle,
  Maximize2,
  Monitor,
  PanelLeft,
  Radio,
  Route,
  Search,
  Smartphone,
  Timer,
  X,
} from "lucide-react";
import { GALLERY_SCREENS, type GalleryScreen } from "./screenList";

const WIDTHS = [
  { id: "full", label: "Full", icon: Maximize2 },
  { id: "desktop", label: "1280", width: 1280, icon: Monitor },
  { id: "mobile", label: "390", width: 390, icon: Smartphone },
] as const;

type WidthId = (typeof WIDTHS)[number]["id"];
type Delay = 0 | 1200;

type StyleMap = CSSProperties;

const panelStyle: StyleMap = {
  border: "1px solid color-mix(in srgb, var(--metron-crimson-bright, #f04b5f) 38%, transparent)",
  borderRadius: "12px",
  background: "color-mix(in srgb, var(--metron-black, #08090b) 92%, var(--metron-crimson, #710014) 8%)",
  color: "var(--metron-pearl, #f2f1ed)",
  boxShadow: "0 18px 46px -16px rgb(0 0 0 / 85%), 0 0 0 1px rgb(255 255 255 / 3%)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

const compactButtonStyle: StyleMap = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  minHeight: "30px",
  padding: "6px 10px",
  border: 0,
  borderRadius: "9px",
  background: "transparent",
  color: "var(--metron-pearl-muted, #aaa7a1)",
  fontFamily: "var(--metron-font-mono, monospace)",
  fontSize: "10px",
  letterSpacing: "0.04em",
  cursor: "pointer",
};

const itemStyle: StyleMap = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  width: "100%",
  minHeight: "36px",
  padding: "7px 11px",
  border: 0,
  borderRadius: "7px",
  background: "transparent",
  color: "var(--metron-pearl-muted, #aaa7a1)",
  textAlign: "left",
  cursor: "pointer",
};

const chipStyle: StyleMap = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "24px",
  padding: "3px 8px",
  border: "1px solid transparent",
  borderRadius: "999px",
  background: "transparent",
  color: "var(--metron-pearl-dim, #77746f)",
  fontFamily: "var(--metron-font-mono, monospace)",
  fontSize: "9px",
  cursor: "pointer",
};

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

function screenMatchesPath(screen: GalleryScreen, pathname: string) {
  const current = normalizePath(pathname);
  if (!screen.path.includes(":")) {
    return current === normalizePath(screen.target);
  }

  const prefix = screen.path.slice(0, screen.path.indexOf(":"));
  return current.startsWith(prefix) && current.length > prefix.length;
}

function displayTarget(screen: GalleryScreen) {
  return screen.path.includes(":") ? screen.path : screen.target;
}

export function ScreenGallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [delay, setDelay] = useState<Delay>(0);
  const [widthId, setWidthId] = useState<WidthId>("full");
  const [query, setQuery] = useState("");
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const pendingTimer = useRef<number | null>(null);
  const navigationToken = useRef(0);
  const currentPath = useRef(location.pathname);
  const searchRef = useRef<HTMLInputElement | null>(null);

  currentPath.current = location.pathname;

  const cancelPending = useCallback(() => {
    navigationToken.current += 1;
    if (pendingTimer.current !== null) {
      window.clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }
    setPendingPath(null);
  }, []);

  const showScreen = useCallback(
    (screen: GalleryScreen) => {
      const target = normalizePath(screen.target);
      if (target === normalizePath(currentPath.current)) {
        cancelPending();
        return;
      }

      cancelPending();
      if (delay === 0) {
        navigate(target);
        return;
      }

      const token = ++navigationToken.current;
      const origin = normalizePath(currentPath.current);
      setPendingPath(target);
      pendingTimer.current = window.setTimeout(() => {
        pendingTimer.current = null;
        if (token !== navigationToken.current || normalizePath(currentPath.current) !== origin) {
          setPendingPath(null);
          return;
        }
        setPendingPath(null);
        navigate(target);
      }, delay);
    },
    [cancelPending, delay, navigate],
  );

  const leaveGallery = useCallback(() => {
    cancelPending();
    setOpen(false);
    // The gallery never mounts a duplicate fixture: live means the current
    // router-rendered app. Replacing the current URL also clears a stale
    // pending transition without adding a history entry.
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true });
  }, [cancelPending, location.hash, location.pathname, location.search, navigate]);

  const active = useMemo(
    () => GALLERY_SCREENS.find((screen) => screenMatchesPath(screen, location.pathname)) ?? null,
    [location.pathname],
  );
  const activeIndex = active ? GALLERY_SCREENS.indexOf(active) : -1;
  const previous = activeIndex > 0 ? GALLERY_SCREENS[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < GALLERY_SCREENS.length - 1 ? GALLERY_SCREENS[activeIndex + 1] : null;
  const pending = pendingPath
    ? GALLERY_SCREENS.find((screen) => normalizePath(screen.target) === normalizePath(pendingPath)) ?? null
    : null;
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return GALLERY_SCREENS;
    return GALLERY_SCREENS.filter((screen) =>
      [screen.id, screen.path, screen.target, screen.label, screen.group].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [query]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']");

      if (event.key === "Escape") {
        if (open || pendingPath) {
          event.preventDefault();
          cancelPending();
          setOpen(false);
        }
        return;
      }
      if (typing || pendingPath) return;
      if (event.key === "[" && previous) {
        event.preventDefault();
        showScreen(previous);
      }
      if (event.key === "]" && next) {
        event.preventDefault();
        showScreen(next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelPending, next, open, pendingPath, previous, showScreen]);

  useEffect(() => {
    return () => {
      if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root || widthId === "full") return;

    const original = {
      width: root.style.width,
      maxWidth: root.style.maxWidth,
      marginInline: root.style.marginInline,
    };
    const width = WIDTHS.find((option) => option.id === widthId)?.width;
    if (!width) return;

    root.style.width = `${width}px`;
    root.style.maxWidth = `${width}px`;
    root.style.marginInline = "auto";
    return () => {
      root.style.width = original.width;
      root.style.maxWidth = original.maxWidth;
      root.style.marginInline = original.marginInline;
    };
  }, [widthId]);

  const activeLabel = pending ? `${active?.label ?? "Route"} → ${pending.label}` : active?.label ?? "Live app";
  const selectedWidth = WIDTHS.find((option) => option.id === widthId) ?? WIDTHS[0];

  return (
    <>
      <style>{`
        @keyframes metron-gallery-spin { to { transform: rotate(360deg); } }
        [data-dev-gallery] button:hover:not(:disabled) { background: rgb(255 255 255 / 6%); color: var(--metron-pearl, #f2f1ed); }
        [data-dev-gallery] button:disabled { cursor: not-allowed; opacity: .35; }
        [data-dev-gallery] input::placeholder { color: var(--metron-pearl-dim, #77746f); }
        [data-dev-gallery] ::-webkit-scrollbar { width: 6px; }
        [data-dev-gallery] ::-webkit-scrollbar-thumb { border-radius: 6px; background: rgb(255 255 255 / 14%); }
      `}</style>

      {pending ? (
        <div
          aria-live="polite"
          aria-label={`Loading ${pending.label}`}
          role="status"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "grid",
            placeItems: "center",
            background: "rgb(4 5 7 / 38%)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              ...panelStyle,
              display: "grid",
              justifyItems: "center",
              gap: "10px",
              minWidth: "178px",
              padding: "18px 22px",
            }}
          >
            <LoaderCircle
              size={22}
              aria-hidden="true"
              style={{ animation: "metron-gallery-spin .9s linear infinite", color: "var(--metron-crimson-bright, #f04b5f)" }}
            />
            <strong style={{ fontSize: "12px", fontWeight: 600 }}>Loading route</strong>
            <span style={{ color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "9px" }}>
              {pending.path}
            </span>
          </div>
        </div>
      ) : null}

      <div
        data-dev-gallery
        style={{
          position: "fixed",
          bottom: "12px",
          left: "12px",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          fontFamily: "var(--metron-font-sans, sans-serif)",
        }}
      >
        {open ? (
          <div
            id="dev-route-gallery"
            role="dialog"
            aria-label="Development route gallery"
            style={{ ...panelStyle, width: "286px", marginBottom: "8px", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px", borderBottom: "1px solid var(--metron-border, rgb(255 255 255 / 10%))" }}>
              <Search size={14} aria-hidden="true" style={{ flex: "0 0 auto", color: "var(--metron-pearl-dim, #77746f)" }} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a route"
                aria-label="Find a route"
                style={{ width: "100%", minWidth: 0, height: "28px", padding: "0 2px", border: 0, outline: 0, background: "transparent", color: "var(--metron-pearl, #f2f1ed)", fontSize: "11px" }}
              />
              <kbd style={{ flex: "0 0 auto", padding: "2px 4px", border: "1px solid var(--metron-border, rgb(255 255 255 / 10%))", borderRadius: "4px", color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "9px" }}>Esc</kbd>
            </div>

            <div style={{ maxHeight: "48vh", overflowY: "auto", padding: "5px" }}>
              <button
                type="button"
                onClick={leaveGallery}
                aria-current={!active && !pending ? "page" : undefined}
                style={{ ...itemStyle, color: !active && !pending ? "var(--metron-sand-bright, #d4b18a)" : itemStyle.color }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <Radio size={14} aria-hidden="true" />
                  <span>Live app</span>
                </span>
                <span style={{ color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "9px" }}>current</span>
              </button>

              {matches.length > 0 ? (
                matches.map((screen, index) => {
                  const showGroup = index === 0 || matches[index - 1]?.group !== screen.group;
                  const isActive = active?.id === screen.id && !pendingPath;
                  return (
                    <div key={screen.id}>
                      {showGroup ? <div style={{ padding: index === 0 ? "8px 10px 4px" : "12px 10px 4px", color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{screen.group}</div> : null}
                      <button
                        type="button"
                        disabled={pendingPath !== null}
                        onClick={() => showScreen(screen)}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={`Open ${screen.label} at ${displayTarget(screen)}`}
                        style={{ ...itemStyle, background: isActive ? "rgb(180 34 57 / 15%)" : "transparent", color: isActive ? "var(--metron-sand-bright, #d4b18a)" : itemStyle.color, borderLeft: isActive ? "2px solid var(--metron-crimson-bright, #f04b5f)" : "2px solid transparent", paddingLeft: "9px" }}
                      >
                        <span style={{ display: "flex", minWidth: 0, flexDirection: "column", gap: "3px" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px" }}>{screen.label}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "8px" }}>{screen.path}</span>
                        </span>
                        {isActive ? <CircleDot size={13} aria-hidden="true" /> : <Route size={12} aria-hidden="true" style={{ color: "var(--metron-pearl-dim, #77746f)" }} />}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p style={{ margin: "8px 10px", color: "var(--metron-pearl-dim, #77746f)", fontSize: "11px" }}>No routes match.</p>
              )}
            </div>

            <div style={{ display: "grid", gap: "7px", padding: "9px", borderTop: "1px solid var(--metron-border, rgb(255 255 255 / 10%))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginRight: "auto", paddingLeft: "2px", color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "9px" }}><Monitor size={11} aria-hidden="true" /> width</span>
                {WIDTHS.map((option) => {
                  const Icon = option.icon;
                  return <button key={option.id} type="button" onClick={() => setWidthId(option.id)} aria-pressed={widthId === option.id} style={{ ...chipStyle, ...(widthId === option.id ? { borderColor: "var(--metron-crimson-glow, #710014)", background: "var(--metron-crimson, #710014)", color: "var(--metron-pearl, #f2f1ed)" } : {}) }}><Icon size={11} aria-hidden="true" />{option.label}</button>;
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginRight: "auto", paddingLeft: "2px", color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "9px" }}><Timer size={11} aria-hidden="true" /> delay</span>
                {([0, 1200] as const).map((option) => <button key={option} type="button" onClick={() => setDelay(option)} aria-pressed={delay === option} style={{ ...chipStyle, ...(delay === option ? { borderColor: "var(--metron-crimson-glow, #710014)", background: "var(--metron-crimson, #710014)", color: "var(--metron-pearl, #f2f1ed)" } : {}) }}>{option === 0 ? "off" : "1.2s"}</button>)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "2px", color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "9px" }}><PanelLeft size={11} aria-hidden="true" /> <span>[ / ] previous · next</span></div>
            </div>
          </div>
        ) : null}

        <div style={{ ...panelStyle, display: "flex", alignItems: "center", gap: "2px" }}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="dev-route-gallery"
            style={compactButtonStyle}
          >
            <PanelLeft size={14} aria-hidden="true" />
            <span>{pending ? `Loading ${pending.label}` : activeLabel}</span>
          </button>
          {open ? <button type="button" onClick={() => setOpen(false)} aria-label="Close route gallery" style={{ ...compactButtonStyle, padding: "6px 7px" }}><X size={14} aria-hidden="true" /></button> : null}
          {active && !pending ? <span style={{ padding: "0 8px 0 2px", color: "var(--metron-pearl-dim, #77746f)", fontFamily: "var(--metron-font-mono, monospace)", fontSize: "9px" }}>{selectedWidth.label}</span> : null}
          {active && !pending ? (
            <>
              <button type="button" disabled={!previous} onClick={() => previous && showScreen(previous)} aria-label="Previous route" style={{ ...compactButtonStyle, padding: "6px 6px" }}><ChevronLeft size={14} aria-hidden="true" /></button>
              <button type="button" disabled={!next} onClick={() => next && showScreen(next)} aria-label="Next route" style={{ ...compactButtonStyle, padding: "6px 6px" }}><ChevronRight size={14} aria-hidden="true" /></button>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
