-- Get the current anon key from Supabase
-- Run this in Supabase SQL Editor

SELECT 
  decrypted_secret as anon_key
FROM vault.decrypted_secrets
WHERE name = 'anon_key'
LIMIT 1;

-- If that doesn't work, try this alternative:
-- Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/api
-- Copy the "anon" / "public" key from there
