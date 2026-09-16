import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Droplets,
  Gauge,
  Layers3,
  Network,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Badge, Button, GlassCard, InlineAlert, MetricCard, Progress, Timeline } from "@metron/ui";

const chains = [
  { name: "Ethereum", short: "ETH", value: "$41,820", share: 46, color: "#d7b98c" },
  { name: "Arbitrum", short: "ARB", value: "$24,560", share: 27, color: "#8a9bb0" },
  { name: "Base", short: "BASE", value: "$16,390", share: 18, color: "#7184ba" },
  { name: "Solana", short: "SOL", value: "$8,120", share: 9, color: "#9d6d78" },
];

const strategies = [
  {
    name: "Basis harvest",
    venue: "ETH / USDC · Aave + Pendle",
    pnl: "+$842.18",
    change: "+4.7%",
    risk: "Low",
    status: "Running",
    icon: Droplets,
  },
  {
    name: "Delta neutral carry",
    venue: "ETH perp · Hyperliquid",
    pnl: "+$516.40",
    change: "+2.9%",
    risk: "Moderate",
    status: "Running",
    icon: BarChart3,
  },
  {
    name: "Stablecoin rotation",
    venue: "USDC / USDT · Morpho",
    pnl: "+$188.04",
    change: "+1.8%",
    risk: "Low",
    status: "Review",
    icon: CircleDollarSign,
  },
];

const activity = [
  {
    title: "Rebalance executed",
    description: "Basis harvest moved 2.4 ETH into Pendle PT-eETH",
    meta: "12 min ago · Ethereum",
    status: "complete" as const,
    icon: <CheckCircle2 size={14} />,
  },
  {
    title: "Risk threshold updated",
    description: "Utilization guard lowered from 78% to 72%",
    meta: "48 min ago · Risk center",
    status: "current" as const,
    icon: <ShieldCheck size={14} />,
  },
  {
    title: "Yield collected",
    description: "$126.82 claimable rewards swept to treasury",
    meta: "2h ago · Arbitrum",
    status: "complete" as const,
    icon: <Zap size={14} />,
  },
  {
    title: "New position opened",
    description: "Delta neutral carry allocated $4,200 collateral",
    meta: "5h ago · Hyperliquid",
    status: "complete" as const,
    icon: <Wallet size={14} />,
  },
];

export function DashboardPage() {
  const [period, setPeriod] = useState("30D");
  const [alertVisible, setAlertVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  return (
    <main className="web-page-dashboard" aria-labelledby="dashboard-title">
      <header className="web-page-dashboard__header">
        <div>
          <p className="web-page-dashboard__eyebrow">Control room / Overview</p>
          <h1 id="dashboard-title">Good morning, operator.</h1>
          <p className="web-page-dashboard__lede">
            Your positions are healthy. Two conditions need review before the next rebalance window.
          </p>
        </div>
        <div className="web-page-dashboard__header-actions">
          <Badge variant="success" leadingIcon={<Activity size={13} />}>
            Systems nominal
          </Badge>
          <Button variant="crimson" size="sm" leadingIcon={<Sparkles size={15} />}>
            Create intent
          </Button>
        </div>
      </header>

      {alertVisible && (
        <InlineAlert
          className="web-page-dashboard__alert"
          variant="warning"
          title="Review required"
          icon={<AlertTriangle size={17} />}
          role="status"
        >
          <span>Stablecoin rotation crossed its utilization watch level on Morpho.</span>{" "}
          <button
            className="web-page-dashboard__inline-link"
            onClick={() => setAlertVisible(false)}
          >
            Dismiss
          </button>
        </InlineAlert>
      )}

      <section className="web-page-dashboard__metrics" aria-label="Portfolio summary">
        <MetricCard
          label="Total portfolio"
          value="$90,890.42"
          change="+$1,546.62 today"
          changeTone="positive"
          icon={<Wallet size={18} />}
        />
        <MetricCard
          label="30 day return"
          value="+8.42%"
          change="+2.1% vs benchmark"
          changeTone="positive"
          icon={<ArrowUpRight size={18} />}
        />
        <MetricCard
          label="Net exposure"
          value="+$12,640"
          change="13.9% of NAV"
          changeTone="neutral"
          icon={<Layers3 size={18} />}
        />
        <MetricCard
          label="Available liquidity"
          value="$18,240"
          change="20.1% of NAV"
          changeTone="neutral"
          icon={<Droplets size={18} />}
        />
      </section>

      <section className="web-page-dashboard__primary-grid">
        <GlassCard
          className="web-page-dashboard__health"
          title="Portfolio health"
          description="Composite view across exposure, liquidity, and execution."
          action={
            <Badge variant="success" leadingIcon={<CheckCircle2 size={13} />}>
              Healthy
            </Badge>
          }
        >
          <div className="web-page-dashboard__health-score">
            <div className="web-page-dashboard__score-ring">
              <strong>82</strong>
              <span>/ 100</span>
            </div>
            <div>
              <p className="web-page-dashboard__health-callout">Stable with room to deploy</p>
              <p className="web-page-dashboard__muted">
                Risk budget is 38% utilized. No liquidation proximity detected.
              </p>
            </div>
          </div>
          <div className="web-page-dashboard__health-bars">
            <Progress
              label="Liquidity coverage"
              value={78}
              valueLabel="78%"
              tone="success"
              size="sm"
              helperText="17 days at current burn"
            />
            <Progress
              label="Risk budget"
              value={38}
              valueLabel="38%"
              tone="accent"
              size="sm"
              helperText="$24,680 remaining"
            />
            <Progress
              label="Execution quality"
              value={94}
              valueLabel="94%"
              tone="success"
              size="sm"
              helperText="Across 142 fills"
            />
          </div>
        </GlassCard>

        <GlassCard
          className="web-page-dashboard__allocation"
          title="Chain allocation"
          description="Capital by settlement network."
          action={
            <Button variant="ghost" size="sm" trailingIcon={<ChevronRight size={14} />}>
              Details
            </Button>
          }
        >
          <div className="web-page-dashboard__allocation-total">
            <span>$90,890.42</span>
            <small>across 4 chains</small>
          </div>
          <div
            className="web-page-dashboard__allocation-track"
            aria-label="Chain allocation breakdown"
          >
            {chains.map((chain) => (
              <span
                key={chain.short}
                style={{ width: `${chain.share}%`, backgroundColor: chain.color }}
              />
            ))}
          </div>
          <div className="web-page-dashboard__chain-list">
            {chains.map((chain) => (
              <div className="web-page-dashboard__chain-row" key={chain.short}>
                <span className="web-page-dashboard__chain-name">
                  <i style={{ backgroundColor: chain.color }} />
                  {chain.name}
                </span>
                <span>{chain.value}</span>
                <strong>{chain.share}%</strong>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="web-page-dashboard__section-head">
        <div>
          <p className="web-page-dashboard__eyebrow">Live book</p>
          <h2>Active strategies</h2>
        </div>
        <Button variant="outline" size="sm" trailingIcon={<ChevronRight size={14} />}>
          View all strategies
        </Button>
      </section>
      <section className="web-page-dashboard__strategy-grid" aria-label="Active strategies">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          return (
            <GlassCard key={strategy.name} className="web-page-dashboard__strategy-card">
              <div className="web-page-dashboard__strategy-top">
                <span className="web-page-dashboard__strategy-icon">
                  <Icon size={17} />
                </span>
                <Badge variant={strategy.status === "Running" ? "success" : "warning"}>
                  {strategy.status}
                </Badge>
              </div>
              <h3>{strategy.name}</h3>
              <p className="web-page-dashboard__muted">{strategy.venue}</p>
              <div className="web-page-dashboard__strategy-result">
                <span>{strategy.pnl}</span>
                <strong>{strategy.change}</strong>
              </div>
              <div className="web-page-dashboard__strategy-meta">
                <span>
                  <Gauge size={13} /> {strategy.risk} risk
                </span>
                <span>
                  <Clock3 size={13} /> Updated 8m ago
                </span>
              </div>
            </GlassCard>
          );
        })}
      </section>

      <section className="web-page-dashboard__lower-grid">
        <GlassCard
          className="web-page-dashboard__alerts"
          title="Risk alerts"
          description="Signals requiring operator attention."
          action={
            <Badge variant="crimson" leadingIcon={<Bell size={13} />}>
              2 open
            </Badge>
          }
        >
          <div className="web-page-dashboard__risk-list">
            <div className="web-page-dashboard__risk-item web-page-dashboard__risk-item--high">
              <AlertTriangle size={17} />
              <div>
                <strong>Morpho utilization is elevated</strong>
                <p>USDC/USDT pool at 72.4%, approaching your 75% guard.</p>
              </div>
              <button aria-label="Open utilization alert">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="web-page-dashboard__risk-item">
              <Bell size={17} />
              <div>
                <strong>Funding rate divergence</strong>
                <p>Hyperliquid ETH perp spread widened to 14 bps.</p>
              </div>
              <button aria-label="Open funding alert">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </GlassCard>
        <GlassCard
          className="web-page-dashboard__automation"
          title="Automation status"
          description="Guardrails and scheduled actions."
        >
          <div className="web-page-dashboard__automation-state">
            <span
              className={
                paused
                  ? "web-page-dashboard__status-dot web-page-dashboard__status-dot--paused"
                  : "web-page-dashboard__status-dot"
              }
            />
            <div>
              <strong>{paused ? "Paused by operator" : "All automations running"}</strong>
              <p className="web-page-dashboard__muted">Next rebalance window in 01:42:18</p>
            </div>
            <Button
              variant={paused ? "primary" : "outline"}
              size="sm"
              leadingIcon={paused ? <Play size={14} /> : <Pause size={14} />}
              onClick={() => setPaused(!paused)}
            >
              {paused ? "Resume" : "Pause"}
            </Button>
          </div>
          <div className="web-page-dashboard__automation-foot">
            <span>4 active rules</span>
            <span>Last check 2 min ago</span>
          </div>
        </GlassCard>
      </section>

      <section className="web-page-dashboard__section-head">
        <div>
          <p className="web-page-dashboard__eyebrow">Audit trail</p>
          <h2>Recent activity</h2>
        </div>
        <div className="web-page-dashboard__periods" role="group" aria-label="Activity period">
          {["24H", "7D", "30D"].map((item) => (
            <button
              key={item}
              className={period === item ? "is-active" : ""}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <GlassCard
        className="web-page-dashboard__activity"
        aria-label={`Recent activity for ${period}`}
      >
        <Timeline items={activity} />
      </GlassCard>

      <footer className="web-page-dashboard__footer">
        <span>
          <Network size={14} /> Data synced 18 seconds ago
        </span>
        <span>Block 19,842,116 · Ethereum mainnet</span>
        <Button variant="quiet" size="sm" trailingIcon={<ArrowDownRight size={14} />}>
          Export report
        </Button>
      </footer>
    </main>
  );
}
