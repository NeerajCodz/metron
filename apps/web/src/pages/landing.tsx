import { useState, type MouseEvent } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CaretDown,
  ChartLineUp,
  Code,
  Command,
  Crosshair,
  GithubLogo,
  GlobeHemisphereWest,
  Lightning,
  LockKey,
  ShieldCheck,
  Sparkle,
  Stack,
} from "@phosphor-icons/react";
import {
  LandingButton,
  LandingGlass,
  LandingLink,
  LandingPrism,
  LandingSectionHeading,
  ScrollReveal,
} from "@metron/ui";

const lifecycle = [
  {
    number: "01",
    title: "Set an intent",
    description: "Describe the outcome, chains, protocols, and hard limits in one place.",
    icon: Crosshair,
  },
  {
    number: "02",
    title: "Compare routes",
    description: "Evaluate valid strategies across yield, cost, slippage, liquidity, and drawdown.",
    icon: ChartLineUp,
  },
  {
    number: "03",
    title: "Execute by policy",
    description: "Only contract-gated actions inside the approved envelope can move forward.",
    icon: LockKey,
  },
  {
    number: "04",
    title: "Monitor the position",
    description: "See one logical position across components, chains, hedges, and recovery rules.",
    icon: ShieldCheck,
  },
] as const;

const faqs = [
  ["What is Metron?", "Metron is a draft, testnet-first system for turning user-defined DeFi goals and risk limits into cross-chain strategy plans and controlled execution."],
  ["Which networks are supported?", "The current specification targets Ethereum Sepolia as the coordination chain, with Arbitrum Sepolia and Base Sepolia as execution chains. Optimism Sepolia is optional."],
  ["Does Metron custody funds?", "No. Smart contracts retain execution authority, and every action is constrained by the user's signed policy and the configured protocol allowlist."],
  ["What happens when conditions change?", "The monitoring layer evaluates the logical position against its limits. If user-authorized recovery is available, it can propose or execute bounded actions. Emergency unwind remains explicit."],
  ["Can I try it now?", "The product is currently a draft prototype for EVM testnets. Use the control room route to explore the working interface and intent flow."],
] as const;

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Mark() {
  return <span className="metron-landing-mark" aria-hidden="true"><span /></span>;
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const openControlRoom = () => {
    window.location.assign("/intent/new");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="metron-landing">
      <header className="metron-landing-nav-wrap">
        <nav className="metron-landing-nav" aria-label="Primary navigation">
          <a className="metron-landing-brand" href="/" aria-label="Metron home" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); closeMenu(); }}>
            <Mark />
            <span>METRON</span>
          </a>
          <div className={`metron-landing-nav-links${menuOpen ? " is-open" : ""}`}>
            <a href="#lifecycle" onClick={(event) => { scrollToSection(event, "lifecycle"); closeMenu(); }}>Lifecycle</a>
            <a href="#envelope" onClick={(event) => { scrollToSection(event, "envelope"); closeMenu(); }}>Risk envelope</a>
            <a href="#principles" onClick={(event) => { scrollToSection(event, "principles"); closeMenu(); }}>Principles</a>
            <a href="https://github.com/NeerajCodz/metron" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} weight="bold" /></a>
          </div>
          <div className="metron-landing-nav-actions">
            <span className="metron-landing-nav-status"><span /> testnets only</span>
            <LandingLink href="#intent" onClick={() => openControlRoom()} className="metron-landing-nav-cta">Open control room <ArrowUpRight size={14} weight="bold" /></LandingLink>
            <LandingButton variant="glass" className="metron-landing-menu-toggle" aria-expanded={menuOpen} aria-controls="landing-nav-links" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? "Close" : "Menu"}
            </LandingButton>
          </div>
        </nav>
      </header>

      <main>
        <section className="metron-landing-hero" aria-labelledby="landing-title">
          <LandingPrism className="metron-landing-hero-prism" />
          <div className="metron-landing-hero-grid" aria-hidden="true" />
          <div className="metron-landing-hero-inner">
            <div className="metron-landing-hero-copy">
              <div className="metron-landing-kicker"><span className="metron-landing-kicker-line" /> <span>Programmable DeFi control</span></div>
              <h1 id="landing-title">Define the outcome.<br /><em>Keep the limits.</em></h1>
              <p className="metron-landing-hero-lede">Metron turns user-defined DeFi goals and risk limits into cross-chain strategies that can execute, hedge, monitor, and protect within those limits.</p>
              <div className="metron-landing-hero-actions">
                <LandingButton onClick={openControlRoom}>Create an intent <ArrowRight size={17} weight="bold" /></LandingButton>
                <LandingButton variant="glass" onClick={() => document.getElementById("lifecycle")?.scrollIntoView({ behavior: "smooth" })}>See the lifecycle <ArrowDown size={16} weight="bold" /></LandingButton>
              </div>
              <div className="metron-landing-hero-note"><Check size={15} weight="bold" /> Draft v0.1.0 for EVM testnets</div>
            </div>
            <div className="metron-landing-intent-card-wrap">
              <LandingGlass className="metron-landing-intent-card" depth="strong">
                <div className="metron-landing-intent-head"><span className="metron-landing-live"><span /> intent preview</span><span className="metron-landing-intent-code">METRON / 001</span></div>
                <div className="metron-landing-intent-prompt"><span className="metron-landing-prompt-mark">&gt;</span><span>Build a strategy for 10 to 12% target yield</span><span className="metron-landing-cursor" /></div>
                <div className="metron-landing-intent-tags"><span>max drawdown <strong>5%</strong></span><span>delta <strong>near zero</strong></span><span>route <strong>Arbitrum + Base</strong></span></div>
                <div className="metron-landing-intent-footer"><span><Command size={14} /> policy envelope</span><span className="metron-landing-intent-state"><span /> within limits</span></div>
              </LandingGlass>
            </div>
          </div>
          <div className="metron-landing-hero-footer"><span>One logical position, assembled from many DeFi components.</span><span className="metron-landing-scroll-cue">Scroll to explore <ArrowDown size={14} /></span></div>
        </section>

        <section className="metron-landing-section metron-landing-problem" id="problem" aria-labelledby="problem-title">
          <div className="metron-landing-section-rule" />
          <div className="metron-landing-problem-layout">
            <div>
              <LandingSectionHeading index="Why Metron" title="DeFi risk does not live in one tab." description="Lending, liquidity, bridges, hedges, collateral, gas, and rebalancing move together. Metron gives those moving parts one policy-aware surface." />
              <ScrollReveal containerClassName="metron-landing-scroll-copy" textClassName="metron-landing-scroll-copy__text" baseOpacity={0.2} baseRotation={2} blurStrength={8}>Lending, liquidity, bridges, hedges, collateral, gas, and rebalancing move together.</ScrollReveal>
            </div>
            <div className="metron-landing-fragment-map" aria-label="Fragmented DeFi actions becoming one logical position">
              <div className="metron-landing-fragment fragment-a"><GlobeHemisphereWest size={18} /> Chain</div>
              <div className="metron-landing-fragment fragment-b"><Stack size={18} /> Liquidity</div>
              <div className="metron-landing-fragment fragment-c"><Lightning size={18} /> Hedge</div>
              <div className="metron-landing-fragment fragment-d"><LockKey size={18} /> Guardrail</div>
              <div className="metron-landing-fragment-center"><span><Sparkle size={17} weight="fill" /></span><strong>one logical<br />position</strong></div>
              <span className="metron-landing-map-line line-one" /><span className="metron-landing-map-line line-two" /><span className="metron-landing-map-line line-three" /><span className="metron-landing-map-line line-four" />
            </div>
          </div>
        </section>

        <section className="metron-landing-section metron-landing-lifecycle" id="lifecycle" aria-labelledby="lifecycle-title">
          <LandingSectionHeading index="The operating loop" title="Tell Metron the objective. Keep control of the envelope." description="A strategy is not a one-time transaction. It is an explicit lifecycle from intent to bounded action." />
          <ScrollReveal containerClassName="metron-landing-scroll-copy" textClassName="metron-landing-scroll-copy__text" baseOpacity={0.2} baseRotation={2} blurStrength={7}>A strategy is not a one-time transaction. It is an explicit lifecycle from intent to bounded action.</ScrollReveal>
          <div className="metron-landing-lifecycle-grid">
            {lifecycle.map(({ number, title, description, icon: Icon }, index) => (
              <article className={`metron-landing-lifecycle-item item-${index + 1}`} key={number}>
                <div className="metron-landing-lifecycle-top"><span>{number}</span><Icon size={22} weight="duotone" /></div>
                <h3>{title}</h3><p>{description}</p>
                <span className="metron-landing-lifecycle-arrow"><ArrowUpRight size={17} weight="bold" /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="metron-landing-section metron-landing-envelope" id="envelope" aria-labelledby="envelope-title">
          <div className="metron-landing-envelope-copy"><LandingSectionHeading index="Risk is a design input" title="Make the guardrails part of the strategy." description="Metron evaluates candidate routes against the constraints that matter to you, then keeps execution accountable to the same envelope." /><ScrollReveal containerClassName="metron-landing-scroll-copy" textClassName="metron-landing-scroll-copy__text" baseOpacity={0.2} baseRotation={2}>Every recommendation has a route, a cost, a boundary, and a reason.</ScrollReveal><LandingButton onClick={openControlRoom}>Write your first intent <ArrowRight size={17} weight="bold" /></LandingButton></div>
          <LandingGlass className="metron-landing-envelope-panel" depth="quiet">
            <div className="metron-landing-envelope-panel-head"><span>policy / target</span><span>live evaluation</span></div>
            <div className="metron-landing-envelope-row"><span>target yield</span><strong>10.00 to 12.00%</strong><span className="metron-landing-ok"><Check size={14} weight="bold" /> in range</span></div>
            <div className="metron-landing-envelope-row"><span>max drawdown</span><strong>5.00%</strong><span className="metron-landing-ok"><Check size={14} weight="bold" /> protected</span></div>
            <div className="metron-landing-envelope-row"><span>health factor</span><strong>&gt; 1.65</strong><span className="metron-landing-ok"><Check size={14} weight="bold" /> enforced</span></div>
            <div className="metron-landing-envelope-row"><span>slippage ceiling</span><strong>0.45%</strong><span className="metron-landing-ok"><Check size={14} weight="bold" /> enforced</span></div>
            <div className="metron-landing-envelope-foot"><span><span className="metron-landing-scan-dot" /> scanning 3 candidate routes</span><span>Sepolia / Arbitrum / Base</span></div>
          </LandingGlass>
        </section>

        <section className="metron-landing-section metron-landing-principles" id="principles" aria-labelledby="principles-title">
          <LandingSectionHeading index="Built for inspection" title="The system should show its work." description="No hidden portfolio state. No vague automation. Every recommendation has a route, a cost, a boundary, and a reason." />
          <ScrollReveal containerClassName="metron-landing-scroll-copy" textClassName="metron-landing-scroll-copy__text" baseOpacity={0.2} baseRotation={2}>No hidden portfolio state. No vague automation.</ScrollReveal>
          <div className="metron-landing-principles-grid">
            <LandingGlass className="metron-landing-principle principle-wide" depth="quiet"><div className="metron-landing-principle-glyph"><Code size={25} weight="duotone" /></div><div><span>01 / composable</span><h3>Readable from intent to transaction.</h3><p>Natural language can start the flow, but structured constraints keep every next step inspectable.</p></div><ArrowUpRight size={18} /></LandingGlass>
            <LandingGlass className="metron-landing-principle" depth="quiet"><div className="metron-landing-principle-glyph"><ShieldCheck size={25} weight="duotone" /></div><span>02 / bounded</span><h3>Automation with an edge.</h3><p>Recovery is user-authorized, allowlisted, and limited by policy.</p></LandingGlass>
            <LandingGlass className="metron-landing-principle" depth="quiet"><div className="metron-landing-principle-glyph"><ChartLineUp size={25} weight="duotone" /></div><span>03 / comparable</span><h3>Routes earn their place.</h3><p>Yield, costs, liquidity, slippage, drawdown, and liquidation risk stay visible together.</p></LandingGlass>
          </div>
        </section>

        <section className="metron-landing-section metron-landing-faq" id="faq" aria-labelledby="faq-title">
          <LandingSectionHeading index="Questions, answered" title="Start with the edges." description="A prototype is useful when its limits are clear." />
          <div className="metron-landing-faq-list">
            {faqs.map(([question, answer], index) => (
              <div className={`metron-landing-faq-item${faqOpen === index ? " is-open" : ""}`} key={question}>
                <button type="button" aria-expanded={faqOpen === index} onClick={() => setFaqOpen(faqOpen === index ? null : index)}><span>{question}</span><CaretDown size={19} /></button>
                <div className="metron-landing-faq-answer"><p>{answer}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="metron-landing-final" aria-labelledby="final-title">
          <div className="metron-landing-final-glow" aria-hidden="true" />
          <span className="metron-landing-kicker"><span className="metron-landing-kicker-line" /> make the first move explicit</span>
          <h2 id="final-title">Give your strategy<br /><em>an operating envelope.</em></h2>
          <p>Draft an intent, compare a route, and see the control room behind the abstraction.</p>
          <LandingButton onClick={openControlRoom}>Open the control room <ArrowUpRight size={17} weight="bold" /></LandingButton>
        </section>
      </main>

      <footer className="metron-landing-footer">
        <div className="metron-landing-footer-top"><a className="metron-landing-brand" href="/" aria-label="Metron home"><Mark /><span>METRON</span></a><p>Cross-chain strategy control for outcomes with boundaries.</p><a className="metron-landing-footer-github" href="https://github.com/NeerajCodz/metron" target="_blank" rel="noreferrer">View source <GithubLogo size={17} /></a></div>
        <div className="metron-landing-footer-bottom"><span>© 2025 Metron. Draft v0.1.0.</span><span>EVM testnets only. No production funds.</span><span className="metron-landing-footer-built"><span /> built for inspection</span></div>
      </footer>
    </div>
  );
}
