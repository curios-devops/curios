// Simple test server for Edge Function
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const body = await req.json();
    console.log('Received request:', body);
    
    // Simple response for testing
    return new Response(
      JSON.stringify({
        text: "Hello from local Deno server! Your function received: " + JSON.stringify(body)
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        } 
      }
    );
  }
}, { port: 54321 });
