import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  Command,
  Gauge,
  LayoutDashboard,
  Layers3,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Siren,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge, BackgroundLayout, Button } from "@metron/ui";
import { ActivityPage } from "./pages/activity";
import { AutomationPage } from "./pages/automation";
import { DashboardPage } from "./pages/dashboard";
import { EmergencyPage } from "./pages/emergency";
import { ExecutionPage } from "./pages/execution";
import { IntentPage } from "./pages/intent";
import { PortfolioPage } from "./pages/portfolio";
import { RiskCenterPage } from "./pages/risk";
import { SettingsPage } from "./pages/settings";
import { StrategiesPage } from "./pages/strategies";
import { StrategyDetailPage } from "./pages/strategy-detail";
import { ScreenDock } from "./components/screen-dock";

type ScreenId =
  | "dashboard"
  | "intent"
  | "strategies"
  | "portfolio"
  | "risk"
  | "automation"
  | "activity"
  | "settings"
  | "strategy-detail"
  | "execution"
  | "emergency";

type NavItem = {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
};

const primaryNavigation: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "intent", label: "Create intent", icon: Plus },
  { id: "strategies", label: "Strategies", icon: Layers3 },
  { id: "portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { id: "risk", label: "Risk center", icon: ShieldAlert },
  { id: "automation", label: "Automation", icon: Workflow },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

const screens = [
  ...primaryNavigation.map(({ id, label, icon }) => ({ id, label, icon })),
  {
    id: "strategy-detail",
    label: "Strategy detail",
    description: "Inspect a live strategy",
    icon: Layers3,
  },
  { id: "execution", label: "Execution", description: "Review pending orders", icon: Gauge },
  { id: "emergency", label: "Emergency", description: "Pause protocol activity", icon: Siren },
] as const;

const pageById: Record<ScreenId, ComponentType> = {
  dashboard: DashboardPage,
  intent: IntentPage,
  strategies: StrategiesPage,
  portfolio: PortfolioPage,
  risk: RiskCenterPage,
  automation: AutomationPage,
  activity: ActivityPage,
  settings: SettingsPage,
  "strategy-detail": StrategyDetailPage,
  execution: ExecutionPage,
  emergency: EmergencyPage,
};

const validScreenIds = new Set<ScreenId>(screens.map(({ id }) => id));

function screenFromHash(): ScreenId {
  if (typeof window === "undefined") return "dashboard";
  const candidate = window.location.hash.replace(/^#/, "") as ScreenId;
  return validScreenIds.has(candidate) ? candidate : "dashboard";
}

export function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>(screenFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ActivePage = pageById[activeScreen];

  const navigate = useCallback((screen: ScreenId) => {
    setActiveScreen(screen);
    setSidebarOpen(false);
    if (typeof window !== "undefined" && window.location.hash !== `#${screen}`) {
      window.history.pushState(null, "", `#${screen}`);
    }
  }, []);

  useEffect(() => {
    const syncHash = () => setActiveScreen(screenFromHash());
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  return (
    <BackgroundLayout
      className="app-background"
      contentClassName="app-background__content"
      patternVariant="grid"
      patternSize={48}
      patternOpacity={0.32}
      patternMask="fade"
      glow="crimson"
    >
      <div className="app-shell">
        <button
          className={`app-scrim${sidebarOpen ? " is-visible" : ""}`}
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={`app-sidebar${sidebarOpen ? " is-open" : ""}`}
          aria-label="Primary navigation"
        >
          <div className="app-sidebar__top">
            <a
              className="wordmark"
              href="#dashboard"
              onClick={() => navigate("dashboard")}
              aria-label="Metron home"
            >
              <span className="wordmark-mark" aria-hidden="true" />
              <span>METRON</span>
            </a>
            <button
              className="app-sidebar__close"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          <div className="app-sidebar__context">
            <span className="app-sidebar__context-label">Workspace</span>
            <button className="workspace-switcher" aria-label="Switch workspace">
              <span className="workspace-switcher__mark">M</span>
              <span className="workspace-switcher__name">Metron treasury</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          <nav className="app-nav">
            <span className="app-nav__label">Control room</span>
            <ul>
              {primaryNavigation.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    className={`app-nav__item${activeScreen === id ? " is-active" : ""}`}
                    aria-current={activeScreen === id ? "page" : undefined}
                    onClick={() => navigate(id)}
                  >
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                    <span>{label}</span>
                    {id === "risk" && <span className="app-nav__count">2</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="app-sidebar__footer">
            <Button
              className="app-emergency-button"
              variant="danger"
              size="sm"
              fullWidth
              leadingIcon={<Siren size={15} aria-hidden="true" />}
              onClick={() => navigate("emergency")}
            >
              Emergency controls
            </Button>
            <div className="app-sidebar__build">
              <span className="status-dot" aria-hidden="true" />
              <span>Systems nominal</span>
              <span className="app-sidebar__build-id">METRON / 01</span>
            </div>
          </div>
        </aside>

        <div className="app-main">
          <header className="app-topbar">
            <button
              className="app-menu-toggle"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="app-breadcrumb" aria-label="Current location">
              <span>Workspace</span>
              <ChevronRight size={14} aria-hidden="true" />
              <strong>{screens.find((screen) => screen.id === activeScreen)?.label}</strong>
            </div>
            <div className="app-topbar__actions">
              <button className="command-trigger" aria-label="Open command search">
                <Search size={16} aria-hidden="true" />
                <span>Search anything</span>
                <kbd>
                  <Command size={11} aria-hidden="true" /> K
                </kbd>
              </button>
              <Badge
                className="network-status"
                variant="success"
                leadingIcon={<span className="status-dot" aria-hidden="true" />}
              >
                Mainnet connected
              </Badge>
              <button className="topbar-icon-button" aria-label="View notifications">
                <Bell size={17} aria-hidden="true" />
                <span className="notification-dot" aria-hidden="true" />
              </button>
              <button className="wallet-button" aria-label="Open wallet menu">
                <span className="wallet-button__avatar">0x</span>
                <span>0x71...9A20</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="app-risk-banner" role="status">
            <span className="app-risk-banner__icon">
              <AlertTriangle size={16} aria-hidden="true" />
            </span>
            <span>
              <strong>Two conditions need review.</strong> Stablecoin utilization is approaching its
              guardrail.
            </span>
            <button onClick={() => navigate("emergency")}>
              Open emergency controls <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="app-content">
            <ActivePage />
          </div>
        </div>

        <ScreenDock
          screens={screens}
          activeScreen={activeScreen}
          onSelect={(screen) => navigate(screen as ScreenId)}
        />
      </div>
    </BackgroundLayout>
  );
}
