import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export async function createCheckoutSession(req: Request) {
  try {
    const { userId, email, interval } = await req.json();

    const priceId = interval === 'year' 
      ? import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID 
      : import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      client_reference_id: userId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${window.location.origin}/subscription/success`,
      cancel_url: `${window.location.origin}/subscription/cancel`,
      metadata: {
        userId,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleWebhook(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = import.meta.env.VITE_STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      await req.text(),
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  await updateUserSubscription(userId, {
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0].price.id,
    subscription_status: subscription.status,
    subscription_period_end: new Date(subscription.current_period_end * 1000),
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
    stripe_price_id: subscription.items.data[0].price.id,
    subscription_status: subscription.status,
    subscription_period_end: new Date(subscription.current_period_end * 1000),
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
    subscription_status: 'canceled',
    subscription_period_end: new Date(),
  });
}

async function updateUserSubscription(userId: string, data: any) {
  await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);
}