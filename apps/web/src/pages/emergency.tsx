import { useState, type CSSProperties } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleCheck,
  CircleStop,
  Clock3,
  Gauge,
  Hand,
  LockKeyhole,
  PauseCircle,
  Power,
  Radio,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  WalletCards,
  Waves,
  X,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  GlassCard,
  InlineAlert,
  Progress,
  Switch,
} from "@metron/ui";

type SystemMode = "normal" | "guarded" | "emergency";
type RecoveryPlan = "stabilize" | "de-risk" | "manual";

type RecoveryOption = {
  id: RecoveryPlan;
  name: string;
  description: string;
  eta: string;
  risk: string;
  icon: typeof BrainCircuit;
  accent: string;
};

const recoveryOptions: RecoveryOption[] = [
  {
    id: "stabilize",
    name: "Stabilize first",
    description: "Halt new exposure, restore collateral buffers, then reassess each route.",
    eta: "Estimated 8 min",
    risk: "Lowest slippage",
    icon: ShieldCheck,
    accent: "#34d399",
  },
  {
    id: "de-risk",
    name: "De-risk quickly",
    description: "Trim volatile legs and move available collateral into the safest venue.",
    eta: "Estimated 3 min",
    risk: "Moderate slippage",
    icon: BrainCircuit,
    accent: "#c8aa8e",
  },
  {
    id: "manual",
    name: "Manual control",
    description: "Lock automation and expose each position for operator-led decisions.",
    eta: "No auto actions",
    risk: "Operator managed",
    icon: Hand,
    accent: "#f59e0b",
  },
];

const modeOptions: Array<{
  id: SystemMode;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    id: "normal",
    label: "Normal",
    description: "Strategies can open and rebalance positions.",
    icon: Activity,
  },
  {
    id: "guarded",
    label: "Guarded",
    description: "New exposure is capped while monitoring remains active.",
    icon: ShieldCheck,
  },
  {
    id: "emergency",
    label: "Emergency",
    description: "Execution is frozen until an operator releases the lock.",
    icon: Siren,
  },
];

const styles = {
  page: {
    minHeight: "100%",
    padding: "clamp(1rem, 2.5vw, 2.5rem)",
    color: "var(--metron-pearl, #f2f1ed)",
    background:
      "radial-gradient(circle at 92% 0%, rgba(113, 0, 20, 0.18), transparent 28rem), #050506",
    fontFamily: "var(--metron-font-sans, system-ui, sans-serif)",
  },
  shell: {
    width: "min(100%, 1180px)",
    margin: "0 auto",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--metron-sand-bright, #c8aa8e)",
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "1.5rem",
    marginTop: "0.75rem",
    marginBottom: "1.5rem",
  },
  title: {
    margin: 0,
    maxWidth: "18ch",
    fontSize: "clamp(2rem, 4vw, 3.7rem)",
    lineHeight: 0.98,
    letterSpacing: "-0.045em",
    fontWeight: 650,
  },
  titleNote: {
    maxWidth: "31ch",
    margin: 0,
    color: "var(--metron-pearl-muted, rgba(242,241,237,.68))",
    fontSize: "0.92rem",
    lineHeight: 1.55,
  },
  alert: {
    marginBottom: "1.25rem",
    border: "1px solid rgba(155, 23, 48, .72)",
    background: "rgba(113, 0, 20, .2)",
  },
  alertIcon: {
    color: "#ff8298",
  },
  modePanel: {
    border: "1px solid rgba(242, 241, 237, .14)",
    background: "rgba(18, 18, 21, .9)",
    padding: "clamp(1rem, 2vw, 1.35rem)",
    marginBottom: "1.5rem",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1rem",
    letterSpacing: "-0.01em",
  },
  sectionMeta: {
    color: "var(--metron-pearl-dim, rgba(242,241,237,.42))",
    fontSize: "0.75rem",
    fontFamily: "var(--metron-font-mono, monospace)",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "0.65rem",
  },
  modeButton: {
    minHeight: "6.75rem",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    gap: "0.65rem",
    padding: "0.9rem",
    border: "1px solid rgba(242, 241, 237, .14)",
    background: "rgba(242, 241, 237, .035)",
    color: "var(--metron-pearl, #f2f1ed)",
    textAlign: "left" as const,
    cursor: "pointer",
    transition: "border-color 160ms ease, background 160ms ease, transform 160ms ease",
  },
  modeButtonSelected: {
    borderColor: "rgba(155, 23, 48, .9)",
    background: "rgba(113, 0, 20, .28)",
    boxShadow: "inset 3px 0 0 #9b1730",
  },
  modeLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontWeight: 650,
  },
  modeDescription: {
    color: "var(--metron-pearl-dim, rgba(242,241,237,.52))",
    fontSize: "0.78rem",
    lineHeight: 1.4,
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(18rem, .75fr)",
    gap: "1.25rem",
    alignItems: "start",
  },
  card: {
    border: "1px solid rgba(242, 241, 237, .13)",
    background: "rgba(12, 12, 14, .82)",
  },
  recoveryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "0.75rem",
  },
  recoveryCard: {
    position: "relative" as const,
    minHeight: "13rem",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    gap: "0.85rem",
    padding: "1rem",
    border: "1px solid rgba(242, 241, 237, .13)",
    background: "rgba(242, 241, 237, .025)",
    color: "var(--metron-pearl, #f2f1ed)",
    textAlign: "left" as const,
    cursor: "pointer",
  },
  recoveryCardSelected: {
    borderColor: "#c8aa8e",
    background: "rgba(179, 143, 111, .1)",
    boxShadow: "inset 0 2px 0 #c8aa8e",
  },
  iconTile: {
    display: "grid",
    placeItems: "center",
    width: "2.25rem",
    height: "2.25rem",
    border: "1px solid rgba(242,241,237,.18)",
    background: "rgba(0,0,0,.2)",
  },
  recoveryName: {
    margin: 0,
    fontSize: "0.97rem",
    fontWeight: 650,
  },
  recoveryDescription: {
    margin: 0,
    color: "var(--metron-pearl-muted, rgba(242,241,237,.68))",
    fontSize: "0.78rem",
    lineHeight: 1.5,
  },
  recoveryMeta: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    marginTop: "auto",
    paddingTop: "0.7rem",
    borderTop: "1px solid rgba(242,241,237,.1)",
    color: "var(--metron-pearl-dim, rgba(242,241,237,.42))",
    fontSize: "0.69rem",
    fontFamily: "var(--metron-font-mono, monospace)",
  },
  actionList: {
    display: "grid",
    gap: "0.25rem",
  },
  actionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "0.85rem 0",
    borderBottom: "1px solid rgba(242,241,237,.1)",
  },
  actionCopy: {
    display: "grid",
    gap: "0.28rem",
  },
  actionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.86rem",
    fontWeight: 600,
  },
  actionDescription: {
    margin: 0,
    color: "var(--metron-pearl-dim, rgba(242,241,237,.5))",
    fontSize: "0.74rem",
    lineHeight: 1.45,
  },
  healthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.6rem",
    marginTop: "1rem",
  },
  healthCell: {
    display: "grid",
    gap: "0.25rem",
    padding: "0.75rem",
    border: "1px solid rgba(242,241,237,.1)",
    background: "rgba(242,241,237,.025)",
  },
  healthValue: {
    color: "#f2f1ed",
    fontSize: "1.1rem",
    fontWeight: 650,
  },
  healthLabel: {
    color: "var(--metron-pearl-dim, rgba(242,241,237,.45))",
    fontSize: "0.68rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.09em",
  },
  divider: {
    height: "1px",
    margin: "1rem 0",
    background: "rgba(242,241,237,.1)",
  },
  flashPanel: {
    marginTop: "1rem",
    padding: "1rem",
    border: "1px solid rgba(245, 158, 11, .6)",
    background: "rgba(245, 158, 11, .08)",
  },
  flashPanelTitle: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    margin: 0,
    fontSize: "0.9rem",
    fontWeight: 700,
  },
  flashPanelCopy: {
    margin: "0.55rem 0 0",
    color: "rgba(242,241,237,.68)",
    fontSize: "0.78rem",
    lineHeight: 1.5,
  },
  flashActions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.55rem",
    marginTop: "0.85rem",
  },
  footerStatus: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "1rem",
    color: "var(--metron-pearl-dim, rgba(242,241,237,.45))",
    fontSize: "0.72rem",
  },
} satisfies Record<string, CSSProperties>;

export function EmergencyPage() {
  const [systemMode, setSystemMode] = useState<SystemMode>("guarded");
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan>("stabilize");
  const [pauseEntries, setPauseEntries] = useState(true);
  const [limitLeverage, setLimitLeverage] = useState(true);
  const [freezeAutomation, setFreezeAutomation] = useState(false);
  const [flashConfirmOpen, setFlashConfirmOpen] = useState(false);
  const [flashQueued, setFlashQueued] = useState(false);

  const activeRecovery = recoveryOptions.find((option) => option.id === recoveryPlan);
  const isEmergency = systemMode === "emergency";

  function handleModeChange(mode: SystemMode) {
    setSystemMode(mode);
    if (mode === "emergency") {
      setPauseEntries(true);
      setLimitLeverage(true);
      setFreezeAutomation(true);
    }
  }

  function confirmFlashUnwind() {
    setFlashConfirmOpen(false);
    setFlashQueued(true);
    setSystemMode("emergency");
    setPauseEntries(true);
    setLimitLeverage(true);
    setFreezeAutomation(true);
  }

  return (
    <main className="web-page-emergency" style={styles.page}>
      <div className="web-page-emergency__shell" style={styles.shell}>
        <div className="web-page-emergency__eyebrow" style={styles.eyebrow}>
          <Radio size={14} strokeWidth={1.8} aria-hidden="true" />
          Emergency operations
        </div>
        <div className="web-page-emergency__title-row" style={styles.titleRow}>
          <div>
            <h1 className="web-page-emergency__title" style={styles.title}>
              Recovery center
            </h1>
            <p className="web-page-emergency__title-note" style={styles.titleNote}>
              Lock down execution, choose a recovery posture, and keep an auditable path back to normal operation.
            </p>
          </div>
          <Badge variant={isEmergency ? "crimson" : "warning"} leadingIcon={isEmergency ? <Siren size={13} /> : <ShieldAlert size={13} />}>
            {isEmergency ? "Emergency mode" : "Elevated risk"}
          </Badge>
        </div>

        <InlineAlert
          className="web-page-emergency__critical-alert"
          style={styles.alert}
          variant="error"
          icon={<AlertTriangle size={20} style={styles.alertIcon} />}
          title="Critical risk detected"
        >
          ETH volatility has pushed the leverage buffer below the 20% operating floor. New strategy entries are paused while two positions require review.
        </InlineAlert>

        <section className="web-page-emergency__mode-panel" style={styles.modePanel} aria-labelledby="system-mode-heading">
          <div style={styles.sectionHeader}>
            <div>
              <h2 id="system-mode-heading" style={styles.sectionTitle}>System mode</h2>
              <span style={styles.sectionMeta}>Operator control / global</span>
            </div>
            <Badge variant={isEmergency ? "crimson" : "neutral"} leadingIcon={<LockKeyhole size={12} />}>
              {isEmergency ? "Execution locked" : "Guardrails active"}
            </Badge>
          </div>
          <div className="web-page-emergency__mode-grid" style={styles.modeGrid} role="group" aria-label="System mode">
            {modeOptions.map((mode) => {
              const ModeIcon = mode.icon;
              const selected = systemMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className="web-page-emergency__mode-button"
                  style={{ ...styles.modeButton, ...(selected ? styles.modeButtonSelected : {}) }}
                  aria-pressed={selected}
                  onClick={() => handleModeChange(mode.id)}
                >
                  <span style={styles.modeLabel}>
                    <ModeIcon size={16} strokeWidth={1.8} aria-hidden="true" />
                    {mode.label}
                    {selected ? <Check size={14} aria-label="Selected" /> : null}
                  </span>
                  <span style={styles.modeDescription}>{mode.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="web-page-emergency__workspace" style={styles.workspace}>
          <GlassCard
            className="web-page-emergency__recovery-card"
            style={styles.card}
            header={<span style={styles.eyebrow}>AI recovery posture</span>}
            title="Choose the next move"
            description="The selected plan remains advisory until you approve an emergency action."
          >
            <div className="web-page-emergency__recovery-grid" style={styles.recoveryGrid} role="radiogroup" aria-label="AI recovery posture">
              {recoveryOptions.map((option) => {
                const RecoveryIcon = option.icon;
                const selected = recoveryPlan === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className="web-page-emergency__recovery-option"
                    style={{ ...styles.recoveryCard, ...(selected ? styles.recoveryCardSelected : {}) }}
                    aria-checked={selected}
                    role="radio"
                    onClick={() => setRecoveryPlan(option.id)}
                  >
                    <span style={{ ...styles.iconTile, color: option.accent }}>
                      <RecoveryIcon size={20} strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <h3 style={styles.recoveryName}>{option.name}</h3>
                    <p style={styles.recoveryDescription}>{option.description}</p>
                    <span style={styles.recoveryMeta}>
                      <span>{option.eta}</span>
                      <span>{option.risk}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={styles.footerStatus} aria-live="polite">
              <CircleCheck size={14} color="#34d399" aria-hidden="true" />
              {activeRecovery?.name} selected. No action has been submitted.
            </div>
          </GlassCard>

          <GlassCard
            className="web-page-emergency__action-card"
            style={styles.card}
            header={<span style={styles.eyebrow}>Immediate controls</span>}
            title="Reduce exposure"
            description="Changes apply globally and are recorded in the activity log."
          >
            <div style={styles.actionList}>
              <div style={styles.actionItem}>
                <div style={styles.actionCopy}>
                  <span style={styles.actionLabel}><PauseCircle size={16} color="#c8aa8e" aria-hidden="true" /> Pause new entries</span>
                  <p style={styles.actionDescription}>Prevent strategies from opening new positions.</p>
                </div>
                <Switch aria-label="Pause new entries" checked={pauseEntries} onCheckedChange={setPauseEntries} />
              </div>
              <div style={styles.actionItem}>
                <div style={styles.actionCopy}>
                  <span style={styles.actionLabel}><Gauge size={16} color="#c8aa8e" aria-hidden="true" /> Limit leverage</span>
                  <p style={styles.actionDescription}>Keep new and rebalance orders at 1.5x maximum.</p>
                </div>
                <Switch aria-label="Limit leverage" checked={limitLeverage} onCheckedChange={setLimitLeverage} />
              </div>
              <div style={styles.actionItem}>
                <div style={styles.actionCopy}>
                  <span style={styles.actionLabel}><Power size={16} color="#ff8298" aria-hidden="true" /> Freeze automation</span>
                  <p style={styles.actionDescription}>Stop autonomous rebalances until manually released.</p>
                </div>
                <Switch aria-label="Freeze automation" checked={freezeAutomation} onCheckedChange={setFreezeAutomation} />
              </div>
            </div>
            <div style={styles.healthGrid}>
              <div style={styles.healthCell}>
                <span style={styles.healthValue}>18.4%</span>
                <span style={styles.healthLabel}>Collateral buffer</span>
              </div>
              <div style={styles.healthCell}>
                <span style={styles.healthValue}>2 / 6</span>
                <span style={styles.healthLabel}>Positions at risk</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="web-page-emergency__lower-grid" style={{ ...styles.workspace, marginTop: "1.25rem" }}>
          <GlassCard
            className="web-page-emergency__flash-card"
            style={styles.card}
            header={<span style={styles.eyebrow}>High impact action</span>}
            title="Flash unwind"
            description="Exit all active positions at the best available route, then revoke strategy execution."
            action={<Badge variant={flashQueued ? "success" : "warning"} leadingIcon={flashQueued ? <CircleCheck size={12} /> : <Zap size={12} />}>{flashQueued ? "Queued" : "Requires confirmation"}</Badge>}
          >
            <div style={styles.divider} />
            <Progress
              label="Estimated unwind coverage"
              value={flashQueued ? 100 : 74}
              valueLabel={flashQueued ? "Queued" : "74% routable now"}
              helperText={flashQueued ? "Execution lock is active across all strategies." : "Two assets may route with elevated slippage."}
              tone={flashQueued ? "success" : "warning"}
              size="sm"
            />
            {!flashConfirmOpen && !flashQueued ? (
              <Button
                variant="danger"
                size="lg"
                fullWidth
                leadingIcon={<Zap size={16} />}
                trailingIcon={<ChevronRight size={16} />}
                onClick={() => setFlashConfirmOpen(true)}
                style={{ marginTop: "1rem" }}
              >
                Review flash unwind
              </Button>
            ) : null}
            {flashConfirmOpen ? (
              <div style={styles.flashPanel} role="alertdialog" aria-labelledby="flash-confirm-heading" aria-describedby="flash-confirm-copy">
                <h3 id="flash-confirm-heading" style={styles.flashPanelTitle}><AlertTriangle size={17} color="#f59e0b" aria-hidden="true" /> Confirm flash unwind</h3>
                <p id="flash-confirm-copy" style={styles.flashPanelCopy}>
                  This will market-exit 6 positions, cancel pending orders, and lock all automation. Estimated realized slippage is 0.8% to 1.6%.
                </p>
                <div style={styles.flashActions}>
                  <Button variant="danger" leadingIcon={<Zap size={15} />} onClick={confirmFlashUnwind}>Confirm unwind</Button>
                  <Button variant="outline" leadingIcon={<X size={15} />} onClick={() => setFlashConfirmOpen(false)}>Cancel</Button>
                </div>
              </div>
            ) : null}
            {flashQueued ? (
              <InlineAlert variant="success" icon={<CircleCheck size={17} />} title="Flash unwind queued" style={{ marginTop: "1rem" }}>
                The execution lock is active. Monitor fills from the execution center.
              </InlineAlert>
            ) : null}
          </GlassCard>

          <GlassCard
            className="web-page-emergency__audit-card"
            style={styles.card}
            header={<span style={styles.eyebrow}>Recovery readiness</span>}
            title="Operator checklist"
            description="Verify each control before releasing the system lock."
          >
            <div style={styles.actionList}>
              <div style={styles.actionItem}>
                <span style={styles.actionLabel}><CircleCheck size={15} color="#34d399" aria-hidden="true" /> Risk engine online</span>
                <Badge variant="success">Healthy</Badge>
              </div>
              <div style={styles.actionItem}>
                <span style={styles.actionLabel}><WalletCards size={15} color="#34d399" aria-hidden="true" /> Collateral sync</span>
                <Badge variant="success">12 sec ago</Badge>
              </div>
              <div style={styles.actionItem}>
                <span style={styles.actionLabel}><Clock3 size={15} color="#f59e0b" aria-hidden="true" /> Venue heartbeat</span>
                <Badge variant="warning">Degraded</Badge>
              </div>
              <div style={{ ...styles.actionItem, borderBottom: 0 }}>
                <span style={styles.actionLabel}><Waves size={15} color="#ff8298" aria-hidden="true" /> Oracle deviation</span>
                <Badge variant="crimson">0.42%</Badge>
              </div>
            </div>
            <Button variant="outline" fullWidth leadingIcon={<RefreshCcw size={15} />} style={{ marginTop: "1rem" }}>
              Recheck systems
            </Button>
          </GlassCard>
        </div>

        <div style={styles.footerStatus}>
          {flashQueued ? <CircleStop size={14} color="#ff8298" aria-hidden="true" /> : <LockKeyhole size={14} aria-hidden="true" />}
          <span>{flashQueued ? "Operator lock active. Awaiting fill confirmation." : "All emergency actions require explicit operator confirmation."}</span>
        </div>
      </div>
    </main>
  );
}
