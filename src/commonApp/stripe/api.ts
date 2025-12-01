import { supabase } from '../../lib/supabase';
import { STRIPE_CONFIG } from './config';
import { sanitizeStripeLocale } from './locales';
import type { CheckoutSession } from './types';
import type { FunctionsHttpError } from '@supabase/supabase-js';

export async function createCheckoutSession(
  userId: string,
  email: string,
  interval: 'month' | 'year'
): Promise<CheckoutSession> {
  try {
    // Validate inputs
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
      ? STRIPE_CONFIG.prices.year 
      : STRIPE_CONFIG.prices.month;

    if (!priceId?.trim()) {
      throw new Error('Invalid price configuration');
    }

    // Get and sanitize browser locale, ensuring it's always a valid Stripe locale
    const browserLocale = typeof navigator !== 'undefined' ? navigator.language : 'auto';
    const normalizedLocale = sanitizeStripeLocale(browserLocale);
    
    // Additional validation to ensure we never pass undefined/null
    const safeLocale = normalizedLocale || 'auto';

    console.log('Creating checkout session:', {
      userId,
      email,
      interval,
      priceId,
      browserLocale,
      normalizedLocale,
      safeLocale
    });

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        userId,
        email,
        interval,
        locale: safeLocale
      }
    });

    if (error) {
      const httpError = error as FunctionsHttpError;
      const serverError = (
        (httpError.context as Record<string, any>)?.response?.error ||
        (httpError.context as Record<string, any>)?.response?.code ||
        (httpError.context as Record<string, any>)?.error ||
        (data as { error?: string; code?: string } | null | undefined)?.error
      );

      console.error('Supabase function error:', {
        error,
        serverError,
        status: httpError.context?.response?.status,
      });

      throw new Error(
        (typeof serverError === 'string' && serverError.trim().length > 0)
          ? serverError
          : httpError.message || 'Failed to create checkout session'
      );
    }

    if (!data?.url || !data?.sessionId) {
      console.error('Invalid response from Edge Function:', data);
      throw new Error('Invalid checkout session response');
    }

    console.log('Checkout session created successfully:', {
      sessionId: data.sessionId,
      url: data.url
    });

    return {
      id: data.sessionId,
      url: data.url,
    };
  } catch (error) {
    // Log detailed error information
    console.error('Stripe API error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    throw error;
  }
}

export async function checkSubscription(userId: string): Promise<boolean> {
  try {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase.functions.invoke('check-subscription', {
      body: { userId }
    });

    if (error) {
      console.error('Subscription check error:', error);
      return false;
    }

    return data?.isActive || false;
  } catch (error) {
    console.error('Subscription check error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}