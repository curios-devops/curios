import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's email
    const email = user.email;
    if (!email) {
      throw new Error('No email found');
    }

    console.log('Checking subscription for:', { userId: user.id, email });

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    // If no customer found, user is not subscribed
    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          isActive: false,
          subscription: null 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get active subscriptions for customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      expand: ['data.default_payment_method'],
      limit: 1
    });

    // If no active subscription found
    if (subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          isActive: false,
          subscription: null 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0].price.id;

    // Determine subscription type
    const subscriptionType = priceId === Deno.env.get('STRIPE_MONTHLY_PRICE_ID')
      ? 'monthly'
      : 'yearly';

    console.log('Active subscription found:', {
      subscriptionId: subscription.id,
      type: subscriptionType,
      status: subscription.status
    });

    return new Response(
      JSON.stringify({
        isActive: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          type: subscriptionType,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking subscription:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to check subscription' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});