# SIM-BEZAKAT

Portal monitoring penerima Beasiswa Zakat Indonesia untuk awardee, koordinator, pengelola LAZ, dan Kemenag. Aplikasi ini memakai **PHP native, PostgreSQL, HTML/CSS, dan JavaScript biasa**. Tidak memakai server Next.js/React/TypeScript.

## Fitur

- Login menggunakan `id_beasiswa`, logout, PHP session, serta pembatasan akses sesuai peran dan cakupan akun.
- Dashboard, profil, transkrip/KHS, metadata keuangan, rekapitulasi, dan monitoring awardee.
- Formulir laporan bulanan dengan 8 bagian dan 72 pertanyaan, pilihan tunggal/jamak, jawaban lainnya, dan daftar kegiatan.
- Simpan dan kosongkan isian draf ke PostgreSQL; konflik versi draf ditolak.
- Pemeriksaan koordinator per bagian/dokumen, persetujuan atau penolakan, dan penyimpanan batch dalam transaksi.
- Laporan cetak A4 yang dapat disimpan sebagai PDF melalui browser.
- Tampilan desktop dan ponsel dengan aset, ikon, font lokal, dan desain portal yang sudah ada.

**Batas fitur:** edit profil, unggah foto/KHS/keuangan, unduh file fisik, dan pengajuan akhir laporan belum tersambung pada jalur PostgreSQL. Halamannya tetap tersedia sebagai tampilan hanya baca/fitur dinonaktifkan. LAZ dan Kemenag memakai monitoring hanya baca. Konfirmasi uang bulanan merupakan simulasi dalam session, bukan catatan pembayaran PostgreSQL. Metadata berkas dalam seed tidak berarti file fisiknya tersedia.

## Kebutuhan dan dependensi

- PHP 8.2 atau lebih baru, dengan `pdo_pgsql`, `mbstring`, `session`, dan JSON.
- PostgreSQL 18 adalah versi yang telah diuji.
- Browser modern.
- Opsional: Apache dengan `mod_rewrite`, atau gunakan server bawaan PHP untuk pengembangan.

Tidak ada paket Composer/npm yang perlu diinstal. Seluruh kode runtime memakai fasilitas bawaan PHP dan aset lokal; karena itu tidak ada `composer.lock`, `package.json`, atau lockfile npm yang digunakan. CSS `public/assets/portal.css` adalah aset distribusi yang **diperlukan saat runtime**, bukan cache yang boleh dihapus.

Periksa ekstensi PHP:

```powershell
php --version
php -m
```

Jika menggunakan XAMPP, aktifkan `extension=pdo_pgsql` dan `extension=mbstring` pada `php.ini` yang dipakai PHP. Mulai ulang proses PHP/Apache setelah mengubah konfigurasi.

## Konfigurasi lokal

Buka terminal di root repository ini. Buat konfigurasi privat satu kali:

```powershell
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Edit `.env.local` di editor lokal:

```dotenv
BEZAKAT_DB_HOST=127.0.0.1
BEZAKAT_DB_PORT=5432
BEZAKAT_DB_NAME=sim_bezakat_dev
BEZAKAT_DB_USER=sim_bezakat_app
BEZAKAT_DB_PASSWORD=""
BEZAKAT_ENABLE_PREVIEW=0
```

Isi password akun aplikasi pada file privat tersebut. Nilai environment proses mengungguli `.env.local`. Jangan commit konfigurasi lokal, kredensial migrator, sesi, atau dump database.

### Menggunakan database yang sudah ada

Gunakan database dan kredensial aplikasi yang sudah disiapkan; **jangan jalankan alat pembuatan database atau seed ulang**. Kontrak aplikasi mengikuti skema `sim_bezakat` dari SQL versi 1–7 dalam repository ini. PK/FK tetap numerik; `id_beasiswa` adalah ID bisnis untuk login, bukan pengganti primary key.

Konfigurasi runtime mempertahankan batas proyek: koneksi lokal ke `sim_bezakat_dev` sebagai `sim_bezakat_app`. Role aplikasi harus non-owner, bukan superuser, tanpa hak membuat database/role, bypass RLS, atau keanggotaan role lain. Seluruh kueri runtime memakai PDO PostgreSQL; input menggunakan prepared statements asli.

Periksa kesiapan koneksi secara baca-saja:

```powershell
php tools/db-check.php
```

Skema lama yang berbeda tidak dapat digunakan hanya dengan mengganti nama database. Jangan menjalankan SQL ini untuk menimpa struktur/data lama tanpa menyiapkan rencana migrasi dan persetujuan pemilik data.

### Menyiapkan database pengembangan BARU

Langkah ini hanya untuk instalasi kosong yang memang ingin membuat database baru bernama `sim_bezakat_dev`. Alat menolak jika database atau role target sudah ada. Tidak ada migrasi/seed otomatis saat membuka aplikasi.

Jika autentikasi admin PostgreSQL lokal memerlukan password, masukkan melalui prompt tersembunyi PowerShell:

```powershell
$setupCredential = Get-Credential -UserName postgres -Message 'Admin PostgreSQL lokal untuk database pengembangan baru'
$env:BEZAKAT_ADMIN_PASSWORD = $setupCredential.GetNetworkCredential().Password
try {
    php tools/create-test-database.php --create-new-dev
} finally {
    Remove-Item Env:BEZAKAT_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable setupCredential -ErrorAction SilentlyContinue
}
```

Jika server lokal sudah mengizinkan koneksi admin tanpa password, cukup jalankan perintah PHP di atas tanpa menyiapkan variabel admin.

Alat memakai admin hanya untuk membuat role terbatas dan database baru, kemudian menjalankan SQL 001–007 sebagai migrator. Seed fiktif dipasang ke database kosong. Password aplikasi/migrator dan password akun fiktif dibuat secara lokal; nilai tersebut tidak dibundel dalam repository. Jangan ulangi alat ini sebagai cara memperbarui database berisi data.

SQL struktur terletak pada `database/migrations/`; seed fiktif pada `database/seeds/001_demo.sql`. Seed memerlukan hash yang disediakan alat penyiapan, sehingga tidak dijalankan sendiri tanpa parameter yang sesuai. Tidak ada dump database asli dalam repository.

## Menjalankan aplikasi

```powershell
php -S 127.0.0.1:8088 -t public router.php
```

Buka [http://127.0.0.1:8088](http://127.0.0.1:8088). Biarkan terminal tetap terbuka; Ctrl+C menghentikan server. Jika port dipakai proses lain, pilih port kosong, misalnya `8089`. Alternatif Windows: `Jalankan Portal.cmd`; sesuaikan lokasi PHP jika instalasi XAMPP berbeda.

Untuk Apache, arahkan **DocumentRoot ke `public/`**, aktifkan `mod_rewrite`, dan izinkan `.htaccess`. URL aplikasi mengacu root host. Jangan menjadikan seluruh repository sebagai document root.

PHP harus dapat menulis direktori `storage/` untuk session dan log. Repository hanya menyertakan `.gitkeep`; berkas runtime akan dibuat lokal dan diabaikan Git. Kredensial dan storage tidak boleh disajikan oleh web server.

### Akun fiktif setelah seed baru

| Peran | ID login |
| --- | --- |
| Awardee | `BZI-251-0000001` atau `BZI-251-0000007` |
| Koordinator A | `BZI-251-0000004` |
| Koordinator B | `BZI-251-0000008` |
| Pengelola LAZ A | `BZI-251-0000005` |
| Pengelola Kemenag | `BZI-251-0000006` |

Password akun fiktif dihasilkan saat setup dan disimpan sebagai `BEZAKAT_TEST_PASSWORD` di `.env.local` milik instalasi tersebut. Tidak ada password login bersama yang dipublikasikan. Autentikasi tetap memeriksa hash PostgreSQL, bukan variabel password demo. Pada database yang sudah ada, gunakan akun/password yang sudah dimiliki.

## Struktur repository

```text
app/                  bootstrap, PDO, session, validasi, aturan bisnis, renderer
views/                halaman dan bagian tampilan PHP yang dapat dipakai ulang
public/               document root, endpoint PHP, gambar, CSS, font, JavaScript
database/migrations/  SQL struktur PostgreSQL berurutan 001–007
database/seeds/       data contoh fiktif, tanpa kredensial asli
tools/                diagnosis koneksi dan penyiapan database baru
tests/                uji validasi/render dan fixture fiktif
storage/              direktori runtime privat; hanya .gitkeep disertakan
docs/                 catatan pemeriksaan kesiapan repository
router.php            router server bawaan PHP
.env.example          contoh konfigurasi tanpa rahasia
```

Navigasi memakai `?page=...`. API PHP berada di `/api.php?action=login|logout|session|drafts|reviews|receipt`; alias `/api/portal/...` tersedia melalui router. Mutasi memerlukan Origin yang cocok dan token CSRF dari halaman. Identitas aktor diperoleh dari session server.

## Pengujian

```powershell
php tests/validation.php
php tests/render.php
php tools/db-check.php
```

Dua uji pertama tidak membutuhkan koneksi database. Uji koneksi membutuhkan konfigurasi lokal, hanya membaca metadata/view, dan tidak mengubah skema/data. Fixture dalam `tests/` sepenuhnya fiktif; pasangan password/hash pada `bcrypt-fixture.json` hanya vektor uji kompatibilitas bcrypt, bukan kredensial akun aplikasi.

Status pengujian salinan repository dicatat di `docs/REPOSITORY-CHECK.md`. Screenshot, log, sesi dan keluaran pengujian lokal tidak disertakan. Aplikasi asli yang sudah berjalan tetap berada di folder sumber terpisah.

## Menyiapkan GitHub Public

Pastikan repository GitHub tujuan masih kosong (tanpa README/commit awal) agar urutan berikut dapat digunakan langsung. Jalankan **di root folder ini**, bukan folder induk yang mungkin memiliki `.git` lain:

```powershell
git init -b main
git status --short
git add .
git diff --cached --stat
git diff --cached --name-only
git commit -m "Prepare SIM-BEZAKAT native PHP application"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

Ganti URL placeholder dengan repository tujuan. Periksa daftar staged sebelum commit: `.env.local`, sesi, log, dump, unggahan dan kredensial migrator tidak boleh muncul. Gunakan autentikasi GitHub melalui credential manager/SSH; jangan menaruh token pada URL remote. Jika remote sudah berisi commit, selaraskan riwayat terlebih dahulu dan jangan memakai force push secara otomatis.

Folder distribusi ini tidak menyertakan `.git` sumber. Persiapan berkas tidak melakukan commit, perubahan riwayat, push, atau publikasi otomatis.
