export const STRIPE_CONFIG = {
  prices: {
    month: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
    year: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID,
  },
  successUrl: `${window.location.origin}/subscription/success`,
  cancelUrl: `${window.location.origin}/subscription/cancel`,
} as const;