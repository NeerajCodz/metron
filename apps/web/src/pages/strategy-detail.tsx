import { useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleDollarSign,
  Clock3,
  Coins,
  GitBranch,
  LockKeyhole,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  MetricCard,
  Progress,
} from "@metron/ui";

const strategyDetailStyles = `
.web-page-strategy-detail {
  min-height: 100%;
  color: #e9e4da;
  background: #0b0d0e;
  padding: 30px clamp(18px, 3.5vw, 56px) 64px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.web-page-strategy-detail *, .web-page-strategy-detail *::before, .web-page-strategy-detail *::after { box-sizing: border-box; }
.web-page-strategy-detail button, .web-page-strategy-detail a { -webkit-tap-highlight-color: transparent; }
.web-page-strategy-detail button:focus-visible, .web-page-strategy-detail a:focus-visible { outline: 2px solid #d6a66b; outline-offset: 3px; }
.web-page-strategy-detail__shell { max-width: 1480px; margin: 0 auto; }
.web-page-strategy-detail__crumbs { display:flex; align-items:center; gap:8px; color:#817e77; font-size:12px; letter-spacing:.01em; margin-bottom: 25px; }
.web-page-strategy-detail__crumbs span:last-child { color:#c1bbae; }
.web-page-strategy-detail__crumb-sep { color:#4a4c4a; }
.web-page-strategy-detail__heading-row { display:flex; justify-content:space-between; gap:22px; align-items:flex-start; margin-bottom:26px; }
.web-page-strategy-detail__title-group { min-width:0; }
.web-page-strategy-detail__eyebrow { color:#9a9389; font-size:11px; line-height:1; letter-spacing:.15em; text-transform:uppercase; margin-bottom:11px; }
.web-page-strategy-detail__title { margin:0; font-size:clamp(27px, 3.3vw, 44px); line-height:1.08; letter-spacing:-.045em; font-weight:550; color:#f3efe7; }
.web-page-strategy-detail__subline { margin:11px 0 0; display:flex; align-items:center; flex-wrap:wrap; gap:9px; color:#9d9a91; font-size:13px; }
.web-page-strategy-detail__dot { width:4px; height:4px; border-radius:50%; background:#5a5b56; }
.web-page-strategy-detail__actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:9px; padding-top:16px; }
.web-page-strategy-detail__button-icon { width:15px; height:15px; }
.web-page-strategy-detail__metrics { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; margin-bottom:27px; }
.web-page-strategy-detail__metric { min-height:126px; }
.web-page-strategy-detail__metric .metron-card__glass { border-color:#292b2a; background:#121515; }
.web-page-strategy-detail__metric .metron-metric-card__value { font-variant-numeric:tabular-nums; letter-spacing:-.035em; }
.web-page-strategy-detail__metric--accent .metron-card__glass { border-color:#6b3531; }
.web-page-strategy-detail__metric--accent .metron-metric-card__value { color:#e0a48b; }
.web-page-strategy-detail__tabs { display:flex; align-items:center; gap:5px; border-bottom:1px solid #292c2b; margin-bottom:22px; overflow-x:auto; }
.web-page-strategy-detail__tab { position:relative; appearance:none; border:0; background:none; color:#85847e; padding:12px 14px 14px; font:inherit; font-size:13px; white-space:nowrap; cursor:pointer; }
.web-page-strategy-detail__tab:hover { color:#dbd5ca; }
.web-page-strategy-detail__tab--active { color:#e9e4da; }
.web-page-strategy-detail__tab--active::after { content:""; position:absolute; height:2px; background:#cf7663; left:10px; right:10px; bottom:-1px; }
.web-page-strategy-detail__layout { display:grid; grid-template-columns:minmax(0, 1.68fr) minmax(320px, .9fr); gap:18px; align-items:start; }
.web-page-strategy-detail__graph-card { min-height:596px; border:1px solid #282b2a; background:#101313; padding:24px; position:relative; overflow:hidden; }
.web-page-strategy-detail__card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:20px; }
.web-page-strategy-detail__card-title { margin:0; font-size:16px; font-weight:560; letter-spacing:-.015em; color:#eeeadf; }
.web-page-strategy-detail__card-description { margin:7px 0 0; color:#85857f; font-size:12px; line-height:1.5; }
.web-page-strategy-detail__live { display:flex; align-items:center; gap:7px; color:#a6bea5; font-size:11px; white-space:nowrap; }
.web-page-strategy-detail__live-dot { width:6px; height:6px; border-radius:50%; background:#8ba98e; box-shadow:0 0 0 3px #233129; }
.web-page-strategy-detail__graph { height:442px; margin:3px -4px 0; position:relative; border-top:1px solid #202423; border-bottom:1px solid #202423; background-color:#0d1010; background-image:linear-gradient(#181d1c 1px, transparent 1px), linear-gradient(90deg, #181d1c 1px, transparent 1px); background-size:52px 52px; }
.web-page-strategy-detail__graph::before { content:"capital allocation map"; position:absolute; top:14px; left:17px; color:#4d514e; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
.web-page-strategy-detail__connector { position:absolute; height:1px; background:#535c57; transform-origin:left center; opacity:.75; }
.web-page-strategy-detail__connector--one { width:15%; left:17%; top:51%; transform:rotate(0deg); }
.web-page-strategy-detail__connector--two { width:17%; left:33%; top:51%; transform:rotate(-24deg); }
.web-page-strategy-detail__connector--three { width:17%; left:33%; top:52%; transform:rotate(23deg); }
.web-page-strategy-detail__connector--four { width:16%; left:49%; top:40%; transform:rotate(0deg); }
.web-page-strategy-detail__connector--five { width:16%; left:49%; top:63%; transform:rotate(0deg); }
.web-page-strategy-detail__connector--six { width:16%; left:65%; top:40%; transform:rotate(21deg); }
.web-page-strategy-detail__connector--seven { width:16%; left:65%; top:63%; transform:rotate(-20deg); }
.web-page-strategy-detail__node { position:absolute; transform:translate(-50%, -50%); width:142px; min-height:88px; padding:13px 13px 11px; text-align:left; border:1px solid #3b4440; background:#151a18; color:#e9e4da; cursor:pointer; transition:border-color .18s ease, background .18s ease, transform .18s ease; }
.web-page-strategy-detail__node:hover { border-color:#8c8e7e; background:#1a211e; transform:translate(-50%, -50%) translateY(-2px); }
.web-page-strategy-detail__node--selected { border-color:#d4a06e; background:#20231f; box-shadow:inset 3px 0 #d4a06e; }
.web-page-strategy-detail__node--root { width:154px; border-color:#98705a; background:#241b18; }
.web-page-strategy-detail__node--quiet { opacity:.93; }
.web-page-strategy-detail__node-label { display:flex; align-items:center; gap:7px; color:#a9aa9e; font-size:10px; letter-spacing:.04em; text-transform:uppercase; margin-bottom:9px; }
.web-page-strategy-detail__node-label svg { width:13px; height:13px; color:#c89d70; }
.web-page-strategy-detail__node-name { font-size:13px; font-weight:570; margin-bottom:8px; }
.web-page-strategy-detail__node-value { color:#d4d0c5; font-size:12px; font-variant-numeric:tabular-nums; }
.web-page-strategy-detail__node-change { color:#98b298; font-size:11px; margin-left:4px; }
.web-page-strategy-detail__node--root .web-page-strategy-detail__node-label svg { color:#e18b75; }
.web-page-strategy-detail__graph-legend { display:flex; flex-wrap:wrap; gap:14px; margin-top:18px; color:#747872; font-size:11px; }
.web-page-strategy-detail__legend-item { display:flex; align-items:center; gap:7px; }
.web-page-strategy-detail__legend-line { width:18px; height:1px; background:#67736a; }
.web-page-strategy-detail__legend-line--active { background:#d4a06e; }
.web-page-strategy-detail__side-stack { display:grid; gap:14px; }
.web-page-strategy-detail__side-card { border:1px solid #282b2a; background:#121515; padding:20px; }
.web-page-strategy-detail__side-card--focus { border-color:#4d4134; background:#171816; }
.web-page-strategy-detail__selected-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.web-page-strategy-detail__selected-icon { width:35px; height:35px; display:grid; place-items:center; border:1px solid #4e4538; color:#d1a36f; background:#211e19; }
.web-page-strategy-detail__selected-icon svg { width:17px; height:17px; }
.web-page-strategy-detail__selected-name { margin:0; color:#f0ece3; font-size:17px; font-weight:560; }
.web-page-strategy-detail__selected-type { color:#898982; font-size:11px; margin-top:5px; }
.web-page-strategy-detail__close { color:#7f827d; background:none; border:0; cursor:pointer; padding:4px; }
.web-page-strategy-detail__close:hover { color:#eee8dc; }
.web-page-strategy-detail__close svg { width:16px; height:16px; }
.web-page-strategy-detail__selected-copy { margin:18px 0 17px; color:#9a9b93; font-size:12px; line-height:1.55; }
.web-page-strategy-detail__kv { display:grid; grid-template-columns:1fr auto; gap:9px 14px; padding-top:15px; border-top:1px solid #2a2d2c; font-size:12px; }
.web-page-strategy-detail__kv dt { color:#81847e; }
.web-page-strategy-detail__kv dd { margin:0; color:#ded9cf; text-align:right; font-variant-numeric:tabular-nums; }
.web-page-strategy-detail__kv dd.web-page-strategy-detail__positive { color:#9eb69d; }
.web-page-strategy-detail__allocation { margin-top:17px; }
.web-page-strategy-detail__allocation-head { display:flex; justify-content:space-between; color:#92938b; font-size:11px; margin-bottom:8px; }
.web-page-strategy-detail__allocation-bar { height:5px; background:#292e2b; display:flex; overflow:hidden; }
.web-page-strategy-detail__allocation-bar span { display:block; height:100%; }
.web-page-strategy-detail__allocation-bar span:nth-child(1) { width:60%; background:#be806e; }
.web-page-strategy-detail__allocation-bar span:nth-child(2) { width:25%; background:#8b9c87; }
.web-page-strategy-detail__allocation-bar span:nth-child(3) { width:15%; background:#bdab79; }
.web-page-strategy-detail__side-title { margin:0 0 17px; font-size:13px; color:#ebe7dc; font-weight:570; }
.web-page-strategy-detail__position-row { display:grid; grid-template-columns:1fr auto; gap:8px; padding:11px 0; border-top:1px solid #292c2b; }
.web-page-strategy-detail__position-row:first-of-type { border-top:0; padding-top:0; }
.web-page-strategy-detail__position-name { color:#d6d1c6; font-size:12px; }
.web-page-strategy-detail__position-meta { display:block; color:#777b75; font-size:10px; margin-top:4px; }
.web-page-strategy-detail__position-value { text-align:right; color:#e5e0d5; font-size:12px; font-variant-numeric:tabular-nums; }
.web-page-strategy-detail__position-pnl { display:block; color:#91ad95; font-size:10px; margin-top:4px; }
.web-page-strategy-detail__risk-row { margin-bottom:15px; }
.web-page-strategy-detail__risk-row:last-child { margin-bottom:0; }
.web-page-strategy-detail__risk-label { display:flex; justify-content:space-between; font-size:11px; color:#9b9c94; margin-bottom:7px; }
.web-page-strategy-detail__risk-label strong { color:#dfdacf; font-weight:500; }
.web-page-strategy-detail__risk-note { margin-top:7px; color:#777a74; font-size:10px; line-height:1.45; }
.web-page-strategy-detail__insights { display:grid; grid-template-columns:1.1fr 1fr 1fr; gap:14px; margin-top:18px; }
.web-page-strategy-detail__insight { min-height:178px; border:1px solid #282b2a; background:#121515; padding:19px; }
.web-page-strategy-detail__insight h3 { margin:0 0 16px; font-size:13px; font-weight:570; color:#ece7dd; }
.web-page-strategy-detail__yield { display:flex; align-items:flex-end; gap:12px; margin-bottom:8px; }
.web-page-strategy-detail__yield-value { color:#dbc18c; font-size:31px; line-height:1; letter-spacing:-.055em; font-variant-numeric:tabular-nums; }
.web-page-strategy-detail__yield-period { color:#868780; font-size:11px; padding-bottom:3px; }
.web-page-strategy-detail__spark { display:flex; align-items:flex-end; gap:3px; height:37px; margin:16px 0 11px; }
.web-page-strategy-detail__spark i { width:7px; background:#687865; display:block; }
.web-page-strategy-detail__spark i:nth-child(1){height:39%;}.web-page-strategy-detail__spark i:nth-child(2){height:47%;}.web-page-strategy-detail__spark i:nth-child(3){height:42%;}.web-page-strategy-detail__spark i:nth-child(4){height:58%;}.web-page-strategy-detail__spark i:nth-child(5){height:52%;}.web-page-strategy-detail__spark i:nth-child(6){height:73%;}.web-page-strategy-detail__spark i:nth-child(7){height:67%;}.web-page-strategy-detail__spark i:nth-child(8){height:83%;}.web-page-strategy-detail__spark i:nth-child(9){height:76%;}.web-page-strategy-detail__spark i:nth-child(10){height:96%; background:#b58c6d;}
.web-page-strategy-detail__micro-copy { color:#7e817a; font-size:11px; line-height:1.48; }
.web-page-strategy-detail__hedge { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.web-page-strategy-detail__hedge-pair { color:#e1dcd0; font-size:14px; }
.web-page-strategy-detail__hedge-pair small { color:#777a75; font-size:10px; display:block; margin-top:4px; }
.web-page-strategy-detail__hedge-ratio { color:#d5ad75; font-size:21px; font-variant-numeric:tabular-nums; }
.web-page-strategy-detail__risk-summary { display:flex; align-items:center; gap:12px; margin-bottom:15px; }
.web-page-strategy-detail__risk-score { color:#e3b58c; font-size:30px; letter-spacing:-.06em; line-height:1; }
.web-page-strategy-detail__risk-copy { color:#a0a096; font-size:11px; line-height:1.4; }
.web-page-strategy-detail__risk-copy strong { color:#d9d3c8; font-weight:500; display:block; }
.web-page-strategy-detail__execution { margin-top:18px; border:1px solid #7b463b; background:#1b1514; padding:18px 20px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
.web-page-strategy-detail__execution-copy { display:flex; align-items:flex-start; gap:12px; }
.web-page-strategy-detail__execution-copy svg { color:#da907a; width:18px; height:18px; flex:none; margin-top:2px; }
.web-page-strategy-detail__execution-title { color:#f0e5da; font-size:13px; font-weight:560; }
.web-page-strategy-detail__execution-note { color:#a99b92; font-size:11px; line-height:1.45; margin-top:4px; }
.web-page-strategy-detail__execution-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
.web-page-strategy-detail__drawer { margin-top:14px; border:1px solid #3c403d; background:#141817; padding:20px; }
.web-page-strategy-detail__drawer-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:15px; }
.web-page-strategy-detail__drawer h3 { margin:0; font-size:14px; color:#eee9df; font-weight:560; }
.web-page-strategy-detail__drawer-copy { color:#999a92; font-size:12px; line-height:1.5; max-width:680px; }
.web-page-strategy-detail__drawer-actions { display:flex; gap:9px; margin-top:17px; }
.web-page-strategy-detail__timeline { display:grid; gap:10px; margin-top:14px; }
.web-page-strategy-detail__timeline-item { display:grid; grid-template-columns:8px 1fr auto; gap:10px; align-items:start; font-size:11px; }
.web-page-strategy-detail__timeline-item::before { content:""; width:6px; height:6px; border-radius:50%; background:#8ea48d; margin-top:4px; }
.web-page-strategy-detail__timeline-item span { color:#a9a99f; }
.web-page-strategy-detail__timeline-item time { color:#71756f; font-variant-numeric:tabular-nums; }
@media (max-width: 1040px) {
  .web-page-strategy-detail__layout { grid-template-columns:1fr; }
  .web-page-strategy-detail__side-stack { grid-template-columns:repeat(2, minmax(0,1fr)); }
  .web-page-strategy-detail__side-card--focus { grid-column:span 2; }
}
@media (max-width: 760px) {
  .web-page-strategy-detail { padding:22px 14px 44px; }
  .web-page-strategy-detail__heading-row { display:block; }
  .web-page-strategy-detail__actions { justify-content:flex-start; padding-top:20px; }
  .web-page-strategy-detail__metrics { grid-template-columns:repeat(2, minmax(0,1fr)); }
  .web-page-strategy-detail__graph-card { padding:17px 12px; min-height:630px; }
  .web-page-strategy-detail__graph { height:485px; margin-left:-3px; margin-right:-3px; }
  .web-page-strategy-detail__node { width:123px; min-height:80px; padding:10px; }
  .web-page-strategy-detail__node--root { width:130px; }
  .web-page-strategy-detail__node-name { font-size:12px; }
  .web-page-strategy-detail__node-value { font-size:11px; }
  .web-page-strategy-detail__insights, .web-page-strategy-detail__side-stack { grid-template-columns:1fr; }
  .web-page-strategy-detail__side-card--focus { grid-column:auto; }
  .web-page-strategy-detail__execution { display:block; }
  .web-page-strategy-detail__execution-actions { justify-content:flex-start; margin-top:15px; }
}
@media (max-width: 440px) {
  .web-page-strategy-detail__metrics { grid-template-columns:1fr; }
  .web-page-strategy-detail__graph { height:530px; background-size:38px 38px; }
  .web-page-strategy-detail__node { width:109px; }
  .web-page-strategy-detail__node--root { width:119px; }
  .web-page-strategy-detail__connector--one { width:10%; left:17%; }
  .web-page-strategy-detail__connector--two { width:14%; left:30%; }
  .web-page-strategy-detail__connector--three { width:14%; left:30%; }
  .web-page-strategy-detail__connector--four, .web-page-strategy-detail__connector--five { width:14%; left:45%; }
  .web-page-strategy-detail__connector--six, .web-page-strategy-detail__connector--seven { width:14%; left:61%; }
}
`;

type NodeId = "capital" | "lending" | "lp" | "hedge" | "reserve" | "aave" | "curve" | "perp";
type TabId = "overview" | "positions" | "yield" | "hedge" | "risk";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "positions", label: "Positions" },
  { id: "yield", label: "Yield" },
  { id: "hedge", label: "Hedge" },
  { id: "risk", label: "Risk" },
];

const nodes: Array<{
  id: NodeId;
  label: string;
  name: string;
  value: string;
  change?: string;
  className?: string;
  icon: typeof Wallet;
  position: CSSProperties;
}> = [
  { id: "capital", label: "Source", name: "Treasury", value: "$248,620", change: "100%", className: "web-page-strategy-detail__node--root", icon: Wallet, position: { left: "10%", top: "51%" } },
  { id: "lending", label: "Lending", name: "Aave v3", value: "$109,393", change: "44%", icon: Coins, position: { left: "27%", top: "51%" } },
  { id: "lp", label: "Liquidity", name: "ETH / USDC LP", value: "$62,155", change: "25%", icon: GitBranch, position: { left: "43%", top: "29%" } },
  { id: "hedge", label: "Hedge", name: "Perp short", value: "$37,293", change: "15%", icon: ShieldCheck, position: { left: "43%", top: "74%" } },
  { id: "reserve", label: "Reserve", name: "USDC buffer", value: "$39,779", change: "16%", icon: LockKeyhole, position: { left: "59%", top: "29%" } },
  { id: "aave", label: "Supply", name: "USDC supply", value: "$109,393", change: "4.8% APY", icon: Activity, position: { left: "75%", top: "22%" } },
  { id: "curve", label: "Pool", name: "Curve tricrypto", value: "$62,155", change: "18.4% APY", icon: BarChart3, position: { left: "75%", top: "48%" } },
  { id: "perp", label: "Protection", name: "ETH-PERP", value: "-$37,293", change: "0.42x delta", className: "web-page-strategy-detail__node--quiet", icon: ShieldCheck, position: { left: "75%", top: "74%" } },
];

const nodeDetails: Record<NodeId, { type: string; copy: string; rows: Array<[string, string, boolean?]> }> = {
  capital: { type: "Capital source", copy: "The strategy draws from the Metron treasury sleeve. Funds remain available for a controlled exit at any time.", rows: [["Available balance", "$248,620"], ["Committed", "$248,620"], ["Wallet", "0x7d…9a31"]] },
  lending: { type: "Lending allocation", copy: "USDC is supplied to Aave v3 on Ethereum to earn base yield while preserving a liquid exit path.", rows: [["Supplied", "$109,393"], ["Current APY", "4.80%", true], ["Health factor", "2.14"], ["Utilization", "38.2%"]] },
  lp: { type: "Liquidity allocation", copy: "The LP sleeve provides market-neutral fee income in the Curve tricrypto pool with a bounded inventory range.", rows: [["Position value", "$62,155"], ["7d fee APY", "18.40%", true], ["Pool share", "0.018%"], ["Range status", "In range"]] },
  hedge: { type: "Hedge allocation", copy: "A perpetual short offsets directional ETH exposure from liquidity positions. Funding is monitored continuously.", rows: [["Notional", "$37,293"], ["ETH delta", "−0.42"], ["Funding, 24h", "−$18.62"], ["Liquidation price", "$4,912"]] },
  reserve: { type: "Reserve allocation", copy: "A USDC buffer absorbs rebalance costs, funding spikes, and withdrawal demand without touching active positions.", rows: [["Balance", "$39,779"], ["Target", "16%", true], ["Buffer coverage", "8.2 days"], ["Custody", "Metron vault"]] },
  aave: { type: "Aave v3 position", copy: "Supply position earning variable USDC yield. No borrowing is active against this account.", rows: [["Principal", "$109,393"], ["Net APY", "4.80%", true], ["Accrued yield", "$1,284", true], ["Last update", "3 min ago"]] },
  curve: { type: "Curve position", copy: "Tricrypto LP position earning swap fees and emissions. The position is currently inside its rebalance band.", rows: [["Principal", "$62,155"], ["Net APY", "18.40%", true], ["7d fees", "$217", true], ["Last rebalance", "14 Jun 2025"]] },
  perp: { type: "Perpetual protection", copy: "ETH-PERP short reduces strategy delta during volatility. The hedge is cross-margined against the reserve sleeve.", rows: [["Notional", "−$37,293"], ["Mark price", "$3,420.80"], ["Funding, 24h", "−$18.62"], ["Margin ratio", "31.4%"]] },
};

export function StrategyDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedNode, setSelectedNode] = useState<NodeId>("lending");
  const [executionOpen, setExecutionOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const detail = nodeDetails[selectedNode];
  const SelectedIcon = nodes.find((node) => node.id === selectedNode)?.icon ?? Wallet;

  return (
    <main className="web-page-strategy-detail">
      <style>{strategyDetailStyles}</style>
      <div className="web-page-strategy-detail__shell">
        <nav className="web-page-strategy-detail__crumbs" aria-label="Breadcrumb">
          <span>Strategies</span><span className="web-page-strategy-detail__crumb-sep">/</span><span>Yield strategies</span><span className="web-page-strategy-detail__crumb-sep">/</span><span>Delta-neutral carry</span>
        </nav>

        <header className="web-page-strategy-detail__heading-row">
          <div className="web-page-strategy-detail__title-group">
            <div className="web-page-strategy-detail__eyebrow">Strategy 004 / live allocation</div>
            <h1 className="web-page-strategy-detail__title">Delta-neutral carry</h1>
            <p className="web-page-strategy-detail__subline">
              <Badge variant="success" leadingIcon={<Check size={12} />}>Healthy</Badge>
              <span>Ethereum mainnet</span><span className="web-page-strategy-detail__dot" aria-hidden="true" /><span>Updated 3 minutes ago</span>
            </p>
          </div>
          <div className="web-page-strategy-detail__actions">
            <Button variant="outline" size="sm" leadingIcon={<SlidersHorizontal className="web-page-strategy-detail__button-icon" />} onClick={() => setManageOpen((open) => !open)}>{manageOpen ? "Close manage" : "Manage strategy"}</Button>
            <Button variant="crimson" size="sm" leadingIcon={<Play className="web-page-strategy-detail__button-icon" />} onClick={() => setExecutionOpen((open) => !open)}>{executionOpen ? "Hide execution" : "Execute rebalance"}</Button>
          </div>
        </header>

        <section className="web-page-strategy-detail__metrics" aria-label="Strategy metrics">
          <MetricCard className="web-page-strategy-detail__metric web-page-strategy-detail__metric--accent" label="Total value" value="$248,620" change="+$18,420 · 8.0% all time" changeTone="positive" icon={<CircleDollarSign size={16} />} />
          <MetricCard className="web-page-strategy-detail__metric" label="Net APY" value="14.72%" change="+0.84% vs 30d average" changeTone="positive" icon={<TrendingUp size={16} />} />
          <MetricCard className="web-page-strategy-detail__metric" label="7d earned" value="$702.18" change="+$104.21 from last week" changeTone="positive" icon={<Sparkles size={16} />} />
          <MetricCard className="web-page-strategy-detail__metric" label="Strategy risk" value="31 / 100" change="Moderate · within target" icon={<ShieldCheck size={16} />} />
        </section>

        <div className="web-page-strategy-detail__tabs" role="tablist" aria-label="Strategy views">
          {tabs.map((tab) => <button key={tab.id} className={`web-page-strategy-detail__tab ${activeTab === tab.id ? "web-page-strategy-detail__tab--active" : ""}`} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
        </div>

        <div className="web-page-strategy-detail__layout">
          <section className="web-page-strategy-detail__graph-card" aria-labelledby="strategy-map-heading">
            <div className="web-page-strategy-detail__card-head">
              <div><h2 id="strategy-map-heading" className="web-page-strategy-detail__card-title">Strategy map</h2><p className="web-page-strategy-detail__card-description">Capital flows from the treasury sleeve into yield, liquidity, and protection legs.</p></div>
              <div className="web-page-strategy-detail__live"><span className="web-page-strategy-detail__live-dot" /> Live positions</div>
            </div>
            <div className="web-page-strategy-detail__graph" role="group" aria-label="Interactive strategy allocation graph">
              <span className="web-page-strategy-detail__connector web-page-strategy-detail__connector--one" aria-hidden="true" /><span className="web-page-strategy-detail__connector web-page-strategy-detail__connector--two" aria-hidden="true" /><span className="web-page-strategy-detail__connector web-page-strategy-detail__connector--three" aria-hidden="true" /><span className="web-page-strategy-detail__connector web-page-strategy-detail__connector--four" aria-hidden="true" /><span className="web-page-strategy-detail__connector web-page-strategy-detail__connector--five" aria-hidden="true" /><span className="web-page-strategy-detail__connector web-page-strategy-detail__connector--six" aria-hidden="true" /><span className="web-page-strategy-detail__connector web-page-strategy-detail__connector--seven" aria-hidden="true" />
              {nodes.map((node) => { const Icon = node.icon; return <button key={node.id} type="button" className={`web-page-strategy-detail__node ${node.className ?? ""} ${selectedNode === node.id ? "web-page-strategy-detail__node--selected" : ""}`} style={node.position} onClick={() => setSelectedNode(node.id)} aria-pressed={selectedNode === node.id}><span className="web-page-strategy-detail__node-label"><Icon />{node.label}</span><span className="web-page-strategy-detail__node-name">{node.name}</span><span className="web-page-strategy-detail__node-value">{node.value}<span className="web-page-strategy-detail__node-change">{node.change}</span></span></button>; })}
            </div>
            <div className="web-page-strategy-detail__graph-legend"><span className="web-page-strategy-detail__legend-item"><i className="web-page-strategy-detail__legend-line web-page-strategy-detail__legend-line--active" /> Selected allocation</span><span className="web-page-strategy-detail__legend-item"><i className="web-page-strategy-detail__legend-line" /> Capital flow</span><span className="web-page-strategy-detail__legend-item"><LockKeyhole size={12} /> Custodied by Metron</span></div>
          </section>

          <aside className="web-page-strategy-detail__side-stack" aria-label="Strategy details">
            <section className="web-page-strategy-detail__side-card web-page-strategy-detail__side-card--focus" aria-labelledby="selected-node-heading">
              <div className="web-page-strategy-detail__selected-heading"><div style={{ display: "flex", gap: 11 }}><div className="web-page-strategy-detail__selected-icon"><SelectedIcon /></div><div><h2 id="selected-node-heading" className="web-page-strategy-detail__selected-name">{selectedNode === "lending" ? "Aave v3" : nodeDetails[selectedNode].type.replace(" allocation", "")}</h2><div className="web-page-strategy-detail__selected-type">{detail.type}</div></div></div><button className="web-page-strategy-detail__close" type="button" aria-label="Clear selected node" onClick={() => setSelectedNode("capital")}><X /></button></div>
              <p className="web-page-strategy-detail__selected-copy">{detail.copy}</p>
              <dl className="web-page-strategy-detail__kv">{detail.rows.map(([label, value, positive]) => <div key={label} style={{ display: "contents" }}><dt>{label}</dt><dd className={positive ? "web-page-strategy-detail__positive" : ""}>{value}</dd></div>)}</dl>
              <div className="web-page-strategy-detail__allocation"><div className="web-page-strategy-detail__allocation-head"><span>Capital allocation</span><strong>{nodes.find((node) => node.id === selectedNode)?.change}</strong></div><div className="web-page-strategy-detail__allocation-bar" aria-label="Allocation breakdown"><span /><span /><span /></div></div>
            </section>

            <section className="web-page-strategy-detail__side-card" aria-labelledby="positions-heading"><h2 id="positions-heading" className="web-page-strategy-detail__side-title">Open positions</h2>{[["USDC supply", "Aave v3 · Ethereum", "$109,393", "+$436.20"], ["ETH / USDC LP", "Curve · tricrypto", "$62,155", "+$217.04"], ["ETH-PERP short", "Hyperliquid · 0.42x", "−$37,293", "−$18.62"]].map(([name, meta, value, pnl]) => <div className="web-page-strategy-detail__position-row" key={name}><div className="web-page-strategy-detail__position-name">{name}<span className="web-page-strategy-detail__position-meta">{meta}</span></div><div className="web-page-strategy-detail__position-value">{value}<span className="web-page-strategy-detail__position-pnl">{pnl}</span></div></div>)}</section>

            <section className="web-page-strategy-detail__side-card" aria-labelledby="risk-heading"><h2 id="risk-heading" className="web-page-strategy-detail__side-title">Risk guardrails</h2><div className="web-page-strategy-detail__risk-row"><div className="web-page-strategy-detail__risk-label"><span>Leverage</span><strong>1.24x / 2.00x</strong></div><Progress label="" value={1.24} max={2} tone="success" size="sm" aria-label="Leverage guardrail" /></div><div className="web-page-strategy-detail__risk-row"><div className="web-page-strategy-detail__risk-label"><span>Delta exposure</span><strong>−0.08 / ±0.15</strong></div><Progress label="" value={0.08} max={0.15} tone="success" size="sm" aria-label="Delta exposure guardrail" /></div><div className="web-page-strategy-detail__risk-row"><div className="web-page-strategy-detail__risk-label"><span>Drawdown trigger</span><strong>3.2% / 8.0%</strong></div><Progress label="" value={3.2} max={8} tone="warning" size="sm" aria-label="Drawdown guardrail" /></div><p className="web-page-strategy-detail__risk-note">No guardrail is currently close to its intervention threshold.</p></section>
          </aside>
        </div>

        <section className="web-page-strategy-detail__insights" aria-label="Strategy performance panels">
          <article className="web-page-strategy-detail__insight"><h3>Yield profile</h3><div className="web-page-strategy-detail__yield"><div className="web-page-strategy-detail__yield-value">14.72%</div><div className="web-page-strategy-detail__yield-period">net APY<br />30 day realized</div></div><div className="web-page-strategy-detail__spark" aria-label="Yield trend over 10 periods">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div><div className="web-page-strategy-detail__micro-copy">Carry is led by LP fees at 58%, with lending at 31% and funding drag at 4%.</div></article>
          <article className="web-page-strategy-detail__insight"><h3>Hedge coverage</h3><div className="web-page-strategy-detail__hedge"><div className="web-page-strategy-detail__hedge-pair">ETH-PERP short<small>current notional</small></div><div className="web-page-strategy-detail__hedge-ratio">0.42x</div></div><Progress label="Delta coverage" value={84} tone="success" size="sm" valueLabel="84%" helperText="Target range 75–95%" /><div className="web-page-strategy-detail__micro-copy" style={{ marginTop: 15 }}>Funding is negative and has reduced returns by $18.62 over the last 24 hours.</div></article>
          <article className="web-page-strategy-detail__insight"><h3>Risk pulse</h3><div className="web-page-strategy-detail__risk-summary"><div className="web-page-strategy-detail__risk-score">31</div><div className="web-page-strategy-detail__risk-copy"><strong>Moderate risk</strong>8 points below your max target</div></div><Progress label="Risk budget used" value={31} tone="warning" size="sm" valueLabel="31 / 100" /><div className="web-page-strategy-detail__micro-copy" style={{ marginTop: 13 }}>Volatility has eased for 3 consecutive days. Next review in 18 hours.</div></article>
        </section>

        {activeTab !== "overview" ? <section className="web-page-strategy-detail__drawer" aria-live="polite"><div className="web-page-strategy-detail__drawer-head"><h3>{tabs.find((tab) => tab.id === activeTab)?.label} view</h3><Badge variant="sand">Live snapshot</Badge></div><p className="web-page-strategy-detail__drawer-copy">{activeTab === "positions" ? "Three positions are open across Aave, Curve, and Hyperliquid. Values below include accrued fees and funding." : activeTab === "yield" ? "Realized yield is tracking above the strategy's 12% target. Fees and lending income are settled daily." : activeTab === "hedge" ? "Hedge coverage remains inside the target band. Rebalancing is only recommended when delta exceeds 0.15." : "Risk controls are armed. The strategy will pause if drawdown exceeds 8% or health factor falls below 1.50."}</p><div className="web-page-strategy-detail__timeline"><div className="web-page-strategy-detail__timeline-item"><span>{activeTab === "risk" ? "Health factor checked at 2.14" : activeTab === "hedge" ? "Hedge coverage recalculated at 84%" : activeTab === "yield" ? "Daily yield settlement posted" : "Position values refreshed"}</span><time>03 min ago</time></div><div className="web-page-strategy-detail__timeline-item"><span>Guardrails unchanged since last review</span><time>18 hr ago</time></div></div></section> : null}

        <section className="web-page-strategy-detail__execution" aria-label="Execution status"><div className="web-page-strategy-detail__execution-copy"><Zap /><div><div className="web-page-strategy-detail__execution-title">Automation is {paused ? "paused" : "armed"}</div><div className="web-page-strategy-detail__execution-note">Next scheduled rebalance checks delta and funding conditions before routing any transaction.</div></div></div><div className="web-page-strategy-detail__execution-actions"><Button variant="quiet" size="sm" leadingIcon={paused ? <Play className="web-page-strategy-detail__button-icon" /> : <Pause className="web-page-strategy-detail__button-icon" />} onClick={() => setPaused((current) => !current)}>{paused ? "Resume automation" : "Pause automation"}</Button><Button variant="crimson" size="sm" leadingIcon={<RefreshCw className="web-page-strategy-detail__button-icon" />} onClick={() => setExecutionOpen(true)}>Review rebalance</Button></div></section>

        {executionOpen ? <section className="web-page-strategy-detail__drawer" aria-label="Rebalance review"><div className="web-page-strategy-detail__drawer-head"><h3>Review rebalance</h3><button className="web-page-strategy-detail__close" type="button" aria-label="Close rebalance review" onClick={() => setExecutionOpen(false)}><X /></button></div><p className="web-page-strategy-detail__drawer-copy">No transaction is required right now. The current delta is −0.08 and sits inside the configured band. You can still route a manual rebalance after reviewing gas and slippage.</p><div className="web-page-strategy-detail__drawer-actions"><Button variant="outline" size="sm" onClick={() => setExecutionOpen(false)}>Keep current positions</Button><Button variant="crimson" size="sm" leadingIcon={<ArrowUpRight className="web-page-strategy-detail__button-icon" />} onClick={() => setExecutionOpen(false)}>Prepare transaction</Button></div></section> : null}
        {manageOpen ? <section className="web-page-strategy-detail__drawer" aria-label="Manage strategy"><div className="web-page-strategy-detail__drawer-head"><h3>Manage strategy</h3><button className="web-page-strategy-detail__close" type="button" aria-label="Close strategy management" onClick={() => setManageOpen(false)}><X /></button></div><p className="web-page-strategy-detail__drawer-copy">Adjust the allocation policy, automation schedule, or risk budget. Current policy runs a 16% reserve and checks every 6 hours.</p><div className="web-page-strategy-detail__drawer-actions"><Button variant="outline" size="sm" leadingIcon={<Clock3 className="web-page-strategy-detail__button-icon" />}>Edit schedule</Button><Button variant="sand" size="sm" leadingIcon={<Target className="web-page-strategy-detail__button-icon" />}>Edit guardrails</Button></div></section> : null}
      </div>
    </main>
  );
}
