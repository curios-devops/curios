/*
  # Fix User Creation and Permissions

  1. Changes
    - Adds proper schema permissions
    - Fixes trigger execution context
    - Adds better error handling
    - Ensures proper role permissions

  2. Security
    - Maintains existing RLS policies
    - Adds proper execution context for triggers
*/

-- Drop existing trigger to recreate with proper context
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER -- Run as database owner
SET search_path = public -- Set proper search path
LANGUAGE plpgsql
AS $$
DECLARE
  _error_message text;
BEGIN
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
      5,
      now(),
      'inactive'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      updated_at = now();

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS _error_message = MESSAGE_TEXT;
    
    -- Log error if logging table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'auth_function_logs') THEN
      INSERT INTO auth_function_logs (
        function_name,
        error_message,
        user_id
      ) VALUES (
        'handle_new_user',
        _error_message,
        NEW.id
      );
    END IF;

    RAISE LOG 'Error in handle_new_user: %', _error_message;
    RETURN NEW; -- Still return NEW to allow user creation
  END;
END;
$$;

-- Recreate trigger with proper configuration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper schema permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon, service_role;

-- Ensure proper table permissions
GRANT ALL ON public.profiles TO postgres, authenticated, anon, service_role;
GRANT ALL ON public.auth_function_logs TO postgres, authenticated, anon, service_role;

-- Ensure proper function permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon, service_role;

-- Ensure sequences are accessible
DO $$
DECLARE
  seq_name text;
BEGIN
  FOR seq_name IN 
    SELECT sequence_name 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format(
      'GRANT USAGE, SELECT ON SEQUENCE public.%I TO postgres, authenticated, anon, service_role',
      seq_name
    );
  END LOOP;
END $$;