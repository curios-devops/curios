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
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'subscription_schedule.canceled':
        await handleSubscriptionCanceled(event.data.object as Stripe.SubscriptionSchedule);
        break;
      case 'subscription_schedule.created':
      case 'subscription_schedule.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.SubscriptionSchedule);
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
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      subscriptionStatus: subscription.status,
      subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  } catch (error) {
    console.error('Error handling checkout completion:', error);
    throw error;
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customer.id)
      .single();

    if (profile) {
      await updateUserSubscription(profile.id, {
        email: customer.email,
        updated_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error handling customer update:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      paymentIntent.metadata.subscription_id
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (profile) {
      await updateUserSubscription(profile.id, {
        subscriptionStatus: subscription.status,
        subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000)
      });
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      paymentIntent.metadata.subscription_id
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (profile) {
      await updateUserSubscription(profile.id, {
        subscriptionStatus: 'past_due'
      });
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(schedule: Stripe.SubscriptionSchedule) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', schedule.subscription)
      .single();

    if (profile) {
      await updateUserSubscription(profile.id, {
        subscriptionStatus: 'canceled',
        subscriptionPeriodEnd: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(schedule: Stripe.SubscriptionSchedule) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', schedule.subscription)
      .single();

    if (profile) {
      const subscription = await stripe.subscriptions.retrieve(schedule.subscription as string);
      
      await updateUserSubscription(profile.id, {
        stripePriceId: subscription.items.data[0].price.id,
        subscriptionStatus: subscription.status,
        subscriptionPeriodEnd: new Date(subscription.current_period_end * 1000)
      });
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
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