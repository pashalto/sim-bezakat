# Pemeriksaan kesiapan repository publik

Tanggal: 25 November 2026.

**Catatan historis:** hasil di bawah mencatat tahap perapian GitHub sebelum penambahan dukungan Vercel/Neon. Untuk perubahan dan verifikasi deploy terbaru, lihat [VERCEL-NEON.md](VERCEL-NEON.md).

## Isi dan struktur

Folder ini adalah satu root aplikasi PHP native, bukan salinan bertingkat dari proyek Next.js. Source awal tetap tersedia di luar folder ini. Tidak ada migrasi bahasa/framework dalam pekerjaan persiapan repository.

Disertakan: `app`, 38 bagian tampilan PHP di `views`, seluruh aset runtime di `public`, router, contoh environment tanpa password, launcher Windows, tujuh SQL migrasi struktur asal, seed fiktif, alat diagnosis/penyiapan database baru, serta uji PHP dengan fixture fiktif. Tidak ada dependensi Composer/npm untuk runtime, sehingga tidak ada manifest/lockfile paket yang digunakan atau dibuat secara semu.

Dikeluarkan: konfigurasi lokal, kredensial aplikasi/migrator/admin, sesi, log, cache, direktori dependensi, build Next.js, alat importer TSX, alat inspeksi dokumen, salinan kode Next.js, screenshot/hasil pengujian yang dapat dibuat ulang, ZIP distribusi lama, dump database asli, unggahan pengguna, dan `.git` sumber. CSS hasil kompilasi dan font lokal tetap disertakan karena merupakan aset yang diperlukan aplikasi PHP.

## Pemeriksaan aplikasi pada salinan ini

| Pemeriksaan | Hasil |
| --- | --- |
| Sintaks PHP | 52 berkas lolos |
| Uji validasi/kontrak data | 35 pemeriksaan lolos |
| Uji render halaman/peran | 23 kombinasi lolos |
| Perbandingan source runtime/aset/SQL dengan sumber yang berjalan | 67 berkas identik byte demi byte |
| Diagnosis PDO pada PostgreSQL yang sudah ada | Berhasil sebagai akun aplikasi terbatas |
| Server PHP dari root baru | Berhasil dijalankan pada port uji sementara |
| Login akun fiktif PostgreSQL | Berhasil |
| Navigasi profil dan laporan, reload data yang sudah tersimpan | Berhasil |
| Pratinjau tanpa sesi | Tidak aktif pada konfigurasi uji akhir |
| Akses HTTP ke konfigurasi, app internal, dan storage | 404 |
| Galat JavaScript browser | Tidak ada pada rangkaian smoke test |
| Aplikasi sumber yang sudah berjalan | Tetap merespons HTTP 200 |

Kredensial koneksi hanya diberikan lewat environment proses selama smoke test, tidak disalin ke folder publik. Server uji salinan dihentikan setelah pemeriksaan; sesi/log yang dihasilkan dibersihkan. Database tidak dibuat ulang, struktur tidak diubah, dan pengujian salinan ini tidak menulis/menghapus laporan.

Uji penulisan CRUD/transaksi menyeluruh tidak diulang dalam tahap perapian ini karena seluruh kode runtime dan SQL identik dengan sumber yang sebelumnya sudah diuji. PostgreSQL, sesi login, dan pembacaan data tetap diperiksa langsung. Deployment GitHub/hosting/Apache tidak dilakukan.

## Pemeriksaan informasi sensitif

- Nilai kredensial aplikasi, akun uji instalasi lokal, dan migrator dari sumber dibandingkan secara programatis terhadap seluruh berkas salinan: tidak ditemukan. Nilainya tidak dicetak atau dimasukkan laporan.
- Pemeriksaan pola token berkeyakinan tinggi, access key, dan private key: tidak ditemukan.
- Referensi `password`, `token`, atau `secret` di kode ditinjau sebagai akses environment, autentikasi, CSRF, dan validasi; bukan kredensial asli yang ditulis langsung.
- `tests/bcrypt-fixture.json` berisi password/hash **sintetis untuk uji kompatibilitas**, bukan pasangan kredensial pada database yang berjalan. Hash dummy di autentikasi dipakai untuk verifikasi waktu gagal login, bukan akun yang dapat digunakan masuk.
- SQL seed memakai identitas contoh fiktif dan hash yang diberikan saat setup. Tidak ada data pribadi mahasiswa atau dump database asli yang disertakan.

Pemeriksaan otomatis tidak menjamin semua kemungkinan informasi sensitif dapat dikenali. Tetap tinjau perubahan yang akan di-stage sebelum setiap publikasi, terutama setelah menambahkan konfigurasi, dump, atau unggahan baru.

## Git dan ignore

Repository Git pada direktori induk belum memiliki commit dan tidak memiliki berkas terlacak. Tidak ada rahasia terlacak yang ditemukan dan tidak ada riwayat yang diubah. Folder ini tidak membawa `.git` induk/sumber dan belum diinisialisasi sebagai repository tersendiri.

`git check-ignore --no-index` memverifikasi bahwa `.env`, `.env.local`, kredensial lokal, session, log, uploads, vendor, node_modules, dan folder dump diabaikan. `.env.example`, CSS runtime, dan SQL migrasi tidak diabaikan. `.gitattributes` mengatur akhir baris source serta berkas biner.

Tidak ada `git add`, commit, penambahan remote, push, atau publikasi otomatis. Urutan perintah manual untuk branch `main` tersedia di README. Jalankan dari root folder ini agar repository baru tidak bercampur dengan direktori induk.
