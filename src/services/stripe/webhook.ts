import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY);

export async function handleWebhookEvent(event: Stripe.Event) {
  const { type, data } = event;

  switch (type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(data.object as Stripe.Subscription);
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  await updateUserSubscription(userId, {
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    subscriptionStatus: subscription.status,
    subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!user) return;

  await updateUserSubscription(user.id, {
    stripePriceId: subscription.items.data[0].price.id,
    subscriptionStatus: subscription.status,
    subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!user) return;

  await updateUserSubscription(user.id, {
    subscriptionStatus: 'canceled',
    subscriptionPeriodEnd: new Date(),
  });
}

async function updateUserSubscription(userId: string, data: any) {
  await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);
}