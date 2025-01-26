import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.17.0?target=deno";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get the stripe signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', { status: 400 });
    }

    // Get the webhook secret
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return new Response('Webhook secret missing', { status: 500 });
    }

    // Get the raw body
    const body = await req.text();

    let event;
    try {
      // Verify the event
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await handleCheckoutSession(session);
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          await handleSubscriptionUpdate(subscription);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await handleSubscriptionDeletion(subscription);
          break;
        }
        default: {
          console.log(`Unhandled event type: ${event.type}`);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (err) {
      console.error(`Error handling webhook event: ${err.message}`);
      return new Response(
        JSON.stringify({ error: 'Error handling webhook event' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (err) {
    console.error(`General webhook error: ${err.message}`);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  if (!userId) {
    throw new Error('No client_reference_id in session');
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0].price.id,
      subscription_status: subscription.status,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      remaining_searches: 500, // Set pro search limit
      searches_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) throw error;
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (fetchError) throw fetchError;
  if (!profile) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      stripe_price_id: subscription.items.data[0].price.id,
      remaining_searches: subscription.status === 'active' ? 500 : 5,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) throw error;
}

async function handleSubscriptionDeletion(subscription: Stripe.Subscription) {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (fetchError) throw fetchError;
  if (!profile) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'inactive',
      remaining_searches: 5, // Reset to free tier limit
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (error) throw error;
}