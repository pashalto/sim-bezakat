# SIM-BEZAKAT Student Portal

Portal pemantauan Beasiswa Zakat Indonesia untuk awardee, koordinator, LAZ, dan Kemenag. Versi ini memakai desain Figma Make dengan Next.js, React, TypeScript, dan Tailwind. Portal lokal menyimpan draf lewat API Next.js ke PostgreSQL. Proyek juga memuat koleksi dan rute Payload dari ekspor Figma.

## Menjalankan demo tanpa database

Gunakan Node.js 24.22.1 atau lebih baru. Dari folder repo, buka PowerShell di subfolder `sim-bezakat-source` yang berisi `package.json`. Perintah instalasi berikut memakai pnpm 10.34.3 sesuai lockfile.

```powershell
npx.cmd --yes pnpm@10.34.3 install --frozen-lockfile
npm.cmd run config:init
```

Di `.env.local`, pertahankan `BEZAKAT_STORAGE=demo` dan isi sendiri `BEZAKAT_DEMO_PASSWORD` untuk login. Kolom koneksi database dapat dibiarkan seperti contoh. Kata sandi demo digunakan di server. Simpan file, lalu masuk memakai ID awardee fiktif `BZI-251-0000001` dan kata sandi yang baru kamu pilih. Perubahan data demo disimpan di browser masing-masing.

```powershell
npm.cmd run build
npm.cmd run start
```

Buka alamat lokal yang ditampilkan di terminal. Untuk mengedit portal sambil melihat perubahan, jalankan `npm.cmd run dev`. Konfigurasi deployment mode demo menggunakan variabel server yang sama.

## Menjalankan dengan PostgreSQL di Windows

1. Buka folder **sim-bezakat-source** yang berisi `package.json`. Dari File Explorer, buka Terminal di folder tersebut. Siapkan Node.js 24.22.1 atau lebih baru dan PostgreSQL lokal (pengujian menggunakan PostgreSQL 18).
2. Pasang dependensi sesuai lockfile dan buat konfigurasi lokal satu kali.

   ```powershell
   npx.cmd --yes pnpm@10.34.3 install --frozen-lockfile
   npm.cmd run config:init
   ```

3. Jika memakai komputer dan database SIM-BEZAKAT yang sudah terpasang, gunakan nilai koneksi lokal yang sudah Anda miliki di langkah 4. Untuk **database baru**, jalankan perintah berikut melalui PowerShell. Sesuaikan lokasi `psql.exe` jika berbeda. Masukkan password ketika terminal memintanya. Skrip menyiapkan database `sim_bezakat_dev`, akun pembuat skema `sim_bezakat_migrator`, dan akun aplikasi `sim_bezakat_app`.

   ```powershell
   & 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -X -h 127.0.0.1 -p 5432 -U postgres -W -d postgres -f database/setup/01_project_roles.psql
   ```

4. Buka `.env.local` dengan editor. Atur `BEZAKAT_STORAGE=postgres`. Isi `BEZAKAT_DB_PASSWORD` dengan password akun aplikasi dan `BEZAKAT_MIGRATION_PASSWORD` dengan password migrator. Pertahankan kunci sesi acak yang dibuat oleh `config:init`. Untuk akun fiktif pada instalasi baru, pilih sendiri `BEZAKAT_DEMO_PASSWORD` (maksimal 72 byte) dan simpan file. File `.env.example` adalah contoh yang boleh masuk ke Git.
5. Pasang migrasi dan periksa koneksi. Migrasi yang sudah tercatat akan dilewati.

   ```powershell
   npm.cmd run db:migrate
   npm.cmd run db:check
   ```

6. **Khusus database pengembangan kosong**, jalankan `npm.cmd run db:seed` untuk membuat akun dan laporan fiktif. Seed membatalkan proses jika sudah ada akun. Akun lama tetap memakai kata sandi yang sudah dimiliki.
7. Jalankan `npm.cmd run dev`, atau klik dua kali **Jalankan Portal.cmd**. Buka alamat **Local** yang tercetak di terminal (biasanya `http://127.0.0.1:3000`). Biarkan terminal terbuka selama menggunakan portal. Tekan Ctrl+C untuk berhenti.

## Mencoba portal

| Peran | ID fiktif setelah seed |
| --- | --- |
| Awardee | BZI-251-0000001 |
| Koordinator | BZI-251-0000004 |
| Pengelola LAZ | BZI-251-0000005 |
| Pengelola Kemenag | BZI-251-0000006 |

Gunakan kata sandi yang Anda pilih saat seed. Untuk mencoba menyimpan laporan yang masih kosong, masuk sebagai awardee **BZI-251-0000007** pada database yang baru diberi seed, buka **Laporan Bulanan**, isi jawaban, lalu klik **Simpan Draft**. Muat ulang halaman dan buka laporan kembali. Perintah `npm.cmd run db:verify` memeriksa record langsung di database. Server perlu mempunyai periode yang sedang terbuka untuk membuat draf baru.

Untuk melihat simulasi desain tanpa PostgreSQL, isi `BEZAKAT_STORAGE=demo` dan `BEZAKAT_DEMO_PASSWORD` di `.env.local`, lalu mulai ulang server. Mode ini memakai data fiktif dan penyimpanan browser. Kembalikan nilainya ke `postgres` untuk memakai data database.

## Memeriksa build lokal

Jalankan `npm.cmd run typecheck` dan `npm.cmd run build`. Setelah build selesai, `npm.cmd run start` menjalankan portal dan API hasil kompilasi. Untuk pengembangan sehari-hari gunakan `npm.cmd run dev`. Rute CMS Payload memerlukan konfigurasi Figma tersendiri dan hanya disertakan pada build yang terhubung ke lingkungan Figma.

## Isi proyek

- `src/components` dan `src/app/(frontend)` berisi tampilan portal dan API. Aset bawaan desain berada di `public`.
- `src/server` memuat autentikasi, koneksi PostgreSQL, dan pembacaan data sesuai peran.
- `database/migrations` berisi lima migrasi. Migrasi 005 menambahkan penghapusan isian draf periode aktif yang belum pernah diajukan. Migrasi 004 menambahkan fungsi baca untuk dashboard, profil, dokumen, riwayat, dan monitoring pengelola.
- `database/seeds` berisi contoh fiktif. `database/tests` berisi pemeriksaan SQL untuk database uji. Pengujian hash pada 002 membutuhkan parameter sesi `sim_bezakat.test_password` yang sesuai dengan seed uji.
- `npm.cmd run typecheck` memeriksa TypeScript. Login, baca data, dan simpan draf tersedia pada mode PostgreSQL. Pengajuan akhir, verifikasi, edit profil, dan unggahan melalui portal masih dalam pengembangan.

Simpan kata sandi di `.env.local` pada komputermu. Repo hanya menyertakan templat `.env.example`.
