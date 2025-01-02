export interface StripeSubscription {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  plan: {
    interval: 'month' | 'year';
    amount: number;
  };
}

export interface CheckoutSession {
  id: string;
  url: string;
}