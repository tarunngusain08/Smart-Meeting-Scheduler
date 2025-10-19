-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_principal_name VARCHAR(255) UNIQUE NOT NULL,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users USING gin(display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING gin(email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_upn ON users USING gin(user_principal_name gin_trgm_ops);

-- Enable the pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
