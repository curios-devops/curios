// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@12.1.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    // Get request data
    const { userId, email, interval } = await req.json();

    // Validate required fields
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    if (!email?.trim()) {
      throw new Error('Email is required');
    }
    if (!['month', 'year'].includes(interval)) {
      throw new Error('Invalid subscription interval');
    }

    // Get correct price ID based on interval
    const priceId = interval === 'year' 
      ? Deno.env.get('STRIPE_YEARLY_PRICE_ID')
      : Deno.env.get('STRIPE_MONTHLY_PRICE_ID');

    if (!priceId?.trim()) {
      throw new Error('Invalid price configuration');
    }

    // Check for existing customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customerId = undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check if already subscribed
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        price: priceId,
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        throw new Error('Already subscribed to this plan');
      }
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    console.log('Creating checkout session...', {
      userId,
      email,
      interval,
      priceId,
      customerId
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      client_reference_id: userId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      locale: 'en', // Force English to avoid localization errors
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        userId,
      },
    });

    console.log('Checkout session created:', {
      sessionId: session.id,
      url: session.url
    });

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create checkout session' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});