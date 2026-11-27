# Hapus dokumen keuangan

Tombol Hapus berada di kiri Unggah pada kedua kartu yang dapat diedit. Dialog menyebut nama dan kategori. Pilihan berkas lokal dihapus lebih dahulu jika belum diunggah; dokumen yang sebelumnya tersimpan tetap ada. Batal/Escape tidak mengubah data. Proses unggah/hapus mengunci kontrol kedua kartu sementara; pembaruan hanya mengganti kartu yang terkait.

## Penyiapan database sebelum menjalankan versi ini

Perubahan ini membutuhkan SQL tambahan `database/migrations/010_delete_finance_files.sql`, setelah SQL 009. Jalankan **sekali sebagai sim_bezakat_migrator**, bukan akun runtime. Untuk Neon gunakan koneksi direct dengan TLS dan database `sim_bezakat_dev` yang sama dengan aplikasi. Contoh (variabel koneksi migrator diisi secara lokal, jangan disimpan ke Git):

```powershell
psql --dbname="$env:BEZAKAT_MIGRATOR_URL" --set=ON_ERROR_STOP=1 --file=database/migrations/010_delete_finance_files.sql
php tools/db-check.php
```

Jangan menjalankan ulang SQL 001–009 pada database yang sudah berisi data. SQL 010 bersifat transaksional dan memeriksa versi domain 9 sebelum menambahkan objek. Tidak menghapus tabel atau mengganti primary key/foreign key lama. Tidak diterapkan otomatis oleh aplikasi, deployment, atau pekerjaan ini pada database lokal utama/Neon. Terapkan dengan prosedur perubahan database Anda sebelum mengaktifkan fitur pada lingkungan tersebut.

API `DELETE /api.php?action=finance-delete` memakai session, CSRF/Origin yang sudah ada dan prepared statements. Payload: `periodId`, `category` (`current`/`next`), `documentId`, semuanya ID berupa string. Fungsi SECURITY DEFINER memeriksa akun aktif, kepemilikan, periode, status, persetujuan dokumen, dan ID versi aktif. Akun aplikasi tetap tanpa akses langsung ke tabel internal. Penguncian baris laporan sama dengan unggah agar permintaan lama tidak menghapus unggahan baru.

Versi metadata dan snapshot pengajuan bersifat tetap. SQL 010 mencatat penarikan versi aktif. Isi bytea dihapus bila tidak pernah dirujuk pengajuan; isi dan tautan versi yang dirujuk riwayat dipertahankan. Versi lama tidak muncul kembali setelah penarikan. Pengajuan berikutnya wajib memiliki kembali dokumen periode berjalan dan hanya menautkan dokumen aktif.

## Verifikasi 27 November 2026

Database uji PostgreSQL terpisah pada port 55491; tidak memakai data/kredensial produksi. SQL 009 dan 010 berhasil diterapkan. Pengujian HTTP PHP dan browser Edge headless memverifikasi: CSRF dan akses anonim ditolak, pemilik lain ditolak, laporan terkirim terkunci, revisi dapat menarik dokumen, versi usang ditolak, kedua kategori terpisah, bytea tanpa referensi terhapus, referensi/unduhan riwayat tetap ada, versi lama tidak muncul kembali, pengajuan tanpa dokumen aktif ditolak, Batal/Escape aman, pilihan lokal dibersihkan tanpa menghapus dokumen tersimpan, pilihan kartu lain tetap ada, reload mempertahankan hasil, unggah ulang berhasil, kegagalan backend menampilkan pesan tanpa menghilangkan dokumen, dan dialog ponsel tidak menyebabkan overflow horizontal.

Pemeriksaan tersedia: `php tests/finance-delete.php`, `php tests/validation.php`, `php tests/render.php`, `php tests/deployment.php`, dan `node --check public/assets/finance.js`. Screenshot dan harness integrasi lokal disimpan di workspace pengujian, bukan repository publik. Koneksi/deployment Neon dan pengujian multi-instance Vercel untuk fitur baru belum diverifikasi; lakukan setelah penerapan SQL 010 dan deployment. Tidak ada commit/push/publikasi dalam pekerjaan ini.
