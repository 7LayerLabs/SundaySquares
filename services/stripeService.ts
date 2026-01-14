import { loadStripe } from '@stripe/stripe-js';

// TODO: Replace with your Stripe publishable key from https://dashboard.stripe.com/apikeys
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE';

// TODO: Replace with your Price ID from Stripe Dashboard
// Create a product "Sunday Squares Pool Fee" with a $5 one-time price
const POOL_FEE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_YOUR_PRICE_ID_HERE';

const POOL_FEE_AMOUNT = 5; // $5 flat fee

let stripePromise: ReturnType<typeof loadStripe> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export const createCheckoutSession = async (poolCode: string): Promise<void> => {
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  // For client-side only checkout, we use redirectToCheckout with a price ID
  // The poolCode is passed in client_reference_id to track which pool paid
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: POOL_FEE_PRICE_ID, quantity: 1 }],
    mode: 'payment',
    successUrl: `${window.location.origin}${window.location.pathname}?payment=success&pool=${poolCode}`,
    cancelUrl: `${window.location.origin}${window.location.pathname}?payment=cancelled&pool=${poolCode}`,
    clientReferenceId: poolCode,
  });

  if (error) {
    console.error('Stripe checkout error:', error);
    throw error;
  }
};

export const POOL_FEE = POOL_FEE_AMOUNT;
