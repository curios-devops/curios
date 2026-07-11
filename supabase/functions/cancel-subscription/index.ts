// @ts-nocheck: Deno edge function with dynamic Stripe types
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Authenticate the caller from the Bearer token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication failed');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user?.email) {
      throw new Error('Authentication failed');
    }

    // Find the Stripe customer by the authenticated user's email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscription found', code: 'NO_SUBSCRIPTION' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }
    const customerId = customers.data[0].id;

    // Cancel every non-canceled subscription for this customer.
    // Covers active + past_due so a failing-card subscription stops retrying too.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
    const cancelable = subscriptions.data.filter(
      (s) => !['canceled', 'incomplete_expired'].includes(s.status),
    );
    if (cancelable.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscription found', code: 'NO_SUBSCRIPTION' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }

    for (const sub of cancelable) {
      await stripe.subscriptions.cancel(sub.id);
      console.log('Canceled subscription:', { subscriptionId: sub.id, userId: user.id });
    }

    // Downgrade the profile to the free tier immediately.
    // 3 = VITE_FREE_DAILY_PRO_CREDITS default (src/config/proCredits.ts).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'inactive',
        remaining_credits: 3,
        credits_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, canceled: cancelable.map((s) => s.id) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel subscription';
    console.error('Error canceling subscription:', { error, message });
    const status = message === 'Authentication failed' ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status },
    );
  }
});
