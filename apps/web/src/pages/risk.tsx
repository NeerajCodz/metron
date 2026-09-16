import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Gauge,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Waves,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Field,
  GlassCard,
  InlineAlert,
  Input,
  MetricCard,
  Progress,
  Select,
  Switch,
} from "@metron/ui";

type Horizon = "24h" | "7d" | "30d";
type SimulationState = "idle" | "running" | "complete";
type MarketRegime = "constructive" | "choppy" | "risk-off";

type StressScenario = {
  id: string;
  title: string;
  detail: string;
  shock: number;
  probability: string;
  impact: string;
  outcome: string;
  regime: MarketRegime;
};

const horizonData: Record<Horizon, readonly number[]> = {
  "24h": [2.2, 2.4, 2.1, 2.8, 3.2, 3.7, 3.3, 3.9, 4.6, 4.1, 4.8, 5.1],
  "7d": [2.2, 2.7, 3.1, 3.8, 4.2, 4.8, 5.5, 5.1, 6.3, 6.9, 7.4, 7.8],
  "30d": [2.2, 2.9, 3.7, 4.3, 5.2, 6.1, 5.8, 7.1, 8.3, 8.7, 9.5, 10.2],
};

const horizonLabels: Record<Horizon, readonly string[]> = {
  "24h": ["Now", "04:00", "08:00", "12:00", "16:00", "20:00"],
  "7d": ["Now", "Day 2", "Day 3", "Day 4", "Day 5", "Day 7"],
  "30d": ["Now", "Wk 1", "Wk 2", "Wk 3", "Wk 4", "Day 30"],
};

const stressScenarios: readonly StressScenario[] = [
  {
    id: "eth-drawdown",
    title: "ETH drawdown",
    detail: "ETH price falls 25% over 48 hours",
    shock: -25,
    probability: "Moderate",
    impact: "Health factor 1.29",
    outcome: "Manageable with reserve",
    regime: "choppy",
  },
  {
    id: "correlated-selloff",
    title: "Correlated selloff",
    detail: "ETH and stables widen together",
    shock: -38,
    probability: "Low",
    impact: "Health factor 1.04",
    outcome: "Repay required",
    regime: "risk-off",
  },
  {
    id: "stablecoin-depeg",
    title: "Stablecoin depeg",
    detail: "USDC trades 4% below peg for six hours",
    shock: -8,
    probability: "Low",
    impact: "Health factor 1.63",
    outcome: "Buffer absorbs impact",
    regime: "choppy",
  },
  {
    id: "oracle-delay",
    title: "Oracle delay",
    detail: "Price feed pauses during a fast move",
    shock: -15,
    probability: "Very low",
    impact: "Health factor 1.48",
    outcome: "Circuit breaker holds",
    regime: "risk-off",
  },
];

const breakdown = [
  { label: "Leverage utilization", value: 62, note: "2.4x effective leverage", tone: "warning" as const },
  { label: "Collateral quality", value: 88, note: "92% ETH and wstETH", tone: "success" as const },
  { label: "Liquidity buffer", value: 71, note: "$18,420 available", tone: "accent" as const },
  { label: "Protocol concentration", value: 54, note: "3 lending venues", tone: "warning" as const },
  { label: "Oracle confidence", value: 96, note: "Two independent feeds", tone: "success" as const },
];

const protectionDefaults = {
  healthGuardrail: true,
  reserveRepay: false,
  circuitBreaker: true,
};

const riskPageStyles = `
.web-page-risk {
  --web-page-risk-bg: #070708;
  --web-page-risk-surface: #101012;
  --web-page-risk-surface-raised: #151518;
  --web-page-risk-border: rgba(242, 241, 237, 0.12);
  --web-page-risk-border-strong: rgba(242, 241, 237, 0.22);
  --web-page-risk-pearl: #f2f1ed;
  --web-page-risk-muted: rgba(242, 241, 237, 0.62);
  --web-page-risk-dim: rgba(242, 241, 237, 0.4);
  --web-page-risk-sand: #b38f6f;
  --web-page-risk-sand-bright: #c8aa8e;
  --web-page-risk-crimson: #9b1730;
  --web-page-risk-crimson-soft: rgba(155, 23, 48, 0.17);
  --web-page-risk-green: #48c99a;
  --web-page-risk-amber: #e8aa50;
  min-height: 100%;
  padding: clamp(1.25rem, 3vw, 3.25rem) clamp(1rem, 3vw, 3.5rem) 4rem;
  color: var(--web-page-risk-pearl);
  background: var(--web-page-risk-bg);
  font-family: var(--metron-font-sans, "Segoe UI", sans-serif);
}

.web-page-risk-main {
  width: min(100%, 1380px);
  margin: 0 auto;
}

.web-page-risk-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  padding-bottom: 1.7rem;
  border-bottom: 1px solid var(--web-page-risk-border);
}

.web-page-risk-kicker,
.web-page-risk-section-kicker,
.web-page-risk-metric-label,
.web-page-risk-chart-axis,
.web-page-risk-table-head,
.web-page-risk-result-label,
.web-page-risk-option-meta {
  color: var(--web-page-risk-sand);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.13em;
  line-height: 1.25;
  text-transform: uppercase;
}

.web-page-risk-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.8rem;
}

.web-page-risk-header h1 {
  max-width: 17ch;
  margin: 0;
  color: var(--web-page-risk-pearl);
  font-size: clamp(2rem, 4vw, 4rem);
  font-weight: 520;
  letter-spacing: -0.055em;
  line-height: 0.98;
}

.web-page-risk-header-copy {
  max-width: 32rem;
  margin: 0.8rem 0 0;
  color: var(--web-page-risk-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

.web-page-risk-header-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  padding-bottom: 0.3rem;
}

.web-page-risk-status-line {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--web-page-risk-muted);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.7rem;
  white-space: nowrap;
}

.web-page-risk-status-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--web-page-risk-green);
  box-shadow: 0 0 0 0.25rem rgba(72, 201, 154, 0.11);
}

.web-page-risk-summary {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
  gap: 1rem;
  margin-top: 1.1rem;
}

.web-page-risk-score-panel {
  min-height: 18.75rem;
  padding: clamp(1.2rem, 3vw, 2rem);
  border: 1px solid var(--web-page-risk-border-strong);
  border-radius: 1.25rem;
  background: var(--web-page-risk-surface);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.web-page-risk-score-topline,
.web-page-risk-card-topline,
.web-page-risk-row-head,
.web-page-risk-regime-topline,
.web-page-risk-chart-heading,
.web-page-risk-scenario-meta,
.web-page-risk-result-topline,
.web-page-risk-option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.web-page-risk-score-topline {
  align-items: flex-start;
}

.web-page-risk-score-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  color: var(--web-page-risk-muted);
  font-size: 0.85rem;
  font-weight: 600;
}

.web-page-risk-score-title svg {
  color: var(--web-page-risk-sand-bright);
}

.web-page-risk-score-value {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  margin-top: 2.25rem;
}

.web-page-risk-score-number {
  color: var(--web-page-risk-pearl);
  font-size: clamp(4.5rem, 9vw, 7.8rem);
  font-weight: 500;
  letter-spacing: -0.09em;
  line-height: 0.8;
}

.web-page-risk-score-denominator {
  color: var(--web-page-risk-dim);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.78rem;
}

.web-page-risk-score-description {
  max-width: 34rem;
  margin: 1.35rem 0 1.1rem;
  color: var(--web-page-risk-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

.web-page-risk-score-progress {
  max-width: 32rem;
}

.web-page-risk-score-progress .metron-progress__track {
  background: rgba(242, 241, 237, 0.08);
}

.web-page-risk-score-progress .metron-progress__fill {
  background: var(--web-page-risk-sand);
}

.web-page-risk-breakdown-progress .metron-progress__header {
  display: none;
}


.web-page-risk-score-footnote {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.8rem;
  color: var(--web-page-risk-dim);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.68rem;
}

.web-page-risk-score-footnote svg {
  color: var(--web-page-risk-green);
}

.web-page-risk-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.web-page-risk-metric-grid > :last-child {
  grid-column: 1 / -1;
}

.web-page-risk-metric-card {
  min-height: 8.75rem;
}

.web-page-risk-metric-card .metron-metric-card__value {
  font-size: clamp(1.85rem, 3vw, 2.8rem);
  letter-spacing: -0.06em;
}

.web-page-risk-metric-card .metron-metric-card__change {
  max-width: 22ch;
  font-size: 0.71rem;
  line-height: 1.35;
}

.web-page-risk-section {
  margin-top: 3rem;
}

.web-page-risk-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 0.95rem;
}

.web-page-risk-section-kicker {
  margin: 0 0 0.45rem;
}

.web-page-risk-section-heading h2 {
  margin: 0;
  color: var(--web-page-risk-pearl);
  font-size: clamp(1.25rem, 2vw, 1.8rem);
  font-weight: 520;
  letter-spacing: -0.04em;
}

.web-page-risk-section-heading p {
  max-width: 29rem;
  margin: 0;
  color: var(--web-page-risk-muted);
  font-size: 0.8rem;
  line-height: 1.5;
  text-align: right;
}

.web-page-risk-chart-card {
  padding: clamp(1rem, 2.5vw, 1.6rem);
  border: 1px solid var(--web-page-risk-border);
  border-radius: 1.25rem;
  background: var(--web-page-risk-surface);
}

.web-page-risk-chart-heading {
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.web-page-risk-chart-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  color: var(--web-page-risk-pearl);
  font-size: 0.9rem;
  font-weight: 600;
}

.web-page-risk-chart-title svg {
  color: var(--web-page-risk-crimson);
}

.web-page-risk-chart-subtitle {
  margin: 0.35rem 0 0;
  color: var(--web-page-risk-muted);
  font-size: 0.75rem;
}

.web-page-risk-horizon-toggle {
  display: inline-flex;
  gap: 0.2rem;
  padding: 0.2rem;
  border: 1px solid var(--web-page-risk-border);
  background: var(--web-page-risk-bg);
}

.web-page-risk-horizon-button {
  min-width: 3.2rem;
  padding: 0.42rem 0.58rem;
  border: 0;
  color: var(--web-page-risk-muted);
  background: transparent;
  cursor: pointer;
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.67rem;
  transition: background 160ms ease, color 160ms ease;
}

.web-page-risk-horizon-button:hover,
.web-page-risk-horizon-button:focus-visible {
  color: var(--web-page-risk-pearl);
  background: rgba(242, 241, 237, 0.08);
  outline: none;
}

.web-page-risk-horizon-button[data-active="true"] {
  color: var(--web-page-risk-pearl);
  background: var(--web-page-risk-crimson);
}

.web-page-risk-chart-body {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.8rem;
}

.web-page-risk-chart-axis-column {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 0 1.65rem;
  color: var(--web-page-risk-dim);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.61rem;
  text-align: right;
}

.web-page-risk-chart-plot {
  position: relative;
  min-height: 14.5rem;
  border-bottom: 1px solid var(--web-page-risk-border-strong);
}

.web-page-risk-chart-grid {
  position: absolute;
  inset: 0 0 1.65rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.web-page-risk-chart-grid-line {
  border-top: 1px solid rgba(242, 241, 237, 0.08);
}

.web-page-risk-chart-threshold {
  position: absolute;
  right: 0;
  bottom: calc(44% + 1.65rem);
  left: 0;
  border-top: 1px dashed rgba(155, 23, 48, 0.8);
  pointer-events: none;
}

.web-page-risk-chart-threshold span {
  position: absolute;
  top: -1.1rem;
  right: 0;
  padding-left: 0.4rem;
  color: var(--web-page-risk-crimson);
  background: var(--web-page-risk-surface);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.6rem;
}

.web-page-risk-chart-bars {
  position: absolute;
  inset: 0 0 1.65rem;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: end;
  gap: clamp(0.2rem, 1vw, 0.8rem);
  padding: 0 0.4rem;
}

.web-page-risk-chart-column {
  position: relative;
  display: flex;
  height: 100%;
  align-items: flex-end;
  justify-content: center;
  min-width: 0;
}

.web-page-risk-chart-bar {
  position: relative;
  width: min(1.8rem, 72%);
  min-height: 0.35rem;
  border: 1px solid rgba(179, 143, 111, 0.4);
  border-bottom: 0;
  background: rgba(179, 143, 111, 0.26);
  transition: height 260ms ease, background 160ms ease;
}

.web-page-risk-chart-bar:hover {
  background: rgba(155, 23, 48, 0.55);
}

.web-page-risk-chart-marker {
  position: absolute;
  top: -0.27rem;
  left: 50%;
  width: 0.52rem;
  height: 0.52rem;
  border: 2px solid var(--web-page-risk-surface);
  border-radius: 50%;
  background: var(--web-page-risk-sand-bright);
  transform: translateX(-50%);
}

.web-page-risk-chart-column:last-child .web-page-risk-chart-marker,
.web-page-risk-chart-column:nth-last-child(2) .web-page-risk-chart-marker {
  background: var(--web-page-risk-crimson);
}

.web-page-risk-chart-labels {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.55rem;
  color: var(--web-page-risk-dim);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.61rem;
}

.web-page-risk-chart-labels span:not(:first-child) {
  text-align: center;
}

.web-page-risk-chart-labels span:last-child {
  text-align: right;
}

.web-page-risk-chart-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1rem;
  margin-top: 1.15rem;
  color: var(--web-page-risk-muted);
  font-size: 0.75rem;
}

.web-page-risk-chart-note strong {
  color: var(--web-page-risk-pearl);
  font-weight: 600;
}

.web-page-risk-legend {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
}

.web-page-risk-legend::before {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--web-page-risk-crimson);
  content: "";
}

.web-page-risk-breakdown-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(19rem, 0.7fr);
  gap: 1rem;
}

.web-page-risk-panel {
  border: 1px solid var(--web-page-risk-border);
  border-radius: 1.25rem;
  background: var(--web-page-risk-surface);
}

.web-page-risk-panel-body {
  padding: clamp(1rem, 2.4vw, 1.55rem);
}

.web-page-risk-breakdown-row {
  padding: 0.95rem 0;
  border-bottom: 1px solid var(--web-page-risk-border);
}

.web-page-risk-breakdown-row:first-child {
  padding-top: 0;
}

.web-page-risk-breakdown-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.web-page-risk-row-head {
  margin-bottom: 0.5rem;
}

.web-page-risk-row-label {
  color: var(--web-page-risk-pearl);
  font-size: 0.8rem;
  font-weight: 560;
}

.web-page-risk-row-value {
  color: var(--web-page-risk-muted);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.72rem;
}

.web-page-risk-breakdown-progress .metron-progress__track {
  background: rgba(242, 241, 237, 0.08);
}

.web-page-risk-breakdown-progress .metron-progress__fill {
  background: var(--web-page-risk-sand);
}


.web-page-risk-breakdown-note {
  margin: 0.42rem 0 0;
  color: var(--web-page-risk-dim);
  font-size: 0.7rem;
}

.web-page-risk-regime-card {
  min-height: 100%;
}

.web-page-risk-regime-topline {
  align-items: flex-start;
}

.web-page-risk-regime-icon {
  display: grid;
  width: 2.6rem;
  height: 2.6rem;
  place-items: center;
  border: 1px solid rgba(179, 143, 111, 0.35);
  color: var(--web-page-risk-sand-bright);
  background: rgba(179, 143, 111, 0.1);
}

.web-page-risk-regime-title {
  margin: 1.5rem 0 0.45rem;
  color: var(--web-page-risk-pearl);
  font-size: 1.55rem;
  font-weight: 520;
  letter-spacing: -0.045em;
}

.web-page-risk-regime-copy {
  margin: 0;
  color: var(--web-page-risk-muted);
  font-size: 0.79rem;
  line-height: 1.55;
}

.web-page-risk-regime-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  margin-top: 1.65rem;
}

.web-page-risk-regime-stat {
  padding-top: 0.7rem;
  border-top: 1px solid var(--web-page-risk-border);
}

.web-page-risk-regime-stat strong {
  display: block;
  margin-top: 0.35rem;
  color: var(--web-page-risk-pearl);
  font-size: 0.8rem;
  font-weight: 600;
}

.web-page-risk-regime-confidence {
  margin-top: 1.35rem;
}

.web-page-risk-scenario-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.web-page-risk-scenario {
  min-height: 12.75rem;
  padding: 1.05rem;
  border: 1px solid var(--web-page-risk-border);
  border-radius: 0.9rem;
  color: inherit;
  background: var(--web-page-risk-surface);
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.web-page-risk-scenario:hover,
.web-page-risk-scenario:focus-visible {
  border-color: var(--web-page-risk-border-strong);
  background: var(--web-page-risk-surface-raised);
  outline: none;
  transform: translateY(-1px);
}

.web-page-risk-scenario[data-selected="true"] {
  border-color: var(--web-page-risk-sand);
  background: rgba(179, 143, 111, 0.09);
}

.web-page-risk-scenario h3 {
  margin: 1.1rem 0 0.45rem;
  color: var(--web-page-risk-pearl);
  font-size: 0.9rem;
  font-weight: 600;
}

.web-page-risk-scenario p {
  min-height: 2.5rem;
  margin: 0;
  color: var(--web-page-risk-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.web-page-risk-scenario-meta {
  align-items: flex-end;
  margin-top: 1.1rem;
}

.web-page-risk-scenario-impact {
  color: var(--web-page-risk-pearl);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.7rem;
}

.web-page-risk-scenario-impact span {
  display: block;
  margin-bottom: 0.28rem;
  color: var(--web-page-risk-dim);
  font-family: var(--metron-font-sans, sans-serif);
  font-size: 0.66rem;
}

.web-page-risk-what-if-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 1rem;
}

.web-page-risk-what-if-card,
.web-page-risk-result-card {
  min-height: 22rem;
}

.web-page-risk-card-topline {
  align-items: flex-start;
}

.web-page-risk-card-heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.web-page-risk-card-heading h3 {
  margin: 0;
  color: var(--web-page-risk-pearl);
  font-size: 1rem;
  font-weight: 600;
}

.web-page-risk-card-heading svg {
  color: var(--web-page-risk-sand-bright);
}

.web-page-risk-card-description {
  margin: 0.4rem 0 1.35rem;
  color: var(--web-page-risk-muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.web-page-risk-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.web-page-risk-what-if-card .metron-field__label {
  color: var(--web-page-risk-muted);
}

.web-page-risk-what-if-card .metron-field__description {
  font-size: 0.67rem;
}

.web-page-risk-form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 1.3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--web-page-risk-border);
}

.web-page-risk-selected-stress {
  color: var(--web-page-risk-dim);
  font-size: 0.69rem;
  line-height: 1.35;
}

.web-page-risk-selected-stress strong {
  display: block;
  color: var(--web-page-risk-pearl);
  font-size: 0.72rem;
  font-weight: 600;
}

.web-page-risk-result-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.web-page-risk-result-idle {
  display: grid;
  min-height: 15rem;
  place-items: center;
  padding: 2rem;
  border: 1px dashed var(--web-page-risk-border-strong);
  color: var(--web-page-risk-muted);
  text-align: center;
}

.web-page-risk-result-idle svg {
  margin-bottom: 0.75rem;
  color: var(--web-page-risk-sand);
}

.web-page-risk-result-idle p {
  max-width: 31ch;
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
}

.web-page-risk-result-loading {
  display: grid;
  min-height: 15rem;
  place-items: center;
  color: var(--web-page-risk-muted);
  text-align: center;
}

.web-page-risk-loading-bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.32rem;
  height: 2.2rem;
  margin-bottom: 0.8rem;
}

.web-page-risk-loading-bars span {
  width: 0.35rem;
  background: var(--web-page-risk-sand);
  animation: web-page-risk-pulse 900ms ease-in-out infinite alternate;
}

.web-page-risk-loading-bars span:nth-child(1) { height: 0.7rem; animation-delay: -180ms; }
.web-page-risk-loading-bars span:nth-child(2) { height: 1.5rem; animation-delay: -360ms; }
.web-page-risk-loading-bars span:nth-child(3) { height: 2.2rem; animation-delay: -540ms; }
.web-page-risk-loading-bars span:nth-child(4) { height: 1.1rem; animation-delay: -720ms; }

@keyframes web-page-risk-pulse {
  to { opacity: 0.35; transform: scaleY(0.55); }
}

.web-page-risk-result-topline {
  align-items: flex-start;
}

.web-page-risk-result-score {
  margin-top: 1.1rem;
  color: var(--web-page-risk-pearl);
  font-size: clamp(2.6rem, 5vw, 4.3rem);
  font-weight: 500;
  letter-spacing: -0.08em;
}

.web-page-risk-result-score span {
  margin-left: 0.35rem;
  color: var(--web-page-risk-dim);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.72rem;
  letter-spacing: 0;
}

.web-page-risk-result-copy {
  max-width: 46ch;
  margin: 0.45rem 0 1.35rem;
  color: var(--web-page-risk-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.web-page-risk-result-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.web-page-risk-result-metric {
  padding: 0.8rem;
  border: 1px solid var(--web-page-risk-border);
  background: rgba(242, 241, 237, 0.025);
}

.web-page-risk-result-metric strong {
  display: block;
  margin-top: 0.45rem;
  color: var(--web-page-risk-pearl);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.9rem;
  font-weight: 500;
}

.web-page-risk-result-metric span {
  color: var(--web-page-risk-dim);
  font-size: 0.65rem;
}

.web-page-risk-protection-list {
  display: grid;
  gap: 0.7rem;
}

.web-page-risk-option-row {
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--web-page-risk-border);
}

.web-page-risk-option-row:first-child {
  padding-top: 0;
}

.web-page-risk-option-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.web-page-risk-option-copy {
  display: grid;
  grid-template-columns: 2.2rem minmax(0, 1fr);
  align-items: start;
  gap: 0.8rem;
}

.web-page-risk-option-icon {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  border: 1px solid var(--web-page-risk-border);
  color: var(--web-page-risk-sand-bright);
}

.web-page-risk-option-title {
  margin: 0;
  color: var(--web-page-risk-pearl);
  font-size: 0.82rem;
  font-weight: 600;
}

.web-page-risk-option-description {
  margin: 0.28rem 0 0;
  color: var(--web-page-risk-muted);
  font-size: 0.7rem;
  line-height: 1.4;
}

.web-page-risk-option-meta {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--web-page-risk-dim);
  text-align: right;
}

.web-page-risk-protection-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--web-page-risk-border);
}

.web-page-risk-protection-footer p {
  margin: 0;
  color: var(--web-page-risk-dim);
  font-size: 0.7rem;
  line-height: 1.4;
}

.web-page-risk-footer-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  color: var(--web-page-risk-dim);
  font-family: var(--metron-font-mono, monospace);
  font-size: 0.66rem;
}

.web-page-risk-footer-note svg {
  color: var(--web-page-risk-sand);
}

@media (max-width: 68rem) {
  .web-page-risk-summary,
  .web-page-risk-breakdown-grid,
  .web-page-risk-what-if-grid {
    grid-template-columns: 1fr;
  }

  .web-page-risk-scenario-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 48rem) {
  .web-page-risk-header {
    display: block;
  }

  .web-page-risk-header-status {
    justify-content: flex-start;
    margin-top: 1.15rem;
  }

  .web-page-risk-section-heading {
    display: block;
  }

  .web-page-risk-section-heading p {
    margin-top: 0.55rem;
    text-align: left;
  }

  .web-page-risk-chart-heading {
    display: block;
  }

  .web-page-risk-horizon-toggle {
    width: max-content;
    margin-top: 1rem;
  }
}

@media (max-width: 34rem) {
  .web-page-risk {
    padding-right: 0.8rem;
    padding-left: 0.8rem;
  }

  .web-page-risk-metric-grid,
  .web-page-risk-form-grid,
  .web-page-risk-result-metrics,
  .web-page-risk-regime-stats {
    grid-template-columns: 1fr;
  }

  .web-page-risk-metric-grid > :last-child {
    grid-column: auto;
  }

  .web-page-risk-scenario-grid {
    grid-template-columns: 1fr;
  }

  .web-page-risk-option-row,
  .web-page-risk-protection-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .web-page-risk-option-meta {
    margin-left: 3rem;
    text-align: left;
  }

  .web-page-risk-chart-body {
    grid-template-columns: 1.65rem minmax(0, 1fr);
    gap: 0.45rem;
  }

  .web-page-risk-chart-labels {
    font-size: 0.54rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .web-page-risk * {
    scroll-behavior: auto;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

function getProgressTone(value: number): "neutral" | "accent" | "success" | "warning" | "danger" {
  if (value >= 80) return "success";
  if (value >= 65) return "accent";
  return "warning";
}

export function RiskCenterPage() {
  const [horizon, setHorizon] = useState<Horizon>("7d");
  const [selectedScenarioId, setSelectedScenarioId] = useState("eth-drawdown");
  const [priceShock, setPriceShock] = useState(-25);
  const [marketRegime, setMarketRegime] = useState<MarketRegime>("choppy");
  const [simulationState, setSimulationState] = useState<SimulationState>("idle");
  const [protections, setProtections] = useState(protectionDefaults);

  useEffect(() => {
    if (simulationState !== "running") return undefined;
    const timer = window.setTimeout(() => setSimulationState("complete"), 720);
    return () => window.clearTimeout(timer);
  }, [simulationState]);

  const selectedScenario = stressScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? stressScenarios[0]!;
  const horizonValues = horizonData[horizon];
  const horizonPeak = Math.max(...horizonValues);
  const currentProtectionCount = Object.values(protections).filter(Boolean).length;

  const simulation = useMemo(() => {
    const magnitude = Math.abs(priceShock);
    const regimePenalty = marketRegime === "risk-off" ? 0.17 : marketRegime === "choppy" ? 0.08 : 0;
    const reserveLift = protections.reserveRepay ? 0.09 : 0;
    const guardrailLift = protections.healthGuardrail ? 0.07 : 0;
    const breakerLift = protections.circuitBreaker ? 0.05 : 0;
    const healthFactor = Math.max(0.84, 1.82 - magnitude * 0.018 - regimePenalty + reserveLift + guardrailLift);
    const probability = Math.min(96, Math.max(3, 7.8 + magnitude * 1.25 + regimePenalty * 24 - reserveLift * 18 - breakerLift * 15));
    const drawdown = Math.min(60, magnitude * 0.76 + (marketRegime === "risk-off" ? 4 : 0));
    return {
      healthFactor: healthFactor.toFixed(2),
      probability: `${probability.toFixed(1)}%`,
      drawdown: `-${drawdown.toFixed(1)}%`,
      isCritical: healthFactor < 1.2 || probability > 35,
    };
  }, [marketRegime, priceShock, protections]);

  const selectScenario = (scenario: StressScenario) => {
    setSelectedScenarioId(scenario.id);
    setPriceShock(scenario.shock);
    setMarketRegime(scenario.regime);
    setSimulationState("idle");
  };

  const updateProtection = (key: keyof typeof protections, enabled: boolean) => {
    setProtections((current) => ({ ...current, [key]: enabled }));
    setSimulationState("idle");
  };

  return (
    <main className="web-page-risk">
      <style>{riskPageStyles}</style>
      <div className="web-page-risk-main">
        <header className="web-page-risk-header">
          <div>
            <p className="web-page-risk-kicker">
              <ShieldAlert size={14} strokeWidth={1.8} aria-hidden="true" />
              Risk center
            </p>
            <h1>Protect the position before the market moves.</h1>
            <p className="web-page-risk-header-copy">
              A forward view of collateral health, liquidation exposure, and the controls that keep your strategy inside its guardrails.
            </p>
          </div>
          <div className="web-page-risk-header-status" aria-label="Risk center status">
            <Badge variant="sand" leadingIcon={<Activity size={13} strokeWidth={1.8} />}>
              Monitoring 3 venues
            </Badge>
            <span className="web-page-risk-status-line">
              <span className="web-page-risk-status-dot" aria-hidden="true" />
              Last synced 38 sec ago
            </span>
          </div>
        </header>

        <section className="web-page-risk-summary" aria-labelledby="risk-overview-title">
          <article className="web-page-risk-score-panel">
            <div className="web-page-risk-score-topline">
              <div>
                <h2 id="risk-overview-title" className="web-page-risk-score-title">
                  <Gauge size={17} strokeWidth={1.7} aria-hidden="true" />
                  Portfolio risk score
                </h2>
                <Badge variant="success" leadingIcon={<ShieldCheck size={13} strokeWidth={1.8} />}>
                  Low exposure
                </Badge>
              </div>
              <span className="web-page-risk-metric-label">Live estimate</span>
            </div>
            <div className="web-page-risk-score-value" aria-label="Risk score 82 out of 100">
              <span className="web-page-risk-score-number">82</span>
              <span className="web-page-risk-score-denominator">/ 100</span>
            </div>
            <p className="web-page-risk-score-description">
              Your buffer remains healthy, but leverage utilization and venue concentration are the two signals worth watching this week.
            </p>
            <Progress
              className="web-page-risk-score-progress"
              label="Risk score confidence"
              value={82}
              valueLabel="82 / 100"
              helperText="Confidence 91% from 14 active signals"
              tone="success"
              size="sm"
            />
            <p className="web-page-risk-score-footnote">
              <Check size={13} strokeWidth={2} aria-hidden="true" />
              No guardrail breaches in the last 24 hours
            </p>
          </article>

          <div className="web-page-risk-metric-grid">
            <MetricCard
              className="web-page-risk-metric-card"
              label="Health factor"
              value="1.82"
              change="+0.12 above your floor"
              changeTone="positive"
              icon={<ShieldCheck size={17} strokeWidth={1.8} />}
            />
            <MetricCard
              className="web-page-risk-metric-card"
              label="Max drawdown"
              value="-12.4%"
              change="-2.1% since last rebalance"
              changeTone="negative"
              icon={<TrendingDown size={17} strokeWidth={1.8} />}
            />
            <MetricCard
              className="web-page-risk-metric-card"
              label="Liquidation probability"
              value="7.8%"
              change="7 day horizon, below 15% watchline"
              changeTone="neutral"
              icon={<AlertTriangle size={17} strokeWidth={1.8} />}
            />
          </div>
        </section>

        <section className="web-page-risk-section" aria-labelledby="liquidation-title">
          <div className="web-page-risk-section-heading">
            <div>
              <p className="web-page-risk-section-kicker">Forward exposure</p>
              <h2 id="liquidation-title">Liquidation probability horizon</h2>
            </div>
            <p>Probability of a forced close under current collateral, leverage, and liquidity conditions.</p>
          </div>
          <div className="web-page-risk-chart-card">
            <div className="web-page-risk-chart-heading">
              <div>
                <h3 className="web-page-risk-chart-title">
                  <Waves size={16} strokeWidth={1.8} aria-hidden="true" />
                  Estimated liquidation probability
                </h3>
                <p className="web-page-risk-chart-subtitle">Watchline is set at 15% for this portfolio.</p>
              </div>
              <div className="web-page-risk-horizon-toggle" role="group" aria-label="Choose liquidation probability horizon">
                {(Object.keys(horizonData) as Horizon[]).map((option) => (
                  <button
                    key={option}
                    className="web-page-risk-horizon-button"
                    data-active={horizon === option}
                    type="button"
                    aria-pressed={horizon === option}
                    onClick={() => setHorizon(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="web-page-risk-chart-body">
              <div className="web-page-risk-chart-axis-column" aria-hidden="true">
                <span>15%</span>
                <span>10%</span>
                <span>5%</span>
                <span>0%</span>
              </div>
              <div
                className="web-page-risk-chart-plot"
                role="img"
                aria-label={`${horizon} liquidation probability rises from ${horizonValues[0].toFixed(1)} percent to ${horizonPeak.toFixed(1)} percent, with a 15 percent watchline`}
              >
                <div className="web-page-risk-chart-grid" aria-hidden="true">
                  <span className="web-page-risk-chart-grid-line" />
                  <span className="web-page-risk-chart-grid-line" />
                  <span className="web-page-risk-chart-grid-line" />
                  <span className="web-page-risk-chart-grid-line" />
                </div>
                <div className="web-page-risk-chart-threshold" aria-hidden="true">
                  <span>15% watchline</span>
                </div>
                <div className="web-page-risk-chart-bars">
                  {horizonValues.map((value, index) => (
                    <div
                      className="web-page-risk-chart-column"
                      key={`${horizon}-${index}`}
                      title={`${value.toFixed(1)}% probability`}
                    >
                      <div
                        className="web-page-risk-chart-bar"
                        style={{ height: `${Math.max(4, Math.min(100, (value / 15) * 100))}%` }}
                      >
                        <span className="web-page-risk-chart-marker" aria-hidden="true" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="web-page-risk-chart-labels" aria-hidden="true">
                  {horizonLabels[horizon].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="web-page-risk-chart-note">
              <span className="web-page-risk-legend">Watchline</span>
              <span>Current horizon peak <strong>{horizonPeak.toFixed(1)}%</strong></span>
              <span>Model confidence <strong>91%</strong></span>
            </div>
          </div>
        </section>

        <section className="web-page-risk-section" aria-labelledby="breakdown-title">
          <div className="web-page-risk-section-heading">
            <div>
              <p className="web-page-risk-section-kicker">Signal decomposition</p>
              <h2 id="breakdown-title">Risk breakdown</h2>
            </div>
            <p>Five weighted signals explain the current score. Higher values indicate more room before stress becomes material.</p>
          </div>
          <div className="web-page-risk-breakdown-grid">
            <div className="web-page-risk-panel">
              <div className="web-page-risk-panel-body">
                {breakdown.map((item) => (
                  <div className="web-page-risk-breakdown-row" key={item.label}>
                    <div className="web-page-risk-row-head">
                      <span className="web-page-risk-row-label">{item.label}</span>
                      <span className="web-page-risk-row-value">{item.value} / 100</span>
                    </div>
                    <Progress
                      className="web-page-risk-breakdown-progress"
                      label={item.label}
                      value={item.value}
                      valueLabel={`${item.value} out of 100`}
                      tone={getProgressTone(item.value)}
                      size="sm"
                    />
                    <p className="web-page-risk-breakdown-note">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <GlassCard
              className="web-page-risk-regime-card"
              title="Market regime"
              description="A composite read of trend, volatility, and available liquidity."
              action={<Badge variant="sand">74% confidence</Badge>}
            >
              <div className="web-page-risk-regime-topline">
                <div className="web-page-risk-regime-icon" aria-hidden="true">
                  <Sparkles size={21} strokeWidth={1.6} />
                </div>
                <Badge variant="success" leadingIcon={<ArrowUpRight size={13} strokeWidth={1.8} />}>
                  Constructive
                </Badge>
              </div>
              <h3 className="web-page-risk-regime-title">Constructive, but brittle</h3>
              <p className="web-page-risk-regime-copy">
                Trend remains supportive, while thinner weekend liquidity leaves less room for a fast move through collateral levels.
              </p>
              <div className="web-page-risk-regime-stats">
                <div className="web-page-risk-regime-stat">
                  <span className="web-page-risk-metric-label">Trend</span>
                  <strong>Positive</strong>
                </div>
                <div className="web-page-risk-regime-stat">
                  <span className="web-page-risk-metric-label">Volatility</span>
                  <strong>Medium</strong>
                </div>
                <div className="web-page-risk-regime-stat">
                  <span className="web-page-risk-metric-label">Liquidity</span>
                  <strong>Narrowing</strong>
                </div>
              </div>
              <Progress
                className="web-page-risk-regime-confidence"
                label="Regime confidence"
                value={74}
                valueLabel="74%"
                tone="accent"
                size="sm"
              />
            </GlassCard>
          </div>
        </section>

        <section className="web-page-risk-section" aria-labelledby="stress-title">
          <div className="web-page-risk-section-heading">
            <div>
              <p className="web-page-risk-section-kicker">Scenario lab</p>
              <h2 id="stress-title">Stress scenarios</h2>
            </div>
            <p>Select a scenario to load its assumptions into the what-if simulator below.</p>
          </div>
          <div className="web-page-risk-scenario-grid">
            {stressScenarios.map((scenario) => (
              <button
                className="web-page-risk-scenario"
                key={scenario.id}
                data-selected={selectedScenarioId === scenario.id}
                type="button"
                aria-pressed={selectedScenarioId === scenario.id}
                onClick={() => selectScenario(scenario)}
              >
                <div className="web-page-risk-scenario-meta">
                  <Badge variant={scenario.id === "correlated-selloff" ? "crimson" : "neutral"}>
                    {scenario.probability}
                  </Badge>
                  {selectedScenarioId === scenario.id ? <Check size={15} strokeWidth={2} aria-label="Selected" /> : <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" />}
                </div>
                <h3>{scenario.title}</h3>
                <p>{scenario.detail}</p>
                <div className="web-page-risk-scenario-meta">
                  <span className="web-page-risk-scenario-impact">
                    <span>Projected impact</span>
                    {scenario.impact}
                  </span>
                  <span className="web-page-risk-scenario-impact">
                    <span>Outcome</span>
                    {scenario.outcome}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="web-page-risk-section" aria-labelledby="what-if-title">
          <div className="web-page-risk-section-heading">
            <div>
              <p className="web-page-risk-section-kicker">Operator controls</p>
              <h2 id="what-if-title">What if the market turns?</h2>
            </div>
            <p>Run a local cascade simulation before changing leverage or protection settings.</p>
          </div>
          <div className="web-page-risk-what-if-grid">
            <GlassCard className="web-page-risk-what-if-card">
              <div className="web-page-risk-card-topline">
                <div className="web-page-risk-card-heading">
                  <Zap size={17} strokeWidth={1.8} aria-hidden="true" />
                  <h3>Scenario inputs</h3>
                </div>
                <Badge variant="outline">Hardcoded model</Badge>
              </div>
              <p className="web-page-risk-card-description">
                Adjust the shock and regime. The preview uses your active protection switches and current collateral snapshot.
              </p>
              <div className="web-page-risk-form-grid">
                <Field
                  label="ETH price shock"
                  description="From -1% to -60%"
                  id="risk-price-shock"
                >
                  <Input
                    type="number"
                    min={-60}
                    max={-1}
                    step={1}
                    value={priceShock}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      if (Number.isFinite(parsed)) {
                        setPriceShock(Math.min(-1, Math.max(-60, parsed)));
                        setSimulationState("idle");
                      }
                    }}
                  />
                </Field>
                <Field
                  label="Market regime"
                  description="Changes liquidity penalty"
                  id="risk-market-regime"
                >
                  <Select
                    value={marketRegime}
                    onChange={(event) => {
                      setMarketRegime(event.target.value as MarketRegime);
                      setSimulationState("idle");
                    }}
                  >
                    <option value="constructive">Constructive</option>
                    <option value="choppy">Choppy</option>
                    <option value="risk-off">Risk-off</option>
                  </Select>
                </Field>
              </div>
              <div className="web-page-risk-form-actions">
                <span className="web-page-risk-selected-stress">
                  Loaded scenario
                  <strong>{selectedScenario.title}</strong>
                </span>
                <Button
                  type="button"
                  variant="crimson"
                  size="sm"
                  loading={simulationState === "running"}
                  loadingLabel="Simulating"
                  leadingIcon={<RefreshCw size={15} strokeWidth={1.9} />}
                  onClick={() => setSimulationState("running")}
                >
                  Run simulation
                </Button>
              </div>
            </GlassCard>

            <GlassCard className="web-page-risk-result-card">
              {simulationState === "idle" ? (
                <div className="web-page-risk-result-idle" role="status">
                  <div>
                    <CircleHelp size={25} strokeWidth={1.5} aria-hidden="true" />
                    <p>Run the cascade simulation to see health factor, drawdown, and liquidation probability under this shock.</p>
                  </div>
                </div>
              ) : simulationState === "running" ? (
                <div className="web-page-risk-result-loading" role="status" aria-live="polite">
                  <div>
                    <div className="web-page-risk-loading-bars" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <p>Tracing collateral across 3 venues</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="web-page-risk-result-topline">
                    <div>
                      <span className="web-page-risk-result-label">Cascade simulation result</span>
                      <div className="web-page-risk-result-score">{simulation.healthFactor}<span>health factor</span></div>
                    </div>
                    <Badge variant={simulation.isCritical ? "crimson" : "success"} leadingIcon={simulation.isCritical ? <AlertTriangle size={13} strokeWidth={1.8} /> : <ShieldCheck size={13} strokeWidth={1.8} />}>
                      {simulation.isCritical ? "Action required" : "Within guardrails"}
                    </Badge>
                  </div>
                  <p className="web-page-risk-result-copy">
                    At a {Math.abs(priceShock)}% ETH shock in a {marketRegime.replace("-", " ")} regime, your active protections leave {simulation.healthFactor} of collateral coverage before liquidation conditions become active.
                  </p>
                  {simulation.isCritical ? (
                    <InlineAlert
                      variant="warning"
                      title="Protection review recommended"
                      icon={<AlertTriangle size={16} strokeWidth={1.8} />}
                    >
                      Reduce leverage or enable reserve repayment before running this scenario live.
                    </InlineAlert>
                  ) : (
                    <InlineAlert
                      variant="success"
                      title="No immediate intervention"
                      icon={<ShieldCheck size={16} strokeWidth={1.8} />}
                    >
                      Keep the health guardrail enabled and recheck after the next rebalance window.
                    </InlineAlert>
                  )}
                  <div className="web-page-risk-result-metrics">
                    <div className="web-page-risk-result-metric">
                      <span>Liquidation probability</span>
                      <strong>{simulation.probability}</strong>
                    </div>
                    <div className="web-page-risk-result-metric">
                      <span>Projected drawdown</span>
                      <strong>{simulation.drawdown}</strong>
                    </div>
                    <div className="web-page-risk-result-metric">
                      <span>Protections active</span>
                      <strong>{currentProtectionCount} / 3</strong>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </section>

        <section className="web-page-risk-section" aria-labelledby="protection-title">
          <div className="web-page-risk-section-heading">
            <div>
              <p className="web-page-risk-section-kicker">Position controls</p>
              <h2 id="protection-title">Protection options</h2>
            </div>
            <p>These controls are local preferences until you confirm them in the execution center.</p>
          </div>
          <GlassCard>
            <div className="web-page-risk-protection-list">
              <div className="web-page-risk-option-row">
                <div className="web-page-risk-option-copy">
                  <span className="web-page-risk-option-icon" aria-hidden="true"><ShieldCheck size={17} strokeWidth={1.8} /></span>
                  <div>
                    <p className="web-page-risk-option-title">Health factor guardrail</p>
                    <p className="web-page-risk-option-description">Pause new leverage when health factor falls below 1.45.</p>
                  </div>
                </div>
                <span className="web-page-risk-option-meta">Floor 1.45</span>
                <Switch
                  aria-label="Enable health factor guardrail"
                  checked={protections.healthGuardrail}
                  onCheckedChange={(checked) => updateProtection("healthGuardrail", checked)}
                />
              </div>
              <div className="web-page-risk-option-row">
                <div className="web-page-risk-option-copy">
                  <span className="web-page-risk-option-icon" aria-hidden="true"><ArrowDownRight size={17} strokeWidth={1.8} /></span>
                  <div>
                    <p className="web-page-risk-option-title">Auto-repay from reserve</p>
                    <p className="web-page-risk-option-description">Use idle USDC to repay debt when the watchline is crossed.</p>
                  </div>
                </div>
                <span className="web-page-risk-option-meta">Reserve $18.4k</span>
                <Switch
                  aria-label="Enable auto repay from reserve"
                  checked={protections.reserveRepay}
                  onCheckedChange={(checked) => updateProtection("reserveRepay", checked)}
                />
              </div>
              <div className="web-page-risk-option-row">
                <div className="web-page-risk-option-copy">
                  <span className="web-page-risk-option-icon" aria-hidden="true"><LockKeyhole size={17} strokeWidth={1.8} /></span>
                  <div>
                    <p className="web-page-risk-option-title">Oracle circuit breaker</p>
                    <p className="web-page-risk-option-description">Block execution when venue prices diverge by more than 2%.</p>
                  </div>
                </div>
                <span className="web-page-risk-option-meta">Deviation 2%</span>
                <Switch
                  aria-label="Enable oracle circuit breaker"
                  checked={protections.circuitBreaker}
                  onCheckedChange={(checked) => updateProtection("circuitBreaker", checked)}
                />
              </div>
            </div>
            <div className="web-page-risk-protection-footer">
              <p>Changes affect the next simulation and require confirmation before execution.</p>
              <Button type="button" variant="outline" size="sm" trailingIcon={<ChevronRight size={15} strokeWidth={1.8} />}>
                Review controls
              </Button>
            </div>
          </GlassCard>
        </section>

        <p className="web-page-risk-footer-note">
          <CircleHelp size={13} strokeWidth={1.8} aria-hidden="true" />
          Model snapshot: block 21,047,812. This page is an analytical view, not a liquidation guarantee.
        </p>
      </div>
    </main>
  );
}
