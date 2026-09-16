import {
  useId,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, Clock3, CircleDot } from "lucide-react";
import { GlassCard, cn } from "@metron/ui";

export type StrategyNodeStatus = "active" | "complete" | "pending" | "warning" | "critical";

export interface StrategyGraphNode {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  /** A short line shown above the label, such as a chain or protocol name. */
  eyebrow?: ReactNode;
  /** Optional value shown at the end of the node. */
  value?: ReactNode;
  icon?: ReactNode;
  status?: StrategyNodeStatus;
  /** Position in the graph canvas, expressed as percentages from the top-left. */
  position?: { x: number; y: number };
  /** An explicit label is useful when `label` is a custom React element. */
  ariaLabel?: string;
}

export interface StrategyGraphDependency {
  from: string;
  to: string;
  label?: ReactNode;
  status?: "default" | "active" | "complete" | "warning";
  ariaLabel?: string;
}

export interface StrategyGraphProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  nodes?: readonly StrategyGraphNode[];
  dependencies?: readonly StrategyGraphDependency[];
  title?: ReactNode;
  description?: ReactNode;
  selectedNodeId?: string | null;
  defaultSelectedNodeId?: string | null;
  onNodeSelect?: (node: StrategyGraphNode) => void;
}

type GraphStyle = CSSProperties & Record<`--${string}`, string | number>;

type GraphPosition = { x: number; y: number };

const visuallyHidden: CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
};

const statusColors: Record<StrategyNodeStatus, { accent: string; soft: string; label: string }> = {
  active: {
    accent: "var(--metron-cyan, #72d8d0)",
    soft: "color-mix(in srgb, var(--metron-cyan, #72d8d0) 16%, transparent)",
    label: "Active",
  },
  complete: {
    accent: "var(--metron-green, #83d19d)",
    soft: "color-mix(in srgb, var(--metron-green, #83d19d) 16%, transparent)",
    label: "Complete",
  },
  pending: {
    accent: "var(--metron-sand, #d6c19d)",
    soft: "color-mix(in srgb, var(--metron-sand, #d6c19d) 16%, transparent)",
    label: "Pending",
  },
  warning: {
    accent: "var(--metron-amber, #e8ae62)",
    soft: "color-mix(in srgb, var(--metron-amber, #e8ae62) 16%, transparent)",
    label: "Warning",
  },
  critical: {
    accent: "var(--metron-crimson-bright, #e87979)",
    soft: "color-mix(in srgb, var(--metron-crimson-bright, #e87979) 16%, transparent)",
    label: "Critical",
  },
};

const dependencyColors = {
  default: "color-mix(in srgb, var(--metron-text-muted, #8f9aa8) 66%, transparent)",
  active: "var(--metron-cyan, #72d8d0)",
  complete: "var(--metron-green, #83d19d)",
  warning: "var(--metron-amber, #e8ae62)",
};

function getDefaultPosition(index: number, count: number): GraphPosition {
  if (count === 1) return { x: 50, y: 50 };

  const columns = count <= 3 ? count : Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: columns === 1 ? 50 : 14 + (column / (columns - 1)) * 72,
    y: rows === 1 ? 50 : 18 + (row / (rows - 1)) * 64,
  };
}

function clampPosition(position: GraphPosition): GraphPosition {
  return {
    x: Math.min(94, Math.max(6, position.x)),
    y: Math.min(90, Math.max(10, position.y)),
  };
}

function getNodePosition(node: StrategyGraphNode, index: number, count: number): GraphPosition {
  return clampPosition(node.position ?? getDefaultPosition(index, count));
}

function StatusIcon({ status }: { status: StrategyNodeStatus }) {
  const iconProps = { size: 14, strokeWidth: 2.2, "aria-hidden": true } as const;
  if (status === "complete") return <Check {...iconProps} />;
  if (status === "warning") return <AlertTriangle {...iconProps} />;
  if (status === "critical") return <AlertTriangle {...iconProps} />;
  if (status === "pending") return <Clock3 {...iconProps} />;
  return <CircleDot {...iconProps} />;
}

function getConnectorGeometry(from: GraphPosition, to: GraphPosition) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return {
    left: `${from.x}%`,
    top: `${from.y}%`,
    width: `${distance}%`,
    transform: `rotate(${angle}deg)`,
  };
}

export function StrategyGraph({
  nodes = [],
  dependencies = [],
  title,
  description,
  selectedNodeId,
  defaultSelectedNodeId = null,
  onNodeSelect,
  className,
  role,
  "aria-label": ariaLabel,
  ...props
}: StrategyGraphProps) {
  const graphId = useId().replace(/:/g, "");
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(
    defaultSelectedNodeId,
  );
  const isControlled = selectedNodeId !== undefined;
  const activeNodeId = isControlled ? selectedNodeId : internalSelectedNodeId;
  const positions = new Map(
    nodes.map((node, index) => [node.id, getNodePosition(node, index, nodes.length)]),
  );
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const validDependencies = dependencies.filter(
    (dependency) => positions.has(dependency.from) && positions.has(dependency.to),
  );
  const dependencyListId = `${graphId}-dependencies`;

  const selectNode = (node: StrategyGraphNode) => {
    if (!isControlled) setInternalSelectedNodeId(node.id);
    onNodeSelect?.(node);
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % nodes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + nodes.length) % nodes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = nodes.length - 1;
    }

    if (nextIndex === null || nextIndex === index || nodes.length === 0) return;
    event.preventDefault();
    document.getElementById(`${graphId}-node-${nodes[nextIndex]?.id}`)?.focus();
  };

  return (
    <GlassCard
      {...props}
      aria-describedby={validDependencies.length > 0 ? dependencyListId : undefined}
      aria-label={ariaLabel ?? "Strategy graph"}
      className={cn("strategy-graph", className)}
      role={role ?? "region"}
    >
      {title || description ? (
        <header className="strategy-graph__header">
          {title ? <h2 className="strategy-graph__title">{title}</h2> : null}
          {description ? <p className="strategy-graph__description">{description}</p> : null}
        </header>
      ) : null}

      <div className="strategy-graph__content">
        <div
          className="strategy-graph__canvas"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px)",
            backgroundSize: "2.5rem 2.5rem",
            border: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
            borderRadius: "0.85rem",
            color: "var(--metron-text-muted, #8f9aa8)",
            minHeight: "20rem",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {validDependencies.map((dependency, index) => {
            const from = positions.get(dependency.from);
            const to = positions.get(dependency.to);
            if (!from || !to) return null;
            const color = dependencyColors[dependency.status ?? "default"];
            const geometry = getConnectorGeometry(from, to);
            const dependencyLabel =
              dependency.ariaLabel ?? `${dependency.from} depends on ${dependency.to}`;

            return (
              <div
                aria-hidden="true"
                className="strategy-graph__dependency"
                key={`${dependency.from}-${dependency.to}-${index}`}
                style={{
                  ...geometry,
                  background: color,
                  height: "2px",
                  opacity: 0.72,
                  position: "absolute",
                  transformOrigin: "0 50%",
                  zIndex: 0,
                }}
                title={dependencyLabel}
              >
                <span
                  style={{
                    borderBottom: "4px solid transparent",
                    borderLeft: `6px solid ${color}`,
                    borderTop: "4px solid transparent",
                    height: 0,
                    position: "absolute",
                    right: "-5px",
                    top: "-3px",
                    width: 0,
                  }}
                />
                {dependency.label ? (
                  <span
                    style={{
                      background: "var(--metron-surface-raised, rgba(18, 23, 31, 0.94))",
                      border: "1px solid color-mix(in srgb, currentColor 15%, transparent)",
                      borderRadius: "999px",
                      color: "var(--metron-text-muted, #8f9aa8)",
                      fontSize: "0.65rem",
                      left: "50%",
                      padding: "0.18rem 0.42rem",
                      position: "absolute",
                      top: "50%",
                      transform: `translate(-50%, -50%) rotate(${-((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI)}deg)`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dependency.label}
                  </span>
                ) : null}
              </div>
            );
          })}

          {nodes.map((node, index) => {
            const position = positions.get(node.id) ?? getDefaultPosition(index, nodes.length);
            const status = node.status ?? "active";
            const statusStyle = statusColors[status];
            const isSelected = activeNodeId === node.id;
            const nodeStyle: GraphStyle = {
              "--strategy-node-accent": statusStyle.accent,
              "--strategy-node-soft": statusStyle.soft,
              left: `${position.x}%`,
              top: `${position.y}%`,
            };

            return (
              <button
                aria-current={isSelected ? "step" : undefined}
                aria-label={node.ariaLabel}
                aria-pressed={isSelected}
                className={cn("strategy-graph__node", isSelected && "strategy-graph__node--selected")}
                id={`${graphId}-node-${node.id}`}
                key={node.id}
                onClick={() => selectNode(node)}
                onKeyDown={(event) => moveFocus(event, index)}
                style={{
                  ...nodeStyle,
                  alignItems: "stretch",
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--strategy-node-soft) 96%, transparent), color-mix(in srgb, var(--metron-surface, #151b24) 88%, transparent))",
                  border: `1px solid color-mix(in srgb, var(--strategy-node-accent) 42%, transparent)`,
                  borderRadius: "0.75rem",
                  boxShadow: isSelected
                    ? "0 0 0 3px color-mix(in srgb, var(--strategy-node-accent) 24%, transparent), 0 0.75rem 2rem rgba(0, 0, 0, 0.2)"
                    : "0 0.75rem 1.6rem rgba(0, 0, 0, 0.16)",
                  color: "var(--metron-text, #f2f3f5)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.55rem",
                  maxWidth: "min(13rem, 32vw)",
                  minWidth: "8.75rem",
                  padding: "0.8rem 0.9rem",
                  position: "absolute",
                  textAlign: "left",
                  transform: "translate(-50%, -50%)",
                  transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                  zIndex: 1,
                }}
                type="button"
              >
                <span style={{ alignItems: "center", display: "flex", gap: "0.55rem" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      alignItems: "center",
                      background: "var(--strategy-node-soft)",
                      borderRadius: "0.45rem",
                      color: "var(--strategy-node-accent)",
                      display: "inline-flex",
                      flex: "0 0 auto",
                      height: "1.8rem",
                      justifyContent: "center",
                      width: "1.8rem",
                    }}
                  >
                    {node.icon ?? <StatusIcon status={status} />}
                  </span>
                  <span style={{ display: "grid", gap: "0.1rem", minWidth: 0 }}>
                    {node.eyebrow ? (
                      <span
                        style={{
                          color: "var(--strategy-node-accent)",
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.eyebrow}
                      </span>
                    ) : null}
                    <span style={{ fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.2 }}>
                      {node.label}
                    </span>
                  </span>
                </span>
                {node.description ? (
                  <span
                    style={{
                      color: "var(--metron-text-muted, #8f9aa8)",
                      fontSize: "0.72rem",
                      lineHeight: 1.35,
                    }}
                  >
                    {node.description}
                  </span>
                ) : null}
                {node.value ? (
                  <span
                    style={{
                      alignItems: "center",
                      borderTop: "1px solid color-mix(in srgb, currentColor 12%, transparent)",
                      color: "var(--strategy-node-accent)",
                      display: "flex",
                      fontSize: "0.76rem",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      justifyContent: "space-between",
                      paddingTop: "0.5rem",
                    }}
                  >
                    <span>{statusStyle.label}</span>
                    <span>{node.value}</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {validDependencies.length > 0 ? (
          <div id={dependencyListId} style={visuallyHidden}>
            <ul>
              {validDependencies.map((dependency, index) => (
                <li key={`${dependency.from}-${dependency.to}-description-${index}`}>
                  {dependency.ariaLabel ??
                    `${nodesById.get(dependency.from)?.ariaLabel ?? dependency.from} depends on ${nodesById.get(dependency.to)?.ariaLabel ?? dependency.to}`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {nodes.length === 0 ? (
          <p
            style={{
              color: "var(--metron-text-muted, #8f9aa8)",
              fontSize: "0.85rem",
              margin: "0.75rem 0 0",
            }}
          >
            No strategy steps are configured.
          </p>
        ) : null}
      </div>
    </GlassCard>
  );
}

export default StrategyGraph;
