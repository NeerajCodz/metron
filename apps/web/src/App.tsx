import { lazy, Suspense, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Command,
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
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
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
import { MetronStateProvider, useMetronState } from "./state/metron-state";
import { BackgroundLayout, Badge } from "@metron/ui";

const DevScreenGallery = import.meta.env.DEV
  ? lazy(() => import("./dev/ScreenGallery").then((module) => ({ default: module.ScreenGallery })))
  : null;

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const primaryNavigation: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/intent/new", label: "Create intent", icon: Plus },
  { to: "/strategies", label: "Strategies", icon: Layers3 },
  { to: "/portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { to: "/risk", label: "Risk center", icon: ShieldAlert },
  { to: "/automation", label: "Automation", icon: Workflow },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];

const routeLabels: Array<{ match: (pathname: string) => boolean; label: string }> = [
  { match: (pathname) => pathname === "/dashboard", label: "Dashboard" },
  { match: (pathname) => pathname === "/intent/new", label: "Create intent" },
  { match: (pathname) => pathname === "/strategies", label: "Strategies" },
  { match: (pathname) => pathname.startsWith("/strategies/"), label: "Strategy detail" },
  { match: (pathname) => pathname === "/portfolio", label: "Portfolio" },
  { match: (pathname) => pathname === "/portfolio/positions", label: "Portfolio / Positions" },
  { match: (pathname) => pathname === "/risk", label: "Risk center" },
  { match: (pathname) => pathname === "/risk/advanced", label: "Risk center / Advanced" },
  { match: (pathname) => pathname === "/automation", label: "Automation" },
  { match: (pathname) => pathname === "/automation/policies", label: "Automation / Policies" },
  { match: (pathname) => pathname === "/activity", label: "Activity" },
  { match: (pathname) => pathname === "/settings", label: "Settings" },
  { match: (pathname) => pathname.startsWith("/execution/"), label: "Execution" },
  { match: (pathname) => pathname === "/emergency", label: "Emergency controls" },
];

function NotFoundPage() {
  return (
    <main className="app-not-found" aria-labelledby="not-found-title">
      <p className="app-not-found__eyebrow">Metron control room</p>
      <h1 id="not-found-title">This route is not available.</h1>
      <p>That control-room view could not be found. Return to the dashboard to continue.</p>
      <Link className="app-not-found__link" to="/dashboard">
        Return to dashboard <ChevronRight size={15} aria-hidden="true" />
      </Link>
    </main>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/intent/new" element={<IntentPage />} />
      <Route path="/strategies" element={<StrategiesPage />} />
      <Route path="/strategies/:strategyId" element={<StrategyDetailPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/portfolio/positions" element={<PortfolioPage />} />
      <Route path="/risk" element={<RiskCenterPage />} />
      <Route path="/risk/advanced" element={<RiskCenterPage />} />
      <Route path="/automation" element={<AutomationPage />} />
      <Route path="/automation/policies" element={<AutomationPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/execution/:executionId" element={<ExecutionPage />} />
      <Route path="/emergency" element={<EmergencyPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function ShellFeedback() {
  const { notifications, jobs, dismissNotification } = useMetronState();
  const activeJob = jobs.find((job) => job.status === "running");
  const recentNotifications = notifications
    .filter((notification) => !notification.read)
    .slice(0, 3);

  if (!activeJob && recentNotifications.length === 0) return null;

  return (
    <aside className="app-feedback" aria-label="Live operation feedback" aria-live="polite">
      {activeJob ? (
        <div className="app-feedback__job">
          <div className="app-feedback__job-head">
            <span>{activeJob.label}</span>
            <span>{activeJob.progress}%</span>
          </div>
          <div className="app-feedback__progress" aria-hidden="true">
            <span style={{ width: `${activeJob.progress}%` }} />
          </div>
          {activeJob.message ? <p>{activeJob.message}</p> : null}
        </div>
      ) : null}
      {recentNotifications.map((notification) => (
        <div className={`app-feedback__notification is-${notification.tone}`} key={notification.id}>
          {notification.tone === "error" ? (
            <XCircle size={15} aria-hidden="true" />
          ) : (
            <Check size={15} aria-hidden="true" />
          )}
          <span>{notification.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissNotification(notification.id)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </aside>
  );
}

function RouterShell() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { wallet, connectWallet } = useMetronState();
  const currentLabel =
    routeLabels.find(({ match }) => match(location.pathname))?.label ?? "Control room";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

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
            <Link className="wordmark" to="/dashboard" aria-label="Metron home">
              <span className="wordmark-mark" aria-hidden="true" />
              <span>METRON</span>
            </Link>
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
            <button className="workspace-switcher" aria-label="Switch workspace" type="button">
              <span className="workspace-switcher__mark">M</span>
              <span className="workspace-switcher__name">Metron treasury</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          <nav className="app-nav">
            <span className="app-nav__label">Control room</span>
            <ul>
              {primaryNavigation.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/dashboard" || to === "/intent/new"}
                    className={({ isActive }) => `app-nav__item${isActive ? " is-active" : ""}`}
                    aria-current={
                      location.pathname === to ||
                      (to !== "/dashboard" && location.pathname.startsWith(`${to}/`))
                        ? "page"
                        : undefined
                    }
                  >
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                    <span>{label}</span>
                    {to === "/risk" && <span className="app-nav__count">2</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="app-sidebar__footer">
            <Link className="app-emergency-button" to="/emergency">
              <Siren size={15} aria-hidden="true" />
              <span>Emergency controls</span>
            </Link>
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
              <strong>{currentLabel}</strong>
            </div>
            <div className="app-topbar__actions">
              <button className="command-trigger" aria-label="Open command search" type="button">
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
              <button className="topbar-icon-button" aria-label="View notifications" type="button">
                <Bell size={17} aria-hidden="true" />
                <span className="notification-dot" aria-hidden="true" />
              </button>
              <button
                className="wallet-button"
                aria-label="Open wallet menu"
                type="button"
                onClick={() => connectWallet()}
              >
                <span className="wallet-button__avatar">0x</span>
                <span>{wallet.connected ? wallet.address : "Connect wallet"}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </header>

          <Link className="app-risk-banner" to="/emergency" role="status">
            <span className="app-risk-banner__icon">
              <AlertTriangle size={16} aria-hidden="true" />
            </span>
            <span>
              <strong>Two conditions need review.</strong> Stablecoin utilization is approaching its
              guardrail.
            </span>
            <span className="app-risk-banner__link">
              Open emergency controls <ChevronRight size={14} aria-hidden="true" />
            </span>
          </Link>

          <div className="app-content">
            <AppRoutes />
          </div>
          <ShellFeedback />
        </div>

        {DevScreenGallery ? (
          <Suspense fallback={null}>
            <DevScreenGallery />
          </Suspense>
        ) : null}
      </div>
    </BackgroundLayout>
  );
}

export function App() {
  return (
    <MetronStateProvider>
      <BrowserRouter>
        <RouterShell />
      </BrowserRouter>
    </MetronStateProvider>
  );
}
