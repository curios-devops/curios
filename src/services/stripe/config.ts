export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  prices: {
    month: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_1Qb7a7BMC94ss7b43iDSmQKO',
    year: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID || 'price_1Qb7bKBMC94ss7b4iTc8Qs79',
  },
  successUrl: '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: '/subscription/cancel',
} as const;