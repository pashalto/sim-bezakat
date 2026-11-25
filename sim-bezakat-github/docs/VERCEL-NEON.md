# Deploy PHP SIM-BEZAKAT ke Vercel dan PostgreSQL Neon

Perubahan ini hanya menyiapkan berkas lokal. Tidak ada commit, push, deploy, penambahan environment remote, atau perubahan database Neon yang dilakukan otomatis. Desain, CSS/font/ikon, serta alur laporan awardee dan pemeriksaan koordinator dipertahankan.

## Runtime dan pengaturan proyek Vercel

`vercel.json` mematok **`vercel-php@0.9.0` (PHP 8.5)**. Dokumentasi runtime menyertakan `pdo_pgsql`, `mbstring`, session, dan OpenSSL. Runtime ini dikelola komunitas, bukan runtime resmi yang didukung Vercel; keberhasilan build aktual tetap harus diperiksa pada proyek Anda. Rujukan: [runtime PHP](https://github.com/vercel-community/php), [Vercel runtimes](https://vercel.com/docs/functions/runtimes).

Pada **proyek Vercel yang sudah ada**, ubah Settings → Build and Deployment:

| Pengaturan | Nilai |
| --- | --- |
| Root Directory | `sim-bezakat-github` jika folder ini masih di dalam repository induk; `.`/kosong jika isi folder ini menjadi root repository tersendiri |
| Framework Preset | **Other**, bukan Next.js |
| Build Command | Kosong; hapus override `next build`/`npm run build` lama |
| Install Command | Kosong; tidak ada paket Composer/npm aplikasi |
| Output Directory | `.`; cocok dengan `vercel.json`, bukan `.next`, `dist`, atau `public` |
| Node.js Version | **22.x**, untuk launcher runtime komunitas; aplikasi tetap PHP |
| Enable access to System Environment Variables | Aktif pada bagian Environment Variables, agar `VERCEL=1` tersedia untuk cookie HTTPS dan guard driver sesi |
| Function region | Pilih region yang dekat dengan compute Neon Anda |

Jangan menunjuk Root Directory ke `public/`: entrypoint `api/`, konfigurasi Vercel, `app/`, dan `views/` harus terlihat oleh builder. Jika dashboard masih memiliki override dari proyek Next.js lama, hapus/selaraskan dengan berkas konfigurasi ini.

Satu fungsi `api/index.php` menangani halaman utama, API dan ekspor. Rute:

| URL portal | Target |
| --- | --- |
| `/`, `/index.php` beserta query `page`, `period`, `section`, `year`, `panel` | Fungsi PHP → `public/index.php` |
| `/api.php?action=...` | Fungsi PHP → `public/api.php` |
| `/api/portal/login`, `logout`, `session`, `drafts`, `reviews`, `receipt` | Fungsi PHP → API dengan action sesuai path |
| `/export.php?period=...` | Fungsi PHP → ekspor terautentikasi |
| `/assets/*`, `/favicon.svg`, `/logo-bezakat.png` | Aset statis di `public/` |
| URL lainnya, termasuk `/app`, `/storage`, `/database`, `.env` dan `/public/api.php` | 404 |

Output root `.` dipasangkan dengan allowlist rute eksplisit dan tanpa fallback filesystem publik. `.vercelignore` serta `excludeFiles` menyingkirkan environment lokal, storage, alat CLI, SQL, tes, dan dokumen dari deployment/bundle. `app/` dan `views/` tetap masuk function bundle karena dibutuhkan PHP. Jangan mengganti catch-all 404 dengan aturan filesystem yang menyajikan berkas privat sebagai statis. Konfigurasi: [referensi Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Environment variables yang diisi di Vercel

Isi pada Settings → Environment Variables untuk environment **Production** yang dituju. Preview sebaiknya memakai branch Neon uji terpisah; jangan menguji penulisan preview ke data produksi.

| Nama | Isi |
| --- | --- |
| `BEZAKAT_DB_HOST` | Host Neon untuk role aplikasi; gunakan endpoint pooled, contoh `ep-YOUR-ENDPOINT-pooler.YOUR-REGION.aws.neon.tech` (host saja) |
| `BEZAKAT_DB_PORT` | `5432` |
| `BEZAKAT_DB_NAME` | `sim_bezakat_dev` agar SQL 001–007 dapat digunakan tanpa mengubah guard nama database |
| `BEZAKAT_DB_USER` | `sim_bezakat_app`, bukan owner/admin Neon |
| `BEZAKAT_DB_PASSWORD` | Password role aplikasi Neon; isi sebagai nilai rahasia di dashboard |
| `BEZAKAT_DB_SSLMODE` | `verify-full` |
| `BEZAKAT_SESSION_DRIVER` | `postgres` |
| `BEZAKAT_ENABLE_PREVIEW` | `0`; pratinjau fiktif juga diblokir kode ketika `VERCEL=1` |
| `BEZAKAT_DB_SSLROOTCERT` | Opsional. Kosongkan jika CA sistem terdeteksi; jika diperlukan, isi path CA yang benar dan tersedia dalam runtime |

`VERCEL=1` disediakan platform; jangan menaruh kredensial admin/migrator atau `BEZAKAT_TEST_PASSWORD` pada runtime production. `DATABASE_URL` yang dibuat integrasi Neon tidak dibaca otomatis: pilih role **sim_bezakat_app** pada dialog Connect Neon dan petakan komponen koneksinya ke variabel di atas. Jangan menggunakan URL default owner/admin sebagai pengganti role aplikasi.

Isi nilai dashboard tanpa pembungkus tanda kutip. Petunjuk penanda platform: [system environment variables Vercel](https://vercel.com/docs/environment-variables/system-environment-variables).

Koneksi remote dibatasi ke host Neon dan memverifikasi sertifikat TLS. Tidak ada downgrade otomatis ke SSL nonaktif atau fallback ke localhost. CA Linux umum dideteksi dari sistem. Bila CA tidak tersedia/handshake gagal pada cloud, perbaiki paket/path CA dan uji koneksi; jangan mengganti `verify-full` menjadi `disable`. Lihat [koneksi aman Neon](https://neon.com/docs/connect/connect-securely).

## Menyiapkan role dan database Neon

**Jangan gunakan `tools/create-test-database.php` untuk Neon.** Alat itu khusus PostgreSQL lokal. Neon tidak menyediakan login OS/superuser PostgreSQL biasa. Role yang dibuat melalui Console/API dapat memiliki keanggotaan `neon_superuser`; role runtime harus dibuat melalui SQL dengan hak minimum. Rujukan: [Neon roles](https://neon.com/docs/manage/roles).

Untuk **instalasi Neon baru yang kosong**, dari root proyek gunakan `psql` dengan **endpoint direct/non-pooler** dan role admin project Neon. Password diminta dengan `-W`; jangan menaruh password pada URL/argumen yang dikomit.

```powershell
psql -X -W -v ON_ERROR_STOP=1 "host=YOUR-DIRECT-HOST.neon.tech port=5432 dbname=YOUR-ADMIN-DATABASE user=YOUR-NEON-ADMIN sslmode=verify-full" -f database/deploy/000_neon_roles.psql
```

Sesuaikan semua placeholder dari dialog Connect Neon dan konfigurasi CA pada komputer yang menjalankan psql bila diperlukan. Skrip:

1. Menolak jika role atau database target sudah ada.
2. Membuat `sim_bezakat_migrator` dan `sim_bezakat_app` melalui SQL, tanpa membership `neon_superuser` pada role aplikasi.
3. Memberi membership migrator sementara kepada admin pembuat hanya untuk membuat database ber-owner migrator, lalu mencabutnya kembali.
4. Membuat `sim_bezakat_dev` dengan owner `sim_bezakat_migrator`.
5. Mengatur timeout pada role aplikasi dan meminta password kedua role melalui prompt tersembunyi `\password`.

Gunakan password unik yang memenuhi persyaratan Neon. Runtime aplikasi harus **bukan owner database**, tanpa `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `BYPASSRLS`, replication, atau keanggotaan role lain. Pemeriksaan ini tetap dilakukan oleh `app/database.php`. Role migrator memiliki objek skema/fungsi, tetapi tidak digunakan untuk melayani HTTP.

Jika database/role sudah ada, **jangan menjalankan ulang setup 000 atau memaksakan DROP**. Periksa owner, hak akses, dan versi skema terlebih dahulu. Bila skema domain sudah versi 7, jangan ulangi SQL 001–007. Bila nama database Neon berbeda dari `sim_bezakat_dev`, kode koneksi dapat menerimanya, tetapi SQL asal 003–007 dan seed mempunyai guard nama: pilih database baru bernama sesuai guard, atau minta penyesuaian migrasi secara terpisah; jangan menghapus guard secara otomatis.

## Memasang skema 001–007, lalu state serverless

Hubungkan **langsung sebagai migrator**, bukan melalui `-pooler`. Dari root repository, contoh PowerShell berikut menjalankan masing-masing berkas sekali. Hentikan jika salah satu perintah gagal.

```powershell
$migrationConnection = 'host=YOUR-DIRECT-HOST.neon.tech port=5432 dbname=sim_bezakat_dev user=sim_bezakat_migrator sslmode=verify-full'
$migrationFiles = @(
  'database/migrations/001_initial.sql',
  'database/migrations/002_id_beasiswa.sql',
  'database/migrations/003_portal_drafts.sql',
  'database/migrations/004_portal_overview.sql',
  'database/migrations/005_clear_draft.sql',
  'database/migrations/006_coordinator_reviews.sql',
  'database/migrations/007_edit_coordinator_reviews.sql',
  'database/deploy/008_serverless_state.sql'
)
foreach ($file in $migrationFiles) {
  psql -X -W -v ON_ERROR_STOP=1 $migrationConnection -f $file
  if ($LASTEXITCODE -ne 0) { throw "Gagal pada $file; jangan lanjutkan." }
}
```

Migrasi 001–007 dipertahankan apa adanya. `008_serverless_state.sql` adalah **tambahan deployment yang wajib** untuk driver `postgres`: dua tabel terpisah pada schema `sim_bezakat_runtime` untuk sesi dan pembatas login. Tidak mengubah tabel domain, PK/FK, atau nomor `sim_bezakat.schema_version` (tetap 7). Skrip 008 hanya dijalankan sekali setelah 007, sebagai migrator. Tidak dijalankan oleh build atau request web.

Akun aplikasi memperoleh USAGE schema dan EXECUTE fungsi state yang terbatas, **tanpa SELECT/INSERT/UPDATE/DELETE langsung** ke tabel sesi. Domain grants tetap dari SQL asal: view login dan fungsi `portal_*`, bukan grant CRUD global. Untuk role aplikasi yang sudah ada, admin dapat menyelaraskan timeout sebelum pemakaian pool baru:

```sql
ALTER ROLE sim_bezakat_app SET statement_timeout = '10s';
ALTER ROLE sim_bezakat_app SET lock_timeout = '5s';
ALTER ROLE sim_bezakat_app SET idle_in_transaction_session_timeout = '25s';
```

Seed `database/seeds/001_demo.sql` **opsional hanya pada database/branch uji kosong**, memerlukan parameter hash `sim_bezakat.seed_hashes`, dan tidak boleh dijalankan terhadap data nyata. Contoh seed tidak otomatis menjadi akun production. Siapkan akun/data secara terkontrol melalui proses administrasi database yang sudah disepakati; tidak menambahkan fitur signup atau pengajuan akhir yang belum tersedia pada portal asal.

## Bagaimana sesi bertahan antar-request

PHP session memakai cookie host-only, HttpOnly, SameSite Strict, serta Secure ketika berjalan di Vercel. SID mentah hanya berada pada cookie; database menyimpan hash SID dan payload sesi, dengan expiry delapan jam. Regenerasi ID saat login dan invalidasi saat logout tetap berlaku.

Handler PostgreSQL membuka koneksi khusus dan transaksi row-lock selama read–write sesi. Koneksi operasi portal terpisah, sehingga transaksi pemeriksaan tidak bertabrakan dengan transaksi sesi. Tidak menggunakan berkas `/tmp`, koneksi persisten, atau advisory lock tingkat session. Pembatas 10 percobaan/15 menit per ID juga disimpan bersama, bukan file instance. GC menghapus state kedaluwarsa dalam batch terbatas.

Neon memakai transaction pooling; karena itu kueri schema-qualified dan parameter native dipakai tanpa `SET` session atau state prepared-statement bernama. Timeout diatur pada role, sedangkan migrasi memakai direct endpoint. Rujukan: [Neon pooling](https://neon.com/docs/connect/connection-pooling).

Setelah SQL dan environment tersedia, pemeriksaan lokal jarak jauh (dengan kredensial pada environment lokal privat) dapat dilakukan melalui `php tools/db-check.php`. Jangan menaruh endpoint `phpinfo` atau diagnosis yang membocorkan environment di Vercel.

## Pengujian lokal yang selesai

- Pemeriksaan sintaks: seluruh 56 berkas PHP lolos; struktur `vercel.json` lolos validator terhadap properti schema resmi Vercel.
- Uji validasi asal: 35 pemeriksaan lolos.
- Uji render awardee/staf/ekspor: 23 kombinasi lolos.
- Uji konfigurasi/rute/TLS/driver: 25 pemeriksaan lolos (`tests/deployment.php`).
- Uji handler PostgreSQL: 10 pemeriksaan lolos (`tests/serverless-state.php --allow-state-test`, hanya branch/database uji).
- Integrasi HTTP pada **cluster PostgreSQL sementara terisolasi**: 30 pemeriksaan lolos, termasuk penerapan 001–007 + 008, login dua peran, sesi antar-dua proses PHP dan sesudah restart, request bersamaan, simpan/hapus draf lintas proses, ekspor, rate limit bersama, logout dan cookie lama, expiry, serta larangan akses langsung tabel state.
- Tidak ada sesi/file pembatas login yang dibuat saat driver PostgreSQL aktif. Tidak ada database aplikasi yang sudah ada atau Neon yang diubah oleh pengujian ini.
- Pemeriksaan hash: 48 berkas UI/aset dan tujuh migrasi domain identik dengan sumber; tidak ada perubahan desain. Cluster dan proses PHP uji sementara sudah dihentikan setelah selesai.

Pemeriksaan yang tidak menulis database:

```powershell
php tests/validation.php
php tests/render.php
php tests/deployment.php
php tools/db-check.php
```

Uji state menulis sesi sintetis dan menjalankan pembersihan state kedaluwarsa; gunakan branch uji terpisah. Kode UI, CSS, JS, font, ikon, serta SQL domain tetap dipertahankan; tidak ada redesain portal.

## Wajib diperiksa setelah Anda deploy

Belum ada build/deploy Vercel atau koneksi Neon langsung yang diuji karena pekerjaan dibatasi workspace dan tidak disediakan environment remote. Lakukan checklist berikut setelah commit/push/deploy sendiri:

1. Build log memakai runtime PHP 8.5; tidak menjalankan build Next.js. `pdo_pgsql`, `mbstring` dan CA TLS tersedia.
2. Login page, logo, font/CSS/JS termuat, termasuk ukuran ponsel. Query `page`, `period`, `section`, dan `year` tetap diteruskan oleh rewrite.
3. Login awardee dan koordinator, token CSRF pada POST/PUT/DELETE, serta cookie Secure pada domain production.
4. Sesi tetap ada setelah refresh, jeda/cold start, dan request ke instance lain. Logout menolak penggunaan cookie lama.
5. Simpan draf, reload, hapus draf, konflik versi, serta pemeriksaan/revisi koordinator pada **data uji**; cek commit/rollback PostgreSQL.
6. Ekspor dengan sesi berhasil; akun di luar scope/anonim ditolak.
7. Akses `.env`, `/app`, `/storage`, `/database`, dan PHP privat menghasilkan 404. Endpoint sesi anonim menghasilkan 401; kredensial owner/admin tidak pernah ada pada function environment.
8. Neon SQL role sesuai hak minimum, koneksi pooled berhasil dengan `verify-full`, dan timeout/latensi/cold start sesuai kebutuhan. Uji transaksi terhadap pooler Neon yang sebenarnya; pengujian lokal menggunakan PostgreSQL direct.

Jika deployment gagal, periksa log privat platform tanpa mempublikasikan connection string/password. Jangan menurunkan verifikasi TLS, menambahkan role owner ke runtime, atau mengalihkan sesi ke file untuk melewati kegagalan konfigurasi.
