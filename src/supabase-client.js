const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient(url, apiKey) {
  if (!url || !apiKey) {
    throw new Error('Supabase URL and API key must be provided');
  }
  
  return createClient(url, apiKey, {
    auth: { persistSession: false },
  });
}

module.exports = { getSupabaseClient };