ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notifications_opt_out BOOLEAN DEFAULT false;
