import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleAlert,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import { Badge, Button, Dialog } from "@metron/ui";

export interface RecoveryAction {
  id?: string;
  label?: ReactNode;
  name?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  type?: ReactNode;
  amount?: ReactNode;
  asset?: ReactNode;
  expectedCostUsd?: ReactNode;
  expectedLossUsd?: ReactNode;
  resultingHealthFactor?: ReactNode;
  postActionLiquidationProbability?: ReactNode;
  maxSlippageBps?: ReactNode;
  metadata?: readonly {
    label: ReactNode;
    value: ReactNode;
  }[];
}

export interface RecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: RecoveryAction;
  actions?: readonly RecoveryAction[];
  selectedActionId?: string;
  onSelectAction?: (action: RecoveryAction) => void;
  onConfirm?: (action: RecoveryAction) => void | Promise<void>;
  positionLabel?: ReactNode;
  currentHealthFactor?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  children?: ReactNode;
}

export interface FlashUnwindModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void | Promise<void>;
  positionLabel?: ReactNode;
  chainName?: ReactNode;
  debt?: ReactNode;
  collateral?: ReactNode;
  estimatedResidual?: ReactNode;
  currentHealthFactor?: ReactNode;
  steps?: readonly ReactNode[];
  warning?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  requireAcknowledgement?: boolean;
  children?: ReactNode;
}

const mutedTextStyle: CSSProperties = {
  color: "var(--metron-pearl-muted)",
  fontSize: "0.875rem",
  lineHeight: 1.55,
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(10rem, 100%), 1fr))",
  gap: "0.6rem",
};

const metricStyle: CSSProperties = {
  display: "grid",
  gap: "0.25rem",
  minWidth: 0,
  padding: "0.75rem",
  color: "var(--metron-pearl)",
  background: "color-mix(in srgb, var(--metron-carbon-surface) 82%, transparent)",
  border: "1px solid var(--metron-border)",
  borderRadius: "var(--metron-radius-control)",
};

const metricLabelStyle: CSSProperties = {
  color: "var(--metron-pearl-muted)",
  fontSize: "0.7rem",
  fontWeight: 650,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
};

const metricValueStyle: CSSProperties = {
  overflow: "hidden",
  fontSize: "0.95rem",
  fontWeight: 650,
  lineHeight: 1.3,
  textOverflow: "ellipsis",
};

const warningStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.7rem",
  padding: "0.85rem",
  color: "var(--metron-pearl)",
  background: "color-mix(in srgb, var(--metron-crimson) 16%, transparent)",
  border: "1px solid color-mix(in srgb, var(--metron-crimson) 58%, var(--metron-border))",
  borderRadius: "var(--metron-radius-control)",
};

const actionListStyle: CSSProperties = {
  display: "grid",
  gap: "0.55rem",
};

const actionButtonStyle: CSSProperties = {
  display: "grid",
  width: "100%",
  gap: "0.25rem",
  padding: "0.85rem",
  color: "var(--metron-pearl)",
  textAlign: "left",
  background: "var(--metron-carbon-surface)",
  border: "1px solid var(--metron-border)",
  borderRadius: "var(--metron-radius-control)",
  cursor: "pointer",
  font: "inherit",
};

const actionButtonSelectedStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--metron-sand) 10%, var(--metron-carbon-surface))",
  borderColor: "var(--metron-sand)",
  boxShadow: "0 0 0 1px color-mix(in srgb, var(--metron-sand) 35%, transparent)",
};

const checkStyle: CSSProperties = {
  display: "inline-grid",
  width: "1.2rem",
  height: "1.2rem",
  flex: "none",
  placeItems: "center",
  color: "var(--metron-ink)",
  background: "var(--metron-sand)",
  borderRadius: "999px",
};

function hasValue(value: ReactNode): boolean {
  return value !== undefined && value !== null && value !== false;
}

function Metric({ label, value }: { label: ReactNode; value: ReactNode }) {
  if (!hasValue(value)) return null;
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={metricValueStyle}>{value}</strong>
    </div>
  );
}

function getActionLabel(action: RecoveryAction): ReactNode {
  return action.label ?? action.name ?? action.title ?? action.type ?? "Recovery action";
}

function getActionKey(action: RecoveryAction, index: number): string {
  return action.id ?? `recovery-action-${index}`;
}

function ActionSummary({ action }: { action: RecoveryAction }) {
  return (
    <div style={sectionStyle}>
      <div>
        <p className="metron-eyebrow" style={{ margin: 0 }}>
          Selected recovery
        </p>
        <h3 style={{ margin: "0.3rem 0 0", color: "var(--metron-pearl)", fontSize: "1rem" }}>
          {getActionLabel(action)}
        </h3>
        {hasValue(action.description) ? <p style={{ ...mutedTextStyle, margin: "0.35rem 0 0" }}>{action.description}</p> : null}
      </div>
      <div style={metricGridStyle}>
        <Metric label="Amount" value={action.amount} />
        <Metric label="Asset" value={action.asset} />
        <Metric label="Expected cost" value={action.expectedCostUsd} />
        <Metric label="Expected loss" value={action.expectedLossUsd} />
        <Metric label="Resulting health" value={action.resultingHealthFactor} />
        <Metric label="Post-action liquidation" value={action.postActionLiquidationProbability} />
        <Metric label="Max slippage" value={action.maxSlippageBps} />
        {action.metadata?.map((entry, index) => (
          <Metric key={`recovery-metadata-${index}`} label={entry.label} value={entry.value} />
        ))}
      </div>
    </div>
  );
}

function ModalFooter({
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  loading,
  disabled,
  destructive = false,
}: {
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <>
      <Button variant="glass" size="md" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={destructive ? "destructive" : "solid"}
        size="md"
        onClick={onConfirm}
        disabled={disabled || loading}
        loading={loading}
        loadingLabel="Submitting"
        trailingIcon={!loading ? <ArrowRight size={15} aria-hidden="true" /> : undefined}
      >
        {confirmLabel}
      </Button>
    </>
  );
}

export function RecoveryModal({
  open,
  onOpenChange,
  action,
  actions,
  selectedActionId,
  onSelectAction,
  onConfirm,
  positionLabel,
  currentHealthFactor,
  title = "Review recovery action",
  description = "Confirm a bounded action to restore this position's safety margin.",
  confirmLabel = "Confirm recovery",
  cancelLabel = "Cancel",
  loading = false,
  error,
  children,
}: RecoveryModalProps) {
  const availableActions = actions?.length ? actions : action ? [action] : [];
  const firstAction = availableActions[0];
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(() =>
    firstAction ? getActionKey(firstAction, 0) : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<ReactNode>(null);
  const effectiveSelectedId = selectedActionId ?? internalSelectedId;
  const selectedAction = availableActions.find(
    (candidate, index) => getActionKey(candidate, index) === effectiveSelectedId,
  ) ?? availableActions[0];
  const busy = loading || isSubmitting;

  useEffect(() => {
    if (!open) setSubmissionError(null);
  }, [open]);

  const selectAction = (candidate: RecoveryAction, index: number) => {
    setInternalSelectedId(getActionKey(candidate, index));
    onSelectAction?.(candidate);
    setSubmissionError(null);
  };

  const confirm = async () => {
    if (!selectedAction || busy) return;
    setSubmissionError(null);
    if (!onConfirm) {
      onOpenChange(false);
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(selectedAction);
      onOpenChange(false);
    } catch {
      setSubmissionError("Recovery could not be submitted. No funds were moved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      closeLabel="Close recovery dialog"
      closeIcon={<X size={17} aria-hidden="true" />}
      footer={
        <ModalFooter
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          onCancel={() => onOpenChange(false)}
          onConfirm={() => void confirm()}
          loading={busy}
          disabled={!selectedAction}
        />
      }
    >
      <div style={sectionStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.55rem" }}>
          <Badge variant="warning" leadingIcon={<ShieldAlert size={14} aria-hidden="true" />}>
            Bounded recovery
          </Badge>
          {hasValue(positionLabel) ? (
            <span style={{ ...mutedTextStyle, fontSize: "0.8rem" }}>{positionLabel}</span>
          ) : null}
        </div>

        {hasValue(currentHealthFactor) ? (
          <div style={{ ...warningStyle, background: "color-mix(in srgb, var(--metron-sand) 10%, transparent)", borderColor: "var(--metron-border)" }}>
            <CircleAlert size={19} color="var(--metron-sand)" aria-hidden="true" />
            <span style={mutedTextStyle}>
              Current health factor: <strong style={{ color: "var(--metron-pearl)" }}>{currentHealthFactor}</strong>. The selected action stays within the deterministic policy limits.
            </span>
          </div>
        ) : null}

        {availableActions.length > 1 ? (
          <div style={sectionStyle}>
            <div>
              <p className="metron-eyebrow" style={{ margin: 0 }}>Eligible actions</p>
              <p style={{ ...mutedTextStyle, margin: "0.3rem 0 0" }}>Choose the action to authorize. The protocol enforces the final limits on-chain.</p>
            </div>
            <div role="radiogroup" aria-label="Eligible recovery actions" style={actionListStyle}>
              {availableActions.map((candidate, index) => {
                const key = getActionKey(candidate, index);
                const selected = key === effectiveSelectedId;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectAction(candidate, index)}
                    style={{ ...actionButtonStyle, ...(selected ? actionButtonSelectedStyle : {}) }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontWeight: 650 }}>
                      <span style={{ ...checkStyle, opacity: selected ? 1 : 0.4 }} aria-hidden="true">
                        {selected ? <Check size={13} strokeWidth={3} /> : null}
                      </span>
                      {getActionLabel(candidate)}
                    </span>
                    {hasValue(candidate.description) ? <span style={{ ...mutedTextStyle, paddingLeft: "1.75rem", fontSize: "0.8rem" }}>{candidate.description}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {selectedAction ? <ActionSummary action={selectedAction} /> : <p style={mutedTextStyle}>No eligible recovery action is available for this position.</p>}
        {children}
        {hasValue(error) || hasValue(submissionError) ? (
          <div role="alert" style={{ ...warningStyle, color: "var(--metron-pearl)" }}>
            <AlertTriangle size={18} color="var(--metron-crimson-bright)" aria-hidden="true" />
            <span style={mutedTextStyle}>{error ?? submissionError}</span>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

const defaultUnwindSteps: readonly ReactNode[] = [
  "Borrow temporary liquidity",
  "Repay outstanding debt",
  "Release collateral and liquidity positions",
  "Close or adjust the hedge",
  "Repay temporary liquidity atomically",
  "Leave remaining funds in the safer vault state",
];

export function FlashUnwindModal({
  open,
  onOpenChange,
  onConfirm,
  positionLabel,
  chainName,
  debt,
  collateral,
  estimatedResidual,
  currentHealthFactor,
  steps = defaultUnwindSteps,
  warning = "Flash unwind is an emergency, same-chain operation. It can sell collateral and close active exposures. Review the outcome before authorizing.",
  confirmLabel = "Authorize flash unwind",
  cancelLabel = "Keep position",
  loading = false,
  error,
  requireAcknowledgement = false,
  children,
}: FlashUnwindModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<ReactNode>(null);
  const busy = loading || isSubmitting;

  useEffect(() => {
    if (!open) {
      setAcknowledged(false);
      setSubmissionError(null);
    }
  }, [open]);

  const confirm = async () => {
    if (busy || (requireAcknowledgement && !acknowledged)) return;
    setSubmissionError(null);
    if (!onConfirm) {
      onOpenChange(false);
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setSubmissionError("Flash unwind could not be submitted. No funds were moved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm emergency flash unwind"
      description="This destructive action attempts to atomically move the position into a safer state."
      closeLabel="Close flash unwind dialog"
      closeIcon={<X size={17} aria-hidden="true" />}
      footer={
        <ModalFooter
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          onCancel={() => onOpenChange(false)}
          onConfirm={() => void confirm()}
          loading={busy}
          disabled={requireAcknowledgement && !acknowledged}
          destructive
        />
      }
    >
      <div style={sectionStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.55rem" }}>
          <Badge variant="danger" leadingIcon={<Zap size={14} aria-hidden="true" />}>
            Emergency operation
          </Badge>
          {hasValue(positionLabel) ? <span style={{ ...mutedTextStyle, fontSize: "0.8rem" }}>{positionLabel}</span> : null}
          {hasValue(chainName) ? <span style={{ ...mutedTextStyle, fontSize: "0.8rem" }}>on {chainName}</span> : null}
        </div>

        <div style={warningStyle} role="note">
          <AlertTriangle size={20} color="var(--metron-crimson-bright)" aria-hidden="true" />
          <p style={{ ...mutedTextStyle, margin: 0, color: "var(--metron-pearl)" }}>{warning}</p>
        </div>

        <div style={metricGridStyle}>
          <Metric label="Debt to repay" value={debt} />
          <Metric label="Collateral at risk" value={collateral} />
          <Metric label="Estimated residual" value={estimatedResidual} />
          <Metric label="Current health" value={currentHealthFactor} />
        </div>

        <div style={sectionStyle}>
          <div>
            <p className="metron-eyebrow" style={{ margin: 0 }}>Atomic sequence</p>
            <p style={{ ...mutedTextStyle, margin: "0.3rem 0 0" }}>If any step fails, the transaction reverts instead of leaving a partial unwind.</p>
          </div>
          <ol style={{ display: "grid", gap: "0.5rem", margin: 0, padding: 0, listStyle: "none" }}>
            {steps.map((step, index) => (
              <li key={`flash-unwind-step-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", color: "var(--metron-pearl)" }}>
                <span style={{ ...checkStyle, width: "1.35rem", height: "1.35rem", color: "var(--metron-sand)", background: "color-mix(in srgb, var(--metron-sand) 12%, transparent)", border: "1px solid var(--metron-border)" }} aria-hidden="true">
                  {index + 1}
                </span>
                <span style={{ ...mutedTextStyle, paddingTop: "0.1rem" }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {requireAcknowledgement ? (
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", color: "var(--metron-pearl)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              disabled={busy}
              style={{ marginTop: "0.2rem", accentColor: "var(--metron-crimson)" }}
            />
            <span style={mutedTextStyle}>I understand this may sell collateral and close active positions on this chain.</span>
          </label>
        ) : null}
        {children}
        {hasValue(error) || hasValue(submissionError) ? (
          <div role="alert" style={{ ...warningStyle, color: "var(--metron-pearl)" }}>
            <CircleAlert size={18} color="var(--metron-crimson-bright)" aria-hidden="true" />
            <span style={mutedTextStyle}>{error ?? submissionError}</span>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
