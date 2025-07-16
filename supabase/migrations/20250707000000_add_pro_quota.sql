-- Add Pro quota fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS remaining_pro_quota INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS pro_quota_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient quota queries
CREATE INDEX IF NOT EXISTS idx_profiles_pro_quota_reset 
ON profiles(pro_quota_reset_at);

-- Update existing users to have default Pro quota
UPDATE profiles 
SET remaining_pro_quota = 5, 
    pro_quota_reset_at = NOW()
WHERE remaining_pro_quota IS NULL;