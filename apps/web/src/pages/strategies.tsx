import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  Filter,
  Gauge,
  Layers3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { Badge, Button, Select, ThinkingOrb } from "@metron/ui";

type Strategy = {
  id: string;
  rank: number;
  name: string;
  shortName: string;
  summary: string;
  protocol: string;
  network: string;
  apy: string;
  apyValue: number;
  drawdown: string;
  drawdownValue: number;
  tvl: string;
  capital: string;
  rebalance: string;
  risk: "Low" | "Moderate" | "Elevated";
  fit: number;
  tags: string[];
  accent: string;
};

const strategies: [Strategy, ...Strategy[]] = [
  {
    id: "delta-anchor",
    rank: 1,
    name: "Delta Anchor",
    shortName: "Delta Anchor",
    summary:
      "Lend stable collateral, then hedge the variable borrow leg to keep net delta close to zero.",
    protocol: "Aave + Synthetix",
    network: "Arbitrum",
    apy: "11.8%",
    apyValue: 11.8,
    drawdown: "-3.1%",
    drawdownValue: 3.1,
    tvl: "$428M",
    capital: "$10,000 minimum",
    rebalance: "Every 8 hours",
    risk: "Low",
    fit: 96,
    tags: ["Delta neutral", "Automated hedge"],
    accent: "#c8aa8e",
  },
  {
    id: "stable-loop",
    rank: 2,
    name: "Stable Loop",
    shortName: "Stable Loop",
    summary:
      "A conservative lending loop that compounds stablecoin supply incentives without directional exposure.",
    protocol: "Morpho Blue",
    network: "Base",
    apy: "10.6%",
    apyValue: 10.6,
    drawdown: "-2.4%",
    drawdownValue: 2.4,
    tvl: "$216M",
    capital: "$2,500 minimum",
    rebalance: "Daily",
    risk: "Low",
    fit: 91,
    tags: ["Stable yield", "Low maintenance"],
    accent: "#9b1730",
  },
  {
    id: "carry-grid",
    rank: 3,
    name: "Carry Grid",
    shortName: "Carry Grid",
    summary:
      "Capture funding carry across liquid perpetuals while a small spot basket dampens regime shifts.",
    protocol: "Drift + Jupiter",
    network: "Solana",
    apy: "17.4%",
    apyValue: 17.4,
    drawdown: "-7.8%",
    drawdownValue: 7.8,
    tvl: "$93M",
    capital: "$5,000 minimum",
    rebalance: "Every 4 hours",
    risk: "Elevated",
    fit: 78,
    tags: ["Higher carry", "More active"],
    accent: "#b38f6f",
  },
  {
    id: "range-liquidity",
    rank: 4,
    name: "Range Liquidity",
    shortName: "Range Liquidity",
    summary:
      "Concentrated ETH and USDC liquidity with a guarded range and automatic fee harvesting.",
    protocol: "Uniswap v4",
    network: "Ethereum",
    apy: "14.2%",
    apyValue: 14.2,
    drawdown: "-6.2%",
    drawdownValue: 6.2,
    tvl: "$1.2B",
    capital: "$7,500 minimum",
    rebalance: "When range breaks",
    risk: "Moderate",
    fit: 74,
    tags: ["Fee capture", "ETH exposure"],
    accent: "#6b7280",
  },
];

const colors = {
  canvas: "#070708",
  surface: "#101012",
  raised: "#151518",
  border: "rgba(242, 241, 237, 0.14)",
  borderStrong: "rgba(242, 241, 237, 0.28)",
  text: "#f2f1ed",
  muted: "rgba(242, 241, 237, 0.64)",
  dim: "rgba(242, 241, 237, 0.42)",
  sand: "#c8aa8e",
  crimson: "#9b1730",
  green: "#55c995",
};

const panelStyle = {
  border: `1px solid ${colors.border}`,
  background: `linear-gradient(135deg, rgba(242,241,237,.05), rgba(12,12,14,.76) 44%), ${colors.surface}`,
  borderRadius: "16px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.06), 0 18px 55px rgba(0,0,0,.22)",
};

const labelStyle = {
  color: colors.dim,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

function RiskBadge({ risk }: { risk: Strategy["risk"] }) {
  const variant = risk === "Low" ? "success" : risk === "Moderate" ? "sand" : "crimson";
  return <Badge variant={variant}>{risk} risk</Badge>;
}

function StrategyCard({
  strategy,
  selected,
  inspected,
  busy,
  onInspect,
  onSelect,
}: {
  strategy: Strategy;
  selected: boolean;
  inspected: boolean;
  busy: "inspect" | "select" | null;
  onInspect: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className="web-page-strategies-candidate"
      style={{
        ...panelStyle,
        position: "relative",
        overflow: "hidden",
        borderColor: selected ? colors.sand : colors.border,
        boxShadow: selected
          ? `inset 3px 0 0 ${colors.sand}, 0 0 0 1px rgba(200,170,142,.18), 0 22px 68px rgba(0,0,0,.3)`
          : panelStyle.boxShadow,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "34%",
          height: "3px",
          background: strategy.accent,
          opacity: selected ? 1 : 0.65,
        }}
      />
      <div style={{ padding: "22px 22px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                display: "grid",
                width: "30px",
                height: "30px",
                placeItems: "center",
                border: `1px solid ${selected ? colors.sand : colors.border}`,
                borderRadius: "9px",
                color: selected ? colors.sand : colors.muted,
                fontFamily: "var(--metron-font-mono)",
                fontSize: "12px",
              }}
            >
              0{strategy.rank}
            </span>
            <div>
              <h3
                style={{
                  margin: 0,
                  color: colors.text,
                  fontSize: "18px",
                  letterSpacing: "-0.02em",
                }}
              >
                {strategy.name}
              </h3>
              <p style={{ margin: "4px 0 0", color: colors.muted, fontSize: "12px" }}>
                {strategy.protocol} · {strategy.network}
              </p>
            </div>
          </div>
          <RiskBadge risk={strategy.risk} />
        </div>

        <p
          style={{
            minHeight: "46px",
            margin: "20px 0 18px",
            color: colors.muted,
            fontSize: "13px",
            lineHeight: 1.55,
          }}
        >
          {strategy.summary}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px",
            borderTop: `1px solid ${colors.border}`,
            borderBottom: `1px solid ${colors.border}`,
            padding: "15px 0",
          }}
        >
          <div>
            <span style={labelStyle}>Net APY</span>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                color: colors.text,
                fontFamily: "var(--metron-font-mono)",
                fontSize: "19px",
                fontWeight: 500,
              }}
            >
              {strategy.apy}
            </strong>
          </div>
          <div>
            <span style={labelStyle}>Worst month</span>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                color: colors.text,
                fontFamily: "var(--metron-font-mono)",
                fontSize: "19px",
                fontWeight: 500,
              }}
            >
              {strategy.drawdown}
            </strong>
          </div>
          <div>
            <span style={labelStyle}>Model fit</span>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                color: colors.sand,
                fontFamily: "var(--metron-font-mono)",
                fontSize: "19px",
                fontWeight: 500,
              }}
            >
              {strategy.fit}%
            </strong>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "14px" }}>
          {strategy.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          borderTop: `1px solid ${colors.border}`,
          padding: "13px 18px",
        }}
      >
        <Button
          variant="quiet"
          size="sm"
          loading={busy === "inspect"}
          loadingLabel="Inspecting"
          leadingIcon={
            busy === "inspect" ? undefined : inspected ? (
              <X size={14} />
            ) : (
              <ExternalLink size={14} />
            )
          }
          onClick={onInspect}
          aria-expanded={inspected}
          disabled={busy !== null}
        >
          {inspected ? "Close details" : "Inspect"}
        </Button>
        <Button
          variant={selected ? "sand" : "outline"}
          size="sm"
          loading={busy === "select"}
          loadingLabel="Selecting"
          trailingIcon={
            busy ? undefined : selected ? <Check size={14} /> : <ChevronRight size={14} />
          }
          onClick={onSelect}
          aria-pressed={selected}
          disabled={busy !== null}
        >
          {selected ? "Selected" : "Select strategy"}
        </Button>
      </div>
    </article>
  );
}

export function StrategiesPage() {
  const [riskFilter, setRiskFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [sortBy, setSortBy] = useState("fit");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("delta-anchor");
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [action, setAction] = useState<{
    kind: "inspect" | "select" | "reset" | "show";
    strategyId: string | undefined;
    status: "running" | "success" | "error";
    message: string;
  } | null>(null);

  const runAction = (
    kind: "inspect" | "select" | "reset" | "show",
    message: string,
    strategyId?: string,
    complete?: () => void,
  ) => {
    setAction({ kind, strategyId, status: "running", message: `${message}…` });
    window.setTimeout(() => {
      complete?.();
      setAction({ kind, strategyId, status: "success", message: `${message} complete.` });
    }, 500);
  };

  const inspectStrategy = (strategyId: string) => {
    if (inspectedId === strategyId) {
      setInspectedId(null);
      setAction({ kind: "inspect", strategyId, status: "success", message: "Inspection closed." });
      return;
    }
    runAction("inspect", "Loading inspection report", strategyId, () => setInspectedId(strategyId));
  };

  const selectStrategy = (strategyId: string) => {
    if (selectedId === strategyId) {
      setAction({
        kind: "select",
        strategyId,
        status: "success",
        message: "Strategy is already selected.",
      });
      return;
    }
    const strategy = strategies.find((candidate) => candidate.id === strategyId);
    runAction("select", `Selecting ${strategy?.name ?? "strategy"}`, strategyId, () =>
      setSelectedId(strategyId),
    );
  };
  const filteredStrategies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = strategies.filter((strategy) => {
      const matchesRisk = riskFilter === "all" || strategy.risk.toLowerCase() === riskFilter;
      const matchesNetwork =
        networkFilter === "all" || strategy.network.toLowerCase() === networkFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${strategy.name} ${strategy.protocol} ${strategy.network} ${strategy.tags.join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesRisk && matchesNetwork && matchesQuery;
    });
    return [...filtered].sort((a, b) =>
      sortBy === "apy"
        ? b.apyValue - a.apyValue
        : sortBy === "drawdown"
          ? a.drawdownValue - b.drawdownValue
          : b.fit - a.fit,
    );
  }, [networkFilter, query, riskFilter, sortBy]);

  const selectedStrategy =
    strategies.find((strategy) => strategy.id === selectedId) ?? strategies[0];
  const inspectedStrategy = strategies.find((strategy) => strategy.id === inspectedId);

  return (
    <main
      className="web-page-strategies"
      style={{
        minHeight: "100%",
        background: colors.canvas,
        color: colors.text,
        padding: "30px clamp(18px, 4vw, 58px) 72px",
      }}
    >
      <div
        className="web-page-strategies__container"
        style={{ width: "min(100%, 1420px)", margin: "0 auto" }}
      >
        <header
          className="web-page-strategies__header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "26px",
            paddingBottom: "28px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "17px" }}
            >
              <Badge variant="crimson" leadingIcon={<Sparkles size={13} />}>
                Solver complete
              </Badge>
              <span
                style={{
                  color: colors.dim,
                  fontSize: "12px",
                  fontFamily: "var(--metron-font-mono)",
                }}
              >
                Run 24-0917-A
              </span>
            </div>
            <h1
              style={{
                maxWidth: "640px",
                margin: 0,
                fontSize: "clamp(30px, 4vw, 52px)",
                lineHeight: 1.02,
                letterSpacing: "-0.05em",
                fontWeight: 600,
              }}
            >
              Strategies for stable, uncorrelated yield
            </h1>
            <p
              style={{
                maxWidth: "640px",
                margin: "16px 0 0",
                color: colors.muted,
                fontSize: "15px",
                lineHeight: 1.55,
              }}
            >
              Your intent is ready. Four candidates match the requested return, risk ceiling, and
              delta-neutral constraint.
            </p>
          </div>
          <div
            style={{
              minWidth: "215px",
              padding: "16px 18px",
              borderLeft: `2px solid ${colors.crimson}`,
              background: "rgba(113,0,20,.10)",
            }}
          >
            <span style={labelStyle}>Current intent</span>
            <strong
              style={{ display: "block", marginTop: "8px", fontSize: "16px", fontWeight: 500 }}
            >
              Protect principal
            </strong>
            <span
              style={{ display: "block", marginTop: "4px", color: colors.muted, fontSize: "12px" }}
            >
              12% APY · 5% drawdown max
            </span>
          </div>
        </header>

        <section
          aria-label="Intent constraints"
          className="web-page-strategies__intent"
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 1fr 1fr 1fr",
            gap: "1px",
            marginTop: "26px",
            border: `1px solid ${colors.border}`,
            background: colors.border,
          }}
        >
          {[
            {
              icon: <Target size={16} />,
              label: "Objective",
              value: "12% minimum APY",
              note: "Net of estimated fees",
            },
            {
              icon: <ShieldCheck size={16} />,
              label: "Risk ceiling",
              value: "5% max drawdown",
              note: "90-day rolling model",
            },
            {
              icon: <Layers3 size={16} />,
              label: "Exposure",
              value: "Delta neutral",
              note: "Target net delta 0",
            },
            {
              icon: <WalletCards size={16} />,
              label: "Capital",
              value: "$25,000 ready",
              note: "USDC on Arbitrum",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{ minWidth: 0, padding: "17px 18px", background: colors.surface }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px", color: colors.sand }}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span style={labelStyle}>{item.label}</span>
              </div>
              <strong
                style={{
                  display: "block",
                  marginTop: "12px",
                  color: colors.text,
                  fontSize: "15px",
                  fontWeight: 500,
                }}
              >
                {item.value}
              </strong>
              <span
                style={{ display: "block", marginTop: "4px", color: colors.dim, fontSize: "12px" }}
              >
                {item.note}
              </span>
            </div>
          ))}
        </section>

        <section
          className="web-page-strategies__controls"
          aria-label="Strategy filters"
          style={{
            display: "flex",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "12px",
            padding: "28px 0 17px",
          }}
        >
          <div style={{ flex: "1 1 230px", minWidth: "190px" }}>
            <label
              htmlFor="strategy-search"
              style={{ ...labelStyle, display: "block", marginBottom: "8px" }}
            >
              Search candidates
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: colors.dim,
                }}
              />
              <input
                id="strategy-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, protocol, network"
                style={{
                  width: "100%",
                  height: "40px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "9px",
                  padding: "0 13px 0 36px",
                  background: colors.surface,
                  color: colors.text,
                  outline: "none",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>
          <div style={{ minWidth: "150px" }}>
            <label
              htmlFor="risk-filter"
              style={{ ...labelStyle, display: "block", marginBottom: "8px" }}
            >
              Risk profile
            </label>
            <Select
              id="risk-filter"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              style={{ width: "100%", height: "40px" }}
            >
              <option value="all">All risk levels</option>
              <option value="low">Low risk</option>
              <option value="moderate">Moderate risk</option>
              <option value="elevated">Elevated risk</option>
            </Select>
          </div>
          <div style={{ minWidth: "150px" }}>
            <label
              htmlFor="network-filter"
              style={{ ...labelStyle, display: "block", marginBottom: "8px" }}
            >
              Network
            </label>
            <Select
              id="network-filter"
              value={networkFilter}
              onChange={(event) => setNetworkFilter(event.target.value)}
              style={{ width: "100%", height: "40px" }}
            >
              <option value="all">All networks</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="base">Base</option>
              <option value="solana">Solana</option>
              <option value="ethereum">Ethereum</option>
            </Select>
          </div>
          <div style={{ minWidth: "165px" }}>
            <label
              htmlFor="sort-strategies"
              style={{ ...labelStyle, display: "block", marginBottom: "8px" }}
            >
              Sort by
            </label>
            <Select
              id="sort-strategies"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{ width: "100%", height: "40px" }}
            >
              <option value="fit">Best fit</option>
              <option value="apy">Highest APY</option>
              <option value="drawdown">Lowest drawdown</option>
            </Select>
          </div>
          <Button
            variant="quiet"
            size="md"
            leadingIcon={<Filter size={15} />}
            loading={action?.kind === "reset" && action.status === "running"}
            loadingLabel="Resetting"
            onClick={() =>
              runAction("reset", "Resetting strategy filters", undefined, () => {
                setRiskFilter("all");
                setNetworkFilter("all");
                setSortBy("fit");
                setQuery("");
              })
            }
            disabled={action?.status === "running"}
          >
            Reset filters
          </Button>
        </section>
        {action ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              margin: "0 0 14px",
              color: action.status === "running" ? colors.sand : colors.green,
              fontSize: "12px",
            }}
          >
            {action.status === "running" ? (
              <ThinkingOrb state="solving" size={20} dark aria-label="Solver working" />
            ) : (
              <Check size={14} />
            )}
            {action.message}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", letterSpacing: "-0.025em", fontWeight: 550 }}>
              Solver candidates
            </h2>
            <span
              style={{ color: colors.dim, fontSize: "12px", fontFamily: "var(--metron-font-mono)" }}
            >
              {filteredStrategies.length} of {strategies.length}
            </span>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: colors.dim,
              fontSize: "12px",
            }}
          >
            <Clock3 size={14} /> Updated 18 seconds ago
          </span>
        </div>

        {filteredStrategies.length > 0 ? (
          <div
            className="web-page-strategies__candidates"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 286px), 1fr))",
              gap: "14px",
            }}
          >
            {filteredStrategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                selected={selectedId === strategy.id}
                inspected={inspectedId === strategy.id}
                busy={
                  action?.status === "running" && action.strategyId === strategy.id
                    ? action.kind === "inspect" || action.kind === "select"
                      ? action.kind
                      : null
                    : null
                }
                onInspect={() => inspectStrategy(strategy.id)}
                onSelect={() => selectStrategy(strategy.id)}
              />
            ))}
          </div>
        ) : (
          <div role="status" style={{ ...panelStyle, padding: "42px 24px", textAlign: "center" }}>
            <SlidersHorizontal size={22} color={colors.sand} />
            <h3 style={{ margin: "14px 0 7px", fontSize: "17px" }}>
              No candidates match these filters
            </h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: "13px" }}>
              Try a wider risk profile or remove the network filter.
            </p>
          </div>
        )}

        {inspectedStrategy ? (
          <section
            className="web-page-strategies__inspection"
            aria-label={`${inspectedStrategy.name} details`}
            style={{
              ...panelStyle,
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr",
              gap: "30px",
              marginTop: "16px",
              padding: "24px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <Gauge size={17} color={colors.sand} />
                <span style={labelStyle}>Inspection report</span>
              </div>
              <h2 style={{ margin: "13px 0 8px", fontSize: "24px", letterSpacing: "-0.03em" }}>
                {inspectedStrategy.name}
              </h2>
              <p style={{ margin: 0, color: colors.muted, fontSize: "13px", lineHeight: 1.6 }}>
                The model favors this route because it meets your principal protection constraint
                while keeping the execution path simple.
              </p>
              <div style={{ display: "flex", gap: "9px", marginTop: "19px" }}>
                <RiskBadge risk={inspectedStrategy.risk} />
                <Badge variant="outline">{inspectedStrategy.fit}% intent fit</Badge>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0 22px",
              }}
            >
              <div style={{ borderBottom: `1px solid ${colors.border}`, padding: "10px 0" }}>
                <span style={labelStyle}>Capital requirement</span>
                <strong
                  style={{ display: "block", marginTop: "6px", fontSize: "14px", fontWeight: 500 }}
                >
                  {inspectedStrategy.capital}
                </strong>
              </div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, padding: "10px 0" }}>
                <span style={labelStyle}>Rebalance policy</span>
                <strong
                  style={{ display: "block", marginTop: "6px", fontSize: "14px", fontWeight: 500 }}
                >
                  {inspectedStrategy.rebalance}
                </strong>
              </div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, padding: "10px 0" }}>
                <span style={labelStyle}>Liquidity available</span>
                <strong
                  style={{ display: "block", marginTop: "6px", fontSize: "14px", fontWeight: 500 }}
                >
                  {inspectedStrategy.tvl} TVL
                </strong>
              </div>
              <div style={{ borderBottom: `1px solid ${colors.border}`, padding: "10px 0" }}>
                <span style={labelStyle}>Execution path</span>
                <strong
                  style={{ display: "block", marginTop: "6px", fontSize: "14px", fontWeight: 500 }}
                >
                  2 approvals · atomic
                </strong>
              </div>
            </div>
          </section>
        ) : null}

        <section className="web-page-strategies__comparison" style={{ marginTop: "42px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "16px",
              marginBottom: "15px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart3 size={16} color={colors.sand} />
                <span style={labelStyle}>Decision view</span>
              </div>
              <h2
                style={{
                  margin: "9px 0 0",
                  fontSize: "24px",
                  letterSpacing: "-0.03em",
                  fontWeight: 550,
                }}
              >
                Compare the shortlist
              </h2>
            </div>
            <span
              style={{
                maxWidth: "260px",
                color: colors.dim,
                fontSize: "12px",
                lineHeight: 1.4,
                textAlign: "right",
              }}
            >
              Forecasts use 90-day protocol history and current liquidity conditions.
            </span>
          </div>
          <div style={{ overflowX: "auto", ...panelStyle }}>
            <table
              style={{
                width: "100%",
                minWidth: "760px",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <caption
                style={{
                  position: "absolute",
                  width: "1px",
                  height: "1px",
                  overflow: "hidden",
                  clip: "rect(0,0,0,0)",
                }}
              >
                Comparison of solver candidate strategies
              </caption>
              <thead>
                <tr
                  style={{
                    color: colors.dim,
                    textAlign: "left",
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {["Strategy", "Net APY", "90d drawdown", "Liquidity", "Maintenance", "Fit"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        style={{
                          padding: "16px 18px",
                          borderBottom: `1px solid ${colors.border}`,
                          fontWeight: 700,
                        }}
                      >
                        {heading}
                      </th>
                    ),
                  )}
                  <th style={{ width: "42px", borderBottom: `1px solid ${colors.border}` }}>
                    <span className="web-page-strategies__sr-only">Selected</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? strategies : strategies.slice(0, 3)).map((strategy) => (
                  <tr
                    key={strategy.id}
                    style={{
                      background:
                        selectedId === strategy.id ? "rgba(200,170,142,.07)" : "transparent",
                    }}
                  >
                    <th
                      scope="row"
                      style={{
                        padding: "16px 18px",
                        borderBottom: `1px solid ${colors.border}`,
                        textAlign: "left",
                        fontWeight: 500,
                      }}
                    >
                      {strategy.name}
                      <span
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: colors.dim,
                          fontSize: "11px",
                          fontWeight: 400,
                        }}
                      >
                        {strategy.protocol} · {strategy.network}
                      </span>
                    </th>
                    <td
                      style={{
                        padding: "16px 18px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.text,
                        fontFamily: "var(--metron-font-mono)",
                      }}
                    >
                      {strategy.apy}
                    </td>
                    <td
                      style={{
                        padding: "16px 18px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.muted,
                        fontFamily: "var(--metron-font-mono)",
                      }}
                    >
                      {strategy.drawdown}
                    </td>
                    <td
                      style={{
                        padding: "16px 18px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.muted,
                      }}
                    >
                      {strategy.tvl}
                    </td>
                    <td
                      style={{
                        padding: "16px 18px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.muted,
                      }}
                    >
                      {strategy.rebalance}
                    </td>
                    <td
                      style={{
                        padding: "16px 18px",
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.sand,
                        fontFamily: "var(--metron-font-mono)",
                      }}
                    >
                      {strategy.fit}%
                    </td>
                    <td
                      style={{ padding: "16px 18px", borderBottom: `1px solid ${colors.border}` }}
                    >
                      {selectedId === strategy.id ? (
                        <Check size={16} color={colors.sand} aria-label="Selected" />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: `1px solid ${colors.border}`, padding: "10px 18px" }}>
              <Button
                variant="quiet"
                size="sm"
                loading={action?.kind === "show" && action.status === "running"}
                loadingLabel="Updating"
                onClick={() =>
                  runAction(
                    "show",
                    showAll ? "Showing top candidates" : "Loading all candidates",
                    undefined,
                    () => setShowAll((visible) => !visible),
                  )
                }
                disabled={action?.status === "running"}
              >
                {showAll ? "Show top three" : "View all candidates"}
                {action?.kind !== "show" ? <ArrowRight size={14} /> : null}
              </Button>
            </div>
          </div>
        </section>

        <section
          className="web-page-strategies__selection"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginTop: "25px",
            padding: "19px 21px",
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: "12px",
            background: "rgba(200,170,142,.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span
              style={{
                display: "grid",
                width: "35px",
                height: "35px",
                placeItems: "center",
                borderRadius: "10px",
                background: "rgba(85,201,149,.14)",
                color: colors.green,
              }}
            >
              <Check size={18} />
            </span>
            <div>
              <span style={labelStyle}>Selected strategy</span>
              <strong
                style={{ display: "block", marginTop: "5px", fontSize: "16px", fontWeight: 550 }}
              >
                {selectedStrategy.name}
              </strong>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: colors.muted,
                fontSize: "12px",
              }}
            >
              <Zap size={14} color={colors.sand} />
              Ready for simulation
            </div>
            <Button
              variant="crimson"
              size="md"
              loading={
                action?.kind === "inspect" &&
                action.status === "running" &&
                action.strategyId === selectedStrategy.id
              }
              loadingLabel="Inspecting"
              trailingIcon={action?.status === "running" ? undefined : <ArrowRight size={15} />}
              onClick={() => inspectStrategy(selectedStrategy.id)}
              disabled={action?.status === "running"}
            >
              Review selected strategy
            </Button>
          </div>
        </section>
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            justifyContent: "flex-end",
            margin: "16px 0 0",
            color: colors.dim,
            fontSize: "12px",
          }}
        >
          <CircleHelp size={14} /> Forecasts are indicative and not a guarantee of future
          performance.
        </p>
      </div>
    </main>
  );
}
