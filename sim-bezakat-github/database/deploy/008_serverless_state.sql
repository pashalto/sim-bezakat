-- Run ONCE as sim_bezakat_migrator, AFTER domain migrations 001-007.
-- Separate deployment state: does not change portal domain tables or their PK/FK.
BEGIN;
DO $$ BEGIN
  IF current_database()<>'sim_bezakat_dev' OR current_user<>'sim_bezakat_migrator'
     OR NOT EXISTS(SELECT 1 FROM sim_bezakat.schema_version WHERE version=7) THEN
    RAISE EXCEPTION 'Requires sim_bezakat_dev version 7 as sim_bezakat_migrator';
  END IF;
END $$;
CREATE SCHEMA sim_bezakat_runtime AUTHORIZATION sim_bezakat_migrator;
REVOKE ALL ON SCHEMA sim_bezakat_runtime FROM PUBLIC;
CREATE TABLE sim_bezakat_runtime.sessions (
  session_key text PRIMARY KEY CHECK(session_key ~ '^[0-9a-f]{64}$'),
  payload text NOT NULL DEFAULT '' CHECK(octet_length(payload)<=262144),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sim_bezakat_runtime.sessions(expires_at);
CREATE TABLE sim_bezakat_runtime.login_attempts (
  login_key text PRIMARY KEY CHECK(login_key ~ '^[0-9a-f]{64}$'),
  attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 10),
  expires_at timestamptz NOT NULL
);
CREATE INDEX login_attempts_expiry ON sim_bezakat_runtime.login_attempts(expires_at);

CREATE FUNCTION sim_bezakat_runtime.session_valid(p_key text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat_runtime,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM sim_bezakat_runtime.sessions WHERE session_key=p_key AND expires_at>clock_timestamp())
$$;
CREATE FUNCTION sim_bezakat_runtime.session_read(p_key text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat_runtime,pg_temp AS $$
DECLARE value text; expiry timestamptz;
BEGIN
 INSERT INTO sim_bezakat_runtime.sessions(session_key,expires_at) VALUES(p_key,clock_timestamp()+interval '8 hours') ON CONFLICT DO NOTHING;
 SELECT payload,expires_at INTO value,expiry FROM sim_bezakat_runtime.sessions WHERE session_key=p_key FOR UPDATE;
 IF expiry<=clock_timestamp() THEN RETURN ''; END IF;
 RETURN value;
END $$;
CREATE FUNCTION sim_bezakat_runtime.session_write(p_key text,p_payload text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat_runtime,pg_temp AS $$
BEGIN
 INSERT INTO sim_bezakat_runtime.sessions VALUES(p_key,p_payload,clock_timestamp()+interval '8 hours')
 ON CONFLICT(session_key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at;
 RETURN true;
END $$;
CREATE FUNCTION sim_bezakat_runtime.session_delete(p_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat_runtime,pg_temp AS $$
BEGIN DELETE FROM sim_bezakat_runtime.sessions WHERE session_key=p_key;RETURN true;END $$;
CREATE FUNCTION sim_bezakat_runtime.session_gc() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat_runtime,pg_temp AS $$
DECLARE removed integer;
BEGIN
 DELETE FROM sim_bezakat_runtime.sessions WHERE session_key IN
   (SELECT session_key FROM sim_bezakat_runtime.sessions WHERE expires_at<=clock_timestamp() FOR UPDATE SKIP LOCKED LIMIT 100);
 GET DIAGNOSTICS removed=ROW_COUNT;
 DELETE FROM sim_bezakat_runtime.login_attempts WHERE login_key IN
   (SELECT login_key FROM sim_bezakat_runtime.login_attempts WHERE expires_at<=clock_timestamp() FOR UPDATE SKIP LOCKED LIMIT 100);
 RETURN removed;
END $$;
CREATE FUNCTION sim_bezakat_runtime.login_attempt(p_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat_runtime,pg_temp AS $$
DECLARE accepted boolean;
BEGIN
 INSERT INTO sim_bezakat_runtime.login_attempts VALUES(p_key,1,clock_timestamp()+interval '15 minutes')
 ON CONFLICT(login_key) DO UPDATE SET
   attempts=CASE WHEN sim_bezakat_runtime.login_attempts.expires_at<=clock_timestamp() THEN 1 ELSE sim_bezakat_runtime.login_attempts.attempts+1 END,
   expires_at=CASE WHEN sim_bezakat_runtime.login_attempts.expires_at<=clock_timestamp() THEN clock_timestamp()+interval '15 minutes' ELSE sim_bezakat_runtime.login_attempts.expires_at END
 WHERE sim_bezakat_runtime.login_attempts.expires_at<=clock_timestamp() OR sim_bezakat_runtime.login_attempts.attempts<10
 RETURNING true INTO accepted;
 RETURN coalesce(accepted,false);
END $$;
CREATE FUNCTION sim_bezakat_runtime.login_clear(p_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat_runtime,pg_temp AS $$
BEGIN DELETE FROM sim_bezakat_runtime.login_attempts WHERE login_key=p_key;RETURN true;END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA sim_bezakat_runtime FROM PUBLIC,sim_bezakat_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA sim_bezakat_runtime FROM PUBLIC;
GRANT USAGE ON SCHEMA sim_bezakat_runtime TO sim_bezakat_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sim_bezakat_runtime TO sim_bezakat_app;
COMMIT;
