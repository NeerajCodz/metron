import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  Clock3,
  Gauge,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { Badge, Button, Field, GlassCard, InlineAlert, Input, Select, Switch } from "@metron/ui";

interface AutomationStrategy {
  id: string;
  name: string;
  description: string;
  allocation: string;
  cadence: string;
  status: "Running" | "Paused";
  lastRun: string;
  nextRun: string;
  action: string;
  risk: "Conservative" | "Balanced" | "Aggressive";
}

interface RuleRow {
  id: number;
  trigger: string;
  condition: string;
  action: string;
}

const initialStrategies: AutomationStrategy[] = [
  {
    id: "yield-sweep",
    name: "Stablecoin yield sweep",
    description: "Routes idle USDC into the highest quality approved venue.",
    allocation: "$42,800",
    cadence: "Every 6 hours",
    status: "Running",
    lastRun: "12 minutes ago",
    nextRun: "in 5 hours 48 minutes",
    action: "Rebalance",
    risk: "Conservative",
  },
  {
    id: "delta-neutral",
    name: "ETH delta neutral",
    description: "Keeps ETH exposure hedged while harvesting funding premiums.",
    allocation: "$18,400",
    cadence: "Every hour",
    status: "Running",
    lastRun: "28 minutes ago",
    nextRun: "in 32 minutes",
    action: "Adjust hedge",
    risk: "Balanced",
  },
  {
    id: "drawdown-guard",
    name: "Drawdown guard",
    description: "Reduces leverage when portfolio volatility moves outside policy.",
    allocation: "$61,200",
    cadence: "On threshold",
    status: "Paused",
    lastRun: "Yesterday at 18:42",
    nextRun: "Awaiting resume",
    action: "Reduce exposure",
    risk: "Aggressive",
  },
];

const triggerOptions = [
  "Portfolio drawdown exceeds",
  "Asset price moves by",
  "Funding rate crosses",
  "Wallet balance falls below",
  "Scheduled review",
];

const conditionOptions = [
  "within the last 24 hours",
  "for two consecutive checks",
  "and gas is below 35 gwei",
  "while volatility is elevated",
  "during the approved window",
];

const actionOptions = [
  "Reduce position by 15%",
  "Move funds to stablecoin reserve",
  "Pause strategy and notify me",
  "Rebalance to target weights",
  "Request approval before execution",
];

const controlStyle = {
  width: "100%",
  background: "rgba(8, 11, 15, 0.72)",
  border: "1px solid rgba(227, 216, 198, 0.18)",
  color: "#e9e4da",
  minHeight: 42,
  padding: "0 12px",
  borderRadius: 7,
};

const labelStyle = {
  color: "#a9a396",
  fontSize: 11,
  letterSpacing: "0.09em",
  textTransform: "uppercase" as const,
  fontWeight: 700,
};

function SectionHeading({
  eyebrow,
  title,
  detail,
  id,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  id: string;
}) {
  return (
    <div style={{ display: "grid", gap: 7, marginBottom: 18 }}>
      <div style={labelStyle}>{eyebrow}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 id={id} style={{ margin: 0, color: "#f3eee5", fontSize: 22, lineHeight: 1.15 }}>
          {title}
        </h2>
        <span style={{ color: "#89857e", fontSize: 13 }}>{detail}</span>
      </div>
    </div>
  );
}

export function AutomationPage() {
  const [strategies, setStrategies] = useState(initialStrategies);
  const [rules, setRules] = useState<RuleRow[]>([
    {
      id: 1,
      trigger: "Portfolio drawdown exceeds",
      condition: "within the last 24 hours",
      action: "Reduce position by 15%",
    },
  ]);
  const [policy, setPolicy] = useState({
    maxDrawdown: "12",
    maxLeverage: "2.5",
    reserve: "18",
    approvalThreshold: "10000",
  });
  const [permissions, setPermissions] = useState({
    executeTrades: true,
    moveFunds: true,
    borrow: false,
    notifyOnly: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [globalPaused, setGlobalPaused] = useState(false);

  const runningCount = useMemo(
    () => strategies.filter((strategy) => strategy.status === "Running").length,
    [strategies],
  );

  const toggleStrategy = (id: string) => {
    setStrategies((current) =>
      current.map((strategy) =>
        strategy.id === id
          ? { ...strategy, status: strategy.status === "Running" ? "Paused" : "Running" }
          : strategy,
      ),
    );
    setSaved(false);
  };

  const toggleGlobalPause = () => {
    const nextPaused = !globalPaused;
    setGlobalPaused(nextPaused);
    setStrategies((current) =>
      current.map((strategy) => ({ ...strategy, status: nextPaused ? "Paused" : "Running" })),
    );
    setSaved(false);
  };

  const updateRule = (id: number, key: keyof Omit<RuleRow, "id">, value: string) => {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, [key]: value } : rule)),
    );
    setSaved(false);
  };

  const addRule = () => {
    const nextId = Math.max(0, ...rules.map((rule) => rule.id)) + 1;
    setRules((current) => [
      ...current,
      {
        id: nextId,
        trigger: triggerOptions[1] ?? "Asset price moves by",
        condition: conditionOptions[1] ?? "for two consecutive checks",
        action: actionOptions[2] ?? "Pause strategy and notify me",
      },
    ]);
    setSaved(false);
  };

  const removeRule = (id: number) => {
    if (rules.length === 1) return;
    setRules((current) => current.filter((rule) => rule.id !== id));
    setSaved(false);
  };

  const saveAutomation = () => {
    const limits = {
      maxDrawdown: Number(policy.maxDrawdown),
      maxLeverage: Number(policy.maxLeverage),
      reserve: Number(policy.reserve),
      approvalThreshold: Number(policy.approvalThreshold),
    };
    const invalid =
      !Number.isFinite(limits.maxDrawdown) ||
      limits.maxDrawdown <= 0 ||
      limits.maxDrawdown > 100 ||
      !Number.isFinite(limits.maxLeverage) ||
      limits.maxLeverage < 1 ||
      limits.maxLeverage > 10 ||
      !Number.isFinite(limits.reserve) ||
      limits.reserve < 0 ||
      limits.reserve > 100 ||
      !Number.isFinite(limits.approvalThreshold) ||
      limits.approvalThreshold < 0;
    if (invalid) {
      setSaved(false);
      setSaveError("Check policy limits: drawdown must be 1–100%, leverage 1–10x, and values cannot be negative.");
      return;
    }
    setIsSaving(true);
    setSaved(false);
    setSaveError(null);
    window.setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
    }, 650);
  };

  return (
    <main
      className="web-page-automation"
      style={{
        color: "#e9e4da",
        display: "grid",
        gap: 30,
        maxWidth: 1320,
        margin: "0 auto",
        padding: "32px clamp(18px, 4vw, 56px) 72px",
      }}
    >
      <header
        className="web-page-automation__header"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(227, 216, 198, 0.14)",
          paddingBottom: 24,
        }}
      >
        <div style={{ display: "grid", gap: 10, maxWidth: 650 }}>
          <div
            style={{
              ...labelStyle,
              color: "#bb443f",
              display: "flex",
              gap: 7,
              alignItems: "center",
            }}
          >
            <Bot size={14} strokeWidth={1.8} aria-hidden="true" />
            Operator automation
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(30px, 5vw, 48px)",
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
              color: "#f5f0e8",
            }}
          >
            Automation control
          </h1>
          <p style={{ margin: 0, color: "#9c988f", fontSize: 15, lineHeight: 1.6 }}>
            Set the conditions your strategies can act on, then keep execution inside a policy you
            trust.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Badge
            variant={globalPaused ? "warning" : "success"}
            leadingIcon={globalPaused ? <Pause size={13} /> : <Activity size={13} />}
          >
            {globalPaused ? "All automation paused" : `${runningCount} strategies running`}
          </Badge>
          <Button
            variant={globalPaused ? "crimson" : "outline"}
            size="md"
            leadingIcon={globalPaused ? <Play size={15} /> : <Pause size={15} />}
            onClick={toggleGlobalPause}
          >
            {globalPaused ? "Resume all" : "Pause all"}
          </Button>
        </div>
      </header>

      {saved ? (
        <InlineAlert variant="success" icon={<Check size={16} />} title="Automation settings saved">
          New rules and permissions are active for the next evaluation cycle.
        </InlineAlert>
      ) : null}
      {saveError ? (
        <InlineAlert
          variant="error"
          icon={<CircleAlert size={16} />}
          title="Automation was not saved"
        >
          {saveError}
        </InlineAlert>
      ) : null}

      <section aria-labelledby="active-automation-heading">
        <SectionHeading
          id="active-automation-heading"
          eyebrow="01 / Active strategies"
          title="Active automation"
          detail="Execution status across your strategy book"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {strategies.map((strategy) => {
            const isRunning = strategy.status === "Running";
            return (
              <GlassCard
                key={strategy.id}
                className="web-page-automation__strategy-card"
                style={{
                  borderTop: `2px solid ${isRunning ? "#bb443f" : "rgba(227, 216, 198, 0.16)"}`,
                }}
                header={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <Badge variant={isRunning ? "success" : "neutral"}>{strategy.status}</Badge>
                    <span style={{ color: "#7f7b74", fontSize: 12 }}>{strategy.risk}</span>
                  </div>
                }
                title={strategy.name}
                description={strategy.description}
                action={
                  <Button
                    variant="quiet"
                    size="sm"
                    leadingIcon={isRunning ? <Pause size={14} /> : <Play size={14} />}
                    onClick={() => toggleStrategy(strategy.id)}
                  >
                    {isRunning ? "Pause" : "Resume"}
                  </Button>
                }
              >
                <div style={{ display: "grid", gap: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "end",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={labelStyle}>Allocation</div>
                      <strong
                        style={{ display: "block", fontSize: 24, marginTop: 5, color: "#f1ece3" }}
                      >
                        {strategy.allocation}
                      </strong>
                    </div>
                    <span style={{ color: "#aaa59c", fontSize: 12, textAlign: "right" }}>
                      {strategy.cadence}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      paddingTop: 12,
                      borderTop: "1px solid rgba(227, 216, 198, 0.12)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        color: "#9b978f",
                        fontSize: 12,
                      }}
                    >
                      <span>Last action</span>
                      <span style={{ color: "#d5cec2" }}>
                        {strategy.action} · {strategy.lastRun}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        color: "#9b978f",
                        fontSize: 12,
                      }}
                    >
                      <span>Next evaluation</span>
                      <span style={{ color: isRunning ? "#d5cec2" : "#817d76" }}>
                        {strategy.nextRun}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="rule-builder-heading">
        <SectionHeading
          id="rule-builder-heading"
          eyebrow="02 / Rule builder"
          title="Guardrails that act"
          detail="Rules are evaluated in order before every automated action"
        />
        <GlassCard
          className="web-page-automation__rule-builder"
          title="Execution rules"
          description="Use one or more conditions to make automation deliberate. The first matching action is applied."
          action={
            <Badge variant="neutral" leadingIcon={<SlidersHorizontal size={13} />}>
              {rules.length} {rules.length === 1 ? "rule" : "rules"}
            </Badge>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                className="web-page-automation__rule-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "26px minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.1fr) 38px",
                  gap: 10,
                  alignItems: "end",
                  padding: "15px 0",
                  borderBottom:
                    index === rules.length - 1 ? "none" : "1px solid rgba(227, 216, 198, 0.11)",
                }}
              >
                <span
                  style={{
                    color: "#7e7a73",
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: 12,
                    paddingBottom: 11,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Field label="When" labelClassName="web-page-automation__field-label">
                  <Select
                    value={rule.trigger}
                    onChange={(event) => updateRule(rule.id, "trigger", event.target.value)}
                    style={controlStyle}
                  >
                    {triggerOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="And" labelClassName="web-page-automation__field-label">
                  <Select
                    value={rule.condition}
                    onChange={(event) => updateRule(rule.id, "condition", event.target.value)}
                    style={controlStyle}
                  >
                    {conditionOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Then" labelClassName="web-page-automation__field-label">
                  <Select
                    value={rule.action}
                    onChange={(event) => updateRule(rule.id, "action", event.target.value)}
                    style={controlStyle}
                  >
                    {actionOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </Field>
                <Button
                  variant="quiet"
                  size="sm"
                  aria-label={`Remove rule ${index + 1}`}
                  leadingIcon={<Trash2 size={15} />}
                  onClick={() => removeRule(rule.id)}
                  disabled={rules.length === 1}
                  style={{ minWidth: 38, paddingInline: 8, color: "#b67b76" }}
                >
                  <span className="metron-sr-only">Remove</span>
                </Button>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                paddingTop: 5,
              }}
            >
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<Plus size={15} />}
                onClick={addRule}
              >
                Add condition
              </Button>
              <span
                style={{
                  color: "#7f7b74",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CircleAlert size={14} aria-hidden="true" />
                Rules never bypass your risk policy
              </span>
            </div>
          </div>
        </GlassCard>
      </section>

      <section
        aria-label="Personal risk policy"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <GlassCard
          className="web-page-automation__policy-card"
          title="Personal risk policy"
          description="The policy is a hard ceiling. Automated actions stop when any limit is reached."
          header={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <ShieldCheck size={15} color="#bb443f" />
              Policy controls
            </span>
          }
        >
          <div style={{ display: "grid", gap: 15 }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}
            >
              <Field label="Max 24h drawdown" description="Pause new actions at this loss.">
                <div style={{ position: "relative" }}>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={policy.maxDrawdown}
                    onChange={(event) => {
                      setPolicy({ ...policy, maxDrawdown: event.target.value });
                      setSaved(false);
                    }}
                    style={{ ...controlStyle, paddingRight: 34 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      color: "#77736c",
                      fontSize: 13,
                    }}
                  >
                    %
                  </span>
                </div>
              </Field>
              <Field label="Max leverage" description="Across all automated positions.">
                <div style={{ position: "relative" }}>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={policy.maxLeverage}
                    onChange={(event) => {
                      setPolicy({ ...policy, maxLeverage: event.target.value });
                      setSaved(false);
                    }}
                    style={{ ...controlStyle, paddingRight: 45 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      color: "#77736c",
                      fontSize: 13,
                    }}
                  >
                    x
                  </span>
                </div>
              </Field>
              <Field label="Stablecoin reserve" description="Minimum liquid balance to preserve.">
                <div style={{ position: "relative" }}>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={policy.reserve}
                    onChange={(event) => {
                      setPolicy({ ...policy, reserve: event.target.value });
                      setSaved(false);
                    }}
                    style={{ ...controlStyle, paddingRight: 34 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      color: "#77736c",
                      fontSize: 13,
                    }}
                  >
                    %
                  </span>
                </div>
              </Field>
              <Field label="Approval threshold" description="Require approval above this amount.">
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 12,
                      color: "#77736c",
                      fontSize: 13,
                    }}
                  >
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={policy.approvalThreshold}
                    onChange={(event) => {
                      setPolicy({ ...policy, approvalThreshold: event.target.value });
                      setSaved(false);
                    }}
                    style={{ ...controlStyle, paddingLeft: 24 }}
                  />
                </div>
              </Field>
            </div>
            <InlineAlert
              variant="info"
              icon={<LockKeyhole size={15} />}
              title="Policy is enforced locally"
            >
              Strategies can propose an action, but they cannot exceed these limits without your
              approval.
            </InlineAlert>
          </div>
        </GlassCard>

        <GlassCard
          className="web-page-automation__permission-card"
          title="Permissions"
          description="Choose what automation may do without a confirmation step."
          header={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <LockKeyhole size={15} />
              Scoped access
            </span>
          }
        >
          <div style={{ display: "grid", gap: 6 }}>
            <Switch
              label="Execute trades"
              description="Place orders within policy limits."
              checked={permissions.executeTrades}
              onCheckedChange={(checked) => {
                setPermissions({ ...permissions, executeTrades: checked });
                setSaved(false);
              }}
            />
            <Switch
              label="Move funds"
              description="Transfer between approved venues."
              checked={permissions.moveFunds}
              onCheckedChange={(checked) => {
                setPermissions({ ...permissions, moveFunds: checked });
                setSaved(false);
              }}
            />
            <Switch
              label="Borrow or add leverage"
              description="Allow credit actions only when enabled."
              checked={permissions.borrow}
              onCheckedChange={(checked) => {
                setPermissions({ ...permissions, borrow: checked });
                setSaved(false);
              }}
            />
            <Switch
              label="Notify without acting"
              description="Send a prompt before every action."
              checked={permissions.notifyOnly}
              onCheckedChange={(checked) => {
                setPermissions({ ...permissions, notifyOnly: checked });
                setSaved(false);
              }}
            />
          </div>
        </GlassCard>
      </section>

      <section aria-label="Review your operating envelope">
        <GlassCard
          className="web-page-automation__review-card"
          header={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Zap size={15} color="#bb443f" />
              Before the next run
            </span>
          }
          title="Review your operating envelope"
          description="Your current policy keeps 18% in reserve, limits leverage to 2.5x, and requires approval for actions over $10,000."
          action={
            <Button
              variant="crimson"
              size="md"
              loading={isSaving}
              loadingLabel="Saving"
              leadingIcon={isSaving ? undefined : <Save size={15} />}
              onClick={saveAutomation}
            >
              Save automation
            </Button>
          }
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}
          >
            <div
              style={{
                padding: 14,
                background: "rgba(227, 216, 198, 0.045)",
                border: "1px solid rgba(227, 216, 198, 0.1)",
                borderRadius: 7,
              }}
            >
              <Gauge size={16} color="#c0a889" aria-hidden="true" />
              <strong style={{ display: "block", fontSize: 20, marginTop: 10, color: "#f2ede4" }}>
                {policy.maxDrawdown}%
              </strong>
              <span style={{ color: "#8d8981", fontSize: 12 }}>drawdown ceiling</span>
            </div>
            <div
              style={{
                padding: 14,
                background: "rgba(227, 216, 198, 0.045)",
                border: "1px solid rgba(227, 216, 198, 0.1)",
                borderRadius: 7,
              }}
            >
              <Clock3 size={16} color="#c0a889" aria-hidden="true" />
              <strong style={{ display: "block", fontSize: 20, marginTop: 10, color: "#f2ede4" }}>
                {runningCount}/3
              </strong>
              <span style={{ color: "#8d8981", fontSize: 12 }}>strategies active</span>
            </div>
            <div
              style={{
                padding: 14,
                background: "rgba(227, 216, 198, 0.045)",
                border: "1px solid rgba(227, 216, 198, 0.1)",
                borderRadius: 7,
              }}
            >
              <Sparkles size={16} color="#c0a889" aria-hidden="true" />
              <strong style={{ display: "block", fontSize: 20, marginTop: 10, color: "#f2ede4" }}>
                {rules.length}
              </strong>
              <span style={{ color: "#8d8981", fontSize: 12 }}>evaluation rules</span>
            </div>
          </div>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="link"
              size="sm"
              trailingIcon={<ArrowRight size={14} />}
              onClick={() =>
                document
                  .getElementById("active-automation-heading")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Inspect active strategies
            </Button>
          </div>
        </GlassCard>
      </section>
    </main>
  );
}
