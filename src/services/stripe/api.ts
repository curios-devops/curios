import { supabase } from '../../lib/supabase';
import { STRIPE_CONFIG } from './config';
import type { CheckoutSession } from './types';

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY);

export async function createCheckoutSession(
  userId: string,
  email: string,
  interval: 'month' | 'year'
): Promise<CheckoutSession> {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    client_reference_id: userId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: STRIPE_CONFIG.prices[interval],
        quantity: 1,
      },
    ],
    success_url: STRIPE_CONFIG.successUrl,
    cancel_url: STRIPE_CONFIG.cancelUrl,
    metadata: {
      userId,
    },
  });

  return {
    id: session.id,
    url: session.url!,
  };
}