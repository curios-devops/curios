// Debug function for testing console logs and API connectivity
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔥 DEBUG FUNCTION CALLED');
    console.warn('⚠️ DEBUG FUNCTION WARNING');
    console.error('❌ DEBUG FUNCTION ERROR');
    console.info('ℹ️ DEBUG FUNCTION INFO');

    // Test different types of responses
    const debugInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
      message: 'Debug function executed successfully',
      logs: [
        'console.log should appear as regular text',
        'console.warn should appear as yellow warning',
        'console.error should appear as red error',
        'console.info should appear as blue info'
      ]
    };

    return new Response(JSON.stringify(debugInfo, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('💥 DEBUG FUNCTION ERROR:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
