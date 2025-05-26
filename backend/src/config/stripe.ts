import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
  typescript: true,
});

    export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export const STRIPE_PLANS = {
  pro: {
    monthly: {
      priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      quota: 1000, // Número de gerações por mês
    },
    yearly: {
      priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
      quota: 12000, // 12 meses de gerações
    },
  },
};
