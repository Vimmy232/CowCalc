-- Table to store project keys (authentication)
CREATE TABLE IF NOT EXISTS project_keys (
  id SERIAL PRIMARY KEY,
  key_name VARCHAR(255) UNIQUE NOT NULL,
  hashed_key VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to store saved builds
CREATE TABLE IF NOT EXISTS builds (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_key_id INTEGER REFERENCES project_keys(id),
  plan_data JSONB NOT NULL,
  is_meta BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for tracking generic logs/events
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default admin account (Key: "admin123", we'll hash this in code or just use a known hash here)
-- In bcrypt, 'admin123' is something like '$2a$10$xyz...'
-- For schema init, we'll create the admin programmatically if it doesn't exist to ensure correct hashing.
