-- Token platform foundation schema (PostgreSQL)
-- Phase 1 scaffold for paid access, device caps, and reset flows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'device_type'
  ) THEN
    CREATE TYPE device_type AS ENUM ('laptop', 'mobile', 'browser');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_status'
  ) THEN
    CREATE TYPE subscription_status AS ENUM (
      'trialing',
      'active',
      'past_due',
      'paused',
      'canceled',
      'expired'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_tier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  monthly_price_usd NUMERIC(8,2) NOT NULL,
  storage_quota_mb INTEGER NOT NULL,
  ql_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  plan_tier_id UUID NOT NULL REFERENCES plan_tier(id),
  provider TEXT NOT NULL,
  provider_subscription_id TEXT NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_user_status
  ON subscription(user_id, status);

CREATE TABLE IF NOT EXISTS access_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_hint TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_access_token_user_active
  ON access_token(user_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS device_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  access_token_id UUID NOT NULL REFERENCES access_token(id) ON DELETE CASCADE,
  device_type device_type NOT NULL,
  device_fingerprint TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ended_reason TEXT,
  UNIQUE(user_id, device_type, device_fingerprint, ended_at)
);

CREATE INDEX IF NOT EXISTS idx_device_session_user_active
  ON device_session(user_id, device_type)
  WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS reset_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  request_code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_ip INET,
  request_user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_reset_request_user_created
  ON reset_request(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_user_created
  ON audit_event(user_id, created_at DESC);

-- Device limit enforcement helper (1 laptop, 1 mobile, 1 browser).
CREATE OR REPLACE FUNCTION count_active_device_sessions(
  target_user_id UUID,
  target_device_type device_type
)
RETURNS INTEGER
LANGUAGE SQL
AS $$
  SELECT COUNT(*)::INTEGER
  FROM device_session
  WHERE user_id = target_user_id
    AND device_type = target_device_type
    AND ended_at IS NULL;
$$;

-- Seed baseline paid plan.
INSERT INTO plan_tier (code, name, monthly_price_usd, storage_quota_mb, ql_features)
VALUES (
  'pro_monthly',
  'Pro Monthly',
  5.99,
  1024,
  '{"cloudSync": true, "teamShare": true, "prioritySupport": false}'::jsonb
)
ON CONFLICT (code) DO NOTHING;
