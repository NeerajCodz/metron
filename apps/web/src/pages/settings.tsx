import { useState, type ReactNode } from "react";
import {
  Activity,
  Bell,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Fingerprint,
  Globe2,
  KeyRound,
  Link2,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Network,
  PlugZap,
  Radio,
  RefreshCw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Wallet,
  WalletCards,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  DataList,
  DataListItem,
  Field,
  GlassCard,
  InlineAlert,
  Input,
  Select,
  Switch,
} from "@metron/ui";

type SettingsTab =
  | "general"
  | "wallet"
  | "security"
  | "privacy"
  | "notifications"
  | "automation"
  | "protocols"
  | "chains";

type SettingsState = {
  theme: "system" | "dark" | "light";
  currency: "USD" | "EUR" | "GBP";
  timezone: string;
  compactMode: boolean;
  showNetWorth: boolean;
  walletLabel: string;
  preferredWallet: "browser" | "ledger" | "safe";
  sessionDuration: "15" | "60" | "240" | "never";
  requireSimulation: boolean;
  passkeys: boolean;
  twoFactor: boolean;
  transactionAlerts: boolean;
  addressAlerts: boolean;
  signOutInactive: boolean;
  analytics: boolean;
  publicProfile: boolean;
  crashReports: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  notificationThreshold: "100" | "1000" | "10000";
  automationEnabled: boolean;
  automationApprovals: boolean;
  maxGas: string;
  defaultSlippage: string;
  mevProtection: boolean;
  aave: boolean;
  uniswap: boolean;
  morpho: boolean;
  curve: boolean;
  ethereum: boolean;
  arbitrum: boolean;
  base: boolean;
  optimism: boolean;
  polygon: boolean;
};

type BooleanSetting = {
  [K in keyof SettingsState]: SettingsState[K] extends boolean ? K : never;
}[keyof SettingsState];

const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: ReactNode }> = [
  { id: "general", label: "General", description: "Display and account defaults", icon: <Settings2 size={16} /> },
  { id: "wallet", label: "Wallet", description: "Connected accounts and signing", icon: <WalletCards size={16} /> },
  { id: "security", label: "Security", description: "Sign-in and transaction safety", icon: <ShieldCheck size={16} /> },
  { id: "privacy", label: "Privacy", description: "Data and visibility controls", icon: <EyeOff size={16} /> },
  { id: "notifications", label: "Notifications", description: "Alerts and delivery", icon: <Bell size={16} /> },
  { id: "automation", label: "Automation", description: "Rules and execution limits", icon: <Bot size={16} /> },
  { id: "protocols", label: "Protocols", description: "Protocol access and permissions", icon: <Network size={16} /> },
  { id: "chains", label: "Chains", description: "Networks and RPC health", icon: <Globe2 size={16} /> },
];

const initialSettings: SettingsState = {
  theme: "dark",
  currency: "USD",
  timezone: "UTC",
  compactMode: false,
  showNetWorth: true,
  walletLabel: "Treasury operator",
  preferredWallet: "browser",
  sessionDuration: "60",
  requireSimulation: true,
  passkeys: true,
  twoFactor: true,
  transactionAlerts: true,
  addressAlerts: true,
  signOutInactive: true,
  analytics: false,
  publicProfile: false,
  crashReports: true,
  emailNotifications: true,
  pushNotifications: true,
  weeklyDigest: false,
  notificationThreshold: "1000",
  automationEnabled: true,
  automationApprovals: true,
  maxGas: "42",
  defaultSlippage: "0.50",
  mevProtection: true,
  aave: true,
  uniswap: true,
  morpho: true,
  curve: false,
  ethereum: true,
  arbitrum: true,
  base: true,
  optimism: false,
  polygon: false,
};

const protocolRows = [
  { key: "aave" as const, name: "Aave v3", detail: "Lending and borrowing", risk: "Low", volume: "$1.84M", icon: <Database size={18} /> },
  { key: "uniswap" as const, name: "Uniswap", detail: "Spot swaps and routing", risk: "Low", volume: "$924K", icon: <RefreshCw size={18} /> },
  { key: "morpho" as const, name: "Morpho", detail: "Optimized lending markets", risk: "Medium", volume: "$416K", icon: <Activity size={18} /> },
  { key: "curve" as const, name: "Curve", detail: "Stable asset liquidity", risk: "Medium", volume: "$98K", icon: <SlidersHorizontal size={18} /> },
];

const chainRows = [
  { key: "ethereum" as const, name: "Ethereum", symbol: "ETH", detail: "Mainnet", latency: "38 ms", block: "22,891,403", status: "Operational", icon: <Zap size={18} /> },
  { key: "arbitrum" as const, name: "Arbitrum One", symbol: "ARB", detail: "Rollup", latency: "21 ms", block: "358,114,220", status: "Operational", icon: <Network size={18} /> },
  { key: "base" as const, name: "Base", symbol: "ETH", detail: "Rollup", latency: "26 ms", block: "32,902,114", status: "Operational", icon: <PlugZap size={18} /> },
  { key: "optimism" as const, name: "Optimism", symbol: "OP", detail: "Rollup", latency: "64 ms", block: "129,442,083", status: "Degraded", icon: <CircleAlert size={18} /> },
  { key: "polygon" as const, name: "Polygon", symbol: "POL", detail: "Sidechain", latency: "52 ms", block: "61,729,110", status: "Operational", icon: <Server size={18} /> },
];

function SettingRow({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`web-page-settings__row ${className}`}>
      <div className="web-page-settings__row-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="web-page-settings__row-control">{children}</div>
    </div>
  );
}


function StatusLine({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "warning" | "neutral" }) {
  return (
    <span className={`web-page-settings__status web-page-settings__status--${tone}`}>
      <span className="web-page-settings__status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(true);
  const [copied, setCopied] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSavedAt(null);
  };

  const toggleSetting = (key: BooleanSetting) => {
    updateSetting(key, !settings[key]);
  };

  const handleSave = () => {
    setDirty(false);
    setSavedAt("just now");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("0x7A31...9D42");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleWalletAction = () => {
    if (walletConnected) {
      setWalletConnected(false);
      setWalletFeedback("Wallet disconnected. Local preferences are still available.");
    } else {
      setWalletConnected(true);
      setWalletFeedback("Wallet connected: 0x7A31...9D42");
    }
  };

  const renderGeneral = () => (
    <>
      <GlassCard className="web-page-settings__card" title="Workspace defaults" description="Shape the control room around how you monitor positions and act on risk.">
        <div className="web-page-settings__form-grid">
          <Field label="Interface theme" description="Choose the appearance used across Metron.">
            <Select value={settings.theme} onChange={(event) => updateSetting("theme", event.target.value as SettingsState["theme"])}>
              <option value="dark">Dark carbon</option>
              <option value="system">Use system setting</option>
              <option value="light">Light (preview)</option>
            </Select>
          </Field>
          <Field label="Display currency" description="Used for portfolio values and activity summaries.">
            <Select value={settings.currency} onChange={(event) => updateSetting("currency", event.target.value as SettingsState["currency"])}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
          </Field>
          <Field label="Timezone" description="Applied to automation windows and exports.">
            <Select value={settings.timezone} onChange={(event) => updateSetting("timezone", event.target.value)}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern time</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Singapore">Singapore</option>
            </Select>
          </Field>
          <Field label="Wallet label" description="A local name for the connected account.">
            <Input value={settings.walletLabel} onChange={(event) => updateSetting("walletLabel", event.target.value)} />
          </Field>
        </div>
        <div className="web-page-settings__rule" />
        <SettingRow title="Compact data density" description="Fit more rows into tables and activity feeds.">
          <Switch label="" aria-label="Compact data density" checked={settings.compactMode} onCheckedChange={() => toggleSetting("compactMode")} />
        </SettingRow>
        <SettingRow title="Show net worth in navigation" description="Keep your total balance visible beside the workspace switcher.">
          <Switch label="" aria-label="Show net worth in navigation" checked={settings.showNetWorth} onCheckedChange={() => toggleSetting("showNetWorth")} />
        </SettingRow>
      </GlassCard>
      <GlassCard className="web-page-settings__card" title="Operator profile" description="This profile stays local to your Metron workspace.">
        <DataList layout="responsive" className="web-page-settings__data-list">
          <DataListItem label="Workspace" value="Northstar treasury" description="Personal operator workspace" />
          <DataListItem label="Role" value="Execution lead" description="Can propose and sign transactions" />
          <DataListItem label="Last synced" value="17 Sep 2026, 14:42 UTC" description="All preferences are current" />
        </DataList>
      </GlassCard>
    </>
  );

  const renderWallet = () => (
    <>
      <GlassCard className="web-page-settings__wallet-card" title="Connected wallet" description="The active signer used for proposals, simulations, and execution.">
        {walletConnected ? (
          <>
            <div className="web-page-settings__wallet-hero">
              <div className="web-page-settings__wallet-mark" aria-hidden="true"><Wallet size={22} /></div>
              <div>
                <div className="web-page-settings__wallet-name">{settings.walletLabel}</div>
                <div className="web-page-settings__wallet-address">0x7A31...9D42</div>
              </div>
              <Badge variant="success" leadingIcon={<CircleCheck size={13} />}>Connected</Badge>
            </div>
            <div className="web-page-settings__wallet-meta">
              <div><span>Network</span><strong>Ethereum mainnet</strong></div>
              <div><span>Balance</span><strong>18.42 ETH</strong></div>
              <div><span>Last signature</span><strong>7 minutes ago</strong></div>
            </div>
            <div className="web-page-settings__wallet-actions">
              <Button variant="outline" size="sm" leadingIcon={copied ? <Check size={15} /> : <Copy size={15} />} onClick={() => void handleCopy()}>{copied ? "Copied" : "Copy address"}</Button>
              <Button variant="quiet" size="sm" leadingIcon={<ExternalLink size={15} />} href="https://etherscan.io" target="_blank" rel="noreferrer">View on explorer</Button>
              <Button variant="danger" size="sm" leadingIcon={<LogOut size={15} />} onClick={handleWalletAction}>Disconnect</Button>
            </div>
          </>
        ) : (
          <div className="web-page-settings__wallet-empty">
            <div className="web-page-settings__empty-icon"><WalletCards size={22} /></div>
            <div><h3>No wallet connected</h3><p>Connect a signer to propose or execute transactions. Your workspace remains readable while disconnected.</p></div>
            <Button variant="crimson" size="sm" leadingIcon={<Wallet size={15} />} onClick={handleWalletAction}>Connect wallet</Button>
          </div>
        )}
        {walletFeedback ? <InlineAlert className="web-page-settings__inline-alert" variant="info" icon={<CircleAlert size={17} />} title="Wallet status">{walletFeedback}</InlineAlert> : null}
      </GlassCard>
      <GlassCard className="web-page-settings__card" title="Signing preferences" description="Choose how Metron prepares a transaction before it reaches your wallet.">
        <div className="web-page-settings__form-grid">
          <Field label="Preferred signer" description="Used when more than one signing method is available.">
            <Select value={settings.preferredWallet} onChange={(event) => updateSetting("preferredWallet", event.target.value as SettingsState["preferredWallet"])}>
              <option value="browser">Browser wallet</option>
              <option value="ledger">Ledger hardware wallet</option>
              <option value="safe">Safe multisig</option>
            </Select>
          </Field>
          <Field label="Session duration" description="How long a connected wallet session can remain active.">
            <Select value={settings.sessionDuration} onChange={(event) => updateSetting("sessionDuration", event.target.value as SettingsState["sessionDuration"])}>
              <option value="15">15 minutes</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
              <option value="never">Until disconnected</option>
            </Select>
          </Field>
        </div>
        <div className="web-page-settings__rule" />
        <SettingRow title="Simulate before signing" description="Show balance deltas, approvals, and revert risk before opening the wallet.">
          <Switch label="" aria-label="Simulate before signing" checked={settings.requireSimulation} onCheckedChange={() => toggleSetting("requireSimulation")} />
        </SettingRow>
      </GlassCard>
    </>
  );

  const renderSecurity = () => (
    <>
      <InlineAlert className="web-page-settings__alert" variant="success" icon={<ShieldCheck size={17} />} title="Security posture: strong">Passkeys, two-factor authentication, and pre-sign simulations are active for this workspace.</InlineAlert>
      <GlassCard className="web-page-settings__card" title="Sign-in protection" description="Protect access to the operator console independently from wallet ownership.">
        <SettingRow title="Passkeys" description="Use a device-bound credential instead of a password when signing in.">
          <div className="web-page-settings__control-stack"><Badge variant="success" leadingIcon={<Fingerprint size={13} />}>2 enrolled</Badge><Switch label="" aria-label="Passkeys" checked={settings.passkeys} onCheckedChange={() => toggleSetting("passkeys")} /></div>
        </SettingRow>
        <SettingRow title="Two-factor authentication" description="Require an authenticator code for new devices and sensitive changes.">
          <div className="web-page-settings__control-stack"><Badge variant="success" leadingIcon={<Smartphone size={13} />}>Enabled</Badge><Switch label="" aria-label="Two-factor authentication" checked={settings.twoFactor} onCheckedChange={() => toggleSetting("twoFactor")} /></div>
        </SettingRow>
        <SettingRow title="Sign out inactive sessions" description="End web sessions after the duration selected in wallet preferences.">
          <Switch label="" aria-label="Sign out inactive sessions" checked={settings.signOutInactive} onCheckedChange={() => toggleSetting("signOutInactive")} />
        </SettingRow>
      </GlassCard>
      <GlassCard className="web-page-settings__card" title="Active sessions" description="Review where this workspace is currently open.">
        <div className="web-page-settings__session-list">
          <div className="web-page-settings__session"><div className="web-page-settings__session-icon"><Globe2 size={17} /></div><div><strong>Chrome on Windows</strong><span>Current session · London, UK · Seen now</span></div><Badge variant="success">Current</Badge></div>
          <div className="web-page-settings__session"><div className="web-page-settings__session-icon"><Smartphone size={17} /></div><div><strong>Metron mobile preview</strong><span>iPhone · Singapore · Seen 2 hours ago</span></div><Button variant="quiet" size="sm" onClick={() => setActionNotice("Mobile preview session revoked.")}>Revoke</Button></div>
        </div>
        <div className="web-page-settings__card-footer"><Button variant="outline" size="sm" leadingIcon={<LockKeyhole size={15} />} onClick={() => setActionNotice("All other web sessions were revoked.")}>Revoke all other sessions</Button></div>
      </GlassCard>
    </>
  );

  const renderPrivacy = () => (
    <>
      <GlassCard className="web-page-settings__card" title="Data controls" description="Choose what Metron stores and what stays only in this browser.">
        <SettingRow title="Product analytics" description="Share anonymous interaction data to help improve navigation and reliability.">
          <Switch label="" aria-label="Product analytics" checked={settings.analytics} onCheckedChange={() => toggleSetting("analytics")} />
        </SettingRow>
        <SettingRow title="Crash reports" description="Include anonymized diagnostics when a page or simulation fails.">
          <Switch label="" aria-label="Crash reports" checked={settings.crashReports} onCheckedChange={() => toggleSetting("crashReports")} />
        </SettingRow>
        <SettingRow title="Public operator profile" description="Allow approved collaborators to see your display name and workspace role.">
          <Switch label="" aria-label="Public operator profile" checked={settings.publicProfile} onCheckedChange={() => toggleSetting("publicProfile")} />
        </SettingRow>
      </GlassCard>
      <GlassCard className="web-page-settings__card" title="Local data" description="Metron uses local storage for drafts, filters, and non-custodial display preferences.">
        <div className="web-page-settings__privacy-callout"><div className="web-page-settings__section-icon"><Eye size={17} /></div><div><strong>Your keys never leave your signer.</strong><p>Metron cannot move funds without an explicit signature from your connected wallet or multisig.</p></div></div>
        <div className="web-page-settings__card-footer"><Button variant="outline" size="sm" leadingIcon={<Database size={15} />} onClick={() => setActionNotice("A local data export is ready to download.")}>Download local data</Button><Button variant="quiet" size="sm" leadingIcon={<RefreshCw size={15} />} onClick={() => setActionNotice("Cached views cleared. Live data will repopulate as you browse.")}>Clear cached views</Button></div>
      </GlassCard>
    </>
  );

  const renderNotifications = () => (
    <>
      <GlassCard className="web-page-settings__card" title="Alert delivery" description="Keep the important events close without turning every block into noise.">
        <SettingRow title="In-app transaction alerts" description="Show confirmation, failure, and approval alerts in the activity stream.">
          <Switch label="" aria-label="In-app transaction alerts" checked={settings.transactionAlerts} onCheckedChange={() => toggleSetting("transactionAlerts")} />
        </SettingRow>
        <SettingRow title="Address activity" description="Alert when a watched address receives or sends an asset.">
          <Switch label="" aria-label="Address activity" checked={settings.addressAlerts} onCheckedChange={() => toggleSetting("addressAlerts")} />
        </SettingRow>
        <SettingRow title="Email notifications" description="Send high-priority risk and execution events to the operator inbox.">
          <Switch label="" aria-label="Email notifications" checked={settings.emailNotifications} onCheckedChange={() => toggleSetting("emailNotifications")} />
        </SettingRow>
        <SettingRow title="Push notifications" description="Deliver urgent alerts to registered devices.">
          <Switch label="" aria-label="Push notifications" checked={settings.pushNotifications} onCheckedChange={() => toggleSetting("pushNotifications")} />
        </SettingRow>
      </GlassCard>
      <GlassCard className="web-page-settings__card" title="Notification threshold" description="Set the minimum value for balance and transfer alerts.">
        <div className="web-page-settings__form-grid web-page-settings__form-grid--single">
          <Field label="Minimum alert value" description="Alerts below this amount remain visible in activity but are not pushed.">
            <Select value={settings.notificationThreshold} onChange={(event) => updateSetting("notificationThreshold", event.target.value as SettingsState["notificationThreshold"])}>
              <option value="100">$100</option><option value="1000">$1,000</option><option value="10000">$10,000</option>
            </Select>
          </Field>
        </div>
        <div className="web-page-settings__rule" />
        <SettingRow title="Weekly digest" description="Receive a Monday summary of portfolio changes, risk, and automation runs.">
          <Switch label="" aria-label="Weekly digest" checked={settings.weeklyDigest} onCheckedChange={() => toggleSetting("weeklyDigest")} />
        </SettingRow>
      </GlassCard>
    </>
  );

  const renderAutomation = () => (
    <>
      <InlineAlert className="web-page-settings__alert" variant={settings.automationEnabled ? "success" : "warning"} icon={settings.automationEnabled ? <CircleCheck size={17} /> : <CircleAlert size={17} />} title={settings.automationEnabled ? "Automation is armed" : "Automation is paused"}>{settings.automationEnabled ? "Rules can submit transactions within the limits below." : "No automated rule can submit until you arm automation again."}</InlineAlert>
      <GlassCard className="web-page-settings__card" title="Execution guardrails" description="These limits apply to every automated strategy in the workspace.">
        <SettingRow title="Enable automation" description="Allow scheduled and event-driven rules to prepare transactions.">
          <Switch label="" aria-label="Enable automation" checked={settings.automationEnabled} onCheckedChange={() => toggleSetting("automationEnabled")} />
        </SettingRow>
        <SettingRow title="Require approval above limit" description="Pause the rule and request a signature when the transaction exceeds the limit.">
          <Switch label="" aria-label="Require approval above limit" checked={settings.automationApprovals} onCheckedChange={() => toggleSetting("automationApprovals")} />
        </SettingRow>
        <div className="web-page-settings__rule" />
        <div className="web-page-settings__form-grid">
          <Field label="Default slippage" description="Used when a strategy does not define its own tolerance.">
            <div className="web-page-settings__input-suffix"><Input value={settings.defaultSlippage} onChange={(event) => updateSetting("defaultSlippage", event.target.value)} inputMode="decimal" /><span>%</span></div>
          </Field>
          <Field label="Maximum gas price" description="Pause automated execution above this network fee.">
            <div className="web-page-settings__input-suffix"><Input value={settings.maxGas} onChange={(event) => updateSetting("maxGas", event.target.value)} inputMode="decimal" /><span>gwei</span></div>
          </Field>
        </div>
        <div className="web-page-settings__rule" />
        <SettingRow title="MEV protection" description="Route supported swaps through private orderflow when available.">
          <Switch label="" aria-label="MEV protection" checked={settings.mevProtection} onCheckedChange={() => toggleSetting("mevProtection")} />
        </SettingRow>
      </GlassCard>
      <GlassCard className="web-page-settings__card" title="Run window" description="Automations are evaluated continuously while the workspace is active.">
        <DataList layout="responsive" className="web-page-settings__data-list"><DataListItem label="Evaluation cadence" value="Every 30 seconds" description="Event triggers are debounced" /><DataListItem label="Quiet hours" value="23:00 to 06:00 UTC" description="Critical risk rules can still run" /><DataListItem label="Next scheduled run" value="In 12 minutes" description="Rebalance ETH / stables" /></DataList>
      </GlassCard>
    </>
  );

  const renderProtocols = () => (
    <>
      <InlineAlert className="web-page-settings__alert" variant="info" icon={<KeyRound size={17} />} title="Protocol permissions">Metron only requests the approvals needed for a selected action. Disabling a protocol removes it from new strategy routes.</InlineAlert>
      <GlassCard className="web-page-settings__card" title="Approved protocols" description="Control which integrations can be used by strategies and automations.">
        <div className="web-page-settings__integration-list">
          {protocolRows.map((protocol) => (
            <div className="web-page-settings__integration" key={protocol.key}>
              <div className="web-page-settings__integration-icon" aria-hidden="true">{protocol.icon}</div>
              <div className="web-page-settings__integration-copy"><div><strong>{protocol.name}</strong><Badge variant={protocol.risk === "Low" ? "success" : "warning"}>{protocol.risk} risk</Badge></div><span>{protocol.detail}</span></div>
              <div className="web-page-settings__integration-meta"><strong>{protocol.volume}</strong><span>30d routed</span></div>
              <Switch label="" aria-label={`Enable ${protocol.name}`} checked={settings[protocol.key]} onCheckedChange={() => toggleSetting(protocol.key)} />
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );

  const renderChains = () => (
    <>
      <GlassCard className="web-page-settings__card" title="Network access" description="Choose the chains available to portfolio views, routing, and automated execution.">
        <div className="web-page-settings__chain-list">
          {chainRows.map((chain) => (
            <div className="web-page-settings__chain" key={chain.key}>
              <div className={`web-page-settings__chain-icon web-page-settings__chain-icon--${chain.key}`} aria-hidden="true">{chain.icon}</div>
              <div className="web-page-settings__chain-copy"><div><strong>{chain.name}</strong><span>{chain.symbol} · {chain.detail}</span></div><StatusLine tone={chain.status === "Degraded" ? "warning" : "success"}>{chain.status}</StatusLine></div>
              <div className="web-page-settings__chain-health"><span><Clock3 size={13} />{chain.latency}</span><span>Block {chain.block}</span></div>
              <Switch label="" aria-label={`Enable ${chain.name}`} checked={settings[chain.key]} onCheckedChange={() => toggleSetting(chain.key)} />
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="web-page-settings__card" title="Custom RPC" description="Use a private endpoint for a supported chain when you need lower latency or higher limits.">
        <div className="web-page-settings__rpc-row"><div className="web-page-settings__rpc-icon"><Link2 size={17} /></div><div><strong>Alchemy shared endpoint</strong><span>Ethereum · Read-only health check</span></div><Badge variant="neutral">Default</Badge><Button variant="outline" size="sm" trailingIcon={<ChevronRight size={14} />} onClick={() => setActionNotice("RPC endpoint management is ready for this workspace.")}>Manage endpoints</Button></div>
      </GlassCard>
    </>
  );

  const renderTab = () => {
    switch (activeTab) {
      case "wallet": return renderWallet();
      case "security": return renderSecurity();
      case "privacy": return renderPrivacy();
      case "notifications": return renderNotifications();
      case "automation": return renderAutomation();
      case "protocols": return renderProtocols();
      case "chains": return renderChains();
      case "general": return renderGeneral();
    }
  };

  return (
    <div className="web-page-settings">
      <style>{styles}</style>
      <header className="web-page-settings__header">
        <div className="web-page-settings__title-block">
          <div className="web-page-settings__eyebrow"><Settings2 size={14} />Workspace control surface</div>
          <h1>Settings</h1>
          <p>Configure how Metron watches risk, prepares transactions, and keeps you informed.</p>
        </div>
        <div className="web-page-settings__header-actions">
          <span className={`web-page-settings__save-state ${dirty ? "web-page-settings__save-state--dirty" : ""}`} role="status">
            {dirty ? <><span className="web-page-settings__save-dot" />Unsaved changes</> : savedAt ? <><Check size={14} />Saved {savedAt}</> : <><CircleCheck size={14} />All changes saved</>}
          </span>
          <Button variant="crimson" size="md" leadingIcon={<Save size={16} />} onClick={handleSave} disabled={!dirty}>Save changes</Button>
        </div>
      </header>

      <div className="web-page-settings__workspace-strip">
        <div className="web-page-settings__workspace"><div className="web-page-settings__workspace-avatar">N</div><div><span>Workspace</span><strong>Northstar treasury</strong></div><ChevronRight size={15} aria-hidden="true" /></div>
        <div className="web-page-settings__strip-item"><span>Environment</span><strong><StatusLine>Production</StatusLine></strong></div>
        <div className="web-page-settings__strip-item"><span>Wallet</span><strong>{walletConnected ? "0x7A31...9D42" : "Disconnected"}</strong></div>
        <div className="web-page-settings__strip-item"><span>Last sync</span><strong>14:42 UTC</strong></div>
      </div>

      <div className="web-page-settings__layout">
        <nav className="web-page-settings__tabs" aria-label="Settings sections">
          <div className="web-page-settings__tabs-label">Workspace settings</div>
          {tabs.map((tab) => (
            <button className={`web-page-settings__tab ${activeTab === tab.id ? "web-page-settings__tab--active" : ""}`} type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? "page" : undefined}>
              <span className="web-page-settings__tab-icon" aria-hidden="true">{tab.icon}</span><span className="web-page-settings__tab-copy"><strong>{tab.label}</strong><small>{tab.description}</small></span><ChevronRight className="web-page-settings__tab-chevron" size={15} aria-hidden="true" />
            </button>
          ))}
          <div className="web-page-settings__tabs-footer"><div className="web-page-settings__support-icon"><MessageSquare size={15} /></div><div><strong>Need a hand?</strong><span>Read the operator guide</span></div><ExternalLink size={14} /></div>
        </nav>
        <main className="web-page-settings__content">
          <div className="web-page-settings__content-heading"><div><span className="web-page-settings__content-kicker">{tabs.find((tab) => tab.id === activeTab)?.description}</span><h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2></div><div className="web-page-settings__content-marker"><Radio size={13} />Live workspace</div></div>
          {actionNotice ? <InlineAlert className="web-page-settings__alert" variant="success" icon={<Check size={17} />} title="Action complete">{actionNotice}</InlineAlert> : null}
          {renderTab()}
        </main>
      </div>
    </div>
  );
}


const styles = `
.web-page-settings { --settings-ink: #f4f0e8; --settings-muted: #9e9d99; --settings-dim: #6f716f; --settings-line: rgba(255,255,255,.1); --settings-line-strong: rgba(255,255,255,.18); --settings-surface: rgba(19,20,20,.82); --settings-sand: #d7c6a5; --settings-crimson: #d04a4a; color: var(--settings-ink); max-width: 1440px; margin: 0 auto; padding: clamp(1.5rem, 3.6vw, 3.75rem) clamp(1rem, 4vw, 4.75rem) 5rem; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.web-page-settings__header { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; border-bottom: 1px solid var(--settings-line); padding-bottom: 1.65rem; }
.web-page-settings__title-block { max-width: 44rem; }
.web-page-settings__eyebrow, .web-page-settings__content-kicker, .web-page-settings__tabs-label { color: var(--settings-sand); font-size: .68rem; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
.web-page-settings__eyebrow { display: inline-flex; align-items: center; gap: .45rem; margin-bottom: .9rem; }
.web-page-settings__title-block h1 { margin: 0; font-size: clamp(2rem, 4vw, 3.45rem); letter-spacing: -.06em; font-weight: 600; line-height: .98; }
.web-page-settings__title-block p { margin: .85rem 0 0; color: var(--settings-muted); max-width: 35rem; font-size: .93rem; line-height: 1.55; }
.web-page-settings__header-actions { display: flex; align-items: center; gap: 1.1rem; flex-wrap: wrap; justify-content: flex-end; }
.web-page-settings__save-state { display: inline-flex; align-items: center; gap: .4rem; color: #9eb99d; font-size: .76rem; white-space: nowrap; }
.web-page-settings__save-dot { width: .42rem; height: .42rem; border-radius: 50%; background: var(--settings-sand); box-shadow: 0 0 0 .22rem rgba(215,198,165,.12); }
.web-page-settings__workspace-strip { display: grid; grid-template-columns: minmax(17rem, 1.6fr) repeat(3, minmax(9rem, .7fr)); border-bottom: 1px solid var(--settings-line); margin-bottom: 2.35rem; }
.web-page-settings__workspace, .web-page-settings__strip-item { min-height: 4.6rem; display: flex; align-items: center; gap: .75rem; border-right: 1px solid var(--settings-line); padding: 1rem 1.1rem; }
.web-page-settings__workspace { padding-left: 0; }
.web-page-settings__workspace-avatar { width: 2.05rem; height: 2.05rem; display: grid; place-items: center; color: #1c1b19; background: var(--settings-sand); font-weight: 800; font-size: .82rem; }
.web-page-settings__workspace > div:not(.web-page-settings__workspace-avatar), .web-page-settings__strip-item { flex-direction: column; align-items: flex-start; justify-content: center; gap: .2rem; }
.web-page-settings__workspace > svg { margin-left: auto; color: var(--settings-dim); }
.web-page-settings__workspace span, .web-page-settings__strip-item span { color: var(--settings-dim); font-size: .65rem; letter-spacing: .08em; text-transform: uppercase; }
.web-page-settings__workspace strong, .web-page-settings__strip-item strong { font-size: .79rem; font-weight: 600; }
.web-page-settings__layout { display: grid; grid-template-columns: minmax(14rem, 18.5rem) minmax(0, 1fr); align-items: start; gap: clamp(1.8rem, 4vw, 4.5rem); }
.web-page-settings__tabs { position: sticky; top: 1.5rem; display: flex; flex-direction: column; gap: .2rem; }
.web-page-settings__tabs-label { color: var(--settings-dim); margin-bottom: .55rem; padding-left: .65rem; }
.web-page-settings__tab { position: relative; display: grid; grid-template-columns: 1.3rem minmax(0, 1fr) auto; gap: .7rem; width: 100%; border: 1px solid transparent; background: transparent; color: var(--settings-muted); padding: .72rem .65rem; text-align: left; cursor: pointer; transition: background-color .16s ease, color .16s ease, border-color .16s ease; }
.web-page-settings__tab:hover { color: var(--settings-ink); background: rgba(255,255,255,.035); }
.web-page-settings__tab:focus-visible { outline: 2px solid var(--settings-sand); outline-offset: 2px; }
.web-page-settings__tab--active { color: var(--settings-ink); border-color: var(--settings-line-strong); background: rgba(208,74,74,.12); }
.web-page-settings__tab--active::before { position: absolute; content: ""; top: .45rem; bottom: .45rem; left: -.1rem; width: 2px; background: var(--settings-crimson); }
.web-page-settings__tab-icon { color: var(--settings-dim); padding-top: .12rem; }
.web-page-settings__tab--active .web-page-settings__tab-icon { color: var(--settings-sand); }
.web-page-settings__tab-copy { min-width: 0; display: flex; flex-direction: column; gap: .18rem; }
.web-page-settings__tab-copy strong { font-size: .81rem; font-weight: 600; }
.web-page-settings__tab-copy small { color: var(--settings-dim); font-size: .68rem; line-height: 1.3; }
.web-page-settings__tab-chevron { align-self: center; color: var(--settings-dim); opacity: .5; }
.web-page-settings__tabs-footer { display: flex; align-items: center; gap: .55rem; border-top: 1px solid var(--settings-line); margin-top: 1.25rem; padding: 1.2rem .65rem 0; color: var(--settings-dim); }
.web-page-settings__support-icon { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; color: var(--settings-sand); border: 1px solid var(--settings-line-strong); }
.web-page-settings__tabs-footer > div:not(.web-page-settings__support-icon) { display: flex; flex-direction: column; gap: .16rem; flex: 1; }
.web-page-settings__tabs-footer strong { color: var(--settings-muted); font-size: .72rem; font-weight: 600; }
.web-page-settings__tabs-footer span { font-size: .65rem; }
.web-page-settings__content { min-width: 0; }
.web-page-settings__content-heading { display: flex; justify-content: space-between; align-items: end; gap: 1rem; border-bottom: 1px solid var(--settings-line); padding-bottom: 1.2rem; margin-bottom: 1.35rem; }
.web-page-settings__content-kicker { display: block; color: var(--settings-dim); font-size: .65rem; margin-bottom: .32rem; letter-spacing: .08em; }
.web-page-settings__content-heading h2 { margin: 0; color: var(--settings-ink); font-size: 1.36rem; letter-spacing: -.035em; font-weight: 600; }
.web-page-settings__content-marker { display: inline-flex; align-items: center; gap: .4rem; color: #9eb99d; font-size: .68rem; white-space: nowrap; }
.web-page-settings__card { margin-bottom: 1rem; }
.web-page-settings__card :is(.metron-card__glass, .metron-card__surface) { border-radius: 0; }
.web-page-settings__card .metron-card__body, .web-page-settings__wallet-card .metron-card__body { padding: 1.3rem 1.35rem 1.4rem; }
.web-page-settings__form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.1rem 1.4rem; }
.web-page-settings__form-grid--single { max-width: 27rem; }
.web-page-settings__rule { height: 1px; background: var(--settings-line); margin: 1.3rem 0 0; }
.web-page-settings__row { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-height: 4.5rem; border-bottom: 1px solid var(--settings-line); padding: 1rem 0; }
.web-page-settings__row:last-child { border-bottom: 0; padding-bottom: .2rem; }
.web-page-settings__row-copy { min-width: 0; }
.web-page-settings__row-copy h3 { margin: 0 0 .28rem; color: var(--settings-ink); font-size: .82rem; font-weight: 600; }
.web-page-settings__row-copy p { max-width: 35rem; margin: 0; color: var(--settings-muted); font-size: .74rem; line-height: 1.45; }
.web-page-settings__row-control { flex: 0 0 auto; }
.web-page-settings__row-control .metron-switch { margin: 0; }
.web-page-settings__control-stack { display: flex; align-items: center; gap: .8rem; }
.web-page-settings__data-list { margin-top: -.45rem; }
.web-page-settings__data-list .metron-data-list__item { padding-block: .85rem; }
.web-page-settings__alert { margin-bottom: 1rem; }
.web-page-settings__wallet-card .metron-card__body { padding-top: 1.1rem; }
.web-page-settings__wallet-hero { display: flex; align-items: center; gap: .85rem; border-bottom: 1px solid var(--settings-line); padding-bottom: 1.2rem; }
.web-page-settings__wallet-mark { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; color: #1f1b17; background: var(--settings-sand); }
.web-page-settings__wallet-name { color: var(--settings-ink); font-size: .92rem; font-weight: 650; }
.web-page-settings__wallet-address { color: var(--settings-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .74rem; margin-top: .25rem; }
.web-page-settings__wallet-hero .metron-badge { margin-left: auto; }
.web-page-settings__wallet-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 1.2rem 0; }
.web-page-settings__wallet-meta div { display: flex; flex-direction: column; gap: .35rem; }
.web-page-settings__wallet-meta span { color: var(--settings-dim); font-size: .65rem; text-transform: uppercase; letter-spacing: .08em; }
.web-page-settings__wallet-meta strong { color: var(--settings-ink); font-size: .8rem; font-weight: 600; }
.web-page-settings__wallet-actions, .web-page-settings__card-footer { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
.web-page-settings__card-footer { border-top: 1px solid var(--settings-line); margin-top: 1.2rem; padding-top: 1rem; }
.web-page-settings__wallet-empty { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; padding: .35rem 0 .6rem; }
.web-page-settings__empty-icon { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; color: var(--settings-sand); border: 1px solid var(--settings-line-strong); }
.web-page-settings__wallet-empty h3 { margin: 0 0 .3rem; font-size: .86rem; }
.web-page-settings__wallet-empty p { margin: 0; color: var(--settings-muted); font-size: .75rem; line-height: 1.5; }
.web-page-settings__inline-alert { margin-top: 1rem; }
.web-page-settings__session-list { display: flex; flex-direction: column; }
.web-page-settings__session { display: flex; align-items: center; gap: .8rem; min-height: 3.85rem; border-bottom: 1px solid var(--settings-line); }
.web-page-settings__session:last-child { border-bottom: 0; }
.web-page-settings__session-icon { display: grid; place-items: center; width: 2rem; height: 2rem; color: var(--settings-sand); border: 1px solid var(--settings-line); }
.web-page-settings__session > div:nth-child(2) { display: flex; flex-direction: column; gap: .24rem; flex: 1; }
.web-page-settings__session strong { font-size: .78rem; font-weight: 600; }
.web-page-settings__session span { color: var(--settings-muted); font-size: .7rem; }
.web-page-settings__privacy-callout { display: flex; align-items: flex-start; gap: .8rem; padding: .95rem; border: 1px solid rgba(215,198,165,.2); background: rgba(215,198,165,.05); }
.web-page-settings__privacy-callout .web-page-settings__section-icon { flex: 0 0 auto; width: 1.9rem; height: 1.9rem; }
.web-page-settings__privacy-callout strong { font-size: .78rem; font-weight: 650; }
.web-page-settings__privacy-callout p { margin: .27rem 0 0; color: var(--settings-muted); font-size: .73rem; line-height: 1.45; }
.web-page-settings__input-suffix { position: relative; display: flex; align-items: center; }
.web-page-settings__input-suffix .metron-input { padding-right: 3.25rem; }
.web-page-settings__input-suffix span { position: absolute; right: .75rem; color: var(--settings-dim); font-size: .72rem; }
.web-page-settings__section-header { display: flex; align-items: flex-start; gap: .8rem; }
.web-page-settings__section-icon { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; color: var(--settings-sand); border: 1px solid var(--settings-line-strong); }
.web-page-settings__section-header h2 { margin: 0; font-size: .95rem; }
.web-page-settings__section-header p { margin: .25rem 0 0; color: var(--settings-muted); font-size: .73rem; }
.web-page-settings__integration-list, .web-page-settings__chain-list { display: flex; flex-direction: column; }
.web-page-settings__integration, .web-page-settings__chain { display: grid; align-items: center; gap: .8rem; border-bottom: 1px solid var(--settings-line); min-height: 4.55rem; }
.web-page-settings__integration { grid-template-columns: 2.2rem minmax(0, 1fr) 6rem auto; }
.web-page-settings__integration:last-child, .web-page-settings__chain:last-child { border-bottom: 0; }
.web-page-settings__integration-icon, .web-page-settings__chain-icon { display: grid; place-items: center; width: 2.15rem; height: 2.15rem; color: var(--settings-sand); border: 1px solid var(--settings-line-strong); }
.web-page-settings__integration-copy, .web-page-settings__chain-copy { min-width: 0; display: flex; flex-direction: column; gap: .3rem; }
.web-page-settings__integration-copy > div, .web-page-settings__chain-copy > div { display: flex; align-items: center; gap: .55rem; }
.web-page-settings__integration-copy strong, .web-page-settings__chain-copy strong { font-size: .8rem; font-weight: 600; }
.web-page-settings__integration-copy > span, .web-page-settings__chain-copy > div > span { color: var(--settings-muted); font-size: .7rem; }
.web-page-settings__integration-meta { display: flex; flex-direction: column; gap: .2rem; text-align: right; }
.web-page-settings__integration-meta strong { font-size: .77rem; font-weight: 600; }
.web-page-settings__integration-meta span { color: var(--settings-dim); font-size: .62rem; }
.web-page-settings__chain { grid-template-columns: 2.2rem minmax(0, 1fr) 9rem auto; }
.web-page-settings__chain-health { display: flex; flex-direction: column; align-items: flex-start; gap: .23rem; color: var(--settings-muted); font-size: .67rem; }
.web-page-settings__chain-health span { display: inline-flex; align-items: center; gap: .35rem; }
.web-page-settings__chain-health span:first-child { color: #9eb99d; }
.web-page-settings__rpc-row { display: grid; grid-template-columns: 2.2rem minmax(0, 1fr) auto auto; align-items: center; gap: .8rem; }
.web-page-settings__rpc-icon { display: grid; place-items: center; width: 2.15rem; height: 2.15rem; color: var(--settings-sand); border: 1px solid var(--settings-line-strong); }
.web-page-settings__rpc-row > div:nth-child(2) { display: flex; flex-direction: column; gap: .24rem; }
.web-page-settings__rpc-row strong { font-size: .8rem; font-weight: 600; }
.web-page-settings__rpc-row span { color: var(--settings-muted); font-size: .7rem; }
.web-page-settings__status { display: inline-flex; align-items: center; gap: .38rem; color: #9eb99d; font-size: .67rem; }
.web-page-settings__status--warning { color: var(--settings-sand); }
.web-page-settings__status--neutral { color: var(--settings-muted); }
.web-page-settings__status-dot { width: .38rem; height: .38rem; background: currentColor; border-radius: 50%; }
@media (max-width: 980px) { .web-page-settings__layout { grid-template-columns: 1fr; gap: 1.7rem; } .web-page-settings__tabs { position: static; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .35rem; } .web-page-settings__tabs-label, .web-page-settings__tabs-footer { grid-column: 1 / -1; } .web-page-settings__tabs-footer { margin-top: .8rem; } .web-page-settings__tab-copy small, .web-page-settings__tab-chevron { display: none; } }
@media (max-width: 720px) { .web-page-settings { padding-inline: 1rem; } .web-page-settings__header { align-items: flex-start; flex-direction: column; gap: 1.2rem; } .web-page-settings__header-actions { width: 100%; justify-content: space-between; } .web-page-settings__workspace-strip { grid-template-columns: 1fr 1fr; } .web-page-settings__workspace, .web-page-settings__strip-item { border-bottom: 1px solid var(--settings-line); } .web-page-settings__workspace { grid-column: 1 / -1; padding-left: 1rem; } .web-page-settings__strip-item:nth-last-child(1) { border-right: 0; } .web-page-settings__tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); } .web-page-settings__form-grid, .web-page-settings__wallet-meta { grid-template-columns: 1fr; } .web-page-settings__wallet-hero { flex-wrap: wrap; } .web-page-settings__wallet-hero .metron-badge { margin-left: 0; } .web-page-settings__wallet-empty { grid-template-columns: auto 1fr; } .web-page-settings__wallet-empty .metron-button { grid-column: 1 / -1; width: 100%; } .web-page-settings__integration { grid-template-columns: 2.2rem minmax(0, 1fr) auto; } .web-page-settings__integration-meta { display: none; } .web-page-settings__chain { grid-template-columns: 2.2rem minmax(0, 1fr) auto; } .web-page-settings__chain-health { display: none; } .web-page-settings__rpc-row { grid-template-columns: 2.2rem minmax(0, 1fr); } .web-page-settings__rpc-row .metron-badge { grid-column: 2; justify-self: start; } .web-page-settings__rpc-row .metron-button { grid-column: 1 / -1; justify-self: start; } }
@media (prefers-reduced-motion: reduce) { .web-page-settings__tab { transition: none; } }
`;
