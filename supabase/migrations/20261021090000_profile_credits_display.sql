-- The viewer's Pro-credits indicator choice (Settings → Credits): { on, look, style }.
-- Kept on the profile so it follows the person to every device.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits_display JSONB;
