import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/bgcut-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Sparkles, Zap, Shield, Check, ImageDown, Code2, Layers } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BGCut AI — Remove. Cut. Perfect." },
      { name: "description", content: "AI-powered background removal in seconds. Studio-grade transparent cutouts for creators, e-commerce, and teams." },
      { property: "og:title", content: "BGCut AI — Remove. Cut. Perfect." },
      { property: "og:description", content: "Studio-grade transparent cutouts powered by AI. Free to start." },
      { property: "og:image", content: logoAsset.url },
      { name: "twitter:image", content: logoAsset.url },
    ],
  }),
  component: Landing,
});

function Nav() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="BGCut AI" className="h-9 w-9 rounded-lg object-cover glow-sm" />
          <span className="text-lg font-semibold tracking-tight">BGCut <span className="text-gradient">AI</span></span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <a href="#api" className="hover:text-foreground transition-colors">API</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button onClick={handleSignOut} size="sm" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground border-0 glow-sm hover:opacity-90">
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);
  return signedIn;
}

function Hero() {
  const signedIn = useSignedIn();
  const navigate = useNavigate();
  const ctaLabel = signedIn ? "Open dashboard" : "Try it free";

  const goNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    navigate({ to: "/dashboard" });
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--neon-purple)] opacity-20 blur-[120px]" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
              {signedIn ? "You're signed in · jump right in" : "Powered by precision AI · 5s avg cutouts"}
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Remove. Cut.{" "}
              <span className="text-gradient">Perfect.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0 mx-auto">
              Studio-grade transparent backgrounds in seconds. Built for creators, e-commerce sellers, and product teams who need pixel-perfect cutouts at scale.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Button onClick={goNext} size="lg" className="bg-gradient-brand text-primary-foreground border-0 glow hover:opacity-90">
                {ctaLabel} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 backdrop-blur hover:bg-white/10">
                <a href="#api"><Code2 className="mr-2 h-4 w-4" /> View API</a>
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground lg:justify-start">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--neon-cyan)]" /> 5 free / day</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--neon-cyan)]" /> No watermarks</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--neon-cyan)]" /> HD downloads</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 -z-10 bg-gradient-brand opacity-20 blur-3xl" />
            <div className="relative mx-auto max-w-md animate-float">
              <img src={logoAsset.url} alt="BGCut AI logo" className="w-full rounded-3xl glow" />
            </div>
          </div>
        </div>

        {/* Upload zone — redirects signed-in users straight to the dashboard editor */}
        <div className="mx-auto mt-16 max-w-3xl">
          <button
            type="button"
            onClick={goNext}
            className="glass group block w-full cursor-pointer rounded-2xl border-2 border-dashed border-white/15 p-10 text-center transition-all hover:border-[var(--neon-blue)]/60 hover:glow-sm"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand glow-sm">
              <Upload className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">
              {signedIn ? "Open the editor to remove backgrounds" : "Drop an image to remove the background"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">JPG, PNG, or WEBP · up to 10MB · 5000×5000 max</p>
            <span className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-brand text-primary-foreground h-10 px-4 text-sm font-medium">
              {signedIn ? "Go to dashboard" : "Choose file"}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Zap, title: "Sub-5s processing", desc: "AI cutouts in under 5 seconds. Built on a serverless pipeline tuned for throughput." },
    { icon: Layers, title: "Hair & fur precision", desc: "Detects fine edges, transparency, and complex backdrops without halos." },
    { icon: ImageDown, title: "Full-resolution output", desc: "Download transparent PNGs up to 5000×5000 — no quality loss, no watermarks." },
    { icon: Shield, title: "Privacy first", desc: "Auto-deleted after 24 hours. Encrypted at rest. SOC-friendly logging." },
    { icon: Code2, title: "Developer API", desc: "Drop-in REST endpoint with API keys, rate limits, and webhook callbacks." },
    { icon: Sparkles, title: "Batch & teams", desc: "Process hundreds of product shots at once. Share credits across your team." },
  ];
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-[var(--neon-cyan)]">Why BGCut AI</p>
          <h2 className="mt-2 text-4xl font-bold md:text-5xl">Cutouts that look hand-masked</h2>
          <p className="mt-4 text-muted-foreground">Everything you need to ship polished visuals — fast.</p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.title} className="glass rounded-2xl p-6 transition-all hover:-translate-y-1 hover:glow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand glow-sm">
                <it.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: "Free", price: "₹0", period: "forever", features: ["5 images / day", "HD downloads", "Web app access", "24h auto-delete"], cta: "Start free", highlight: false },
    { name: "Pro", price: "₹499", period: "/ month", features: ["Unlimited images", "Priority processing", "Batch uploads", "API access (1k/mo)", "Email support"], cta: "Go Pro", highlight: true },
    { name: "Business", price: "₹1,999", period: "/ month", features: ["Everything in Pro", "API access (10k/mo)", "Team seats", "Webhook integrations", "Priority support"], cta: "Contact sales", highlight: false },
  ];
  return (
    <section id="pricing" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-[var(--neon-cyan)]">Pricing</p>
          <h2 className="mt-2 text-4xl font-bold md:text-5xl">Simple plans, real value</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when your workflow scales.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-8 ${p.highlight ? "bg-gradient-brand glow" : "glass"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-background px-3 py-1 text-xs font-medium border border-white/15">
                  Most popular
                </span>
              )}
              <h3 className={`text-xl font-semibold ${p.highlight ? "text-primary-foreground" : ""}`}>{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${p.highlight ? "text-primary-foreground" : ""}`}>{p.price}</span>
                <span className={`text-sm ${p.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.period}</span>
              </div>
              <ul className={`mt-6 space-y-3 text-sm ${p.highlight ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${p.highlight ? "text-primary-foreground" : "text-[var(--neon-cyan)]"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-8 w-full ${p.highlight ? "bg-background text-foreground hover:bg-background/90" : "bg-gradient-brand text-primary-foreground border-0"}`}
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ApiSection() {
  return (
    <section id="api" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-[var(--neon-cyan)]">Developer API</p>
            <h2 className="mt-2 text-4xl font-bold md:text-5xl">Drop it into your stack</h2>
            <p className="mt-4 text-muted-foreground">One REST call. Transparent PNG back. Authenticated with your API key, rate-limited per plan, and ready for production.</p>
            <Button className="mt-8 bg-gradient-brand text-primary-foreground border-0">Read the docs <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
          <div className="glass rounded-2xl p-1 glow-sm">
            <div className="rounded-xl bg-black/50 p-6 font-mono text-sm leading-relaxed">
              <div className="text-muted-foreground"># Remove a background</div>
              <div><span className="text-[var(--neon-cyan)]">curl</span> -X POST https://api.bgcut.ai/v1/remove \</div>
              <div className="pl-4">-H <span className="text-[var(--neon-purple)]">"Authorization: Bearer $KEY"</span> \</div>
              <div className="pl-4">-F <span className="text-[var(--neon-purple)]">"image=@photo.jpg"</span> \</div>
              <div className="pl-4">-o <span className="text-[var(--neon-orange)]">cutout.png</span></div>
              <div className="mt-4 text-muted-foreground"># → 200 OK · image/png</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <img src={logoAsset.url} alt="BGCut AI" className="h-7 w-7 rounded-md object-cover" />
          <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} BGCut AI. Remove. Cut. Perfect.</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Contact</a>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <ApiSection />
      </main>
      <Footer />
    </div>
  );
}
