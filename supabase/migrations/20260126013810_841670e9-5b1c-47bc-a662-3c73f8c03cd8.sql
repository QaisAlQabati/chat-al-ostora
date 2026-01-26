-- First migration: Just add the new enum values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vip';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';