import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export async function createCheckoutSession(req: Request) {
  try {
    // Validate Stripe API key
    if (!import.meta.env.VITE_STRIPE_SECRET_KEY?.trim()) {
      console.error('Stripe API key is missing');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
      console.log('Received request body:', {
        userId: body.userId,
        email: body.email,
        interval: body.interval
      });
    } catch (error) {
      console.error('Request body parse error:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId, email, interval } = body;

    // Validate required fields
    if (!userId?.trim()) {
      console.error('Missing userId');
      return new Response(
        JSON.stringify({ error: 'User ID is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email?.trim()) {
      console.error('Missing email');
      return new Response(
        JSON.stringify({ error: 'Email is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!interval || !['month', 'year'].includes(interval)) {
      console.error('Invalid interval:', interval);
      return new Response(
        JSON.stringify({ error: 'Invalid subscription interval' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get correct price ID based on interval
    const priceId = interval === 'year' 
      ? import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID 
      : import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;

    if (!priceId?.trim()) {
      console.error('Missing price ID for interval:', interval);
      return new Response(
        JSON.stringify({ error: 'Invalid subscription configuration' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create checkout session with error handling
    try {
      console.log('Creating Stripe checkout session with params:', {
        customer_email: email,
        client_reference_id: userId,
        price: priceId,
        mode: 'subscription'
      });

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
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      // Validate session URL
      if (!session?.url) {
        console.error('No URL in Stripe session response:', session);
        throw new Error('No checkout URL returned from Stripe');
      }

      console.log('Stripe session created successfully:', {
        sessionId: session.id,
        url: session.url
      });

      return new Response(
        JSON.stringify({ 
          url: session.url,
          sessionId: session.id 
        }), 
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Stripe session creation error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Failed to create checkout session' 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Checkout session error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process request' 
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}