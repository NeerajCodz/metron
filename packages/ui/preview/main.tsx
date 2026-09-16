import {
  ArrowRight,
  Bell,
  CalendarBlank,
  CaretDown,
  CheckCircle,
  ChatCircleDots,
  Clock,
  Command as CommandIcon,
  Copy,
  CurrencyDollar,
  Database,
  DotsThree,
  FileCode,
  FileText,
  Gear,
  Info,
  Lightning,
  LockKey,
  MagnifyingGlass,
  Paperclip,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  TrendUp,
  User,
  Warning,
} from "@phosphor-icons/react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  AspectRatio,
  Attachment,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  BackgroundLayout,
  Badge,
  BarChart,
  Blockquote,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Bubble,
  Button,
  ButtonGroup,
  Calendar,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Combobox,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
  DataTable,
  DatePicker,
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DirectionContainer,
  DonutChart,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuItem,
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyTitle,
  Field,
  GlassCard,
  GlassNavigation,
  H1,
  H2,
  H3,
  H4,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  IconButton,
  InlineCode,
  Input,
  InputGroup,
  InputGroupAddon,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  Kbd,
  KbdGroup,
  Label,
  Large,
  Lead,
  LiquidGlass,
  Marker,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  Message,
  MessageActions,
  MessageHeader,
  MessageScroller,
  MessageTimestamp,
  MetricCard,
  Muted,
  NativeSelect,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  P,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  PulseMarker,
  Questionnaire,
  QuestionnaireOption,
  RadioGroup,
  RadioGroupItem,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select as ComposableSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  type BackgroundGlow,
  type BackgroundMask,
  type BackgroundPatternVariant,
  SelectValue,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  Skeleton,
  Slider,
  Small,
  Sparkline,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toast,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../src/index.js";
import "../src/styles.css";
import "./preview.css";

const navItems = [
  { id: "overview", label: "Overview", href: "#overview" },
  { id: "surfaces", label: "Surfaces", href: "#surfaces" },
  { id: "controls", label: "Controls", href: "#controls" },
  { id: "overlays", label: "Navigation & Overlays", href: "#overlays" },
  { id: "data", label: "Data & Charts", href: "#data" },
  { id: "ai", label: "AI & Chat", href: "#ai" },
] as const;

const tableDemoData = [
  { id: "TX-9012", route: "Arbitrum → Base", volume: "$1.45M", solver: "Metron-ZK", status: "Settled" },
  { id: "TX-9013", route: "Ethereum → Optimism", volume: "$840K", solver: "FlashFlow", status: "Routing" },
  { id: "TX-9014", route: "Base → Avalanche", volume: "$320K", solver: "Metron-ZK", status: "Settled" },
  { id: "TX-9015", route: "Polygon → Arbitrum", volume: "$650K", solver: "HyperRoute", status: "Pending" },
  { id: "TX-9016", route: "Optimism → Base", volume: "$2.10M", solver: "Metron-ZK", status: "Settled" },
  { id: "TX-9017", route: "Ethereum → Base", volume: "$510K", solver: "AaveV3-Relay", status: "Settled" },
];

const comboboxItems = [
  { value: "arb-zk", label: "Arbitrum One ZK Solver" },
  { value: "base-opt", label: "Base Fast Settlement" },
  { value: "eth-main", label: "Ethereum L1 Security Vault" },
  { value: "op-pool", label: "Optimism Liquidity Mesh" },
];

function App() {
  // Background configuration state
  const [bgPattern, setBgPattern] = useState<BackgroundPatternVariant>("dots");
  const [bgGlow, setBgGlow] = useState<BackgroundGlow>("dual");
  const [bgMask, setBgMask] = useState<BackgroundMask>("radial");
  const [bgSize, setBgSize] = useState<number>(28);

  // UI Interactive States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [switchState, setSwitchState] = useState(true);
  const [sliderValue, setSliderValue] = useState<number[]>([65]);
  const [activeTab, setActiveTab] = useState("surfaces");
  const [surveyAnswer, setSurveyAnswer] = useState<string>("speed");
  const [selectedCombobox, setSelectedCombobox] = useState("arb-zk");
  const [dateValue, setDateValue] = useState<Date | undefined>(new Date());
  const [toastVisible, setToastVisible] = useState(true);

  // AI chat simulator messages
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string; time: string }>>([
    {
      role: "user",
      text: "Can you optimize my liquidity route across Arbitrum and Base?",
      time: "10:41 AM",
    },
    {
      role: "assistant",
      text: "Evaluating solver execution. The optimal route achieves 0.02% slippage with ZK commitment verified onchain.",
      time: "10:42 AM",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  const handleSendChat = () => {
    if (!inputMessage.trim()) return;
    const userMsg = { role: "user" as const, text: inputMessage, time: "Just now" };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage("");

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          text: `Executing constraint verification for: "${userMsg.text}". Route settled in 420ms with liquid glass carbon proof.`,
          time: "Just now",
        },
      ]);
    }, 600);
  };

  return (
    <BackgroundLayout
      className="metron-theme showcase"
      glow={bgGlow}
      patternMask={bgMask}
      patternSize={bgSize}
      patternVariant={bgPattern}
    >
      <div className="showcase__frame" id="overview">
        {/* Navigation Bar */}
        <div className="showcase__nav">
          <GlassNavigation
            activeItem="overview"
            actions={
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Button
                  leadingIcon={<CommandIcon size={16} weight="bold" />}
                  onClick={() => setCommandOpen(true)}
                  size="sm"
                  variant="liquid-glass"
                >
                  ⌘K Search
                </Button>
                <IconButton
                  accessibleLabel="Notifications"
                  icon={<Bell size={18} weight="bold" />}
                  variant="glass"
                />
              </div>
            }
            brand={<span>METRON / SYSTEM</span>}
            brandHref="#overview"
            brandLabel="Metron UI"
            items={navItems}
          />
        </div>

        {/* Hero Section */}
        <section className="showcase__hero" aria-labelledby="showcase-title">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <Badge variant="liquid-glass">Carbon v2.0</Badge>
              <Badge variant="sand">Pure Black #000000</Badge>
              <PulseMarker tone="crimson" />
            </div>
            <H1 id="showcase-title">
              Pure Black. Carbon Depth. Liquid Glass.
            </H1>
            <Lead>
              Refactored design system combining pure black canvas with configurable matrix layouts, carbon fiber surfaces, and crystal transparent liquid glass components.
            </Lead>
            <div className="showcase__hero-actions">
              <Button
                leadingIcon={<Sparkle size={17} weight="bold" />}
                onClick={() => setDialogOpen(true)}
                size="lg"
                variant="liquid-glass"
              >
                Liquid Glass Dialog
              </Button>
              <Button
                onClick={() => setSheetOpen(true)}
                size="lg"
                trailingIcon={<ArrowRight size={17} weight="bold" />}
                variant="solid"
              >
                Open Carbon Sheet
              </Button>
            </div>
          </div>

          <div>
            <GlassCard
              description="Real-time multi-chain settlement engine."
              footer={
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span>Latency: 280ms</span>
                  <Badge variant="crimson">ZK Active</Badge>
                </div>
              }
              title="Liquid Engine"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Large>$34.8M TVL</Large>
                  <Small className="metron-typography-muted">+14.2%</Small>
                </div>
                <Progress label="Route Liquidity" tone="accent" value={78} />
                <Sparkline data={[24, 32, 28, 45, 52, 48, 65, 78]} height={48} width={260} />
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Interactive Background Configurator Toolbar */}
        <div className="showcase__configurator">
          <div className="showcase__config-group">
            <span className="showcase__config-label">Background:</span>
            <ButtonGroup spacing="attached">
              {(["dots", "grid", "cross", "mesh", "none"] as const).map((pat) => (
                <Button
                  key={pat}
                  onClick={() => setBgPattern(pat)}
                  size="sm"
                  variant={bgPattern === pat ? "solid" : "glass"}
                >
                  {pat}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="showcase__config-group">
            <span className="showcase__config-label">Glow:</span>
            <ButtonGroup spacing="attached">
              {(["none", "center", "crimson", "sand", "dual"] as const).map((g) => (
                <Button
                  key={g}
                  onClick={() => setBgGlow(g)}
                  size="sm"
                  variant={bgGlow === g ? "solid" : "glass"}
                >
                  {g}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="showcase__config-group">
            <span className="showcase__config-label">Mask:</span>
            <ButtonGroup spacing="attached">
              {(["radial", "top", "fade", "none"] as const).map((m) => (
                <Button
                  key={m}
                  onClick={() => setBgMask(m)}
                  size="sm"
                  variant={bgMask === m ? "solid" : "glass"}
                >
                  {m}
                </Button>
              ))}
            </ButtonGroup>
          </div>

          <div className="showcase__config-group" style={{ minWidth: "140px" }}>
            <span className="showcase__config-label">Density ({bgSize}px):</span>
            <Slider
              defaultValue={[bgSize]}
              max={64}
              min={16}
              onValueChange={(val) => val[0] && setBgSize(val[0])}
            />
          </div>
        </div>

        {/* Global Toast Preview */}
        {toastVisible && (
          <div style={{ marginBottom: "1.5rem" }}>
            <Toast
              action={{ label: "Dismiss", onClick: () => setToastVisible(false) }}
              title="Liquid glass system operational"
              variant="success"
            >
              Background switched to pure black #000000 with interactive matrix configuration.
            </Toast>
          </div>
        )}

        {/* Main Component Showcase Tabs */}
        <div className="showcase__tabs-container">
          <Tabs defaultValue="surfaces" onValueChange={setActiveTab} value={activeTab}>
            <TabsList>
              <TabsTrigger value="surfaces">1. Surfaces & Layout</TabsTrigger>
              <TabsTrigger value="controls">2. Inputs & Controls</TabsTrigger>
              <TabsTrigger value="overlays">3. Navigation & Overlays</TabsTrigger>
              <TabsTrigger value="data">4. Data, Tables & Charts</TabsTrigger>
              <TabsTrigger value="ai">5. AI & Interactive Chat</TabsTrigger>
            </TabsList>

            {/* TAB 1: SURFACES & LAYOUT */}
            <TabsContent value="surfaces">
              <div className="showcase__grid">
                {/* Standard Shadcn Card with Liquid Glass */}
                <div className="showcase__cell">
                  <Card glow variant="liquid-glass">
                    <CardHeader>
                      <CardTitle>Liquid Glass Card</CardTitle>
                      <CardDescription>
                        Multi-layer refraction with SVG noise turbulence and frosted blur.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <P>
                        Card surface built from carbon black tones (<InlineCode>#0c0c0e</InlineCode>) with rim reflections.
                      </P>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <Button size="sm" variant="liquid-glass">Inspect Glass</Button>
                        <Button size="sm" variant="outline">Outline</Button>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Small className="metron-typography-muted">Status: Active</Small>
                    </CardFooter>
                  </Card>
                </div>

                {/* Carbon Black Card */}
                <div className="showcase__cell">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Carbon Black Card</CardTitle>
                      <CardDescription>
                        Deep carbon structure with high-contrast pearl typography.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>Shield Integrity</span>
                        <Badge variant="sand">99.98%</Badge>
                      </div>
                      <Separator style={{ margin: "1rem 0" }} />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>Multi-Sig Quorum</span>
                        <Badge variant="crimson">4 / 5</Badge>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button fullWidth size="sm" variant="secondary">Manage Vault</Button>
                    </CardFooter>
                  </Card>
                </div>

                {/* MetricCard & Accordion */}
                <div className="showcase__cell">
                  <MetricCard
                    change="+24.6%"
                    changeTone="positive"
                    icon={<TrendUp size={16} />}
                    label="Route Efficiency"
                    value="99.4%"
                  />
                  <div style={{ marginTop: "1rem" }}>
                    <Accordion defaultValue="item-1" type="single">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>What is Liquid Glass?</AccordionTrigger>
                        <AccordionContent>
                          A layered optical surface that pairs backdrop diffusion with dynamic specular reflections and carbon depth.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>Pure Black Canvas</AccordionTrigger>
                        <AccordionContent>
                          The root canvas renders in #000000, eliminating grey halos for OLED contrast and high visual luxury.
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>

                {/* Collapsible, Resizable & Drawer preview */}
                <div className="showcase__cell showcase__cell--wide">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Modals, Drawers & Sheet Panels</CardTitle>
                      <CardDescription>
                        Full coverage of Shadcn dialog, alert dialog, drawer, and slide-over sheets.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        <AlertDialog onOpenChange={setAlertOpen} open={alertOpen}>
                          <AlertDialogTrigger className="metron-button metron-button--danger metron-button--md">
                            Open Alert Dialog
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Execute Emergency Hedging?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action commits an irreversible hedge order across collateral pools.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction>Confirm Execution</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button onClick={() => setDrawerOpen(true)} variant="liquid-glass">
                          Open Bottom Drawer
                        </Button>

                        <Button onClick={() => setSheetOpen(true)} variant="glass">
                          Open Slide Sheet
                        </Button>

                        <Collapsible>
                          <CollapsibleTrigger>
                            <Button variant="secondary">Toggle Details</Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(242,241,237,0.04)", borderRadius: "0.5rem" }}>
                            Collapsible content expanded smoothly with pure CSS transitions.
                          </CollapsibleContent>
                        </Collapsible>
                      </div>

                      {/* Resizable Panel Group Preview */}
                      <div style={{ height: "140px", marginTop: "1.5rem", border: "1px solid var(--metron-border)", borderRadius: "0.75rem" }}>
                        <ResizablePanelGroup direction="horizontal">
                          <ResizablePanel defaultSize={50}>
                            <div style={{ padding: "1rem", height: "100%", background: "rgba(14,14,18,0.5)" }}>
                              <strong>Panel A (50%)</strong>
                              <P className="metron-typography-small">Drag handle to resize.</P>
                            </div>
                          </ResizablePanel>
                          <ResizableHandle />
                          <ResizablePanel defaultSize={50}>
                            <div style={{ padding: "1rem", height: "100%", background: "rgba(18,18,24,0.5)" }}>
                              <strong>Panel B (50%)</strong>
                              <P className="metron-typography-small">Liquid glass border.</P>
                            </div>
                          </ResizablePanel>
                        </ResizablePanelGroup>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: INPUTS & CONTROLS */}
            <TabsContent value="controls">
              <div className="showcase__grid">
                {/* Button Gallery */}
                <div className="showcase__cell showcase__cell--full">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Configurable Button Palette</CardTitle>
                      <CardDescription>
                        Solid crimson, sand, secondary carbon, and crystal liquid glass buttons with full interactive states.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                        <Button variant="liquid-glass">Liquid Glass</Button>
                        <Button variant="solid">Solid Crimson</Button>
                        <Button variant="sand">Solid Sand</Button>
                        <Button variant="secondary">Secondary Carbon</Button>
                        <Button variant="glass">Glass</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="quiet">Quiet</Button>
                        <Button variant="danger">Destructive</Button>
                        <Button variant="link">Underline Link</Button>
                        <Button loading variant="solid">Loading</Button>
                      </div>

                      <Separator style={{ margin: "1.25rem 0" }} />

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
                        <div>
                          <Label style={{ display: "block", marginBottom: "0.5rem" }}>Connected Button Group</Label>
                          <ButtonGroup spacing="attached">
                            <Button variant="glass">Years</Button>
                            <Button variant="solid">Months</Button>
                            <Button variant="glass">Days</Button>
                          </ButtonGroup>
                        </div>

                        <div>
                          <Label style={{ display: "block", marginBottom: "0.5rem" }}>Toggle Group</Label>
                          <ToggleGroup defaultValue="grid" type="single">
                            <ToggleGroupItem value="list">List</ToggleGroupItem>
                            <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
                            <ToggleGroupItem value="chart">Chart</ToggleGroupItem>
                          </ToggleGroup>
                        </div>

                        <div>
                          <Label style={{ display: "block", marginBottom: "0.5rem" }}>Single Toggle</Label>
                          <Toggle defaultPressed>Pinned</Toggle>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Form Controls */}
                <div className="showcase__cell">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Fields & Inputs</CardTitle>
                      <CardDescription>Input with addons, OTP slots, and native controls.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Field description="Enter solver verification code" label="One-Time Password (OTP)" required>
                        <InputOTP maxLength={6} />
                      </Field>

                      <div style={{ marginTop: "1rem" }}>
                        <Label required>Input with Group Addons</Label>
                        <InputGroup style={{ marginTop: "0.35rem" }}>
                          <InputGroupAddon>https://</InputGroupAddon>
                          <Input placeholder="solver.metron.network" />
                          <InputGroupAddon>.eth</InputGroupAddon>
                        </InputGroup>
                      </div>

                      <div style={{ marginTop: "1rem" }}>
                        <Label>Combobox Searchable Select</Label>
                        <Combobox
                          items={comboboxItems}
                          onValueChange={setSelectedCombobox}
                          value={selectedCombobox}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Checkbox, Radio, Switch, Slider */}
                <div className="showcase__cell">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Selection Controls</CardTitle>
                      <CardDescription>Checkboxes, radio options, switches, and range sliders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                        <Switch checked={switchState} onCheckedChange={setSwitchState} />
                        <Label>Zero-Knowledge Route Obfuscation</Label>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                        <Checkbox defaultChecked id="cb1" />
                        <Label htmlFor="cb1">Auto-rebalance collateral below 120% ratio</Label>
                      </div>

                      <Label style={{ display: "block", marginBottom: "0.5rem" }}>Liquidity Pool Routing</Label>
                      <RadioGroup defaultValue="primary">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <RadioGroupItem id="r1" value="primary" />
                          <Label htmlFor="r1">Primary Aave V3 Liquidity</Label>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <RadioGroupItem id="r2" value="secondary" />
                          <Label htmlFor="r2">Secondary Uniswap V3 concentrated mesh</Label>
                        </div>
                      </RadioGroup>

                      <div style={{ marginTop: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                          <Label>Max Slippage Tolerance</Label>
                          <span style={{ fontFamily: "var(--metron-font-mono)", fontSize: "0.85rem" }}>{sliderValue[0]} bps</span>
                        </div>
                        <Slider
                          max={100}
                          min={5}
                          onValueChange={setSliderValue}
                          value={sliderValue}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: NAVIGATION & OVERLAYS */}
            <TabsContent value="overlays">
              <div className="showcase__grid">
                <div className="showcase__cell showcase__cell--full">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Navigation Menus, Popovers & Context Tools</CardTitle>
                      <CardDescription>
                        Complete suite including Breadcrumb, Menubar, Navigation Menu, Popover, Tooltip, and Context Menu.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Breadcrumb style={{ marginBottom: "1.5rem" }}>
                        <BreadcrumbList>
                          <BreadcrumbItem>
                            <BreadcrumbLink href="#overview">Metron</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbLink href="#surfaces">Protocol</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage>Liquid Glass Registry</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>

                      {/* Menubar */}
                      <Menubar style={{ marginBottom: "1.5rem" }}>
                        <MenubarMenu value="file">
                          <MenubarTrigger>Registry</MenubarTrigger>
                          <MenubarContent>
                            <MenubarItem>New Intent <MenubarShortcut>⌘N</MenubarShortcut></MenubarItem>
                            <MenubarItem>Open Contract <MenubarShortcut>⌘O</MenubarShortcut></MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem>Export ABI <MenubarShortcut>⇧⌘E</MenubarShortcut></MenubarItem>
                          </MenubarContent>
                        </MenubarMenu>
                        <MenubarMenu value="edit">
                          <MenubarTrigger>Solvers</MenubarTrigger>
                          <MenubarContent>
                            <MenubarItem>Run Verification</MenubarItem>
                            <MenubarItem>Benchmark Routes</MenubarItem>
                          </MenubarContent>
                        </MenubarMenu>
                        <MenubarMenu value="view">
                          <MenubarTrigger>Surfaces</MenubarTrigger>
                          <MenubarContent>
                            <MenubarItem>Liquid Glass Mode</MenubarItem>
                            <MenubarItem>Pure Black Canvas</MenubarItem>
                          </MenubarContent>
                        </MenubarMenu>
                      </Menubar>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
                        {/* Popover */}
                        <Popover>
                          <PopoverTrigger className="metron-button metron-button--glass metron-button--md">
                            Open Liquid Popover
                          </PopoverTrigger>
                          <PopoverContent>
                            <H4>Popover Configuration</H4>
                            <P className="metron-typography-small">
                              Backdrop frosted glass with specular top rim highlight.
                            </P>
                            <Button size="sm" variant="solid">Apply Filter</Button>
                          </PopoverContent>
                        </Popover>

                        {/* Tooltip */}
                        <Tooltip content="Deterministic ZK Intent Verifier">
                          <Button variant="outline">Hover for Tooltip</Button>
                        </Tooltip>

                        {/* Hover Card */}
                        <HoverCard>
                          <HoverCardTrigger>
                            <Button variant="secondary">Hover for Profile Card</Button>
                          </HoverCardTrigger>
                          <HoverCardContent>
                            <div style={{ display: "flex", gap: "0.75rem" }}>
                              <Avatar size="sm">
                                <AvatarFallback>ZK</AvatarFallback>
                              </Avatar>
                              <div>
                                <strong>Metron Solver Node #42</strong>
                                <P className="metron-typography-small" style={{ margin: "0.25rem 0 0" }}>
                                  Verified on Arbitrum L2, uptime 99.99%.
                                </P>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>

                        {/* Context Menu Target */}
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <div
                              style={{
                                padding: "1rem 1.5rem",
                                border: "1px dashed var(--metron-border-strong)",
                                borderRadius: "0.5rem",
                                background: "rgba(242,241,237,0.03)",
                                cursor: "context-menu",
                              }}
                            >
                              Right click inside this container for Context Menu
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem>Back</ContextMenuItem>
                            <ContextMenuItem>Forward</ContextMenuItem>
                            <ContextMenuItem>Reload Node</ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem>Inspect Proof <ContextMenuShortcut>⌥⌘I</ContextMenuShortcut></ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: DATA, TABLES & CHARTS */}
            <TabsContent value="data">
              <div className="showcase__grid">
                {/* Data Table */}
                <div className="showcase__cell showcase__cell--full">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Sortable Data Table & Settlement Ledger</CardTitle>
                      <CardDescription>
                        Interactive table component with column sorting, paging, and glass rows.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={[
                          { key: "id", header: "Transaction", cell: (d) => <strong>{String(d.id)}</strong>, sortable: true },
                          { key: "route", header: "Cross-Chain Route", cell: (d) => String(d.route), sortable: true },
                          { key: "volume", header: "Committed Volume", cell: (d) => <span style={{ fontFamily: "var(--metron-font-mono)" }}>{String(d.volume)}</span>, sortable: true },
                          { key: "solver", header: "Assigned Solver", cell: (d) => <Badge variant="sand">{String(d.solver)}</Badge> },
                          {
                            key: "status",
                            header: "Status",
                            cell: (d) => (
                              <Badge variant={d.status === "Settled" ? "success" : d.status === "Routing" ? "accent" : "warning"}>
                                {String(d.status)}
                              </Badge>
                            ),
                          },
                        ]}
                        data={tableDemoData}
                        pageSize={4}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Gallery */}
                <div className="showcase__cell">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Multi-Chain Volume Metrics</CardTitle>
                      <CardDescription>Clean SVG visualizations with carbon glass borders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarChart
                        data={[
                          { label: "Mon", value: 34 },
                          { label: "Tue", value: 58 },
                          { label: "Wed", value: 72 },
                          { label: "Thu", value: 89 },
                          { label: "Fri", value: 64 },
                          { label: "Sat", value: 92 },
                          { label: "Sun", value: 110 },
                        ]}
                        height={140}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Calendar & Date Picker */}
                <div className="showcase__cell">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Calendar & Date Picker</CardTitle>
                      <CardDescription>Selectable month and day scheduling interface.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
                        <DatePicker onValueChange={setDateValue} value={dateValue} />
                        <Calendar onValueChange={setDateValue} value={dateValue} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Carousel & Badges */}
                <div className="showcase__cell showcase__cell--wide">
                  <Card variant="carbon">
                    <CardHeader>
                      <CardTitle>Carousel & Component Gallery</CardTitle>
                      <CardDescription>Smooth scroll snap carousel with carbon glass item chips.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Carousel>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <CarouselPrevious />
                          <CarouselNext />
                        </div>
                        <CarouselContent>
                          <CarouselItem style={{ flex: "0 0 45%" }}>
                            <Item>
                              <ItemMedia><LockKey size={24} color="var(--metron-sand)" /></ItemMedia>
                              <ItemContent>
                                <ItemTitle>Zero-Knowledge Rollup</ItemTitle>
                                <ItemDescription>ZK validity verified on L1 mainnet.</ItemDescription>
                              </ItemContent>
                            </Item>
                          </CarouselItem>
                          <CarouselItem style={{ flex: "0 0 45%" }}>
                            <Item>
                              <ItemMedia><Lightning size={24} color="var(--metron-crimson-bright)" /></ItemMedia>
                              <ItemContent>
                                <ItemTitle>Flash Solver Relay</ItemTitle>
                                <ItemDescription>Sub-second cross-chain intent clearing.</ItemDescription>
                              </ItemContent>
                            </Item>
                          </CarouselItem>
                          <CarouselItem style={{ flex: "0 0 45%" }}>
                            <Item>
                              <ItemMedia><ShieldCheck size={24} color="var(--metron-pearl)" /></ItemMedia>
                              <ItemContent>
                                <ItemTitle>Vault Invariance</ItemTitle>
                                <ItemDescription>Mathematical balance guarantees.</ItemDescription>
                              </ItemContent>
                            </Item>
                          </CarouselItem>
                        </CarouselContent>
                      </Carousel>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: AI & INTERACTIVE CHAT */}
            <TabsContent value="ai">
              <div className="showcase__grid">
                {/* Chat Stream & Bubbles (Simulating AI SDK useChat) */}
                <div className="showcase__cell showcase__cell--wide">
                  <Card glow style={{ minHeight: "420px", display: "flex", flexDirection: "column" }} variant="liquid-glass">
                    <CardHeader>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <CardTitle>Metron AI SDK Chat Streaming</CardTitle>
                          <CardDescription>
                            Real-time streaming simulation using transparent liquid glass bubbles.
                          </CardDescription>
                        </div>
                        <Badge variant="crimson">AI SDK Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ height: "260px", border: "1px solid var(--metron-carbon-border)", borderRadius: "0.75rem", overflow: "hidden", background: "rgba(8,8,10,0.6)" }}>
                        <MessageScroller>
                          {chatMessages.map((msg, idx) => (
                            <Message
                              key={idx}
                              avatar={
                                msg.role === "assistant" ? (
                                  <Avatar size="sm">
                                    <AvatarFallback>AI</AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <Avatar size="sm">
                                    <AvatarFallback>YOU</AvatarFallback>
                                  </Avatar>
                                )
                              }
                              role={msg.role}
                            >
                              <MessageHeader>
                                <strong>{msg.role === "assistant" ? "Metron Assistant" : "Operator"}</strong>
                                <MessageTimestamp>{msg.time}</MessageTimestamp>
                              </MessageHeader>
                              <Bubble variant={msg.role === "assistant" ? "liquid-glass" : "user"}>
                                {msg.text}
                              </Bubble>
                            </Message>
                          ))}
                        </MessageScroller>
                      </div>

                      {/* Chat Input Bar */}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <Input
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                          placeholder="Ask Metron AI to simulate a route, optimize collateral, or sign intent..."
                          value={inputMessage}
                        />
                        <Button onClick={handleSendChat} variant="solid">
                          Send
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Questionnaire & Attachments */}
                <div className="showcase__cell">
                  <Questionnaire
                    stepIndicator="Step 1 of 3"
                    title="Select Intent Optimization Priority"
                  >
                    <QuestionnaireOption
                      onClick={() => setSurveyAnswer("speed")}
                      selected={surveyAnswer === "speed"}
                    >
                      ⚡ Minimum Execution Latency (&lt; 500ms)
                    </QuestionnaireOption>
                    <QuestionnaireOption
                      onClick={() => setSurveyAnswer("cost")}
                      selected={surveyAnswer === "cost"}
                    >
                      💰 Maximum Yield &amp; Minimal Gas Slippage
                    </QuestionnaireOption>
                    <QuestionnaireOption
                      onClick={() => setSurveyAnswer("security")}
                      selected={surveyAnswer === "security"}
                    >
                      🛡️ Strict ZK-SNARK Mathematical Verification
                    </QuestionnaireOption>
                  </Questionnaire>

                  <div style={{ marginTop: "1rem" }}>
                    <Attachment
                      action={<Button size="sm" variant="quiet">View</Button>}
                      name="intent-commitment-0x9a8f.zk"
                      size="42.8 KB"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Global Slide-Over Sheet Preview */}
        {sheetOpen && (
          <Sheet onOpenChange={setSheetOpen} open={sheetOpen}>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Carbon Sheet Inspector</SheetTitle>
                <SheetDescription>
                  Side sheet overlay with pure black backdrop blur and carbon panel.
                </SheetDescription>
              </SheetHeader>
              <div style={{ padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Item>
                  <ItemMedia><FileCode size={20} color="var(--metron-sand)" /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>Registry Manifest</ItemTitle>
                    <ItemDescription>64 Shadcn components with Liquid Glass.</ItemDescription>
                  </ItemContent>
                </Item>
                <Item>
                  <ItemMedia><Gear size={20} color="var(--metron-pearl)" /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>Theme Settings</ItemTitle>
                    <ItemDescription>Pure Black background active.</ItemDescription>
                  </ItemContent>
                </Item>
              </div>
              <SheetFooter>
                <SheetClose>Close Panel</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}

        {/* Bottom Drawer Preview */}
        {drawerOpen && (
          <Drawer onOpenChange={setDrawerOpen} open={drawerOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Bottom Pull Drawer</DrawerTitle>
                <DrawerDescription>Mobile-friendly bottom drawer with grab handle.</DrawerDescription>
              </DrawerHeader>
              <div style={{ padding: "1rem 0" }}>
                <P>Drag handle or tap close to dismiss.</P>
              </div>
              <DrawerFooter>
                <DrawerClose>Dismiss Drawer</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}

        {/* Command Palette Modal Preview */}
        <CommandDialog onOpenChange={setCommandOpen} open={commandOpen}>
          <CommandInput icon={<MagnifyingGlass size={18} />} placeholder="Search registry components, solvers, routes..." />
          <CommandList>
            <CommandEmpty>No components or solvers match your query.</CommandEmpty>
            <CommandGroup heading="Components">
              <CommandItem onSelect={() => { setActiveTab("surfaces"); setCommandOpen(false); }}>
                <span>Liquid Glass Cards</span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => { setActiveTab("controls"); setCommandOpen(false); }}>
                <span>Solid &amp; Glass Buttons</span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => { setActiveTab("ai"); setCommandOpen(false); }}>
                <span>AI SDK Chat Streamer</span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Protocol Solvers">
              <CommandItem onSelect={() => setCommandOpen(false)}>
                <span>Arbitrum ZK Intent Engine</span>
              </CommandItem>
              <CommandItem onSelect={() => setCommandOpen(false)}>
                <span>Base Cross-Chain Fast Settle</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {/* Dialog Modal Preview */}
        {dialogOpen && (
          <Dialog
            onClose={() => setDialogOpen(false)}
            open={dialogOpen}
            title="Liquid Glass Specification"
          >
            <DialogBody>
              <P>
                This dialog uses the transparent liquid glass material, refractive rim, and carbon black surface tokens.
              </P>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <Kbd>ESC</Kbd>
                <span className="metron-typography-small metron-typography-muted">to close</span>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setDialogOpen(false)} variant="glass">
                Close
              </Button>
              <Button onClick={() => setDialogOpen(false)} variant="solid">
                Confirm
              </Button>
            </DialogFooter>
          </Dialog>
        )}
      </div>
    </BackgroundLayout>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
