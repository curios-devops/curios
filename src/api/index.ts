import { createCheckoutSession } from './stripe';

// API route handler
export async function handleRequest(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Route handlers
  switch (path) {
    case '/api/create-checkout-session':
      return createCheckoutSession(req);
    default:
      return new Response(
        JSON.stringify({ error: 'Not found' }), 
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
  }
}