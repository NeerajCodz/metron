import { Activity, ArrowUpRight } from "lucide-react";

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="wordmark" href="/" aria-label="Metron home">
          <span className="wordmark-mark" aria-hidden="true" />
          <span>METRON</span>
        </a>
        <span className="network-status">
          <span className="status-dot" aria-hidden="true" />
          Mainnet connected
        </span>
      </header>

      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="eyebrow">
          <Activity size={14} strokeWidth={2.5} aria-hidden="true" />
          Protocol control room
        </div>
        <h1 id="welcome-title">The signal is clear.</h1>
        <p>Monitor liquidity, positions, and protocol health from one decisive view.</p>
        <a className="panel-link" href="#dashboard">
          Enter dashboard
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </section>

      <footer className="app-footer">
        <span>METRON / SYSTEM ONLINE</span>
        <span>v0.1.0</span>
      </footer>
    </main>
  );
}
