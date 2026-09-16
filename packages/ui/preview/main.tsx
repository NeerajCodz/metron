import {
  ArrowRight,
  Check,
  CheckCircle,
  Code,
  Command,
  Cube,
  FileCode,
  GearSix,
  Graph,
  Lightning,
  List,
  LockKey,
  Plus,
  Pulse,
  ShieldCheck,
  Sparkle,
  TerminalWindow,
  X,
} from "@phosphor-icons/react";
import { StrictMode, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  DataList,
  DataListItem,
  Dialog,
  EmptyState,
  Field,
  GlassCard,
  GlassNavigation,
  Input,
  LiquidGlass,
  LiquidGlassSidebarMenu,
  Progress,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Timeline,
  Toast,
} from "../src/index.js";
import "../src/styles.css";
import "./preview.css";

const navigation = [
  { id: "overview", label: "Overview", href: "#overview", icon: <Cube size={16} weight="duotone" /> },
  { id: "surfaces", label: "Surfaces", href: "#surfaces", icon: <Sparkle size={16} weight="duotone" /> },
  { id: "controls", label: "Controls", href: "#controls", icon: <Command size={16} weight="duotone" /> },
  { id: "overlays", label: "Overlays", href: "#overlays", icon: <Pulse size={16} weight="duotone" /> },
  { id: "data", label: "Data", href: "#data", icon: <Graph size={16} weight="duotone" /> },
] as const;

const sidebarItems = [
  { id: "signals", label: "Signals", icon: <Pulse size={17} weight="duotone" />, badge: "04" },
  { id: "routes", label: "Routes", icon: <Graph size={17} weight="duotone" /> },
  { id: "policies", label: "Policies", icon: <ShieldCheck size={17} weight="duotone" /> },
  { id: "settings", label: "Settings", icon: <GearSix size={17} weight="duotone" /> },
] as const;

const timelineItems = [
  {
    id: "intent",
    title: "Intent received",
    description: "A route request enters the Metron execution layer.",
    meta: "09:41:08",
    status: "complete" as const,
    icon: <Check size={13} weight="bold" />,
  },
  {
    id: "quote",
    title: "Quote committed",
    description: "Solver terms are sealed before execution begins.",
    meta: "09:41:09",
    status: "current" as const,
    icon: <Lightning size={13} weight="fill" />,
  },
  {
    id: "settle",
    title: "Settlement ready",
    description: "The final proof is waiting for network confirmation.",
    meta: "pending",
    status: "upcoming" as const,
    icon: <LockKey size={13} weight="duotone" />,
  },
];

function App() {
  const [activeNav, setActiveNav] = useState("overview");
  const [activeSidebar, setActiveSidebar] = useState("signals");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(true);
  const [switchEnabled, setSwitchEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const handleNav = (id: string) => {
    setActiveNav(id);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setToastVisible(true);
    setNote("");
  };

  return (
    <div className="metron-theme showcase">
      <div className="showcase__frame">
        <header className="showcase__nav" aria-label="Metron component catalogue navigation">
          <GlassNavigation
            activeItem={activeNav}
            brand={
              <span aria-label="Metron UI">
                <span style={{ color: "var(--metron-crimson-bright)" }}>M</span>ETRON
              </span>
            }
            brandHref="#overview"
            brandLabel="Metron UI home"
            items={navigation}
            onNavigate={(item) => handleNav(item.id)}
            actions={
              <Button
                aria-label="Open component source"
                href="#data"
                size="sm"
                variant="crimson"
                trailingIcon={<ArrowRight size={14} weight="bold" />}
              >
                Build
              </Button>
            }
          />
        </header>

        <main>
          <section className="showcase__hero" id="overview" aria-labelledby="showcase-title">
            <div className="showcase__hero-copy">
              <p className="showcase__eyebrow">Metron UI / Reference system</p>
              <h1 className="showcase__title" id="showcase-title">
                Interfaces for <span style={{ color: "var(--metron-crimson-bright)" }}>clear</span> execution.
              </h1>
              <p className="showcase__intro">
                A restrained catalogue of liquid surfaces, expressive controls, and reliable states for developer systems.
              </p>
              <div className="showcase__hero-actions">
                <Button href="#surfaces" size="lg" variant="crimson" trailingIcon={<ArrowRight size={17} weight="bold" />}>
                  Explore surfaces
                </Button>
                <Button href="#controls" size="lg" variant="liquid-glass" leadingIcon={<Code size={17} weight="duotone" />}>
                  Read the patterns
                </Button>
              </div>
            </div>

            <div className="showcase__hero-art" aria-label="Liquid material preview">
              <LiquidGlass
                blurIntensity="xl"
                className="showcase__hero-glass"
                contentClassName="showcase__hero-glass-content"
                glowIntensity="sm"
                shadowIntensity="lg"
              >
                <div className="showcase__signal">
                  <span className="showcase__signal-mark"><Pulse size={18} weight="bold" /></span>
                  <div>
                    <span className="showcase__signal-label">Execution signal</span>
                    <strong>Route is coherent</strong>
                  </div>
                  <Badge variant="crimson">LIVE</Badge>
                </div>
                <div className="showcase__hero-line" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="showcase__hero-art-footer">
                  <span>Intent</span>
                  <span>Quote</span>
                  <span>Settle</span>
                </div>
              </LiquidGlass>
            </div>
          </section>

          <section className="showcase__metric-rail" aria-label="Metron system notes">
            <div className="showcase__metric">
              <span className="showcase__metric-value">01</span>
              <span className="showcase__metric-label">One material language</span>
            </div>
            <div className="showcase__metric">
              <span className="showcase__metric-value">08</span>
              <span className="showcase__metric-label">Composable families</span>
            </div>
            <div className="showcase__metric">
              <span className="showcase__metric-value">0%</span>
              <span className="showcase__metric-label">Colored glass fill</span>
            </div>
            <div className="showcase__metric showcase__metric--accent">
              <span className="showcase__metric-value">24/7</span>
              <span className="showcase__metric-label">Signal clarity</span>
            </div>
          </section>

          <section className="showcase__section" id="surfaces" aria-labelledby="surfaces-heading">
            <div className="showcase__section-heading">
              <p className="showcase__eyebrow">Material / 01</p>
              <h2 id="surfaces-heading">Liquid surfaces, kept transparent.</h2>
              <p>Refractive edges and soft contrast establish hierarchy without painting the canvas.</p>
            </div>
            <div className="showcase__grid">
              <div className="showcase__cell showcase__cell--wide">
                <GlassCard
                  className="showcase__specimen"
                  header="GlassCard"
                  title="A surface with a point of view"
                  description="Use a liquid panel when the content needs focus, not decoration."
                  footer={<span>Transparent fill / white edge / crimson action</span>}
                  action={<Badge variant="liquid-glass">refractive</Badge>}
                >
                  <div className="showcase__stack">
                    <div className="showcase__row showcase__row--spread">
                      <div>
                        <span className="showcase__micro-label">Current route</span>
                        <strong className="showcase__route">Base <ArrowRight size={17} /> Optimism</strong>
                      </div>
                      <Badge variant="success" leadingIcon={<CheckCircle size={14} weight="fill" />}>Verified</Badge>
                    </div>
                    <Progress label="Proof readiness" value={76} valueLabel="76%" tone="accent" size="sm" helperText="The next state is one confirmation away." />
                  </div>
                </GlassCard>
              </div>
              <div className="showcase__cell">
                <Card className="showcase__panel" variant="outline">
                  <div className="showcase__specimen-mark"><Sparkle size={18} weight="duotone" /></div>
                  <h3 className="showcase__subheading">LiquidGlass</h3>
                  <p className="showcase__body-copy">Use for raised context, navigation, and moments that deserve a calm edge.</p>
                  <div className="showcase__token-line"><span>blur</span><code className="showcase__code">xl</code></div>
                  <div className="showcase__token-line"><span>fill</span><code className="showcase__code">transparent</code></div>
                </Card>
              </div>
              <div className="showcase__cell showcase__cell--full">
                <div className="showcase__surface-strip" aria-label="Material edge samples">
                  <span>white edge highlight</span>
                  <span>soft lowlight</span>
                  <span>no colored glass</span>
                  <span>black canvas</span>
                </div>
              </div>
            </div>
          </section>

          <section className="showcase__section" id="controls" aria-labelledby="controls-heading">
            <div className="showcase__section-heading">
              <p className="showcase__eyebrow">Controls / 02</p>
              <h2 id="controls-heading">Every input earns its space.</h2>
              <p>Curved controls keep the system tactile while the type and labels stay quiet.</p>
            </div>
            <div className="showcase__grid">
              <div className="showcase__cell showcase__cell--wide">
                <Card className="showcase__panel" variant="glass">
                  <div className="showcase__card-heading">
                    <div>
                      <span className="showcase__micro-label">Field / Input / Textarea</span>
                      <h3 className="showcase__subheading">Send a route note</h3>
                    </div>
                    <FileCode size={21} weight="duotone" />
                  </div>
                  <form className="showcase__form" onSubmit={handleSubmit}>
                    <Field label="Work email" description="We only use this to return the route summary." required>
                      <Input
                        required
                        type="email"
                        value={email}
                        placeholder="you@metron.systems"
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </Field>
                    <Field label="Context" description="A short note for the execution team.">
                      <Textarea value={note} placeholder="Keep the quote inside the requested window." onChange={(event) => setNote(event.target.value)} />
                    </Field>
                    <div className="showcase__row showcase__row--spread">
                      <Switch
                        checked={switchEnabled}
                        label="Smart routing"
                        description={switchEnabled ? "Enabled for this preview." : "Manual route selection."}
                        onCheckedChange={setSwitchEnabled}
                      />
                      <Button type="submit" variant="crimson" trailingIcon={<ArrowRight size={15} weight="bold" />}>Submit note</Button>
                    </div>
                  </form>
                </Card>
              </div>
              <div className="showcase__cell">
                <div className="showcase__stack">
                  <Card className="showcase__panel" variant="outline">
                    <div className="showcase__card-heading">
                      <span className="showcase__micro-label">Button / Badge</span>
                      <Badge variant="accent">Pill only</Badge>
                    </div>
                    <div className="showcase__row">
                      <Button size="sm" variant="crimson" leadingIcon={<Plus size={14} weight="bold" />}>Create</Button>
                      <Button size="sm" variant="liquid-glass">Inspect</Button>
                    </div>
                    <div className="showcase__row">
                      <Badge variant="neutral">Queued</Badge>
                      <Badge variant="success" leadingIcon={<Check size={13} weight="bold" />}>Ready</Badge>
                    </div>
                  </Card>
                  <Card className="showcase__panel showcase__switch-card" variant="outline">
                    <Switch checked={switchEnabled} label="Runtime hints" description="Show practical guidance in context." onCheckedChange={setSwitchEnabled} />
                  </Card>
                </div>
              </div>
            </div>
          </section>

          <section className="showcase__section" id="overlays" aria-labelledby="overlays-heading">
            <div className="showcase__section-heading">
              <p className="showcase__eyebrow">Navigation / 03</p>
              <h2 id="overlays-heading">Context, without losing the thread.</h2>
              <p>A transparent sidebar and focused overlays keep state close to the action.</p>
            </div>
            <div className="showcase__grid">
              <div className="showcase__cell">
                <LiquidGlassSidebarMenu
                  activeId={activeSidebar}
                  className="showcase__sidebar"
                  footer={<span className="showcase__sidebar-footer"><TerminalWindow size={15} /> Metron runtime</span>}
                  heading={<span className="showcase__sidebar-heading"><span>Workspace</span><Badge variant="liquid-glass">DEV</Badge></span>}
                  items={sidebarItems}
                  onActiveChange={setActiveSidebar}
                />
              </div>
              <div className="showcase__cell showcase__cell--wide">
                <Card className="showcase__panel" variant="glass">
                  <div className="showcase__card-heading">
                    <div>
                      <span className="showcase__micro-label">Dialog / Toast / Alert</span>
                      <h3 className="showcase__subheading">Useful interruption</h3>
                    </div>
                    <Button size="sm" variant="liquid-glass" onClick={() => setDialogOpen(true)}>Open dialog</Button>
                  </div>
                  <Alert icon={<ShieldCheck size={19} weight="duotone" />} variant="liquid-glass">
                    <AlertTitle>Policy check passed</AlertTitle>
                    <AlertDescription>Transparent feedback works best when it says what changed and what happens next.</AlertDescription>
                  </Alert>
                  <div className="showcase__overlay-space">
                    {toastVisible ? (
                      <Toast
                        className="showcase__toast"
                        dismissIcon={<X size={15} />}
                        icon={<CheckCircle size={18} weight="fill" />}
                        onDismiss={() => setToastVisible(false)}
                        title="Note received"
                        variant="success"
                      >
                        We will keep this route context attached.
                      </Toast>
                    ) : (
                      <Button size="sm" variant="quiet" onClick={() => setToastVisible(true)}>Show toast again</Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </section>

          <section className="showcase__section" id="data" aria-labelledby="data-heading">
            <div className="showcase__section-heading">
              <p className="showcase__eyebrow">State / 04</p>
              <h2 id="data-heading">Readable signals, not a statistics wall.</h2>
              <p>Data components are for decisions: one list, one timeline, and one honest empty state.</p>
            </div>
            <div className="showcase__grid">
              <div className="showcase__cell showcase__cell--wide">
                <Card className="showcase__panel" variant="outline">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList aria-label="Data view">
                      <TabsTrigger value="live">Live route</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="live">
                      <DataList className="showcase__data-list" layout="responsive" divided>
                        <DataListItem icon={<Graph size={15} />} label="Route" value="Base / Optimism" description="Fast settlement lane" />
                        <DataListItem icon={<ShieldCheck size={15} />} label="Policy" value="Verified" description="No exception raised" />
                        <DataListItem icon={<Lightning size={15} />} label="Latency" value="184 ms" description="Within target window" />
                      </DataList>
                    </TabsContent>
                    <TabsContent value="history">
                      <div className="showcase__history-row"><CheckCircle size={17} weight="fill" /><span>Last route settled in 1.8 seconds.</span><Badge variant="success">stable</Badge></div>
                      <div className="showcase__history-row"><CheckCircle size={17} weight="fill" /><span>Policy checks stayed green for 12 runs.</span><Badge variant="neutral">12 runs</Badge></div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>
              <div className="showcase__cell">
                <GlassCard className="showcase__specimen" header="Timeline" title="Intent lifecycle" description="A compact sequence for operational context.">
                  <Timeline items={timelineItems} />
                </GlassCard>
              </div>
              <div className="showcase__cell">
                <Card className="showcase__panel" variant="glass">
                  <span className="showcase__micro-label">Loading / Empty</span>
                  <div className="showcase__skeleton-block" aria-label="Loading route summary">
                    <Skeleton variant="text" lines={2} />
                    <Skeleton variant="control" width="55%" />
                  </div>
                  <EmptyState
                    action={<Button size="sm" variant="liquid-glass" onClick={() => setDialogOpen(true)}>Create route</Button>}
                    description="Create an intent to see a verified path here."
                    icon={<List size={22} weight="duotone" />}
                    title="No saved routes"
                  />
                </Card>
              </div>
            </div>
          </section>
        </main>

        <footer className="showcase__footer">
          <div>
            <span className="showcase__eyebrow">Metron UI</span>
            <p>Practical primitives for systems that need to stay legible.</p>
          </div>
          <div className="showcase__footer-meta"><span>Pure black canvas</span><span>Liquid by default</span><span>Built for clarity</span></div>
        </footer>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Confirm route intent"
        description="This is a focused decision, not a detour."
        footer={<Button variant="crimson" onClick={() => setDialogOpen(false)}>Confirm intent</Button>}
      >
        <div className="showcase__dialog-kicker"><Command size={15} /> Route preview</div>
        <DataList layout="stacked" divided={false}>
          <DataListItem label="Origin" value="Base" />
          <DataListItem label="Destination" value="Optimism" />
          <DataListItem label="Policy" value="Metron standard" />
        </DataList>
      </Dialog>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
