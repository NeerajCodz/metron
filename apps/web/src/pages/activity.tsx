import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Database,
  ExternalLink,
  Filter,
  Info,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  GlassCard,
  InlineAlert,
  Input,
  Select,
} from "@metron/ui";

type EventCategory = "Strategy" | "Risk" | "Execution" | "Automation" | "System";
type EventStatus = "Completed" | "Action required" | "Monitoring" | "Failed";

type AuditEvent = {
  id: string;
  category: EventCategory;
  status: EventStatus;
  title: string;
  summary: string;
  time: string;
  relative: string;
  actor: string;
  chain: string;
  position: string;
  tx?: string;
  observed: Array<{ label: string; value: string; detail?: string }>;
  calculation: Array<{ label: string; value: string }>;
  prediction?: { label: string; value: string; confidence: string; horizon: string };
  action: string;
  result: string;
  transaction?: Array<{ label: string; value: string; link?: string }>;
};

const events: AuditEvent[] = [
  {
    id: "evt-8f3c",
    category: "Automation",
    status: "Completed",
    title: "Delta hedge rebalanced",
    summary: "ETH exposure returned inside the configured tolerance after a liquidity move.",
    time: "Sep 17, 2026, 14:32 UTC",
    relative: "18 min ago",
    actor: "Metron keeper",
    chain: "Arbitrum",
    position: "Basis carry 04",
    tx: "0x8f3c...a91d",
    observed: [
      { label: "Net delta before", value: "+0.184 ETH", detail: "Target 0.00 ETH" },
      { label: "ETH price", value: "$3,842.16", detail: "Chainlink primary feed" },
      { label: "Aave health factor", value: "2.31", detail: "Fresh at block 298114221" },
      { label: "Pool depth", value: "$18.4m", detail: "WETH/USDC 0.05% pool" },
    ],
    calculation: [
      { label: "Hedge size", value: "0.18 ETH short" },
      { label: "Expected price impact", value: "0.07%" },
      { label: "Resulting delta", value: "+0.004 ETH" },
    ],
    prediction: { label: "Liquidation probability", value: "0.8%", confidence: "94% confidence", horizon: "24 hour horizon" },
    action: "Borrowed 0.18 WETH against the Aave collateral and swapped to USDC through the approved route.",
    result: "Completed inside policy. Delta is now within the ±0.02 ETH tolerance and health factor is unchanged.",
    transaction: [
      { label: "Transaction", value: "0x8f3c6d29...a91d", link: "https://arbiscan.io/tx/0x8f3c" },
      { label: "Block", value: "298,114,221" },
      { label: "Gas used", value: "0.00041 ETH" },
      { label: "Route", value: "Aave V3 → Uniswap v4" },
    ],
  },
  {
    id: "evt-3ad1",
    category: "Risk",
    status: "Monitoring",
    title: "Volatility regime changed",
    summary: "The market moved from stable to elevated volatility after a sharp ETH move.",
    time: "Sep 17, 2026, 13:57 UTC",
    relative: "53 min ago",
    actor: "Risk engine",
    chain: "Multi-chain",
    position: "All positions",
    observed: [
      { label: "ETH 1h realized volatility", value: "48.2%", detail: "Up from 31.4%" },
      { label: "WETH/USDC depth", value: "$18.4m", detail: "95th percentile spread" },
      { label: "Oracle deviation", value: "0.06%", detail: "Within 0.35% gate" },
      { label: "Active positions", value: "3", detail: "No policy violations" },
    ],
    calculation: [
      { label: "Regime score", value: "0.71 elevated" },
      { label: "Intervention threshold", value: "0.68" },
      { label: "Required response", value: "Increase monitoring" },
    ],
    prediction: { label: "Liquidation probability", value: "1.6%", confidence: "89% confidence", horizon: "24 hour horizon" },
    action: "Raised monitoring cadence to every 5 minutes. No capital-moving action was authorized.",
    result: "All positions remain inside their risk envelopes. Automation is armed if health or delta gates deteriorate.",
  },
  {
    id: "evt-51be",
    category: "Execution",
    status: "Completed",
    title: "Strategy route settled",
    summary: "The selected lending route finished on Arbitrum with the expected collateral balance.",
    time: "Sep 17, 2026, 11:42 UTC",
    relative: "3 hr ago",
    actor: "Settlement contract",
    chain: "Arbitrum",
    position: "Basis carry 04",
    tx: "0x51be...79c2",
    observed: [
      { label: "Intent", value: "intent_7M4Q...2KC", detail: "Authorized until Sep 18" },
      { label: "Amount", value: "25,000 USDC", detail: "User authorized" },
      { label: "Winning score", value: "87.4 / 100", detail: "Solver atlas-07" },
      { label: "Minimum health", value: "2.08", detail: "Policy floor 1.65" },
    ],
    calculation: [
      { label: "Expected net APY", value: "12.8%" },
      { label: "Estimated execution cost", value: "$14.22" },
      { label: "Projected drawdown", value: "3.1%" },
    ],
    prediction: { label: "12 month yield range", value: "$2,184 to $3,560", confidence: "78% confidence", horizon: "Scenario range" },
    action: "Deposited USDC, supplied collateral to Aave V3, and opened the bounded hedge leg.",
    result: "Position opened. Route matched the signed intent and settled below the maximum slippage limit.",
    transaction: [
      { label: "Transaction", value: "0x51be11d0...79c2", link: "https://arbiscan.io/tx/0x51be" },
      { label: "Block", value: "298,108,904" },
      { label: "Gas used", value: "0.00119 ETH" },
      { label: "Trace", value: "tr_01J8Q7R9" },
    ],
  },
  {
    id: "evt-c0e4",
    category: "Strategy",
    status: "Completed",
    title: "Solver auction closed",
    summary: "Three valid routes were scored against the signed constraints.",
    time: "Sep 17, 2026, 11:40 UTC",
    relative: "3 hr ago",
    actor: "Auction coordinator",
    chain: "Arbitrum",
    position: "Basis carry 04",
    observed: [
      { label: "Bids received", value: "3", detail: "All from registered solvers" },
      { label: "Valid routes", value: "3", detail: "0 rejected" },
      { label: "Auction window", value: "28 seconds", detail: "Closed before settlement" },
      { label: "Preference", value: "Low drawdown", detail: "Signed intent policy" },
    ],
    calculation: [
      { label: "Winner", value: "atlas-07" },
      { label: "Score spread", value: "4.6 points" },
      { label: "Projected APY", value: "12.8%" },
    ],
    action: "Selected the highest-scoring valid bid after deterministic policy checks.",
    result: "Route approved for settlement. No bid exceeded cost, health, or protocol limits.",
  },
  {
    id: "evt-792a",
    category: "System",
    status: "Completed",
    title: "Intent authorization recorded",
    summary: "Your wallet signed a new intent with bounded capital and automation permissions.",
    time: "Sep 17, 2026, 11:39 UTC",
    relative: "3 hr ago",
    actor: "Wallet signature",
    chain: "Arbitrum",
    position: "Basis carry 04",
    tx: "0x792a...c44b",
    observed: [
      { label: "Authorized capital", value: "25,000 USDC", detail: "USDC on Arbitrum" },
      { label: "Target APY", value: "12% minimum", detail: "No upper bound" },
      { label: "Drawdown limit", value: "5%", detail: "Hard policy limit" },
      { label: "Automation", value: "Protection enabled", detail: "Bounded recovery only" },
    ],
    calculation: [
      { label: "Nonce", value: "42" },
      { label: "Expiry", value: "24 hours" },
      { label: "Commitment", value: "0x0a7e...93bf" },
    ],
    action: "Accepted the signed intent and opened a solver auction.",
    result: "Authorization is valid and can only be consumed once by the settlement contract.",
    transaction: [
      { label: "Transaction", value: "0x792a2d10...c44b", link: "https://arbiscan.io/tx/0x792a" },
      { label: "Block", value: "298,108,812" },
      { label: "Signer", value: "0x4c19...b12e" },
    ],
  },
  {
    id: "evt-42f9",
    category: "Risk",
    status: "Action required",
    title: "Stablecoin deviation watch",
    summary: "USDC moved 0.21% below its reference price. No policy gate has tripped.",
    time: "Sep 16, 2026, 22:16 UTC",
    relative: "16 hr ago",
    actor: "Risk engine",
    chain: "Base",
    position: "Liquidity sleeve 02",
    observed: [
      { label: "USDC reference", value: "$0.9979", detail: "Uniswap TWAP" },
      { label: "Chainlink price", value: "$0.9998", detail: "Fresh 24 seconds ago" },
      { label: "Position exposure", value: "$8,420", detail: "Base liquidity sleeve" },
      { label: "Configured gate", value: "0.35%", detail: "Action at 0.30%" },
    ],
    calculation: [
      { label: "Deviation", value: "0.21%" },
      { label: "Distance to gate", value: "0.09%" },
      { label: "Recommended mode", value: "Observe" },
    ],
    prediction: { label: "Gate breach probability", value: "8.4%", confidence: "86% confidence", horizon: "6 hour horizon" },
    action: "Flagged the position for closer observation and paused non-essential rebalancing.",
    result: "No emergency action taken. The position remains within its stablecoin deviation policy.",
  },
  {
    id: "evt-b18d",
    category: "Automation",
    status: "Completed",
    title: "Liquidity range recentered",
    summary: "The LP position was moved back around the current spot price after range drift.",
    time: "Sep 16, 2026, 18:04 UTC",
    relative: "Yesterday",
    actor: "Metron keeper",
    chain: "Base",
    position: "Liquidity sleeve 02",
    tx: "0xb18d...48f1",
    observed: [
      { label: "Pool", value: "WETH/USDC 0.05%", detail: "Base" },
      { label: "Current tick", value: "202,184", detail: "Outside lower range" },
      { label: "Position TVL", value: "$8,420", detail: "Before recenter" },
      { label: "Fee APR", value: "18.7%", detail: "Trailing 7 days" },
    ],
    calculation: [
      { label: "New range", value: "198,600 to 206,100" },
      { label: "Estimated IL", value: "1.2%" },
      { label: "Minimum benefit", value: "$31.00" },
    ],
    action: "Removed liquidity from the stale range and minted a new bounded position around spot.",
    result: "Recenter complete. Estimated fee capture is restored while the stablecoin gate remains active.",
    transaction: [
      { label: "Transaction", value: "0xb18d76a9...48f1", link: "https://basescan.org/tx/0xb18d" },
      { label: "Block", value: "24,901,118" },
      { label: "Gas used", value: "0.00008 ETH" },
    ],
  },
  {
    id: "evt-2dc7",
    category: "Execution",
    status: "Failed",
    title: "Recovery quote expired",
    summary: "A proposed collateral swap missed its execution deadline and was safely rejected.",
    time: "Sep 16, 2026, 15:27 UTC",
    relative: "Yesterday",
    actor: "Recovery executor",
    chain: "Ethereum",
    position: "Delta neutral 01",
    observed: [
      { label: "Quote age", value: "41 seconds", detail: "Maximum 30 seconds" },
      { label: "Expected output", value: "4,912 USDC", detail: "Minimum 4,875 USDC" },
      { label: "Oracle freshness", value: "Valid", detail: "12 seconds old" },
    ],
    calculation: [
      { label: "Expiry drift", value: "+11 seconds" },
      { label: "Capital moved", value: "$0", detail: "Atomic rejection" },
      { label: "Retry policy", value: "Await new quote" },
    ],
    action: "Rejected the stale quote before any token approval or transfer.",
    result: "No funds moved. The position remains safe and the recovery policy is ready for a fresh route.",
  },
  {
    id: "evt-0d41",
    category: "System",
    status: "Completed",
    title: "Cross-chain message confirmed",
    summary: "A hedge instruction was acknowledged by the destination executor on Base.",
    time: "Sep 16, 2026, 09:11 UTC",
    relative: "Yesterday",
    actor: "LayerZero adapter",
    chain: "Ethereum → Base",
    position: "Delta neutral 01",
    tx: "0x0d41...f712",
    observed: [
      { label: "Message nonce", value: "118", detail: "Source chain locked" },
      { label: "Destination", value: "Base executor", detail: "Peer authenticated" },
      { label: "Payload", value: "hedge.adjust.v2", detail: "Hash verified" },
    ],
    calculation: [
      { label: "Delivery time", value: "2m 18s" },
      { label: "Message fee", value: "$0.34" },
      { label: "Replay check", value: "Passed" },
    ],
    action: "Accepted the destination acknowledgment and reconciled the local position projection.",
    result: "Message is confirmed. Source and destination states agree on the hedge adjustment.",
    transaction: [
      { label: "Source tx", value: "0x0d41aa22...f712", link: "https://etherscan.io/tx/0x0d41" },
      { label: "Destination tx", value: "0x29ad...0e17", link: "https://basescan.org/tx/0x29ad" },
      { label: "Message ID", value: "lz_118_0d41" },
    ],
  },
];
const defaultEvent = events[0];
if (!defaultEvent) {
  throw new Error("Activity event seed is empty.");
}


const categoryOptions = ["All categories", "Strategy", "Risk", "Execution", "Automation", "System"];
const statusOptions = ["All statuses", "Completed", "Action required", "Monitoring", "Failed"];

const categoryIcon: Record<EventCategory, LucideIcon> = {
  Strategy: Layers3,
  Risk: AlertTriangle,
  Execution: ArrowUpRight,
  Automation: Bot,
  System: Database,
};

const statusVariant: Record<EventStatus, "success" | "warning" | "neutral" | "danger"> = {
  Completed: "success",
  "Action required": "warning",
  Monitoring: "neutral",
  Failed: "danger",
};

function EventIcon({ category, status }: { category: EventCategory; status: EventStatus }) {
  const Icon = categoryIcon[category];
  return (
    <span className="web-page-activity-event-icon" data-status={status} aria-hidden="true">
      <Icon size={16} strokeWidth={1.8} />
    </span>
  );
}

function DetailSection({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="web-page-activity-detail-section">
      <div className="web-page-activity-detail-eyebrow">
        <span aria-hidden="true">{icon}</span>
        <span>{eyebrow}</span>
      </div>
      {children}
    </section>
  );
}

export function ActivityPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All statuses");
  const [selectedId, setSelectedId] = useState(defaultEvent.id);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [event.title, event.summary, event.actor, event.chain, event.position, event.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory = category === "All categories" || event.category === category;
      const matchesStatus = status === "All statuses" || event.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [category, query, status]);

  const selectedEvent = events.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? defaultEvent;
  const prediction = selectedEvent.prediction;
  const transaction = selectedEvent.transaction;
  const hasFilters = query.length > 0 || category !== "All categories" || status !== "All statuses";

  const clearFilters = () => {
    setQuery("");
    setCategory("All categories");
    setStatus("All statuses");
  };

  return (
    <>
      <style>{`
        .web-page-activity {
          --activity-bg: #0a0b0c;
          --activity-surface: #111315;
          --activity-surface-raised: #17191c;
          --activity-border: rgba(242, 241, 237, 0.11);
          --activity-border-strong: rgba(242, 241, 237, 0.2);
          --activity-text: #f2f1ed;
          --activity-muted: #989b9c;
          --activity-sand: #d4c19d;
          --activity-crimson: #dc5b5f;
          --activity-green: #73bf9b;
          min-height: 100%;
          color: var(--activity-text);
          background: var(--activity-bg);
          padding: clamp(1.25rem, 2.8vw, 2.75rem);
        }
        .web-page-activity-inner { max-width: 1480px; margin: 0 auto; }
        .web-page-activity-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding: 0 0 1.65rem; border-bottom: 1px solid var(--activity-border); }
        .web-page-activity-kicker { color: var(--activity-sand); font-size: 0.68rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 .65rem; }
        .web-page-activity-title { font-size: clamp(1.75rem, 3vw, 2.65rem); letter-spacing: -.045em; line-height: 1; margin: 0; font-weight: 640; }
        .web-page-activity-description { color: var(--activity-muted); max-width: 38rem; font-size: .92rem; line-height: 1.55; margin: .75rem 0 0; }
        .web-page-activity-header-meta { display: flex; align-items: center; gap: .65rem; color: var(--activity-muted); font-size: .76rem; white-space: nowrap; }
        .web-page-activity-live-dot { width: .44rem; height: .44rem; border-radius: 999px; background: var(--activity-green); box-shadow: 0 0 0 4px rgba(115,191,155,.1); }
        .web-page-activity-toolbar { display: grid; grid-template-columns: minmax(14rem, 1fr) 12rem 12rem auto; align-items: end; gap: .65rem; padding: 1rem 0 1.2rem; }
        .web-page-activity-filter-label { display: block; color: var(--activity-muted); font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; margin-bottom: .4rem; }
        .web-page-activity-search { position: relative; }
        .web-page-activity-search > svg { position: absolute; left: .8rem; top: 50%; transform: translateY(-50%); color: var(--activity-muted); pointer-events: none; }
        .web-page-activity-search input { width: 100%; padding-left: 2.35rem; }
        .web-page-activity-toolbar .metron-select { width: 100%; }
        .web-page-activity-filter-actions { display: flex; justify-content: flex-end; gap: .5rem; }
        .web-page-activity-main { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(22rem, .9fr); align-items: start; gap: 1rem; }
        .web-page-activity-list-panel { min-width: 0; }
        .web-page-activity-list-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .1rem 0 .7rem; }
        .web-page-activity-list-count { color: var(--activity-muted); font-size: .78rem; }
        .web-page-activity-list-count strong { color: var(--activity-text); font-weight: 650; }
        .web-page-activity-list { border-top: 1px solid var(--activity-border); }
        .web-page-activity-event { display: grid; grid-template-columns: 2.4rem minmax(0, 1fr) auto; gap: .85rem; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--activity-border); background: transparent; color: inherit; padding: 1rem .7rem 1rem .3rem; cursor: pointer; transition: background .16s ease, border-color .16s ease; }
        .web-page-activity-event:hover { background: rgba(242,241,237,.035); }
        .web-page-activity-event:focus-visible { outline: 2px solid var(--activity-sand); outline-offset: -2px; }
        .web-page-activity-event[data-selected="true"] { background: rgba(212,193,157,.07); border-bottom-color: rgba(212,193,157,.36); }
        .web-page-activity-event-icon { display: grid; place-items: center; width: 2.15rem; height: 2.15rem; border: 1px solid var(--activity-border-strong); color: var(--activity-sand); background: rgba(212,193,157,.07); }
        .web-page-activity-event-icon[data-status="Failed"] { color: var(--activity-crimson); border-color: rgba(220,91,95,.38); background: rgba(220,91,95,.08); }
        .web-page-activity-event-icon[data-status="Action required"] { color: var(--activity-sand); border-color: rgba(212,193,157,.4); }
        .web-page-activity-event-copy { min-width: 0; }
        .web-page-activity-event-title { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; font-size: .91rem; font-weight: 650; line-height: 1.35; }
        .web-page-activity-event-summary { overflow: hidden; color: var(--activity-muted); font-size: .78rem; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; margin-top: .28rem; }
        .web-page-activity-event-meta { display: flex; flex-wrap: wrap; gap: .75rem; color: #777b7c; font-size: .69rem; margin-top: .55rem; }
        .web-page-activity-event-meta span { display: inline-flex; align-items: center; gap: .3rem; }
        .web-page-activity-event-time { color: var(--activity-muted); font-size: .7rem; padding-top: .16rem; white-space: nowrap; text-align: right; }
        .web-page-activity-event-chevron { display: inline-flex; color: #656869; margin-left: .15rem; vertical-align: middle; }
        .web-page-activity-empty { border: 1px solid var(--activity-border); padding: 3.5rem 1.5rem; text-align: center; color: var(--activity-muted); }
        .web-page-activity-empty svg { color: var(--activity-sand); margin-bottom: .75rem; }
        .web-page-activity-empty strong { display: block; color: var(--activity-text); font-size: .98rem; margin-bottom: .35rem; }
        .web-page-activity-detail { position: sticky; top: 1.25rem; min-width: 0; }
        .web-page-activity-detail-card { background: var(--activity-surface); border: 1px solid var(--activity-border); }
        .web-page-activity-detail-card .metron-card__glass { border-radius: 0; background: var(--activity-surface); }
        .web-page-activity-detail-card .metron-card__surface { padding: 0; }
        .web-page-activity-detail-header { padding: 1.2rem 1.2rem 1rem; border-bottom: 1px solid var(--activity-border); }
        .web-page-activity-detail-topline { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
        .web-page-activity-detail-category { color: var(--activity-sand); font-size: .66rem; letter-spacing: .13em; text-transform: uppercase; font-weight: 700; }
        .web-page-activity-detail-title { font-size: 1.3rem; letter-spacing: -.025em; line-height: 1.15; margin: .65rem 0 .45rem; font-weight: 650; }
        .web-page-activity-detail-summary { color: var(--activity-muted); font-size: .78rem; line-height: 1.5; margin: 0; }
        .web-page-activity-detail-context { display: flex; flex-wrap: wrap; gap: .45rem 1rem; color: #7d8182; font-size: .69rem; margin-top: .9rem; }
        .web-page-activity-detail-context span { display: inline-flex; align-items: center; gap: .3rem; }
        .web-page-activity-detail-body { padding: .15rem 1.2rem 1.2rem; }
        .web-page-activity-detail-section { padding: 1rem 0; border-bottom: 1px solid var(--activity-border); }
        .web-page-activity-detail-section:last-child { border-bottom: 0; padding-bottom: 0; }
        .web-page-activity-detail-eyebrow { display: flex; align-items: center; gap: .45rem; color: var(--activity-sand); font-size: .67rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; margin-bottom: .7rem; }
        .web-page-activity-detail-eyebrow svg { width: .85rem; height: .85rem; }
        .web-page-activity-data { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .7rem; }
        .web-page-activity-data-item { min-width: 0; }
        .web-page-activity-data-label { color: #7d8182; font-size: .67rem; line-height: 1.2; }
        .web-page-activity-data-value { color: var(--activity-text); font-size: .79rem; font-weight: 650; overflow-wrap: anywhere; margin-top: .22rem; }
        .web-page-activity-data-detail { color: #737778; font-size: .65rem; line-height: 1.3; margin-top: .18rem; }
        .web-page-activity-detail-copy { color: #c2c3be; font-size: .78rem; line-height: 1.55; margin: 0; }
        .web-page-activity-result { border-left: 2px solid var(--activity-green); padding-left: .7rem; }
        .web-page-activity-result[data-status="Failed"] { border-left-color: var(--activity-crimson); }
        .web-page-activity-prediction { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: .8rem; border: 1px solid rgba(212,193,157,.18); background: rgba(212,193,157,.045); padding: .75rem; }
        .web-page-activity-prediction-label { color: var(--activity-muted); font-size: .7rem; }
        .web-page-activity-prediction-value { color: var(--activity-sand); font-size: 1.1rem; font-weight: 680; letter-spacing: -.02em; }
        .web-page-activity-prediction-meta { color: #777b7c; font-size: .63rem; margin-top: .2rem; }
        .web-page-activity-prediction-confidence { color: var(--activity-green); font-size: .68rem; text-align: right; }
        .web-page-activity-tx { display: grid; gap: .55rem; }
        .web-page-activity-tx-row { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; font-size: .71rem; }
        .web-page-activity-tx-row dt { color: #7d8182; }
        .web-page-activity-tx-row dd { color: #c2c3be; font-weight: 620; margin: 0; text-align: right; overflow-wrap: anywhere; }
        .web-page-activity-tx-row a { color: var(--activity-sand); text-decoration: none; }
        .web-page-activity-tx-row a:hover { text-decoration: underline; }
        .web-page-activity-legend { display: flex; align-items: center; flex-wrap: wrap; gap: .7rem 1rem; color: #7d8182; font-size: .67rem; padding-top: 1rem; }
        .web-page-activity-legend-item { display: inline-flex; align-items: center; gap: .35rem; }
        .web-page-activity-legend-swatch { width: .4rem; height: .4rem; border-radius: 999px; background: var(--activity-green); }
        .web-page-activity-legend-swatch[data-status="Action required"] { background: var(--activity-sand); }
        .web-page-activity-legend-swatch[data-status="Monitoring"] { background: #8f9698; }
        .web-page-activity-legend-swatch[data-status="Failed"] { background: var(--activity-crimson); }
        .web-page-activity-alert { margin-bottom: 1rem; }
        @media (max-width: 980px) {
          .web-page-activity-main { grid-template-columns: minmax(0, 1fr); }
          .web-page-activity-detail { position: static; }
          .web-page-activity-toolbar { grid-template-columns: minmax(12rem, 1fr) 1fr 1fr; }
          .web-page-activity-filter-actions { grid-column: 1 / -1; justify-content: flex-start; }
        }
        @media (max-width: 640px) {
          .web-page-activity { padding: 1rem; }
          .web-page-activity-header { display: block; }
          .web-page-activity-header-meta { margin-top: 1rem; }
          .web-page-activity-toolbar { grid-template-columns: 1fr; }
          .web-page-activity-filter-actions { grid-column: auto; }
          .web-page-activity-event { grid-template-columns: 2.15rem minmax(0,1fr); }
          .web-page-activity-event-time { grid-column: 2; text-align: left; padding-top: 0; }
          .web-page-activity-event-summary { white-space: normal; }
          .web-page-activity-data { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
      <main className="web-page-activity">
        <div className="web-page-activity-inner">
          <header className="web-page-activity-header">
            <div>
              <p className="web-page-activity-kicker">Audit trail</p>
              <h1 className="web-page-activity-title">Activity</h1>
              <p className="web-page-activity-description">
                A traceable record of strategy decisions, risk signals, and every authorized action across your account.
              </p>
            </div>
            <div className="web-page-activity-header-meta" aria-label="Activity sync status">
              <span className="web-page-activity-live-dot" aria-hidden="true" />
              <span>Synced 18 seconds ago</span>
              <Activity size={15} aria-hidden="true" />
            </div>
          </header>

          <div className="web-page-activity-toolbar" aria-label="Activity filters">
            <div>
              <label className="web-page-activity-filter-label" htmlFor="activity-search">Search events</label>
              <div className="web-page-activity-search">
                <Search size={15} aria-hidden="true" />
                <Input
                  id="activity-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by event, chain, or position"
                  aria-label="Search activity events"
                />
              </div>
            </div>
            <div>
              <label className="web-page-activity-filter-label" htmlFor="activity-category">Category</label>
              <Select id="activity-category" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categoryOptions.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </div>
            <div>
              <label className="web-page-activity-filter-label" htmlFor="activity-status">Status</label>
              <Select id="activity-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                {statusOptions.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </div>
            <div className="web-page-activity-filter-actions">
              <Button
                variant="quiet"
                size="sm"
                leadingIcon={<Filter size={14} />}
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                Clear filters
              </Button>
            </div>
          </div>

          {selectedEvent.status === "Action required" && (
            <InlineAlert
              className="web-page-activity-alert"
              variant="warning"
              icon={<AlertTriangle size={15} />}
              title="One event needs attention"
            >
              Review the selected risk event before changing automation limits.
            </InlineAlert>
          )}

          <div className="web-page-activity-main">
            <section className="web-page-activity-list-panel" aria-labelledby="activity-list-heading">
              <div className="web-page-activity-list-head">
                <div className="web-page-activity-list-count" id="activity-list-heading">
                  <strong>{filteredEvents.length}</strong> events in the last 7 days
                </div>
                <Badge variant="neutral" leadingIcon={<Clock3 size={12} />}>Newest first</Badge>
              </div>
              <div className="web-page-activity-list" role="list" aria-label="Audit events">
                {filteredEvents.length === 0 ? (
                  <div className="web-page-activity-empty">
                    <Search size={22} aria-hidden="true" />
                    <strong>No matching events</strong>
                    <span>Try a different search or clear the active filters.</span>
                    <div style={{ marginTop: "1rem" }}><Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button></div>
                  </div>
                ) : filteredEvents.map((event) => (
                  <button
                    className="web-page-activity-event"
                    type="button"
                    role="listitem"
                    key={event.id}
                    data-selected={event.id === selectedEvent.id}
                    onClick={() => setSelectedId(event.id)}
                    aria-label={`View details for ${event.title}`}
                  >
                    <EventIcon category={event.category} status={event.status} />
                    <span className="web-page-activity-event-copy">
                      <span className="web-page-activity-event-title">
                        {event.title}
                        <Badge variant={statusVariant[event.status]}>{event.status}</Badge>
                      </span>
                      <span className="web-page-activity-event-summary">{event.summary}</span>
                      <span className="web-page-activity-event-meta">
                        <span>{event.category}</span>
                        <span>{event.chain}</span>
                        <span>{event.actor}</span>
                      </span>
                    </span>
                    <span className="web-page-activity-event-time">
                      {event.relative}
                      <span className="web-page-activity-event-chevron"><ChevronRight size={14} /></span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="web-page-activity-legend" aria-label="Event status legend">
                {statusOptions.slice(1).map((item) => <span className="web-page-activity-legend-item" key={item}><span className="web-page-activity-legend-swatch" data-status={item} />{item}</span>)}
              </div>
            </section>

            <aside className="web-page-activity-detail" aria-label="Selected event details">
              <GlassCard className="web-page-activity-detail-card">
                <div className="web-page-activity-detail-header">
                  <div className="web-page-activity-detail-topline">
                    <span className="web-page-activity-detail-category">Selected event</span>
                    <Badge variant={statusVariant[selectedEvent.status]}>{selectedEvent.status}</Badge>
                  </div>
                  <h2 className="web-page-activity-detail-title">{selectedEvent.title}</h2>
                  <p className="web-page-activity-detail-summary">{selectedEvent.summary}</p>
                  <div className="web-page-activity-detail-context">
                    <span><Clock3 size={12} />{selectedEvent.time}</span>
                    <span><ShieldCheck size={12} />{selectedEvent.actor}</span>
                    <span><Layers3 size={12} />{selectedEvent.position}</span>
                  </div>
                </div>
                <div className="web-page-activity-detail-body">
                  <DetailSection eyebrow="Observed data" icon={<Database size={14} />}>
                    <div className="web-page-activity-data">
                      {selectedEvent.observed.map((item) => <div className="web-page-activity-data-item" key={item.label}><div className="web-page-activity-data-label">{item.label}</div><div className="web-page-activity-data-value">{item.value}</div>{item.detail && <div className="web-page-activity-data-detail">{item.detail}</div>}</div>)}
                    </div>
                  </DetailSection>
                  <DetailSection eyebrow="Calculation" icon={<Sparkles size={14} />}>
                    <div className="web-page-activity-data">
                      {selectedEvent.calculation.map((item) => <div className="web-page-activity-data-item" key={item.label}><div className="web-page-activity-data-label">{item.label}</div><div className="web-page-activity-data-value">{item.value}</div></div>)}
                    </div>
                  </DetailSection>
                  {prediction && <DetailSection eyebrow="Prediction" icon={<Activity size={14} />}>
                    <div className="web-page-activity-prediction">
                      <div><div className="web-page-activity-prediction-label">{prediction.label}</div><div className="web-page-activity-prediction-value">{prediction.value}</div><div className="web-page-activity-prediction-meta">{prediction.horizon}</div></div>
                      <div className="web-page-activity-prediction-confidence">{prediction.confidence}</div>
                    </div>
                  </DetailSection>}
                  <DetailSection eyebrow="Action" icon={<ArrowUpRight size={14} />}>
                    <p className="web-page-activity-detail-copy">{selectedEvent.action}</p>
                  </DetailSection>
                  <DetailSection eyebrow="Result" icon={selectedEvent.status === "Failed" ? <AlertTriangle size={14} /> : <Check size={14} />}>
                    <p className="web-page-activity-detail-copy web-page-activity-result" data-status={selectedEvent.status}>{selectedEvent.result}</p>
                  </DetailSection>
                  {transaction && <DetailSection eyebrow="Transaction details" icon={<ExternalLink size={14} />}>
                    <dl className="web-page-activity-tx">
                      {transaction.map((item) => <div className="web-page-activity-tx-row" key={item.label}><dt>{item.label}</dt><dd>{item.link ? <a href={item.link} target="_blank" rel="noreferrer">{item.value}<ExternalLink size={11} aria-hidden="true" /></a> : item.value}</dd></div>)}
                    </dl>
                  </DetailSection>}
                  {!transaction && <InlineAlert variant="info" icon={<Info size={14} />} title="No transaction recorded">This event changed monitoring state only. No capital-moving transaction was submitted.</InlineAlert>}
                </div>
              </GlassCard>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
