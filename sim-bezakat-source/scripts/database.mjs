import { hash, genSalt } from 'bcryptjs'
import { Client } from 'pg'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dbConfig, assertTarget } from './db-config.mjs'

// Tidak pernah mencetak error asli, parameter, env, hash, atau password.
// Uji terisolasi menyediakan konfigurasi melalui environment proses sendiri.
let localConfigLoaded=false
if (!process.argv.includes('--process-env')) {
 try { process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)));localConfigLoaded=true } catch {}
}
const mode=process.argv[2] || 'check'
if(mode==='config-status') {
 console.log(JSON.stringify({fileLoaded:localConfigLoaded,
  hostLocal:['127.0.0.1','localhost','::1'].includes(process.env.BEZAKAT_DB_HOST||''),
  targetCorrect:process.env.BEZAKAT_DB_NAME==='sim_bezakat_dev',
  appUserCorrect:process.env.BEZAKAT_DB_USER==='sim_bezakat_app',
  appPasswordFilled:!!process.env.BEZAKAT_DB_PASSWORD,
  migrationUserCorrect:process.env.BEZAKAT_MIGRATION_USER==='sim_bezakat_migrator',
  migrationPasswordFilled:!!process.env.BEZAKAT_MIGRATION_PASSWORD,
  sessionKeyReady:(process.env.BEZAKAT_SESSION_SECRET?.length||0)>=32},null,2))
 process.exit(0)
}
const useMigration=['migrate','seed','verify','probe'].includes(mode)
let client
try {
 client=new Client(dbConfig(useMigration)); await client.connect(); await assertTarget(client,useMigration)
 if(mode==='probe') {
  const {rows:[r]}=await client.query("SELECT to_regclass('sim_bezakat.schema_version') IS NOT NULL AS exists")
  const versions=r.exists?(await client.query('SELECT version FROM sim_bezakat.schema_version ORDER BY version')).rows.map(v=>v.version):[]
  console.log(JSON.stringify({target:'sim_bezakat_dev',migratorNonSuperuser:true,versions}))
 } else if(mode==='check') {
  await client.query('SELECT * FROM sim_bezakat.v_portal_akun LIMIT 0')
  console.log('OK: backend terhubung ke sim_bezakat_dev sebagai akun aplikasi non-superuser.')
 } else if(mode==='migrate') {
  await client.query("SELECT pg_advisory_lock(hashtext('sim_bezakat_migrations'))")
  const {rows:[r]}=await client.query("SELECT to_regclass('sim_bezakat.schema_version') IS NOT NULL AS exists")
  const done=r.exists ? (await client.query('SELECT version FROM sim_bezakat.schema_version')).rows.map(v=>v.version):[]
  if(done.some(v=>![1,2,3,4,5].includes(v))) throw new Error('SCHEMA_UNKNOWN')
  for (const [version,file] of [[1,'001_initial.sql'],[2,'002_id_beasiswa.sql'],[3,'003_portal_drafts.sql'],[4,'004_portal_overview.sql'],[5,'005_clear_draft.sql']]) {
   if(done.includes(version)) { console.log(`Migration ${version} sudah terpasang; dilewati.`); continue }
   await assertTarget(client,true)
   await client.query(await readFile(new URL('../database/migrations/'+file,import.meta.url),'utf8'))
   console.log(`Migration ${version} berhasil di sim_bezakat_dev.`)
  }
 } else if(mode==='seed') {
  if((await client.query('SELECT count(*)::int AS n FROM sim_bezakat.akun_pengguna')).rows[0].n!==0)
    throw new Error('SEED_NOT_EMPTY')
  const password = process.env.BEZAKAT_DEMO_PASSWORD
  if (!password || Buffer.byteLength(password) > 72) throw new Error('SEED_PASSWORD')
  const hashes = []
  for (let i = 0; i < 9; i++) {
    const salt = (await genSalt(12)).replace('$2b$', '$2a$')
    hashes.push(await hash(password, salt))
  }
  await client.query("SELECT set_config('sim_bezakat.seed_hashes', $1, false)", [JSON.stringify(hashes)])
  await client.query(await readFile(new URL('../database/seeds/001_demo.sql',import.meta.url),'utf8'))
  console.log('Data fiktif ditambahkan ke database kosong; tidak ada akun lama ditimpa.')
 } else if(mode==='verify') {
  const {rows}=await client.query(`SELECT l.id_laporan_bulanan::text AS record_id, a.id_beasiswa,
    p.tahun_anggaran AS tahun,p.bulan,l.versi_draf,l.diperbarui_pada,
    l.jawaban_tambahan->'portal' IS NOT NULL AS isi_portal_tersimpan
    FROM sim_bezakat.laporan_bulanan l JOIN sim_bezakat.akun_pengguna a ON a.id_akun=l.id_awardee
    JOIN sim_bezakat.periode_monitoring p USING(id_periode_monitoring)
    WHERE l.versi_draf>0 ORDER BY l.diperbarui_pada DESC LIMIT 10`)
  console.log(JSON.stringify({database:'sim_bezakat_dev',records:rows},null,2))
 } else throw new Error('MODE_INVALID')
} catch(error) {
 const message = error?.message
 const known={SEED_PASSWORD:'Isi BEZAKAT_DEMO_PASSWORD lokal (maksimal 72 byte).',DB_CONFIG_INVALID:'Konfigurasi belum lengkap atau target bukan database lokal proyek.',
  DB_TARGET_UNSAFE:'Akun/target database tidak sesuai. Tidak ada migration dilanjutkan.',
  SEED_NOT_EMPTY:'Seed dibatalkan: sudah ada akun. Data lama tidak ditimpa.',SCHEMA_UNKNOWN:'Versi skema tidak dikenal. Migration dihentikan.'}
 console.error(known[message] || 'Operasi database gagal. Periksa layanan, dua password lokal, hak akses, dan urutan penyiapan. Detail rahasia tidak dicetak.')
 process.exitCode=1
} finally { if(client) await client.end().catch(()=>{}) }
