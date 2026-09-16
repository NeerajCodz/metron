import {
  ArrowRight,
  Bell,
  CheckCircle,
  Database,
  DotsThree,
  Lightning,
  LockKey,
  ShieldCheck,
  SlidersHorizontal,
  TrendUp,
  Wallet,
  Warning,
} from "@phosphor-icons/react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  Badge,
  Button,
  DataList,
  DataListItem,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  Field,
  GlassCard,
  GlassNavigation,
  IconButton,
  InlineAlert,
  Input,
  LiquidGlass,
  MetricCard,
  Progress,
  Select,
  Skeleton,
  Stat,
  Switch,
  Textarea,
  Timeline,
  Toast,
} from "../src/index.js";
import "../src/styles.css";
import "./preview.css";

const navigationItems = [
  { id: "surfaces", label: "Surfaces", href: "#surfaces" },
  { id: "actions", label: "Actions", href: "#actions" },
  { id: "data", label: "Data", href: "#data" },
  { id: "forms", label: "Forms", href: "#forms" },
] as const;

const timelineItems = [
  {
    id: "intent",
    title: "Intent sealed",
    description: "Constraints signed and committed onchain.",
    meta: "10:41",
    status: "complete" as const,
  },
  {
    id: "route",
    title: "Route executing",
    description: "Capital is moving through the selected path.",
    meta: "Now",
    status: "current" as const,
  },
  {
    id: "settle",
    title: "Position settles",
    description: "Final balances will reconcile across chains.",
    status: "upcoming" as const,
  },
];

function App() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
    <main className="metron-theme showcase" id="top">
      <div className="showcase__frame">
        <div className="showcase__nav">
          <GlassNavigation
            activeItem="surfaces"
            actions={
              <IconButton
                accessibleLabel="Open notifications"
                icon={<Bell size={18} weight="bold" />}
                variant="quiet"
              />
            }
            brand={<span>METRON</span>}
            brandHref="#top"
            brandLabel="Metron UI home"
            items={navigationItems}
          />
        </div>

        <section className="showcase__hero" aria-labelledby="showcase-title">
          <div>
            <p className="showcase__eyebrow">Metron Interface System</p>
            <h1 className="showcase__title" id="showcase-title">
              Capital in motion.
            </h1>
          </div>
          <div>
            <p className="showcase__intro">
              Obsidian surfaces, liquid depth, and crisp financial states built from the Metron palette.
            </p>
            <div className="showcase__hero-actions">
              <Button trailingIcon={<ArrowRight size={17} weight="bold" />}>Explore kit</Button>
              <Button variant="glass" onClick={() => setDialogOpen(true)}>
                Open dialog
              </Button>
            </div>
          </div>
        </section>

        <section className="showcase__section" id="surfaces" aria-labelledby="surfaces-title">
          <div className="showcase__section-heading">
            <h2 id="surfaces-title">Liquid surfaces with restraint.</h2>
            <p>
              Layered highlights, local distortion, and dark transparency create depth without weakening
              readability.
            </p>
          </div>
          <div className="showcase__grid">
            <div className="showcase__cell showcase__cell--wide">
              <div className="showcase__drag-field">
                <LiquidGlass
                  className="showcase__drag-card"
                  contentClassName="showcase__stack"
                  draggable
                  glowIntensity="lg"
                >
                  <Badge leadingIcon={<Lightning size={13} weight="fill" />} variant="sand">
                    Draggable surface
                  </Badge>
                  <strong>Material that responds.</strong>
                  <span>Drag this panel and feel the elastic return.</span>
                </LiquidGlass>
              </div>
            </div>
            <div className="showcase__cell showcase__stack">
              <MetricCard
                change="+2.8%"
                changeTone="positive"
                icon={<TrendUp size={16} />}
                label="Net APY"
                value="12.4%"
              />
              <MetricCard
                change="Stable"
                icon={<ShieldCheck size={16} />}
                label="Health factor"
                value="2.18"
              />
            </div>
          </div>
        </section>

        <section className="showcase__section" id="actions" aria-labelledby="actions-title">
          <div className="showcase__section-heading">
            <h2 id="actions-title">Clear action at every intensity.</h2>
            <p>Controls stay tactile and legible across primary, quiet, destructive, and loading states.</p>
          </div>
          <div className="showcase__grid">
            <GlassCard
              className="showcase__cell showcase__cell--wide"
              description="Purposeful variants for capital-moving decisions."
              header="Control set"
              title="Buttons"
            >
              <div className="showcase__row">
                <Button leadingIcon={<Wallet size={17} />}>Connect wallet</Button>
                <Button variant="glass">Preview route</Button>
                <Button variant="quiet">View details</Button>
                <Button variant="danger">Emergency exit</Button>
                <IconButton
                  accessibleLabel="More actions"
                  icon={<DotsThree size={20} weight="bold" />}
                />
              </div>
            </GlassCard>
            <GlassCard
              className="showcase__cell"
              description="Compact signals use color only as reinforcement."
              header="System state"
              title="Badges"
            >
              <div className="showcase__row">
                <Badge variant="accent">Executing</Badge>
                <Badge variant="success">Healthy</Badge>
                <Badge variant="warning">Review</Badge>
                <Badge variant="danger">At risk</Badge>
                <Badge>Queued</Badge>
              </div>
            </GlassCard>
          </div>
        </section>

        <section className="showcase__section" id="data" aria-labelledby="data-title">
          <div className="showcase__section-heading">
            <h2 id="data-title">Dense data, calm hierarchy.</h2>
            <p>Financial context remains scan-friendly through semantic lists, progress, and timelines.</p>
          </div>
          <div className="showcase__grid">
            <GlassCard className="showcase__cell" header="Exposure" title="Position signal">
              <Stat
                detail="Across 3 chains"
                icon={<Database size={20} />}
                label="Managed value"
                tone="accent"
                trend="+4.2%"
                value="$48,240"
              />
            </GlassCard>
            <GlassCard className="showcase__cell showcase__cell--wide" header="Constraints" title="Risk usage">
              <div className="showcase__stack">
                <Progress label="Borrow capacity" value={62} valueLabel="62%" />
                <Progress label="Delta tolerance" tone="warning" value={38} valueLabel="38%" />
                <Progress label="Recovery reserve" tone="success" value={84} valueLabel="84%" />
              </div>
            </GlassCard>
            <GlassCard className="showcase__cell showcase__cell--wide" header="Execution" title="Activity">
              <Timeline items={timelineItems} />
            </GlassCard>
            <GlassCard className="showcase__cell" header="Route" title="Allocation">
              <DataList>
                <DataListItem label="Lending" value="45%" />
                <DataListItem label="Liquidity" value="35%" />
                <DataListItem label="Hedge" value="20%" />
              </DataList>
            </GlassCard>
          </div>
        </section>

        <section className="showcase__section" id="forms" aria-labelledby="forms-title">
          <div className="showcase__section-heading">
            <h2 id="forms-title">Inputs with explicit outcomes.</h2>
            <p>Every field connects labels, guidance, validation, and keyboard focus without hidden state.</p>
          </div>
          <div className="showcase__grid">
            <GlassCard
              className="showcase__cell showcase__cell--wide"
              description="A compact intent form with native controls."
              header="New intent"
              title="Capital constraints"
            >
              <div className="showcase__stack">
                <Field description="Used to cap the initial execution." label="Capital" required>
                  {(field) => <Input field={field} inputMode="decimal" placeholder="25,000 USDC" />}
                </Field>
                <Field label="Risk profile">
                  {(field) => (
                    <Select defaultValue="balanced" field={field}>
                      <option value="conservative">Conservative</option>
                      <option value="balanced">Balanced</option>
                      <option value="growth">Growth</option>
                    </Select>
                  )}
                </Field>
                <Field label="Execution note">
                  {(field) => <Textarea field={field} placeholder="Optional solver guidance" rows={3} />}
                </Field>
                <Switch
                  checked={protectionEnabled}
                  description="Pause execution when constraints drift."
                  label="Automatic protection"
                  onChange={(event) => setProtectionEnabled(event.currentTarget.checked)}
                />
                <Button fullWidth trailingIcon={<ArrowRight size={17} />}>
                  Review intent
                </Button>
              </div>
            </GlassCard>
            <div className="showcase__cell showcase__stack">
              <InlineAlert icon={<ShieldCheck size={20} />} title="Protected" variant="success">
                Recovery controls are active.
              </InlineAlert>
              <Toast
                action={{ label: "Review", onClick: () => setDialogOpen(true) }}
                icon={<Warning size={20} />}
                onDismiss={() => setNotificationsEnabled(false)}
                title="Route needs review"
                variant="warning"
              >
                Price impact moved outside your preferred range.
              </Toast>
              <Switch
                checked={notificationsEnabled}
                label="Execution notifications"
                onChange={(event) => setNotificationsEnabled(event.currentTarget.checked)}
              />
              <DropdownMenu
                align="end"
                label="Position actions"
                trigger="Position actions"
              >
                <DropdownMenuItem icon={<SlidersHorizontal size={17} />}>
                  Adjust constraints
                </DropdownMenuItem>
                <DropdownMenuItem icon={<LockKey size={17} />}>Lock position</DropdownMenuItem>
                <DropdownMenuItem destructive icon={<Warning size={17} />}>
                  Exit position
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </section>

        <section className="showcase__section" aria-labelledby="states-title">
          <div className="showcase__section-heading">
            <h2 id="states-title">The complete state cycle.</h2>
            <p>Loading and empty states match the final interface instead of falling back to generic spinners.</p>
          </div>
          <div className="showcase__grid">
            <GlassCard className="showcase__cell" header="Loading" title="Position summary">
              <div className="showcase__stack">
                <Skeleton lines={3} />
                <Skeleton height="4rem" variant="control" />
              </div>
            </GlassCard>
            <GlassCard className="showcase__cell showcase__cell--wide" header="Empty" title="Activity log">
              <EmptyState
                action={<Button variant="glass">Create intent</Button>}
                description="Execution records will appear here after your first intent runs."
                icon={<CheckCircle size={26} />}
                title="No activity yet"
              />
            </GlassCard>
          </div>
        </section>
      </div>

      <Dialog
        description="This native modal keeps focus, Escape handling, and the glass material aligned."
        footer={
          <>
            <Button variant="quiet" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm route</Button>
          </>
        }
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        title="Confirm execution"
      >
        <DataList>
          <DataListItem label="Capital" value="25,000 USDC" />
          <DataListItem label="Chains" value="Ethereum, Arbitrum" />
          <DataListItem label="Maximum slippage" value="0.40%" />
        </DataList>
      </Dialog>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Preview root element is missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
