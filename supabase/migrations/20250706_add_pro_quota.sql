-- Add Pro quota columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS remaining_pro_quota INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS pro_quota_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_pro_quota_reset_at ON public.profiles (pro_quota_reset_at);

-- Update existing profiles to have default Pro quota
UPDATE public.profiles 
SET remaining_pro_quota = 5, pro_quota_reset_at = NOW() 
WHERE remaining_pro_quota IS NULL;
