/*
  # Fix Profile Creation and Add Error Handling

  1. Changes
    - Adds better error handling to profile creation trigger
    - Ensures profiles exist for all users
    - Adds logging for trigger execution
    - Fixes permissions and grants

  2. Security
    - Maintains existing RLS policies
    - Adds proper function execution permissions
*/

-- Create error logging table
CREATE TABLE IF NOT EXISTS auth_function_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  error_message text,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on logs table
ALTER TABLE auth_function_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for logs
CREATE POLICY "Admins can read logs" ON auth_function_logs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Improved handle_new_user function with error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Log function execution
  INSERT INTO auth_function_logs (function_name, user_id)
  VALUES ('handle_new_user', NEW.id);

  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      created_at,
      updated_at,
      remaining_searches,
      searches_reset_at,
      subscription_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      now(),
      now(),
      5, -- Default to 5 searches for new users
      now(),
      'inactive'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO auth_function_logs (
      function_name,
      error_message,
      user_id
    )
    VALUES (
      'handle_new_user',
      SQLERRM,
      NEW.id
    );
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create missing profiles for existing users
INSERT INTO public.profiles (
  id,
  email,
  created_at,
  updated_at,
  remaining_searches,
  searches_reset_at,
  subscription_status
)
SELECT
  id,
  email,
  created_at,
  now(),
  5,
  now(),
  'inactive'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.profiles TO authenticated, anon;
GRANT ALL ON public.auth_function_logs TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated, anon;