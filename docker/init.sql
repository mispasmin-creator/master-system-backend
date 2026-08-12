-- Runs once on first DB init (inside /docker-entrypoint-initdb.d/).
-- Creates a PostgreSQL superuser role named "admin" so you can connect
-- via pgAdmin with username=admin / password=admin123.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin
      WITH LOGIN
           SUPERUSER
           PASSWORD 'admin123';
    RAISE NOTICE 'PostgreSQL role "admin" created.';
  ELSE
    RAISE NOTICE 'PostgreSQL role "admin" already exists — skipping.';
  END IF;
END
$$;

-- Grant the admin role full access to the postgres database
GRANT ALL PRIVILEGES ON DATABASE postgres TO admin;
