# Pemetaan rancangan dan alasan penyesuaian

Kedua file dibaca sebelum pembuatan skema. PDF terdiri dari 11 halaman; Excel
memiliki satu sheet `Normalisasi`, dengan blok UNF, 1NF, 2NF, dan 3NF. PDF halaman
11 menyertakan tabel constraint sebagai gambar; bagian itu juga diperiksa secara
visual agar aturan yang tidak terbaca melalui ekstraksi teks tidak terlewat.

PDF skema relasional akhir halaman 10–11 dipakai sebagai dasar 13 tabel.
Excel memberi rincian tambahan seperti bacaan juz, tingkat prestasi dan target
wakaf. Isi contoh mahasiswa dari dokumen tidak disalin menjadi data uji.

| Dasar sumber | Penyesuaian SQL | Alasan |
| --- | --- | --- |
| Empat tabel peran menyalin email/password/status akun; email harus unik lintas peran (PDF 6, 11) | Tambah kembali superclass `akun_pengguna` dari ERD PDF 2; keempat profil tetap ada | UNIQUE biasa tidak mencakup empat tabel terpisah. Satu tempat login menegakkan keunikan global dan mengurangi duplikasi; peran total/disjoint tetap dijaga dengan FK komposit dan constraint trigger |
| Awardee punya status_aktif dan status_awardee | Status akun ada di akun_pengguna, status beasiswa tetap di awardee | Beasiswa nonaktif tidak menghapus/menonaktifkan akun |
| Kontak wali weak entity dengan PK gabungan | Pertahankan PK awardee + nomor urut, minimal satu wali saat COMMIT | Menjaga rancangan PDF; pengecekan ditunda agar mahasiswa dan wali bisa dibuat dalam satu transaksi |
| Periode menggunakan nama_bulan dan tahun anggaran | Bulan disimpan sebagai angka 1–12 dengan UNIQUE tahun+bulan | Menghindari perbedaan penulisan nama bulan; label dapat dibentuk frontend |
| Periode memiliki semester dan status_periode | Label semester periode opsional; status dihitung melalui view | Semester label monitoring tidak disamakan dengan semester_ke akademik. Status kalender tidak perlu diperbarui manual setiap pergantian hari |
| Jadwal periode PDF belum merinci jam WIB | Tanggal buka/cutoff dihitung otomatis dengan Asia/Jakarta | Sesuai aturan pengguna: tanggal 10 pukul 00.00 sampai akhir tanggal 9 berikutnya; cutoff eksklusif menghindari hilangnya detik terakhir |
| Rentang kegiatan dan jendela pengisian belum dipisahkan | Tambah tanggal_awal_laporan dan tanggal_akhir_laporan | Kegiatan tetap mencakup seluruh bulan yang dilaporkan, meskipun pengisian dibuka tanggal 10 |
| Laporan + evaluasi + LPJ digabung dalam PDF | Tetap gabung laporan_bulanan, ID evaluasi/LPJ tetap sebagai alternate key | Tidak memecah ulang struktur utama tanpa kebutuhan |
| UNIQUE awardee+periode pada PDF | Ditegakkan langsung di database | Dua request bersamaan tidak dapat menghasilkan dua laporan untuk periode sama |
| Nomor pengajuan/status pada satu baris laporan | Tambah pengajuan_laporan; status/nomor terakhir dibaca lewat view | Setiap pengajuan/revisi menyimpan snapshot sendiri; baris lama tidak ditimpa |
| Verifikasi memiliki nomor pengajuan dan tiga pilihan FK | Pertahankan tiga FK, tambahkan FK komposit ke pengajuan serta UNIQUE laporan+pengajuan+tahap | Pemeriksaan terhubung ke versi pengajuan tepat, satu pelaksana sesuai tahap; persetujuan lama tidak mengesahkan revisi baru |
| Verifikasi seluruh tahap wajib (PDF 11) | Tahap koordinator → LAZ → Kemenag | Pilihan implementasi mengikuti PDF. Frontend lama yang membatasi LAZ/Kemenag hanya baca perlu diselaraskan pada tugas integrasi berikutnya |
| Revisi laporan lama harus tetap bisa diajukan | Pengajuan pertama dibatasi periode; pengajuan ulang diizinkan jika status terakhir perlu_revisi, tanpa cutoff | Memisahkan kewajiban pengajuan awal dari penyelesaian revisi |
| LPJ semula menyimpan transaksi/ringkasan angka | Tambah berkas_keuangan_versi dan pengajuan_berkas; saldo/income/target_wakaf dan realisasi_pengeluaran dipertahankan sebagai opsional | Kebutuhan terbaru adalah file Excel/PDF; tidak mewajibkan parsing atau rekap otomatis. FK realisasi ke ID LPJ tetap dipertahankan |
| Tidak ada versi file eksplisit | Nomor versi per laporan+jenis, metadata, storage_key unik, hash opsional, versi template, pengunggah dan waktu | File pengganti tidak menimpa file yang telah diperiksa. Setiap pengajuan menunjuk versi tertentu |
| Excel sholat bernilai 150, tetapi PDF CHECK poin 1–5 | Pisahkan frekuensi_sholat_berjamaah dari poin_sholat_berjamaah | Jumlah kejadian dan skor berbeda satuan; data contoh tidak diam-diam dipaksa menjadi skor |
| Excel menambah bacaan juz, tingkat prestasi, target wakaf | Tambahkan atribut tersebut, target wakaf tetap opsional | Mempertahankan rincian sumber yang tidak tertulis lengkap pada daftar akhir PDF |
| Riwayat akademik unik awardee+semester dan menyimpan IPS/IPK/KHS | Identitas semester tetap di riwayat_akademik; nilai/KHS dipindah ke versi_akademik, keputusan ke verifikasi_akademik | Koreksi KHS/nilai tidak menimpa bukti yang telah diverifikasi; nilai sah terakhir bisa dibedakan dari unggahan baru |
| PDF mengevaluasi IPK dibanding standar lembaga | Evaluasi memakai IPS terverifikasi dengan batas tetap 3,00 | Instruksi terbaru pengguna mengungguli aturan dokumen yang berbeda; standar_minimal_ipk tetap disimpan sebagai metadata sumber |
| Dua semester berturut-turut | Bandingkan semester_ke dan semester_ke+1, keduanya terverifikasi | Dua nilai rendah yang terpisah semester atau belum diverifikasi tidak memenuhi syarat |
| Status awardee berubah | Tambah riwayat_status_beasiswa, tanpa menghapus akun/data | Perubahan dapat ditelusuri ke verifikasi pemicu; satu semester rendah memberi status evaluasi |

Pilihan yang masih perlu diputuskan pada pengembangan berikutnya:

1. Prosedur pengaktifan kembali setelah koreksi IPS atau keputusan pengelola.
   Versi ini tidak mengaktifkan ulang secara otomatis.
2. Template resmi keuangan dan apakah rencana bulan berikutnya wajib. Versi
   ini mensyaratkan file periode berjalan; rencana berikutnya opsional.
3. Rincian hak baca/otorisasi API dan RLS. Integritas scope reviewer sudah
   dicek di SQL, tetapi autentikasi orang yang menggunakan API belum dibangun.
4. Kecocokan seluruh pertanyaan frontend dengan atribut relasional. Kolom
   `jawaban_tambahan` menampung jawaban tambahan sebagai objek JSON; kunci
   identitas/periode/status/nilai tetap relasional, bukan diganti JSON.

Ini penyesuaian implementasi atas rancangan sumber, bukan klaim bahwa file
kuliah awal sudah memuat semua tabel/aturan tambahan tersebut.


## Penyesuaian lanjutan: login ID beasiswa (15 November 2026)

Permintaan terbaru mengganti email login dengan `BZI-251-000XXXX`. Oleh karena
itu migration 001 dipertahankan sebagai riwayat rancangan awal, dan migration 002
menambahkan ID unik, wajib diisi, validasi pola/nomor bukan nol, serta sequence
otomatis 1..9999 tanpa pengulangan. Satu ruang nomor dipakai untuk empat peran.

`email_login` berganti nama menjadi `email_kontak` dan menjadi opsional; isinya
tidak dihapus. `password_hash` lama tidak diubah. PK numerik dan FK tidak berubah,
sehingga riwayat laporan, berkas, verifikasi, akademik, dan status tetap terhubung.
Nomor registrasi awardee yang sudah memenuhi pola dipertahankan sebagai ID login;
nomor registrasi lain tetap tersimpan sebagai identitas bisnis sebelumnya.

Seed baru menggunakan ID eksplisit 1..9 lalu menyelaraskan sequence ke 9, sehingga
akun otomatis berikutnya mendapat 10. Untuk aplikasi gunakan DEFAULT; bila kelak
mengimpor ID eksplisit, sinkronkan sequence dengan nomor terbesar saat tidak ada
penulisan akun lain. Seed tidak boleh dijalankan ulang pada database berisi data.
Tidak ada perubahan kebijakan password produksi sampai hasil diskusi berikutnya.
