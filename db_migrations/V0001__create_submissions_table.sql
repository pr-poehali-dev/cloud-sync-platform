CREATE TABLE IF NOT EXISTS t_p26040474_cloud_sync_platform.submissions (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT,
  city TEXT,
  telegram TEXT,
  email TEXT,
  type TEXT,
  data JSONB NOT NULL
);