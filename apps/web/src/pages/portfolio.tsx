import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Ellipsis,
  ExternalLink,
  Filter,
  Layers3,
  LineChart,
  Network,
  RefreshCw,
  Search,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  GlassCard,
  IconButton,
  MetricCard,
  Progress,
} from "@metron/ui";

const chains = ["All chains", "Ethereum", "Arbitrum", "Base", "Solana"] as const;
type Chain = (typeof chains)[number];

type Position = {
  id: string;
  asset: string;
  symbol: string;
  protocol: string;
  chain: Exclude<Chain, "All chains">;
  type: string;
  balance: string;
  value: number;
  pnl: number;
  apy: string;
  health: string;
  healthTone: "success" | "warning" | "danger";
  icon: ReactNode;
};

const chainData: Record<Exclude<Chain, "All chains">, { value: number; pnl: number; positions: number; supplied: string; borrowed: string; color: string }> = {
  Ethereum: { value: 96420.18, pnl: 2160.44, positions: 2, supplied: "$54,180", borrowed: "$12,600", color: "#b38f6f" },
  Arbitrum: { value: 41280.55, pnl: 984.33, positions: 2, supplied: "$26,420", borrowed: "$7,810", color: "#8e9bb5" },
  Base: { value: 22415.09, pnl: 338.02, positions: 2, supplied: "$16,790", borrowed: "$2,140", color: "#9b1730" },
  Solana: { value: 16090.72, pnl: -118.9, positions: 2, supplied: "$10,880", borrowed: "$1,220", color: "#7c9e8d" },
};

  { id: "eth-aave", asset: "Ethereum", symbol: "ETH", protocol: "Aave v3", chain: "Ethereum", type: "Supply", balance: "18.42 ETH", value: 59184.32, pnl: 1842.2, apy: "3.84%", health: "Healthy", healthTone: "success", icon: <Coins size={14} /> },
  { id: "usdc-morpho", asset: "USD Coin", symbol: "USDC", protocol: "Morpho Blue", chain: "Ethereum", type: "Lend", balance: "21,400 USDC", value: 21400, pnl: 318.12, apy: "8.21%", health: "Healthy", healthTone: "success", icon: <CircleDollarSign size={14} /> },
  { id: "arb-gmx", asset: "ETH / USDC", symbol: "LP", protocol: "GMX", chain: "Arbitrum", type: "Liquidity", balance: "0.84 LP", value: 16280.55, pnl: 720.14, apy: "14.62%", health: "Healthy", healthTone: "success", icon: <Layers3 size={14} /> },
  { id: "arb-eth", asset: "Ethereum", symbol: "ETH", protocol: "Radiant", chain: "Arbitrum", type: "Collateral", balance: "7.76 ETH", value: 24920, pnl: 264.19, apy: "2.18%", health: "Watch", healthTone: "warning", icon: <Coins size={14} /> },
  { id: "base-aero", asset: "ETH / USDC", symbol: "LP", protocol: "Aerodrome", chain: "Base", type: "Liquidity", balance: "1.12 LP", value: 12415.09, pnl: 298.82, apy: "18.40%", health: "Healthy", healthTone: "success", icon: <Layers3 size={14} /> },
  { id: "base-usdc", asset: "USD Coin", symbol: "USDC", protocol: "Moonwell", chain: "Base", type: "Supply", balance: "10,000 USDC", value: 10000, pnl: 39.2, apy: "5.74%", health: "Healthy", healthTone: "success", icon: <CircleDollarSign size={14} /> },
  { id: "sol-jup", asset: "SOL / USDC", symbol: "LP", protocol: "Jupiter", chain: "Solana", type: "Liquidity", balance: "42.8 LP", value: 10790.72, pnl: -84.2, apy: "11.20%", health: "Watch", healthTone: "warning", icon: <Layers3 size={14} /> },
  { id: "sol-sol", asset: "Solana", symbol: "SOL", protocol: "Marinade", chain: "Solana", type: "Stake", balance: "29.4 SOL", value: 5300, pnl: -34.7, apy: "7.18%", health: "Healthy", healthTone: "success", icon: <Network size={14} /> },
  { id: "sol-sol", asset: "Solana", symbol: "SOL", protocol: "Marinade", chain: "Solana", type: "Stake", balance: "29.4 SOL", value: 5300, pnl: -34.7, apy: "7.18%", health: "Healthy", healthTone: "success", icon: "S" },
];

const assetMix = [
  { label: "ETH", share: 32.8, value: "$59,184", color: "#b38f6f" },
  { label: "Stablecoins", share: 24.6, value: "$44,440", color: "#8e9bb5" },
  { label: "LP positions", share: 21.1, value: "$38,067", color: "#9b1730" },
  { label: "SOL", share: 8.9, value: "$16,091", color: "#7c9e8d" },
  { label: "Other", share: 12.6, value: "$22,425", color: "#5b5c64" },
];

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

const formatCompactUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);

export function PortfolioPage() {
  const [selectedChain, setSelectedChain] = useState<Chain>("All chains");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    const rows = selectedChain === "All chains" ? Object.values(chainData) : [chainData[selectedChain]];
    return rows.reduce(
      (acc, chain) => ({
        value: acc.value + chain.value,
        pnl: acc.pnl + chain.pnl,
        positions: acc.positions + chain.positions,
        supplied: acc.supplied + Number(chain.supplied.replace(/[$,]/g, "")),
        borrowed: acc.borrowed + Number(chain.borrowed.replace(/[$,]/g, "")),
      }),
      { value: 0, pnl: 0, positions: 0, supplied: 0, borrowed: 0 },
    );
  }, [selectedChain]);

  const filteredPositions = useMemo(() => positions.filter((position) => {
    const inChain = selectedChain === "All chains" || position.chain === selectedChain;
    const search = query.trim().toLowerCase();
    return inChain && (!search || `${position.asset} ${position.protocol} ${position.chain} ${position.type}`.toLowerCase().includes(search));
  }), [query, selectedChain]);

  const handleAction = (action: string, position: Position) => {
    setNotice(`${action} request staged for ${position.asset} on ${position.protocol}.`);
    setActiveMenu(null);
  };

  return (
    <main className="web-page-portfolio">
      <style>{styles}</style>
      <div className="web-page-portfolio__topline">
        <div>
          <p className="web-page-portfolio__eyebrow">Capital overview</p>
          <h1>Portfolio</h1>
          <p className="web-page-portfolio__lede">A unified view of your positions, collateral, and deployed liquidity.</p>
        </div>
        <div className="web-page-portfolio__header-actions">
          <span className="web-page-portfolio__sync"><span className="web-page-portfolio__sync-dot" />Synced 2 min ago</span>
          <Button variant="outline" size="sm" leadingIcon={<RefreshCw size={15} />}>Refresh</Button>
        </div>
      </div>

      <section className="web-page-portfolio__chain-bar" aria-label="Portfolio chain filter">
        <div className="web-page-portfolio__chain-heading">
          <Network size={16} aria-hidden="true" />
          <span>Network scope</span>
        </div>
        <div className="web-page-portfolio__chain-tabs" role="tablist" aria-label="Select network">
          {chains.map((chain) => (
            <button
              className="web-page-portfolio__chain-tab"
              data-active={selectedChain === chain}
              key={chain}
              onClick={() => { setSelectedChain(chain); setActiveMenu(null); }}
              role="tab"
              aria-selected={selectedChain === chain}
              type="button"
            >
              {chain}
              {chain !== "All chains" ? <span>{chainData[chain].positions}</span> : null}
            </button>
          ))}
        </div>
        <label className="web-page-portfolio__chain-select-wrap">
          <span className="web-page-portfolio__sr-only">Select network</span>
          <select className="web-page-portfolio__chain-select" value={selectedChain} onChange={(event) => setSelectedChain(event.target.value as Chain)} aria-label="Select network">
            {chains.map((chain) => <option key={chain} value={chain}>{chain}</option>)}
          </select>
          <ChevronDown className="web-page-portfolio__chain-select-icon" size={14} aria-hidden="true" />
        </label>
      </section>

      {notice ? (
        <div className="web-page-portfolio__notice" role="status" aria-live="polite">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={15} /></button>
        </div>
      ) : null}

      <section className="web-page-portfolio__metrics" aria-label="Portfolio totals">
        <MetricCard label="Total portfolio value" value={formatUsd(totals.value)} change="Across all connected wallets" changeTone="neutral" icon={<WalletCards size={17} />} className="web-page-portfolio__metric web-page-portfolio__metric--hero" />
        <MetricCard label="Net performance" value={`${totals.pnl >= 0 ? "+" : "-"}${formatUsd(Math.abs(totals.pnl))}`} change="Since first deposit" changeTone={totals.pnl >= 0 ? "positive" : "negative"} icon={<LineChart size={17} />} className="web-page-portfolio__metric" />
        <MetricCard label="Active positions" value={totals.positions} change={`${selectedChain === "All chains" ? "4 networks" : selectedChain}`} changeTone="neutral" icon={<Layers3 size={17} />} className="web-page-portfolio__metric" />
        <MetricCard label="Net exposure" value={formatUsd(totals.supplied - totals.borrowed)} change={`${formatCompactUsd(totals.borrowed)} borrowed`} changeTone="neutral" icon={<CircleDollarSign size={17} />} className="web-page-portfolio__metric" />
      </section>

      <section className="web-page-portfolio__overview-grid">
        <GlassCard title="Allocation by chain" description="Current portfolio value by network." className="web-page-portfolio__allocation">
          <div className="web-page-portfolio__allocation-chart" aria-label="Portfolio allocation by chain">
            {(Object.entries(chainData) as [Exclude<Chain, "All chains">, (typeof chainData)[Exclude<Chain, "All chains">]][]).map(([chain, data]) => {
              const share = (data.value / 176206.54) * 100;
              const isSelected = selectedChain === "All chains" || selectedChain === chain;
              return (
                <button className="web-page-portfolio__allocation-row" data-muted={!isSelected} key={chain} type="button" onClick={() => setSelectedChain(chain)}>
                  <span className="web-page-portfolio__allocation-label"><i style={{ backgroundColor: data.color }} />{chain}</span>
                  <span className="web-page-portfolio__allocation-track"><i style={{ width: `${share}%`, backgroundColor: data.color }} /></span>
                  <span className="web-page-portfolio__allocation-value">{formatCompactUsd(data.value)}<small>{share.toFixed(1)}%</small></span>
                </button>
              );
            })}
          </div>
          <div className="web-page-portfolio__allocation-foot"><span>Supplied {formatCompactUsd(totals.supplied)}</span><span>Borrowed {formatCompactUsd(totals.borrowed)}</span></div>
        </GlassCard>

        <GlassCard title="Asset mix" description="Exposure by underlying asset." className="web-page-portfolio__asset-mix">
          <div className="web-page-portfolio__mix-bar" aria-label="Asset mix distribution">
            {assetMix.map((asset) => <span key={asset.label} style={{ width: `${asset.share}%`, backgroundColor: asset.color }} title={`${asset.label}: ${asset.share}%`} />)}
          </div>
          <div className="web-page-portfolio__mix-list">
            {assetMix.map((asset) => (
              <div className="web-page-portfolio__mix-item" key={asset.label}>
                <span className="web-page-portfolio__mix-name"><i style={{ backgroundColor: asset.color }} />{asset.label}</span>
                <span>{asset.value}</span><b>{asset.share.toFixed(1)}%</b>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Risk posture" description="Borrowing remains within policy limits." className="web-page-portfolio__risk-card" action={<Badge variant="success">Low risk</Badge>}>
          <div className="web-page-portfolio__risk-score"><div><span>Collateral health</span><strong>82</strong><small>/ 100</small></div><Progress label="Health score" value={82} valueLabel="82%" tone="success" size="sm" aria-label="Collateral health score" /></div>
          <div className="web-page-portfolio__risk-grid"><span><small>Collateral</small><b>{formatCompactUsd(totals.supplied)}</b></span><span><small>Borrowed</small><b>{formatCompactUsd(totals.borrowed)}</b></span><span><small>Utilization</small><b>{((totals.borrowed / totals.supplied) * 100).toFixed(1)}%</b></span></div>
          <Button variant="quiet" size="sm" trailingIcon={<ChevronRight size={14} />}>Open risk center</Button>
        </GlassCard>
      </section>

      <section className="web-page-portfolio__positions-section" aria-labelledby="positions-heading">
        <div className="web-page-portfolio__section-header">
          <div><p className="web-page-portfolio__eyebrow">Live inventory</p><h2 id="positions-heading">Positions</h2></div>
          <div className="web-page-portfolio__table-tools">
            <label className="web-page-portfolio__search"><Search size={15} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search positions" aria-label="Search positions" /></label>
            <Button variant="outline" size="sm" leadingIcon={<SlidersHorizontal size={15} />}>Filter</Button>
          </div>
        </div>
        {filteredPositions.length === 0 ? (
          <GlassCard className="web-page-portfolio__empty"><div className="web-page-portfolio__empty-icon"><Filter size={20} /></div><h3>No positions match</h3><p>Try another network or clear the search filter.</p><Button variant="quiet" size="sm" onClick={() => { setQuery(""); setSelectedChain("All chains"); }}>Clear filters</Button></GlassCard>
        ) : (
          <div className="web-page-portfolio__table-wrap">
            <table className="web-page-portfolio__table">
              <thead><tr><th scope="col">Position</th><th scope="col">Network</th><th scope="col">Balance</th><th scope="col">Value</th><th scope="col">P&amp;L</th><th scope="col">APY</th><th scope="col">Health</th><th scope="col"><span className="web-page-portfolio__sr-only">Actions</span></th></tr></thead>
              <tbody>
                {filteredPositions.map((position) => (
                  <tr key={position.id} data-selected={selectedPosition?.id === position.id}>
                    <td><div className="web-page-portfolio__position-name"><span className="web-page-portfolio__asset-icon">{position.icon}</span><span><b>{position.asset}</b><small>{position.protocol} · {position.type}</small></span></div></td>
                    <td><span className="web-page-portfolio__network"><i style={{ backgroundColor: chainData[position.chain].color }} />{position.chain}</span></td>
                    <td className="web-page-portfolio__mono">{position.balance}</td>
                    <td className="web-page-portfolio__mono">{formatUsd(position.value)}</td>
                    <td className={`web-page-portfolio__mono ${position.pnl >= 0 ? "web-page-portfolio__positive" : "web-page-portfolio__negative"}`}>{position.pnl >= 0 ? "+" : "-"}{formatUsd(Math.abs(position.pnl))}</td>
                    <td className="web-page-portfolio__mono">{position.apy}</td>
                    <td><Badge variant={position.healthTone}>{position.health}</Badge></td>
                    <td><div className="web-page-portfolio__row-actions"><Button variant="quiet" size="sm" onClick={() => setSelectedPosition(position)}>Inspect</Button><div className="web-page-portfolio__menu-wrap"><IconButton icon={<Ellipsis size={17} />} accessibleLabel={`Actions for ${position.asset}`} variant="ghost" size="sm" onClick={() => setActiveMenu(activeMenu === position.id ? null : position.id)} />{activeMenu === position.id ? <div className="web-page-portfolio__action-menu" role="menu"><button type="button" role="menuitem" onClick={() => handleAction("Adjust", position)}><SlidersHorizontal size={14} />Adjust position</button><button type="button" role="menuitem" onClick={() => handleAction("Withdraw", position)}><ArrowDownLeft size={14} />Withdraw funds</button><button type="button" role="menuitem" onClick={() => handleAction("View", position)}><ExternalLink size={14} />View on explorer</button></div> : null}</div></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedPosition ? (
        <aside className="web-page-portfolio__inspector" aria-label="Selected position details">
          <div><span className="web-page-portfolio__eyebrow">Position detail</span><h2>{selectedPosition.asset}</h2><p>{selectedPosition.protocol} on {selectedPosition.chain}</p></div>
          <div className="web-page-portfolio__inspector-stats"><span><small>Position value</small><b>{formatUsd(selectedPosition.value)}</b></span><span><small>Current APY</small><b>{selectedPosition.apy}</b></span><span><small>Net P&amp;L</small><b className={selectedPosition.pnl >= 0 ? "web-page-portfolio__positive" : "web-page-portfolio__negative"}>{selectedPosition.pnl >= 0 ? "+" : "-"}{formatUsd(Math.abs(selectedPosition.pnl))}</b></span></div>
          <div className="web-page-portfolio__inspector-actions"><Button variant="crimson" size="sm" leadingIcon={<SlidersHorizontal size={15} />} onClick={() => handleAction("Adjust", selectedPosition)}>Adjust</Button><Button variant="outline" size="sm" leadingIcon={<ArrowUpRight size={15} />} onClick={() => handleAction("Withdraw", selectedPosition)}>Withdraw</Button><IconButton icon={<X size={16} />} accessibleLabel="Close position details" variant="ghost" size="sm" onClick={() => setSelectedPosition(null)} /></div>
        </aside>
      ) : null}
    </main>
  );
}

const styles = `
.web-page-portfolio { max-width: 1480px; margin: 0 auto; padding: 38px clamp(18px, 3vw, 52px) 72px; color: var(--metron-pearl, #f2f1ed); }
.web-page-portfolio h1, .web-page-portfolio h2, .web-page-portfolio h3, .web-page-portfolio p { margin: 0; }
.web-page-portfolio__topline { display: flex; justify-content: space-between; gap: 32px; align-items: flex-end; border-bottom: 1px solid var(--metron-border, rgb(242 241 237 / 14%)); padding-bottom: 30px; }
.web-page-portfolio__eyebrow { color: var(--metron-sand-bright, #c8aa8e); font-family: var(--metron-font-mono, monospace); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 10px !important; }
.web-page-portfolio h1 { font-size: clamp(30px, 4vw, 48px); letter-spacing: -.04em; line-height: 1; font-weight: 600; }
.web-page-portfolio__lede { color: var(--metron-pearl-muted, rgb(242 241 237 / 68%)); margin-top: 12px !important; font-size: 14px; max-width: 500px; }
.web-page-portfolio__header-actions { display: flex; align-items: center; gap: 20px; }
.web-page-portfolio__sync { display: inline-flex; align-items: center; gap: 8px; color: var(--metron-pearl-dim, rgb(242 241 237 / 42%)); font: 11px var(--metron-font-mono, monospace); white-space: nowrap; }
.web-page-portfolio__chain-tab, .web-page-portfolio__chain-select { border: 1px solid transparent; background: transparent; color: var(--metron-pearl-dim, rgb(242 241 237 / 42%)); font: 12px var(--metron-font-sans, sans-serif); padding: 8px 12px; border-radius: var(--metron-radius-control, 14px); cursor: pointer; transition: .18s ease; }
.web-page-portfolio__chain-tab:hover, .web-page-portfolio__chain-select:hover { color: var(--metron-pearl); background: var(--metron-surface-hover, rgb(242 241 237 / 8%)); }
.web-page-portfolio__chain-tab:focus-visible, .web-page-portfolio__chain-select:focus-visible, .web-page-portfolio__allocation-row:focus-visible, .web-page-portfolio__action-menu button:focus-visible { outline: 2px solid var(--metron-focus, #b38f6f); outline-offset: 2px; }
.web-page-portfolio__chain-tab[data-active="true"] { color: var(--metron-pearl); background: var(--metron-surface-strong, #151518); border-color: var(--metron-border, rgb(242 241 237 / 14%)); }
.web-page-portfolio__chain-tab span { color: var(--metron-sand-bright, #c8aa8e); margin-left: 7px; font: 10px var(--metron-font-mono, monospace); }
.web-page-portfolio__chain-select-wrap { display: none; position: relative; min-width: 150px; }
.web-page-portfolio__chain-select { width: 100%; appearance: none; border-color: var(--metron-border); }
.web-page-portfolio__chain-select-icon { pointer-events: none; position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: var(--metron-pearl-dim); }
.web-page-portfolio__notice { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 11px 14px; border-left: 2px solid var(--metron-crimson-bright); background: rgb(113 0 20 / 18%); color: var(--metron-pearl-muted); font-size: 12px; margin: 0 0 22px; }
.web-page-portfolio__notice button { border: 0; background: transparent; color: var(--metron-pearl-muted); cursor: pointer; display: grid; place-items: center; }
.web-page-portfolio__metrics { display: grid; grid-template-columns: minmax(1.35fr, 2fr) repeat(3, minmax(0, 1fr)); gap: 12px; }
.web-page-portfolio__metric { min-height: 132px; }
.web-page-portfolio__metric--hero { border-top: 2px solid var(--metron-crimson-bright); }
.web-page-portfolio__overview-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 14px; margin-top: 14px; }
.web-page-portfolio__allocation { grid-row: span 2; }
.web-page-portfolio__overview-grid .metron-card { min-width: 0; }
.web-page-portfolio__allocation-chart { display: grid; gap: 17px; }
.web-page-portfolio__allocation-row { display: grid; grid-template-columns: 108px minmax(0, 1fr) 104px; align-items: center; gap: 14px; text-align: left; border: 0; background: transparent; padding: 0; color: var(--metron-pearl); cursor: pointer; }
.web-page-portfolio__allocation-row[data-muted="true"] { opacity: .4; }
.web-page-portfolio__allocation-label, .web-page-portfolio__mix-name { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; white-space: nowrap; }
.web-page-portfolio__allocation-label i, .web-page-portfolio__mix-name i, .web-page-portfolio__network i { width: 7px; height: 7px; display: inline-block; border-radius: 50%; flex: 0 0 auto; }
.web-page-portfolio__allocation-track { display: block; height: 5px; background: rgb(242 241 237 / 8%); }
.web-page-portfolio__allocation-track i { display: block; height: 100%; min-width: 4px; transition: width .25s ease; }
.web-page-portfolio__allocation-value { text-align: right; font: 11px var(--metron-font-mono, monospace); white-space: nowrap; }
.web-page-portfolio__allocation-value small { display: block; color: var(--metron-pearl-dim); font-size: 9px; margin-top: 3px; }
.web-page-portfolio__allocation-foot { display: flex; justify-content: space-between; border-top: 1px solid var(--metron-border); margin-top: 24px; padding-top: 16px; color: var(--metron-pearl-dim); font: 10px var(--metron-font-mono, monospace); }
.web-page-portfolio__mix-bar { display: flex; width: 100%; height: 12px; gap: 2px; background: rgb(242 241 237 / 6%); margin: 8px 0 23px; }
.web-page-portfolio__mix-bar span { min-width: 4px; transition: width .25s ease; }
.web-page-portfolio__mix-list { display: grid; gap: 10px; }
.web-page-portfolio__mix-item { display: grid; grid-template-columns: 1fr auto auto; gap: 18px; align-items: center; color: var(--metron-pearl-muted); font: 11px var(--metron-font-mono, monospace); }
.web-page-portfolio__mix-item b { color: var(--metron-pearl); font-weight: 500; min-width: 42px; text-align: right; }
.web-page-portfolio__risk-card { grid-column: 2; }
.web-page-portfolio__risk-score { display: grid; gap: 13px; }
.web-page-portfolio__risk-score > div { display: flex; align-items: baseline; gap: 8px; color: var(--metron-pearl-muted); font-size: 12px; }
.web-page-portfolio__risk-score strong { color: var(--metron-pearl); font: 30px var(--metron-font-mono, monospace); margin-left: auto; }
.web-page-portfolio__risk-score small { color: var(--metron-pearl-dim); font: 11px var(--metron-font-mono, monospace); }
.web-page-portfolio__risk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; border-top: 1px solid var(--metron-border); margin-top: 18px; padding-top: 14px; }
.web-page-portfolio__risk-grid span { display: grid; gap: 5px; }
.web-page-portfolio__risk-grid small { color: var(--metron-pearl-dim); font-size: 10px; }
.web-page-portfolio__risk-grid b { font: 12px var(--metron-font-mono, monospace); color: var(--metron-pearl); }
.web-page-portfolio__risk-card .metron-button { padding-left: 0; margin-top: 16px; }
.web-page-portfolio__positions-section { margin-top: 42px; }
.web-page-portfolio__section-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
.web-page-portfolio h2 { font-size: 23px; letter-spacing: -.025em; font-weight: 550; }
.web-page-portfolio__table-tools { display: flex; align-items: center; gap: 8px; }
.web-page-portfolio__search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--metron-border); background: var(--metron-surface); padding: 7px 10px; min-width: 210px; color: var(--metron-pearl-dim); }
.web-page-portfolio__search input { border: 0; outline: 0; min-width: 0; width: 100%; background: transparent; color: var(--metron-pearl); font: 12px var(--metron-font-sans, sans-serif); }
.web-page-portfolio__search input::placeholder { color: var(--metron-pearl-dim); }
.web-page-portfolio__table-wrap { overflow-x: auto; border-top: 1px solid var(--metron-border-strong); border-bottom: 1px solid var(--metron-border); }
.web-page-portfolio__table { width: 100%; min-width: 950px; border-collapse: collapse; }
.web-page-portfolio__table th { color: var(--metron-pearl-dim); font: 10px var(--metron-font-mono, monospace); font-weight: 400; letter-spacing: .1em; text-align: left; text-transform: uppercase; padding: 13px 12px; white-space: nowrap; }
.web-page-portfolio__table td { padding: 15px 12px; border-top: 1px solid var(--metron-border); font-size: 12px; white-space: nowrap; }
.web-page-portfolio__table tbody tr { transition: background .18s ease; }
.web-page-portfolio__table tbody tr:hover, .web-page-portfolio__table tbody tr[data-selected="true"] { background: rgb(242 241 237 / 4%); }
.web-page-portfolio__position-name { display: flex; align-items: center; gap: 10px; min-width: 170px; }
.web-page-portfolio__position-name > span:last-child { display: grid; gap: 4px; }
.web-page-portfolio__position-name b { font-size: 12px; font-weight: 550; }
.web-page-portfolio__position-name small { color: var(--metron-pearl-dim); font-size: 10px; }
.web-page-portfolio__asset-icon { width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--metron-border-strong); background: var(--metron-carbon-surface); color: var(--metron-sand-bright); font: 13px var(--metron-font-mono, monospace); }
.web-page-portfolio__network { display: inline-flex; align-items: center; gap: 7px; color: var(--metron-pearl-muted); }
.web-page-portfolio__mono { font: 11px var(--metron-font-mono, monospace); }
.web-page-portfolio__positive { color: var(--metron-success, #34d399) !important; }
.web-page-portfolio__negative { color: #d46d78 !important; }
.web-page-portfolio__row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.web-page-portfolio__row-actions .metron-button { color: var(--metron-sand-bright); padding-left: 5px; padding-right: 5px; }
.web-page-portfolio__menu-wrap { position: relative; }
.web-page-portfolio__action-menu { position: absolute; z-index: 4; top: calc(100% + 5px); right: 0; min-width: 170px; padding: 5px; border: 1px solid var(--metron-border-strong); background: #151518; box-shadow: var(--metron-shadow-control); }
.web-page-portfolio__action-menu button { display: flex; align-items: center; gap: 9px; width: 100%; border: 0; background: transparent; color: var(--metron-pearl-muted); padding: 9px 10px; text-align: left; font-size: 11px; cursor: pointer; }
.web-page-portfolio__action-menu button:hover { color: var(--metron-pearl); background: var(--metron-surface-hover); }
.web-page-portfolio__empty { display: grid; justify-items: center; text-align: center; padding: 42px 20px; }
.web-page-portfolio__empty-icon { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid var(--metron-border-strong); color: var(--metron-sand-bright); margin-bottom: 14px; }
.web-page-portfolio__empty h3 { font-size: 16px; font-weight: 550; }
.web-page-portfolio__empty p { color: var(--metron-pearl-dim); font-size: 12px; margin: 7px 0 16px !important; }
.web-page-portfolio__inspector { display: grid; grid-template-columns: 1fr 1.4fr auto; align-items: center; gap: 28px; position: sticky; z-index: 3; bottom: 18px; margin-top: 22px; border: 1px solid var(--metron-border-strong); border-left: 2px solid var(--metron-crimson-bright); background: rgb(18 18 21 / 96%); box-shadow: var(--metron-shadow-control); padding: 16px 18px; backdrop-filter: blur(12px); }
.web-page-portfolio__inspector h2 { font-size: 18px; margin-top: 3px; }
.web-page-portfolio__inspector p { color: var(--metron-pearl-dim); font-size: 11px; margin-top: 4px !important; }
.web-page-portfolio__inspector-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.web-page-portfolio__inspector-stats span { display: grid; gap: 5px; }
.web-page-portfolio__inspector-stats small { color: var(--metron-pearl-dim); font-size: 10px; }
.web-page-portfolio__inspector-stats b { font: 12px var(--metron-font-mono, monospace); }
.web-page-portfolio__inspector-actions { display: flex; align-items: center; gap: 6px; }
.web-page-portfolio__sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
@media (max-width: 1080px) { .web-page-portfolio__metrics { grid-template-columns: repeat(2, 1fr); } .web-page-portfolio__overview-grid { grid-template-columns: 1fr; } .web-page-portfolio__allocation { grid-row: auto; } .web-page-portfolio__risk-card { grid-column: auto; } .web-page-portfolio__inspector { grid-template-columns: 1fr auto; } .web-page-portfolio__inspector-stats { grid-column: 1 / -1; grid-row: 2; } .web-page-portfolio__inspector-actions { grid-column: 2; grid-row: 1; } }
@media (max-width: 720px) { .web-page-portfolio { padding: 24px 15px 56px; } .web-page-portfolio__topline { display: block; padding-bottom: 22px; } .web-page-portfolio__header-actions { justify-content: space-between; margin-top: 22px; } .web-page-portfolio__chain-bar { display: block; } .web-page-portfolio__chain-heading { margin-bottom: 10px; } .web-page-portfolio__chain-tabs { display: none; } .web-page-portfolio__chain-select-wrap { display: block; } .web-page-portfolio__metrics { grid-template-columns: 1fr; } .web-page-portfolio__section-header { display: block; } .web-page-portfolio__table-tools { margin-top: 15px; } .web-page-portfolio__search { flex: 1; min-width: 0; } .web-page-portfolio__inspector { display: block; } .web-page-portfolio__inspector-stats { margin: 18px 0; } .web-page-portfolio__inspector-actions { justify-content: flex-end; } }
@media (prefers-reduced-motion: reduce) { .web-page-portfolio *, .web-page-portfolio *::before, .web-page-portfolio *::after { transition-duration: .01ms !important; } }
`;
