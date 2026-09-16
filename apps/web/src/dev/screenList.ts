/**
 * The real app routes available in the development route gallery.
 *
 * Dynamic routes expose their route pattern for quick recognition while keeping
 * a deterministic concrete target for navigation in the hardcoded app.
 */
export const GALLERY_SCREENS = [
  { id: "dashboard", path: "/dashboard", target: "/dashboard", label: "Dashboard", group: "Control room" },
  { id: "intent-new", path: "/intent/new", target: "/intent/new", label: "Create intent", group: "Control room" },
  { id: "strategies", path: "/strategies", target: "/strategies", label: "Strategies", group: "Control room" },
  {
    id: "strategy-detail",
    path: "/strategies/:strategyId",
    target: "/strategies/core-yield",
    label: "Strategy detail",
    group: "Strategies",
  },
  { id: "portfolio", path: "/portfolio", target: "/portfolio", label: "Portfolio", group: "Control room" },
  {
    id: "portfolio-positions",
    path: "/portfolio/positions",
    target: "/portfolio/positions",
    label: "Portfolio positions",
    group: "Portfolio",
  },
  { id: "risk", path: "/risk", target: "/risk", label: "Risk center", group: "Control room" },
  { id: "risk-advanced", path: "/risk/advanced", target: "/risk/advanced", label: "Advanced risk", group: "Risk" },
  { id: "automation", path: "/automation", target: "/automation", label: "Automation", group: "Control room" },
  {
    id: "automation-policies",
    path: "/automation/policies",
    target: "/automation/policies",
    label: "Automation policies",
    group: "Automation",
  },
  { id: "activity", path: "/activity", target: "/activity", label: "Activity", group: "Control room" },
  {
    id: "notifications",
    path: "/notifications",
    target: "/notifications",
    label: "Notifications",
    group: "Control room",
  },
  { id: "settings", path: "/settings", target: "/settings", label: "Settings", group: "Control room" },
  {
    id: "execution-detail",
    path: "/execution/:executionId",
    target: "/execution/exec-1042",
    label: "Execution detail",
    group: "Operations",
  },
  { id: "emergency", path: "/emergency", target: "/emergency", label: "Emergency controls", group: "Operations" },
] as const;

export type GalleryScreen = (typeof GALLERY_SCREENS)[number];
export type GalleryScreenId = GalleryScreen["id"];
