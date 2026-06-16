import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createCheckout, customerPortal, PLANS } from "@/lib/api/stripe.functions";

export const Route = createFileRoute("/pricing")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pricing — BGCut AI" },
      { name: "description", content: "Pick a plan to unlock more background removals." },
    ],
  }),
  component: PricingPage,
});

const TIERS = [
  {
    key: "free" as const,
    name: "Free",
    price: 0,
    features: ["5 removals per day", "Standard quality", "24h history"],
  },
  {
    key: "pro" as const,
    name: PLANS.pro.name,
    price: PLANS.pro.amount,
    features: ["Unlimited removals", "Priority processing", "30-day history"],
    highlight: true,
  },
  {
    key: "business" as const,
    name: PLANS.business.name,
    price: PLANS.business.amount,
    features: ["Everything in Pro", "Team seats", "Priority support"],
  },
];

function PricingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const checkout = useServerFn(createCheckout);
  const portal = useServerFn(customerPortal);
  const [busy, setBusy] = useState<string | null>(null);

  async function startCheckout(plan: "pro" | "business") {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setBusy(plan);
    try {
      const res = await checkout({ data: { plan } });
      if (res.url) window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await portal();
      if (res.url) window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Portal unavailable");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-semibold">BGCut <span className="text-gradient">AI</span></Link>
          {user && (
            <Button variant="ghost" size="sm" onClick={openPortal} disabled={busy === "portal"}>
              {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing"}
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[var(--neon-cyan)]" /> Test mode
          </div>
          <h1 className="mt-4 text-4xl font-bold">Simple, scalable pricing</h1>
          <p className="mt-2 text-muted-foreground">Start free. Upgrade when you need more.</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.key}
              className={`glass rounded-2xl p-6 ${tier.highlight ? "ring-2 ring-[var(--neon-blue)] glow-sm" : ""}`}
            >
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${tier.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-[var(--neon-cyan)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {tier.key === "free" ? (
                  <Button variant="outline" className="w-full border-white/15 bg-white/5" asChild>
                    <Link to={user ? "/dashboard" : "/auth"}>{user ? "Go to app" : "Get started"}</Link>
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-brand text-primary-foreground border-0"
                    disabled={busy === tier.key || loading}
                    onClick={() => startCheckout(tier.key)}
                  >
                    {busy === tier.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Upgrade to ${tier.name}`
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Payments processed by Stripe in test mode — use card 4242 4242 4242 4242, any future date, any CVC.
        </p>
      </main>
    </div>
  );
}
