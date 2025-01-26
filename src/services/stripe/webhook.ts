import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY);
const endpointSecret = import.meta.env.VITE_STRIPE_WEBHOOK_SECRET;

export async function handleWebhookEvent(event: Stripe.Event) {
  try {
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
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    throw error;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  if (!userId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    await updateUserSubscription(userId, {
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0].price.id,
      subscription_status: 'active',
      subscription_period_end: new Date(subscription.current_period_end * 1000),
      remaining_searches: 500, // Set pro search limit
      searches_reset_at: new Date()
    });
  } catch (error) {
    console.error('Error handling checkout completion:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (profile) {
      await updateUserSubscription(profile.id, {
        subscription_status: subscription.status,
        subscription_period_end: new Date(subscription.current_period_end * 1000),
        remaining_searches: subscription.status === 'active' ? 500 : 5
      });
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (profile) {
      await updateUserSubscription(profile.id, {
        subscription_status: 'inactive',
        remaining_searches: 5 // Reset to free tier limit
      });
    }
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}

async function updateUserSubscription(userId: string, data: any) {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}