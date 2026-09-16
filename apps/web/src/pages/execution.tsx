import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  Fuel,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Network,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  WalletCards,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataList,
  DataListItem,
  InlineAlert,
  Progress,
  Switch,
  Timeline,
} from "@metron/ui";

const routeAddress = "0x7F3a...91c2";

const steps = [
  {
    label: "Prepare",
    detail: "Route built",
  },
  {
    label: "Authorize",
    detail: "Wallet signature",
  },
  {
    label: "Commit",
    detail: "MEV protection",
  },
  {
    label: "Settle",
    detail: "Awaiting execution",
  },
] as const;

const bridgeItems = [
  {
    id: "quote",
    title: "Quote locked",
    description: "0.041 ETH bridge fee included in the route quote.",
    meta: "Complete",
    status: "complete" as const,
    icon: <Check size={14} aria-hidden="true" />,
  },
  {
    id: "message",
    title: "Bridge message ready",
    description: "Across intent is signed and queued for relayers.",
    meta: "Current",
    status: "current" as const,
    icon: <Network size={14} aria-hidden="true" />,
  },
  {
    id: "settlement",
    title: "Destination settlement",
    description: "Funds arrive on Ethereum after the finality window.",
    meta: "~7 min",
    status: "upcoming" as const,
    icon: <ArrowDown size={14} aria-hidden="true" />,
  },
];

export function ExecutionPage() {
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [mevCommitted, setMevCommitted] = useState(true);
  const [executionWindow, setExecutionWindow] = useState("next-block");
  const [copied, setCopied] = useState(false);
  const [explorerStatus, setExplorerStatus] = useState<"idle" | "running" | "success">("idle");
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText("0x7F3a2cA18F9c0D5A4bE191c2");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const confirmRoute = () => {
    if (routeConfirmed || confirmationStatus === "running" || !mevCommitted) return;
    setConfirmationStatus("running");
    window.setTimeout(() => {
      setRouteConfirmed(true);
      setConfirmationStatus("success");
    }, 900);
  };

  const openExplorer = () => {
    setExplorerStatus("running");
    window.setTimeout(() => setExplorerStatus("success"), 450);
  };

  return (
    <div className="web-page-execution">
      <style>{styles}</style>

      <header className="web-page-execution__header">
        <div>
          <p className="web-page-execution__eyebrow">Execution center / route review</p>
          <h1>Confirm the route</h1>
          <p className="web-page-execution__intro">
            A final review of the transaction path before Metron broadcasts the intent.
          </p>
        </div>
        <div className="web-page-execution__header-meta">
          <Badge
            variant={confirmationStatus === "running" ? "warning" : routeConfirmed ? "success" : "sand"}
            leadingIcon={
              confirmationStatus === "running" ? <RefreshCw size={13} /> : <CircleAlert size={13} />
            }
          >
            {confirmationStatus === "running"
              ? "Confirming route"
              : routeConfirmed
                ? "Route confirmed"
                : "Ready to execute"}
          </Badge>
          <span className="web-page-execution__intent-id">Intent MT-2048</span>
        </div>
      </header>

      <main className="web-page-execution__main">
        <section className="web-page-execution__primary-grid" aria-label="Execution review">
          <div className="web-page-execution__left-column">
            <Card
              variant="carbon"
              className="web-page-execution__card web-page-execution__step-card"
            >
              <CardHeader>
                <div className="web-page-execution__card-heading">
                  <div>
                    <p className="web-page-execution__label">Execution plan</p>
                    <CardTitle>One route, four checkpoints</CardTitle>
                    <CardDescription>
                      Each checkpoint must be satisfied before settlement can begin.
                    </CardDescription>
                  </div>
                  <span className="web-page-execution__step-count">
                    {routeConfirmed ? "4 / 4" : "3 / 4"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="web-page-execution__stepper">
                  {steps.map((step, index) => {
                    const complete = routeConfirmed ? true : index < 3;
                    const current = !routeConfirmed && index === 2;
                    return (
                      <li
                        key={step.label}
                        className={`web-page-execution__step ${complete ? "is-complete" : ""} ${current ? "is-current" : ""}`}
                        aria-current={current ? "step" : undefined}
                      >
                        <span className="web-page-execution__step-marker" aria-hidden="true">
                          {complete ? <Check size={14} /> : index + 1}
                        </span>
                        <span className="web-page-execution__step-copy">
                          <strong>{step.label}</strong>
                          <span>{step.detail}</span>
                        </span>
                        {index < steps.length - 1 ? (
                          <span className="web-page-execution__step-line" aria-hidden="true" />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>

            <div className="web-page-execution__panel-grid">
              <Card variant="carbon" className="web-page-execution__card">
                <CardHeader>
                  <div className="web-page-execution__panel-title">
                    <span className="web-page-execution__icon-box">
                      <Fuel size={16} />
                    </span>
                    <div>
                      <CardTitle>Gas budget</CardTitle>
                      <CardDescription>Protected from fee spikes</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="web-page-execution__big-value">$4.82</div>
                  <DataList
                    layout="stacked"
                    divided={false}
                    className="web-page-execution__compact-list"
                  >
                    <DataListItem label="Network" value="Base" />
                    <DataListItem label="Max fee" value="0.00014 ETH" />
                    <DataListItem label="Priority" value="0.00002 ETH" />
                  </DataList>
                  <Progress
                    label="Fee headroom"
                    value={72}
                    valueLabel="72%"
                    tone="success"
                    size="sm"
                    helperText="Budget leaves room for one retry."
                  />
                </CardContent>
              </Card>

              <Card variant="carbon" className="web-page-execution__card">
                <CardHeader>
                  <div className="web-page-execution__panel-title">
                    <span className="web-page-execution__icon-box">
                      <SlidersHorizontal size={16} />
                    </span>
                    <div>
                      <CardTitle>Slippage guard</CardTitle>
                      <CardDescription>Worst acceptable fill</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="web-page-execution__big-value">0.30%</div>
                  <div className="web-page-execution__range" aria-hidden="true">
                    <span style={{ width: "30%" }} />
                    <i />
                  </div>
                  <DataList
                    layout="stacked"
                    divided={false}
                    className="web-page-execution__compact-list"
                  >
                    <DataListItem label="Expected fill" value="$24,981.30" />
                    <DataListItem label="Minimum received" value="24,906.35 USDC" />
                    <DataListItem label="Price impact" value="0.08%" />
                  </DataList>
                </CardContent>
              </Card>

              <Card
                variant="carbon"
                className="web-page-execution__card web-page-execution__liquidity-card"
              >
                <CardHeader>
                  <div className="web-page-execution__panel-title">
                    <span className="web-page-execution__icon-box">
                      <GitBranch size={16} />
                    </span>
                    <div>
                      <CardTitle>Liquidity path</CardTitle>
                      <CardDescription>Split across two deep venues</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="web-page-execution__venue-row">
                    <div>
                      <strong>Uniswap V3</strong>
                      <span>Base / 0.05% pool</span>
                    </div>
                    <b>68%</b>
                  </div>
                  <Progress
                    label="Uniswap V3 allocation"
                    value={68}
                    valueLabel="68%"
                    tone="accent"
                    size="sm"
                  />
                  <div className="web-page-execution__venue-row">
                    <div>
                      <strong>Aerodrome</strong>
                      <span>Base / volatile pool</span>
                    </div>
                    <b>32%</b>
                  </div>
                  <Progress
                    label="Aerodrome allocation"
                    value={32}
                    valueLabel="32%"
                    tone="neutral"
                    size="sm"
                  />
                  <p className="web-page-execution__panel-note">
                    <CheckCircle2 size={14} /> Combined depth covers 4.6x the order size.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="web-page-execution__right-column">
            <Card variant="solid" className="web-page-execution__route-card">
              <CardHeader>
                <div className="web-page-execution__route-heading">
                  <div>
                    <p className="web-page-execution__label">Selected route</p>
                    <CardTitle>USDC to ETH</CardTitle>
                  </div>
                  <Badge variant="success" leadingIcon={<CheckCircle2 size={13} />}>
                    Best execution
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="web-page-execution__asset-flow">
                  <div className="web-page-execution__asset">
                    <span className="web-page-execution__asset-mark web-page-execution__asset-mark--usdc">
                      $
                    </span>
                    <div>
                      <strong>25,000 USDC</strong>
                      <span>From Base</span>
                    </div>
                  </div>
                  <ArrowRight
                    className="web-page-execution__flow-arrow"
                    size={18}
                    aria-hidden="true"
                  />
                  <div className="web-page-execution__asset">
                    <span className="web-page-execution__asset-mark web-page-execution__asset-mark--eth">
                      Ξ
                    </span>
                    <div>
                      <strong>9.86 ETH</strong>
                      <span>To Ethereum</span>
                    </div>
                  </div>
                </div>
                <div className="web-page-execution__route-line" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <DataList className="web-page-execution__route-list">
                  <DataListItem label="Route" value="Across bridge / Uniswap V3" />
                  <DataListItem
                    label="Expected arrival"
                    value="~7 minutes"
                    icon={<Clock3 size={15} />}
                  />
                  <DataListItem label="You receive" value="$24,981.30 value" />
                </DataList>
                <div className="web-page-execution__wallet-row">
                  <span className="web-page-execution__wallet-icon">
                    <WalletCards size={15} />
                  </span>
                  <div>
                    <span>Destination wallet</span>
                    <strong>{routeAddress}</strong>
                  </div>
                  <Button
                    variant="quiet"
                    size="sm"
                    leadingIcon={<Copy size={14} />}
                    onClick={() => void handleCopyAddress()}
                    aria-label="Copy destination wallet address"
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Button
                  variant="crimson"
                  size="lg"
                  fullWidth
                  loading={confirmationStatus === "running"}
                  loadingLabel="Confirming route"
                  leadingIcon={
                    confirmationStatus === "running"
                      ? undefined
                      : routeConfirmed
                        ? <CheckCircle2 size={17} />
                        : <LockKeyhole size={17} />
                  }
                  onClick={confirmRoute}
                  disabled={routeConfirmed || confirmationStatus === "running" || !mevCommitted}
                >
                  {routeConfirmed ? "Route confirmed" : "Confirm route"}
                </Button>
                {routeConfirmed ? (
                  <Button
                    variant="quiet"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      setRouteConfirmed(false);
                      setConfirmationStatus("idle");
                    }}
                  >
                    Edit route
                  </Button>
                ) : null}
                <p className="web-page-execution__signature-note">
                  <KeyRound size={13} /> Your wallet will ask for one signature.
                </p>
              </CardContent>
            </Card>

            <InlineAlert
              variant={routeConfirmed ? "success" : "info"}
              icon={
                confirmationStatus === "running" ? (
                  <RefreshCw size={17} />
                ) : routeConfirmed ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <ShieldCheck size={17} />
                )
              }
              title={
                confirmationStatus === "running"
                  ? "Preparing signature request"
                  : routeConfirmed
                    ? "Signature request ready"
                    : "Simulation passed"
              }
              className="web-page-execution__alert"
            >
              {confirmationStatus === "running"
                ? "Validating the protected route and preparing the wallet handoff."
                : routeConfirmed
                  ? "Open your wallet to authorize the prepared transaction."
                  : "No revert risk found across the selected route and destination call."}
            </InlineAlert>
          </div>
        </section>

        <section
          className="web-page-execution__secondary-grid"
          aria-label="Execution controls and status"
        >
          <Card variant="carbon" className="web-page-execution__card">
            <CardHeader>
              <div className="web-page-execution__panel-title">
                <span className="web-page-execution__icon-box">
                  <Timer size={16} />
                </span>
                <div>
                  <CardTitle>Execution window</CardTitle>
                  <CardDescription>Choose when the solver may submit.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <label className="web-page-execution__select-label" htmlFor="execution-window">
                Submit preference
              </label>
              <div className="web-page-execution__select-wrap">
                <select
                  id="execution-window"
                  className="web-page-execution__select"
                  value={executionWindow}
                  onChange={(event) => setExecutionWindow(event.target.value)}
                >
                  <option value="next-block">Next block, if protected</option>
                  <option value="five-minutes">Within 5 minutes</option>
                  <option value="best-price">Best price within 30 minutes</option>
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </div>
              <div className="web-page-execution__window-summary">
                <div>
                  <Clock3 size={15} />
                  <span>Window opens</span>
                  <strong>Now</strong>
                </div>
                <div>
                  <RefreshCw size={15} />
                  <span>Quote refresh</span>
                  <strong>02:48</strong>
                </div>
              </div>
              <p className="web-page-execution__panel-note">
                The quote expires in 04:32 if it is not committed.
              </p>
            </CardContent>
          </Card>

          <Card variant="carbon" className="web-page-execution__card">
            <CardHeader>
              <div className="web-page-execution__panel-title">
                <span className="web-page-execution__icon-box">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <CardTitle>MEV commitment</CardTitle>
                  <CardDescription>Private order flow is active.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="web-page-execution__commitment-row">
                <div className="web-page-execution__commitment-status">
                  <span
                    className={`web-page-execution__status-dot ${mevCommitted ? "is-on" : ""}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{mevCommitted ? "Protected commitment" : "Public mempool"}</strong>
                    <span>
                      {mevCommitted
                        ? "Signed bundle held by the relay."
                        : "The route may be visible before inclusion."}
                    </span>
                  </div>
                </div>
                <Switch
                  aria-label="Enable MEV protection"
                  checked={mevCommitted}
                  onCheckedChange={setMevCommitted}
                />
              </div>
              <div className="web-page-execution__commitment-facts">
                <span>
                  <LockKeyhole size={14} /> Relay: Titan Builder
                </span>
                <span>
                  <Clock3 size={14} /> TTL: 18 seconds
                </span>
              </div>
              <InlineAlert
                variant={mevCommitted ? "success" : "warning"}
                icon={mevCommitted ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
              >
                {mevCommitted
                  ? "Sandwich protection and revert shielding are enabled."
                  : "Turn protection back on before confirming this route."}
              </InlineAlert>
            </CardContent>
          </Card>

          <Card
            variant="carbon"
            className="web-page-execution__card web-page-execution__bridge-card"
          >
            <CardHeader>
              <div className="web-page-execution__panel-title">
                <span className="web-page-execution__icon-box">
                  <Network size={16} />
                </span>
                <div>
                  <CardTitle>Bridge status</CardTitle>
                  <CardDescription>Across intent MT-2048</CardDescription>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Timeline items={bridgeItems} className="web-page-execution__timeline" />
              <Button
                variant="quiet"
                size="sm"
                loading={explorerStatus === "running"}
                loadingLabel="Opening"
                trailingIcon={explorerStatus === "running" ? undefined : <ExternalLink size={14} />}
                className="web-page-execution__explorer-link"
                onClick={openExplorer}
                disabled={explorerStatus === "running"}
              >
                {explorerStatus === "success" ? "Explorer ready" : "View on explorer"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <footer className="web-page-execution__footer-note">
          <CircleAlert size={15} />
          <span>
            Review the destination chain and wallet before signing. Metron cannot reverse a
            confirmed bridge transaction.
          </span>
        </footer>
      </main>
    </div>
  );
}

const styles = `
.web-page-execution {
  --execution-line: rgba(242, 241, 237, 0.12);
  --execution-muted: rgba(242, 241, 237, 0.62);
  --execution-dim: rgba(242, 241, 237, 0.42);
  --execution-accent: #9b1730;
  --execution-accent-soft: rgba(155, 23, 48, 0.16);
  --execution-positive: #34d399;
  min-height: 100dvh;
  padding: clamp(1.5rem, 4vw, 4rem);
  color: var(--metron-pearl);
  background:
    radial-gradient(circle at 85% 0%, rgba(113, 0, 20, 0.16), transparent 32rem),
    var(--metron-background);
}

.web-page-execution__header,
.web-page-execution__main {
  width: min(100%, 1380px);
  margin-inline: auto;
}

.web-page-execution__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  padding-bottom: clamp(1.5rem, 3vw, 2.75rem);
  border-bottom: 1px solid var(--execution-line);
}

.web-page-execution__eyebrow,
.web-page-execution__label,
.web-page-execution__select-label {
  margin: 0 0 0.55rem;
  color: var(--metron-sand);
  font-family: var(--metron-font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  line-height: 1.35;
  text-transform: uppercase;
}

.web-page-execution__header h1 {
  max-width: 12ch;
  margin: 0;
  font-size: clamp(2.25rem, 5vw, 4.35rem);
  font-weight: 650;
  letter-spacing: -0.065em;
  line-height: 0.96;
}

.web-page-execution__intro {
  max-width: 48ch;
  margin: 1rem 0 0;
  color: var(--execution-muted);
  font-size: 0.98rem;
  line-height: 1.55;
}

.web-page-execution__header-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.8rem;
  flex: 0 0 auto;
}

.web-page-execution__intent-id {
  color: var(--execution-dim);
  font-family: var(--metron-font-mono);
  font-size: 0.73rem;
  letter-spacing: 0.04em;
}

.web-page-execution__main {
  padding-top: clamp(1.5rem, 3vw, 2.5rem);
}

.web-page-execution__primary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.36fr) minmax(20rem, 0.82fr);
  gap: 1.25rem;
  align-items: start;
}

.web-page-execution__left-column,
.web-page-execution__right-column {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
}

.web-page-execution__card,
.web-page-execution__route-card {
  min-width: 0;
  overflow: hidden;
}

.web-page-execution__step-card {
  background: linear-gradient(140deg, rgba(113, 0, 20, 0.18), rgba(15, 15, 18, 0.86) 48%);
}

.web-page-execution__card-heading,
.web-page-execution__route-heading,
.web-page-execution__panel-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.web-page-execution__step-count {
  color: var(--metron-sand-bright);
  font-family: var(--metron-font-mono);
  font-size: 0.82rem;
  white-space: nowrap;
}

.web-page-execution__stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.web-page-execution__step {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  padding-right: 0.9rem;
}

.web-page-execution__step-marker {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  color: var(--execution-dim);
  border: 1px solid var(--execution-line);
  border-radius: 50%;
  background: var(--metron-carbon-surface);
  font-family: var(--metron-font-mono);
  font-size: 0.7rem;
}

.web-page-execution__step.is-complete .web-page-execution__step-marker {
  color: var(--metron-pearl);
  border-color: var(--execution-accent);
  background: var(--execution-accent);
}

.web-page-execution__step.is-current .web-page-execution__step-marker {
  color: var(--metron-pearl);
  border-color: var(--metron-sand);
  box-shadow: 0 0 0 4px rgba(179, 143, 111, 0.12);
}

.web-page-execution__step-line {
  position: absolute;
  top: 0.85rem;
  left: 1.7rem;
  right: 0.45rem;
  height: 1px;
  background: var(--execution-line);
}

.web-page-execution__step.is-complete .web-page-execution__step-line {
  background: var(--execution-accent);
}

.web-page-execution__step-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.web-page-execution__step-copy strong {
  color: var(--metron-pearl);
  font-size: 0.9rem;
  font-weight: 650;
}

.web-page-execution__step-copy span {
  color: var(--execution-muted);
  font-size: 0.76rem;
  line-height: 1.35;
}

.web-page-execution__panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.web-page-execution__liquidity-card {
  grid-column: 1 / -1;
}

.web-page-execution__icon-box {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2rem;
  height: 2rem;
  color: var(--metron-sand-bright);
  border: 1px solid rgba(179, 143, 111, 0.35);
  border-radius: 0.55rem;
  background: rgba(179, 143, 111, 0.1);
}

.web-page-execution__panel-title {
  justify-content: flex-start;
}

.web-page-execution__panel-title > div {
  min-width: 0;
}

.web-page-execution__big-value {
  margin-bottom: 1.1rem;
  color: var(--metron-pearl);
  font-family: var(--metron-font-mono);
  font-size: clamp(1.55rem, 3vw, 2.2rem);
  letter-spacing: -0.05em;
}

.web-page-execution__compact-list .metron-data-list__item {
  padding-block: 0.48rem;
}

.web-page-execution__compact-list .metron-data-list__term,
.web-page-execution__compact-list .metron-data-list__definition {
  font-size: 0.78rem;
}

.web-page-execution__range {
  position: relative;
  height: 3px;
  margin: 0 0 1rem;
  background: rgba(242, 241, 237, 0.11);
}

.web-page-execution__range span {
  display: block;
  height: 100%;
  background: var(--execution-accent);
}

.web-page-execution__range i {
  position: absolute;
  top: 50%;
  left: 30%;
  width: 9px;
  height: 9px;
  border: 2px solid var(--metron-pearl);
  border-radius: 50%;
  background: var(--execution-accent);
  transform: translate(-50%, -50%);
}

.web-page-execution__venue-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.web-page-execution__venue-row div {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.web-page-execution__venue-row strong {
  font-size: 0.87rem;
  font-weight: 650;
}

.web-page-execution__venue-row span {
  color: var(--execution-muted);
  font-size: 0.74rem;
}

.web-page-execution__venue-row b {
  color: var(--metron-sand-bright);
  font-family: var(--metron-font-mono);
  font-size: 0.78rem;
}

.web-page-execution__liquidity-card .metron-progress + .web-page-execution__venue-row {
  margin-top: 1rem;
}

.web-page-execution__panel-note,
.web-page-execution__signature-note {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 1rem 0 0;
  color: var(--execution-muted);
  font-size: 0.77rem;
  line-height: 1.45;
}

.web-page-execution__panel-note svg {
  flex: 0 0 auto;
  color: var(--execution-positive);
}

.web-page-execution__route-card {
  border-color: rgba(179, 143, 111, 0.34);
  background: linear-gradient(180deg, rgba(27, 23, 22, 0.92), rgba(13, 13, 15, 0.98));
}

.web-page-execution__route-heading {
  align-items: center;
}

.web-page-execution__route-heading .metron-badge {
  flex: 0 0 auto;
}

.web-page-execution__asset-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 0.7rem;
  align-items: center;
  padding: 0.85rem 0;
}

.web-page-execution__asset {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.web-page-execution__asset-mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  font-family: var(--metron-font-mono);
  font-size: 1.05rem;
  font-weight: 600;
}

.web-page-execution__asset-mark--usdc {
  color: #061d18;
  background: #58d7a8;
}

.web-page-execution__asset-mark--eth {
  color: #121215;
  background: #b7b9cc;
}

.web-page-execution__asset div {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 0;
}

.web-page-execution__asset strong {
  overflow-wrap: anywhere;
  font-size: 0.9rem;
  font-weight: 650;
}

.web-page-execution__asset span:not(.web-page-execution__asset-mark) {
  color: var(--execution-muted);
  font-size: 0.74rem;
}

.web-page-execution__flow-arrow {
  color: var(--metron-sand);
}

.web-page-execution__route-line {
  display: grid;
  grid-template-columns: 1fr 2fr 1.3fr 1fr;
  gap: 3px;
  margin: 0.7rem 0 1.2rem;
}

.web-page-execution__route-line span {
  height: 3px;
  background: var(--execution-accent);
}

.web-page-execution__route-line span:nth-child(2) {
  background: var(--metron-sand);
}

.web-page-execution__route-line span:nth-child(3) {
  background: rgba(179, 143, 111, 0.42);
}

.web-page-execution__route-line span:nth-child(4) {
  background: var(--execution-line);
}

.web-page-execution__route-list .metron-data-list__item {
  padding-block: 0.65rem;
}

.web-page-execution__route-list .metron-data-list__term,
.web-page-execution__route-list .metron-data-list__definition {
  font-size: 0.82rem;
}

.web-page-execution__wallet-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 1rem 0 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--execution-line);
}

.web-page-execution__wallet-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 1.85rem;
  height: 1.85rem;
  color: var(--metron-sand-bright);
  border: 1px solid var(--execution-line);
  border-radius: 0.45rem;
}

.web-page-execution__wallet-row > div {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.web-page-execution__wallet-row span:not(.web-page-execution__wallet-icon) {
  color: var(--execution-muted);
  font-size: 0.72rem;
}

.web-page-execution__wallet-row strong {
  color: var(--metron-pearl);
  font-family: var(--metron-font-mono);
  font-size: 0.78rem;
  font-weight: 500;
}

.web-page-execution__wallet-row .metron-button {
  padding-inline: 0.5rem;
}

.web-page-execution__signature-note {
  justify-content: center;
  margin-top: 0.9rem;
  color: var(--execution-dim);
}

.web-page-execution__signature-note svg {
  color: var(--metron-sand);
}

.web-page-execution__alert {
  margin-top: 0;
}

.web-page-execution__secondary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
  margin-top: 1.25rem;
}

.web-page-execution__select-label {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--execution-muted);
  font-family: var(--metron-font-sans);
  font-size: 0.77rem;
  letter-spacing: 0;
  text-transform: none;
}

.web-page-execution__select-wrap {
  position: relative;
}

.web-page-execution__select-wrap svg {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  color: var(--execution-muted);
  pointer-events: none;
  transform: translateY(-50%);
}

.web-page-execution__select {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.7rem 2.2rem 0.7rem 0.8rem;
  color: var(--metron-pearl);
  border: 1px solid var(--execution-line);
  border-radius: var(--metron-radius-control);
  outline: none;
  background: var(--metron-carbon-surface);
  appearance: none;
}

.web-page-execution__select:focus-visible {
  border-color: var(--metron-focus);
  box-shadow: 0 0 0 3px rgba(179, 143, 111, 0.18);
}

.web-page-execution__select option {
  color: var(--metron-pearl);
  background: var(--metron-carbon-surface);
}

.web-page-execution__window-summary {
  display: grid;
  gap: 0.6rem;
  margin-top: 1.1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--execution-line);
}

.web-page-execution__window-summary div {
  display: grid;
  grid-template-columns: 1.1rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
  color: var(--execution-muted);
  font-size: 0.78rem;
}

.web-page-execution__window-summary svg {
  color: var(--metron-sand);
}

.web-page-execution__window-summary strong {
  color: var(--metron-pearl);
  font-family: var(--metron-font-mono);
  font-size: 0.76rem;
  font-weight: 500;
}

.web-page-execution__commitment-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.web-page-execution__commitment-status {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  min-width: 0;
}

.web-page-execution__commitment-status > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.web-page-execution__commitment-status strong {
  font-size: 0.88rem;
  font-weight: 650;
}

.web-page-execution__commitment-status span:not(.web-page-execution__status-dot) {
  color: var(--execution-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.web-page-execution__status-dot {
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.35rem;
  border: 1px solid var(--execution-dim);
  border-radius: 50%;
  background: transparent;
}

.web-page-execution__status-dot.is-on {
  border-color: var(--execution-positive);
  background: var(--execution-positive);
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12);
}

.web-page-execution__commitment-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem 1rem;
  margin: 1.1rem 0;
  padding-top: 1rem;
  border-top: 1px solid var(--execution-line);
  color: var(--execution-muted);
  font-family: var(--metron-font-mono);
  font-size: 0.7rem;
}

.web-page-execution__commitment-facts span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.web-page-execution__commitment-facts svg {
  color: var(--metron-sand);
}

.web-page-execution__bridge-card .metron-card-header {
  padding-bottom: 0;
}

.web-page-execution__bridge-card .metron-card-header .metron-badge {
  margin-left: auto;
}

.web-page-execution__timeline {
  margin-top: -0.2rem;
}

.web-page-execution__explorer-link {
  margin-top: 0.7rem;
  padding-inline: 0;
}

.web-page-execution__footer-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 1.45rem;
  padding-top: 1rem;
  border-top: 1px solid var(--execution-line);
  color: var(--execution-dim);
  font-size: 0.75rem;
  line-height: 1.5;
}

.web-page-execution__footer-note svg {
  flex: 0 0 auto;
  margin-top: 0.1rem;
  color: var(--metron-sand);
}

@media (max-width: 1080px) {
  .web-page-execution__primary-grid {
    grid-template-columns: 1fr;
  }

  .web-page-execution__right-column {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }

  .web-page-execution__route-card {
    grid-row: span 2;
  }
}

@media (max-width: 820px) {
  .web-page-execution {
    padding: 1.25rem;
  }

  .web-page-execution__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .web-page-execution__header-meta {
    align-items: flex-start;
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
  }

  .web-page-execution__secondary-grid,
  .web-page-execution__right-column {
    grid-template-columns: 1fr;
  }

  .web-page-execution__route-card {
    grid-row: auto;
  }
}

@media (max-width: 560px) {
  .web-page-execution__panel-grid {
    grid-template-columns: 1fr;
  }

  .web-page-execution__liquidity-card {
    grid-column: auto;
  }

  .web-page-execution__stepper {
    grid-template-columns: 1fr;
    gap: 0.9rem;
  }

  .web-page-execution__step {
    display: grid;
    grid-template-columns: 1.7rem minmax(0, 1fr);
    gap: 0.7rem;
    padding-right: 0;
  }

  .web-page-execution__step-line {
    top: 1.7rem;
    bottom: -0.9rem;
    left: 0.85rem;
    right: auto;
    width: 1px;
    height: auto;
  }

  .web-page-execution__step:last-child .web-page-execution__step-line {
    display: none;
  }

  .web-page-execution__step-copy {
    padding-top: 0.18rem;
  }

  .web-page-execution__asset-flow {
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }

  .web-page-execution__flow-arrow {
    display: none;
  }

  .web-page-execution__asset:last-child {
    padding-left: 2.6rem;
  }
}
`;
