export const STRIPE_CONFIG = {
  prices: {
    month: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_1Qb7a7BMC94ss7b43iDSmQKO',
    year: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID || 'price_1Qb7bKBMC94ss7b4iTc8Qs79',
  },
  successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${window.location.origin}/subscription/cancel`,
} as const;