import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { mapStripeSubscriptionStatus } from "@/lib/stripe/map-status";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return NextResponse.json({ error: "Stripe no está configurado" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Falta la firma");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook: invalid signature", error);
    return NextResponse.json({ error: "Firma no válida" }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const householdId = session.client_reference_id;
        if (!householdId || !session.subscription) { console.error("Stripe webhook: checkout.session.completed missing household/subscription", session.id); break; }
        const { error } = await db.from("households").update({
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription.id,
          subscription_status: "active",
        }).eq("id", householdId);
        if (error) throw error;
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStripeSubscriptionStatus(subscription.status);
        const { error } = await db.from("households").update({ subscription_status: status }).eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
        if (!subscriptionId) break;
        const { error } = await db.from("households").update({ subscription_status: "past_due" }).eq("stripe_subscription_id", subscriptionId);
        if (error) throw error;
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook: failed to sync household", event.type, error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
