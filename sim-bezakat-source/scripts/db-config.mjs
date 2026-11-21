// Modul Node backend/CLI. Jangan diimpor dari komponen client.
export function dbConfig(migration = false) {
  const name = process.env.BEZAKAT_DB_NAME
  const host = process.env.BEZAKAT_DB_HOST
  const port = Number(process.env.BEZAKAT_DB_PORT || 5432)
  const user = migration ? process.env.BEZAKAT_MIGRATION_USER : process.env.BEZAKAT_DB_USER
  const password = migration ? process.env.BEZAKAT_MIGRATION_PASSWORD : process.env.BEZAKAT_DB_PASSWORD
  if (name !== 'sim_bezakat_dev' || !['127.0.0.1','localhost','::1'].includes(host || '') ||
      !Number.isInteger(port) || port < 1 || port > 65535 ||
      user !== (migration ? 'sim_bezakat_migrator' : 'sim_bezakat_app') || !password) {
    throw new Error('DB_CONFIG_INVALID')
  }
  return { host, port, database:name, user, password, connectionTimeoutMillis:5000,
    statement_timeout:10000, application_name:'sim-bezakat-local', ssl:false }
}
export async function assertTarget(client, migration = false) {
  const {rows:[r]} = await client.query(`SELECT current_database() AS db, current_user AS usr,
    r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls, r.rolreplication,
    d.datdba=r.oid AS owns_db,
    EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS has_memberships
    FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user`)
  if (!r || r.db !== 'sim_bezakat_dev' || r.usr !== (migration ? 'sim_bezakat_migrator':'sim_bezakat_app') ||
      r.rolsuper || r.rolcreatedb || r.rolcreaterole || r.rolbypassrls || r.rolreplication || r.has_memberships ||
      (migration ? !r.owns_db : r.owns_db)) throw new Error('DB_TARGET_UNSAFE')
}
