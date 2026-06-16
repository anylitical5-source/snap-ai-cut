import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLANS = {
  pro: {
    name: "Pro",
    priceId: "price_1Tj0XCPEUyl5yqVD98CkbJ1j",
    productId: "prod_UiRQvA6OMlEnJh",
    amount: 19,
  },
  business: {
    name: "Business",
    priceId: "price_1Tj0XHPEUyl5yqVDR8co3yn2",
    productId: "prod_UiRQF7OaWfN54F",
    amount: 49,
  },
} as const;

type PlanKey = keyof typeof PLANS;

async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  const { default: Stripe } = await import("stripe");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as never });
}

function originFromRequest() {
  return getRequestHeader("origin") ?? getRequestHeader("referer") ?? "";
}

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ plan: z.enum(["pro", "business"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const stripe = await getStripe();
    const plan = PLANS[data.plan as PlanKey];

    const { data: userInfo } = await context.supabase.auth.getUser();
    const email = userInfo.user?.email;
    if (!email) throw new Error("No email on user");

    const existing = await stripe.customers.list({ email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const origin = originFromRequest();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    return { url: session.url };
  });

export const checkSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = await getStripe();
    const { data: userInfo } = await context.supabase.auth.getUser();
    const email = userInfo.user?.email;
    if (!email) return { subscribed: false, plan: "free" as const };

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) return { subscribed: false, plan: "free" as const };

    const subs = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });
    if (subs.data.length === 0) return { subscribed: false, plan: "free" as const };

    const sub = subs.data[0];
    const productId = sub.items.data[0].price.product as string;
    let planKey: "free" | "pro" | "business" = "free";
    if (productId === PLANS.pro.productId) planKey = "pro";
    else if (productId === PLANS.business.productId) planKey = "business";

    return {
      subscribed: true,
      plan: planKey,
      // @ts-expect-error current_period_end exists at runtime
      subscriptionEnd: new Date(sub.current_period_end * 1000).toISOString(),
    };
  });

export const customerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripe = await getStripe();
    const { data: userInfo } = await context.supabase.auth.getUser();
    const email = userInfo.user?.email;
    if (!email) throw new Error("No email on user");

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");

    const origin = originFromRequest();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/dashboard`,
    });
    return { url: portal.url };
  });
