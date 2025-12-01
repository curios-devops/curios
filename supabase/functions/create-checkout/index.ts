// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@12.1.1?target=deno&no-check";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SUPPORTED_LOCALES = [
  'auto','ar','bg','cs','da','de','el','en','en-GB','es','es-419','et','fi','fil','fr','fr-CA','he','hr','hu','id','it','ja','ko','lt','lv','ms','mt','nb','nl','pl','pt','pt-BR','ro','ru','sk','sl','sv','th','tr','vi','zh','zh-HK','zh-TW'
] as const;

type StripeLocale = (typeof STRIPE_SUPPORTED_LOCALES)[number];

function sanitizeStripeLocale(locale?: string | null): StripeLocale {
  if (!locale || typeof locale !== 'string') {
    return 'auto';
  }

  const trimmed = locale.trim();
  if (!trimmed) {
    return 'auto';
  }

  const normalized = trimmed.toLowerCase();
  const directMatch = STRIPE_SUPPORTED_LOCALES.find((value) => value.toLowerCase() === normalized);
  if (directMatch) {
    return directMatch;
  }

  const [language] = normalized.split(/[-_]/);
  if (language) {
    const baseMatch = STRIPE_SUPPORTED_LOCALES.find((value) => value.toLowerCase() === language);
    if (baseMatch) {
      return baseMatch;
    }

    if (language === 'es') {
      return 'es';
    }

    if (language === 'pt') {
      return 'pt';
    }

    if (language === 'zh') {
      return 'zh';
    }
  }

  return 'auto';
}

function classifyError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Failed to create checkout session';
  const normalized = message.toLowerCase();

  if (normalized.includes('already subscribed')) {
    return { status: 409, code: 'ALREADY_SUBSCRIBED', message };
  }

  if (normalized.includes('invalid subscription interval')) {
    return { status: 400, code: 'INVALID_INTERVAL', message };
  }

  if (normalized.includes('user id is required') || normalized.includes('email is required')) {
    return { status: 400, code: 'MISSING_FIELDS', message };
  }

  if (normalized.includes('invalid price configuration')) {
    return { status: 500, code: 'INVALID_PRICE_CONFIG', message };
  }

  if (normalized.includes('invalid locale')) {
    return { status: 400, code: 'UNSUPPORTED_LOCALE', message };
  }

  if (normalized.includes('already has an active subscription')) {
    return { status: 409, code: 'ACTIVE_SUBSCRIPTION', message };
  }

  return { status: 500, code: 'INTERNAL_SERVER_ERROR', message };
}

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
  const { userId, email, interval, locale } = await req.json();
  // Always default to 'auto' to prevent Stripe locale errors
  const sanitizedLocale = (locale && sanitizeStripeLocale(locale)) || 'auto';

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
      customerId,
      locale: sanitizedLocale
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
  locale: sanitizedLocale,
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
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
    const { status, code, message } = classifyError(error);

    console.error('Error creating checkout session:', {
      error,
      code,
      message,
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ 
        error: message,
        code,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      }
    );
  }
});