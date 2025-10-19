-- Add raw_json column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_json JSONB;
