import { useState, type CSSProperties, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Cpu,
  FileCheck2,
  LockKeyhole,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import {
  Badge,
  Button,
  Field,
  GlassCard,
  InlineAlert,
  Input,
  Progress,
  Select,
  Switch,
  Textarea,
} from "@metron/ui";

const pageStyle: CSSProperties = {
  minHeight: "100%",
  background: "#070709",
  color: "#f2f1ed",
  padding: "clamp(1.25rem, 3vw, 3.25rem)",
};

const shellStyle: CSSProperties = {
  width: "min(1180px, 100%)",
  margin: "0 auto",
};

const mutedText: CSSProperties = {
  color: "rgba(242, 241, 237, 0.62)",
  lineHeight: 1.55,
};

const monoText: CSSProperties = {
  color: "#b38f6f",
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "0.68rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const surfaceStyle: CSSProperties = {
  background: "#101013",
  border: "1px solid rgba(242, 241, 237, 0.13)",
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.24)",
};

const compactSurfaceStyle: CSSProperties = {
  background: "rgba(20, 20, 24, 0.72)",
  border: "1px solid rgba(242, 241, 237, 0.11)",
};

type IntentConstraints = {
  objective: string;
  capital: string;
  risk: string;
  horizon: string;
  networks: string;
};

const initialConstraints: IntentConstraints = {
  objective: "Grow stablecoin yield while preserving principal",
  capital: "$25,000 USDC",
  risk: "Moderate, max 12% drawdown",
  horizon: "6–12 months",
  networks: "Ethereum, Arbitrum",
};

const parsedSignals = [
  { label: "Goal detected", value: "Yield with principal protection", icon: Target },
  { label: "Risk posture", value: "Moderate · 12% max drawdown", icon: ShieldCheck },
  { label: "Liquidity window", value: "Keep 35% available", icon: WalletCards },
];

export function IntentPage() {
  const [intentText, setIntentText] = useState(
    "I want to put 25,000 USDC to work across Ethereum and Arbitrum. Prioritize steady yield over maximum upside, keep at least 35% liquid, and do not accept more than a 12% drawdown. I expect to hold for six to twelve months and want the plan to rebalance monthly.",
  );
  const [constraints, setConstraints] = useState<IntentConstraints>(initialConstraints);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isParsed, setIsParsed] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [advanced, setAdvanced] = useState({
    slippage: "0.50%",
    cadence: "Monthly",
    routing: "Best execution",
    stablecoinOnly: true,
  });

  const updateConstraint = (key: keyof IntentConstraints, value: string) => {
    setConstraints((current) => ({ ...current, [key]: value }));
    setIsConfirmed(false);
    setShowConfirmation(false);
  };

  const updateAdvanced = (key: "slippage" | "cadence" | "routing", value: string) => {
    setAdvanced((current) => ({ ...current, [key]: value }));
    setIsConfirmed(false);
    setShowConfirmation(false);
  };

  const parseIntent = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!intentText.trim() || isProcessing) return;

    setIsProcessing(true);
    setIsParsed(false);
    setIsConfirmed(false);
    setShowConfirmation(false);

    window.setTimeout(() => {
      setIsProcessing(false);
      setIsParsed(true);
    }, 850);
  };

  const confirmIntent = () => {
    if (!privacyAccepted || !isParsed || isProcessing) return;
    setIsConfirmed(true);
    setShowConfirmation(true);
  };

  return (
    <main className="web-page-intent" style={pageStyle}>
      <div className="web-page-intent__shell" style={shellStyle}>
        <header
          className="web-page-intent__header"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "2rem",
            marginBottom: "clamp(2rem, 5vw, 4rem)",
          }}
        >
          <div style={{ maxWidth: 720 }}>
            <div style={{ ...monoText, display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <Command size={14} strokeWidth={1.5} aria-hidden="true" />
              Intent compiler
            </div>
            <h1
              style={{
                fontSize: "clamp(2.2rem, 5vw, 4.3rem)",
                lineHeight: 0.98,
                letterSpacing: "-0.045em",
                fontWeight: 520,
                margin: "0.8rem 0 1rem",
                maxWidth: 700,
              }}
            >
              Tell Metron what you want to happen.
            </h1>
            <p style={{ ...mutedText, fontSize: "1.03rem", maxWidth: 625, margin: 0 }}>
              Describe an outcome in your own words. Metron turns it into an explicit,
              reviewable mandate before any strategy is considered.
            </p>
          </div>
          <div
            className="web-page-intent__status"
            style={{
              ...compactSurfaceStyle,
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              padding: "0.62rem 0.8rem",
              whiteSpace: "nowrap",
              marginTop: "0.15rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 0 4px rgba(52,211,153,0.1)" }}
            />
            <span style={{ ...monoText, color: "rgba(242,241,237,0.72)", fontSize: "0.62rem" }}>
              Local draft
            </span>
          </div>
        </header>

        <section
          className="web-page-intent__workspace"
          style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.03fr) minmax(340px, 0.97fr)", gap: "1rem", alignItems: "start" }}
        >
          <form onSubmit={parseIntent} className="web-page-intent__brief" style={{ minWidth: 0 }}>
            <GlassCard
              className="web-page-intent__brief-card"
              style={surfaceStyle}
              header={
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
                  Your brief
                </span>
              }
              title="Start with the outcome, not the product"
              description="Mention capital, risk boundaries, liquidity needs, and timing when they matter."
            >
              <Field
                label="Natural-language intent"
                description="This remains a draft until you confirm the parsed constraints."
                labelClassName="web-page-intent__field-label"
              >
                <Textarea
                  value={intentText}
                  onChange={(event) => {
                    setIntentText(event.target.value);
                    setIsConfirmed(false);
                    setShowConfirmation(false);
                  }}
                  rows={9}
                  placeholder="For example: Put $20,000 to work for a year, keep 30% liquid, and avoid more than a 10% drawdown."
                  aria-label="Natural-language intent"
                  style={{ minHeight: 210, resize: "vertical", lineHeight: 1.6 }}
                />
              </Field>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.8rem",
                  marginTop: "1.1rem",
                }}
              >
                <span style={{ ...mutedText, fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <CircleHelp size={13} aria-hidden="true" />
                  Metron never signs or routes from this screen.
                </span>
                <Button
                  type="submit"
                  variant="sand"
                  size="md"
                  loading={isProcessing}
                  loadingLabel="Reading intent"
                  disabled={!intentText.trim()}
                  leadingIcon={isProcessing ? undefined : <Sparkles size={16} aria-hidden="true" />}
                  trailingIcon={isProcessing ? undefined : <ArrowRight size={16} aria-hidden="true" />}
                >
                  Review intent
                </Button>
              </div>
            </GlassCard>

            <div
              className="web-page-intent__signal-strip"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.65rem", marginTop: "0.7rem" }}
            >
              {parsedSignals.map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ ...compactSurfaceStyle, padding: "0.8rem 0.85rem", minHeight: 96 }}>
                  <Icon size={15} strokeWidth={1.6} color="#b38f6f" aria-hidden="true" />
                  <div style={{ ...monoText, fontSize: "0.58rem", marginTop: "0.65rem" }}>{label}</div>
                  <div style={{ color: "rgba(242,241,237,0.86)", fontSize: "0.78rem", lineHeight: 1.35, marginTop: "0.28rem" }}>{value}</div>
                </div>
              ))}
            </div>
          </form>

          <div className="web-page-intent__review" style={{ minWidth: 0 }}>
            <GlassCard
              className="web-page-intent__parsed-card"
              style={surfaceStyle}
              header={
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileCheck2 size={14} strokeWidth={1.8} aria-hidden="true" />
                  Parsed mandate
                </span>
              }
              title="Review what Metron heard"
              description="Edit any value before you make this intent available to strategy design."
              action={
                <Badge variant={isParsed ? "success" : "warning"}>
                  {isProcessing ? "Processing" : isParsed ? "Ready to review" : "Needs review"}
                </Badge>
              }
            >
              {isProcessing ? (
                <div
                  className="web-page-intent__processing"
                  role="status"
                  aria-live="polite"
                  style={{ padding: "1.5rem 0.25rem 1.25rem" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#c8aa8e" }}>
                    <RefreshCw size={18} className="web-page-intent__spin" aria-hidden="true" />
                    <strong style={{ fontSize: "0.98rem", fontWeight: 560 }}>Translating your brief</strong>
                  </div>
                  <p style={{ ...mutedText, fontSize: "0.84rem", margin: "0.7rem 0 1rem" }}>
                    Mapping outcomes into risk, liquidity, and execution boundaries.
                  </p>
                  <Progress value={56} aria-label="Intent processing progress" />
                </div>
              ) : isParsed ? (
                <div className="web-page-intent__constraints" style={{ display: "grid", gap: "0.7rem" }}>
                  <ConstraintField
                    label="Objective"
                    icon={<Target size={14} aria-hidden="true" />}
                    value={constraints.objective}
                    onChange={(value) => updateConstraint("objective", value)}
                  />
                  <ConstraintField
                    label="Capital"
                    icon={<WalletCards size={14} aria-hidden="true" />}
                    value={constraints.capital}
                    onChange={(value) => updateConstraint("capital", value)}
                  />
                  <ConstraintField
                    label="Risk boundary"
                    icon={<ShieldCheck size={14} aria-hidden="true" />}
                    value={constraints.risk}
                    onChange={(value) => updateConstraint("risk", value)}
                  />
                  <ConstraintField
                    label="Time horizon"
                    icon={<Clock3 size={14} aria-hidden="true" />}
                    value={constraints.horizon}
                    onChange={(value) => updateConstraint("horizon", value)}
                  />
                  <ConstraintField
                    label="Networks"
                    icon={<Cpu size={14} aria-hidden="true" />}
                    value={constraints.networks}
                    onChange={(value) => updateConstraint("networks", value)}
                  />
                </div>
              ) : null}

              <div
                className="web-page-intent__advanced"
                style={{ marginTop: "1.1rem", borderTop: "1px solid rgba(242,241,237,0.1)", paddingTop: "0.9rem" }}
              >
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((open) => !open)}
                  aria-expanded={advancedOpen}
                  className="web-page-intent__advanced-trigger"
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    border: 0,
                    background: "transparent",
                    color: "rgba(242,241,237,0.88)",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.84rem", fontWeight: 550 }}>
                    <Pencil size={14} color="#b38f6f" aria-hidden="true" />
                    Advanced controls
                  </span>
                  <ChevronDown size={16} aria-hidden="true" style={{ transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
                </button>

                {advancedOpen ? (
                  <div className="web-page-intent__advanced-fields" style={{ display: "grid", gap: "0.9rem", marginTop: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
                      <Field label="Max slippage">
                        <Input value={advanced.slippage} onChange={(event) => updateAdvanced("slippage", event.target.value)} />
                      </Field>
                      <Field label="Rebalance cadence">
                        <Select value={advanced.cadence} onChange={(event) => updateAdvanced("cadence", event.target.value)}>
                          <option>Weekly</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Manual only</option>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Execution routing" description="A preference, not a guarantee. Final routes are reviewed before signing.">
                      <Select value={advanced.routing} onChange={(event) => updateAdvanced("routing", event.target.value)}>
                        <option>Best execution</option>
                        <option>Lowest gas</option>
                        <option>Deepest liquidity</option>
                      </Select>
                    </Field>
                    <Switch
                      checked={advanced.stablecoinOnly}
                      onCheckedChange={(checked) => setAdvanced((current) => ({ ...current, stablecoinOnly: checked }))}
                      label="Prefer stablecoin-denominated positions"
                      description="Avoid directional token exposure unless explicitly requested."
                    />
                  </div>
                ) : null}
              </div>
            </GlassCard>

            <section
              className="web-page-intent__commitment"
              style={{ ...compactSurfaceStyle, marginTop: "0.7rem", padding: "1rem" }}
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, display: "grid", placeItems: "center", background: "rgba(179,143,111,0.12)", color: "#c8aa8e", flex: "0 0 auto" }}>
                  <LockKeyhole size={16} aria-hidden="true" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.9rem", fontWeight: 560 }}>A private commitment</strong>
                    <Badge variant="outline">No wallet action</Badge>
                  </div>
                  <p style={{ ...mutedText, fontSize: "0.78rem", margin: "0.4rem 0 0" }}>
                    Confirming records your mandate in this workspace. Nothing moves until you approve a strategy and sign a separate transaction.
                  </p>
                  <div style={{ marginTop: "0.85rem" }}>
                    <Switch
                      id="intent-privacy-commitment"
                      checked={privacyAccepted}
                      onCheckedChange={(checked) => {
                        setPrivacyAccepted(checked);
                        if (!checked) {
                          setIsConfirmed(false);
                          setShowConfirmation(false);
                        }
                      }}
                      label="I understand and accept this commitment"
                      description="I can revise the mandate before execution."
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="web-page-intent__confirm" style={{ marginTop: "0.9rem" }}>
              {showConfirmation ? (
                <InlineAlert variant="success" icon={<Check size={16} aria-hidden="true" />} title="Intent confirmed">
                  Your mandate is ready for strategy design. Metron will keep these boundaries visible as you compare options.
                </InlineAlert>
              ) : !privacyAccepted ? (
                <InlineAlert variant="info" icon={<AlertTriangle size={16} aria-hidden="true" />}>
                  Accept the private commitment above to confirm this mandate.
                </InlineAlert>
              ) : null}
              <Button
                type="button"
                variant={isConfirmed ? "secondary" : "crimson"}
                size="lg"
                fullWidth
                disabled={!privacyAccepted || !isParsed || isProcessing}
                onClick={confirmIntent}
                leadingIcon={isConfirmed ? <Check size={17} aria-hidden="true" /> : <FileCheck2 size={17} aria-hidden="true" />}
                trailingIcon={!isConfirmed ? <ArrowRight size={17} aria-hidden="true" /> : undefined}
                style={{ marginTop: showConfirmation || !privacyAccepted ? "0.75rem" : 0 }}
              >
                {isConfirmed ? "Intent confirmed" : "Confirm intent"}
              </Button>
            </div>
          </div>
        </section>

        <footer
          className="web-page-intent__footer"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: "1.75rem", paddingTop: "1rem", borderTop: "1px solid rgba(242,241,237,0.08)" }}
        >
          <span style={{ ...monoText, color: "rgba(242,241,237,0.4)", fontSize: "0.58rem" }}>Draft 04 · No execution authority</span>
          <span style={{ ...mutedText, fontSize: "0.72rem", textAlign: "right" }}>You stay in control at every approval boundary.</span>
        </footer>
      </div>
      <style>{`
        .web-page-intent__advanced-trigger:focus-visible,
        .web-page-intent textarea:focus-visible,
        .web-page-intent input:focus-visible,
        .web-page-intent select:focus-visible,
        .web-page-intent button:focus-visible {
          outline: 2px solid #c8aa8e;
          outline-offset: 3px;
        }
        .web-page-intent__spin { animation: web-page-intent-spin 900ms linear infinite; }
        @keyframes web-page-intent-spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) {
          .web-page-intent__workspace { grid-template-columns: 1fr !important; }
          .web-page-intent__header { flex-direction: column; gap: 1rem !important; }
          .web-page-intent__status { align-self: flex-start; }
        }
        @media (max-width: 560px) {
          .web-page-intent__signal-strip { grid-template-columns: 1fr !important; }
          .web-page-intent__footer { align-items: flex-start !important; flex-direction: column; }
          .web-page-intent__footer span:last-child { text-align: left !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .web-page-intent__spin { animation: none; }
        }
      `}</style>
    </main>
  );
}

type ConstraintFieldProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  onChange: (value: string) => void;
};

function ConstraintField({ label, value, icon, onChange }: ConstraintFieldProps) {
  return (
    <div className="web-page-intent__constraint" style={{ ...compactSurfaceStyle, padding: "0.75rem 0.8rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.42rem" }}>
        <span style={{ display: "grid", placeItems: "center", color: "#b38f6f" }}>{icon}</span>
        <span style={{ ...monoText, fontSize: "0.58rem" }}>{label}</span>
      </div>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        style={{ background: "transparent", border: 0, boxShadow: "none", padding: 0, minHeight: "auto", color: "#f2f1ed", fontSize: "0.89rem" }}
      />
    </div>
  );
}
