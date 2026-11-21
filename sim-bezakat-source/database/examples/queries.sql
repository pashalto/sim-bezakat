-- Query baca saja. Tidak menampilkan password_hash.
SET search_path=sim_bezakat,pg_catalog;
SET TIME ZONE 'Asia/Jakarta';

-- Periode, rentang isi laporan, dan jendela pengajuan WIB.
SELECT tahun_anggaran,bulan,tanggal_awal_laporan,tanggal_akhir_laporan,
       tanggal_buka,tanggal_tenggat_cutoff,status_periode
FROM v_periode_monitoring ORDER BY tahun_anggaran,bulan;

-- Status terakhir; kewajiban pengumpulan tetap terpenuhi meskipun perlu revisi.
SELECT a.nomor_registrasi,a.nama_lengkap,p.tahun_anggaran,p.bulan,
       s.nomor_pengajuan,s.status_pengisian,s.kewajiban_pengumpulan_terpenuhi
FROM laporan_bulanan l JOIN awardee a USING(id_awardee)
JOIN periode_monitoring p USING(id_periode_monitoring)
JOIN v_status_laporan s USING(id_laporan_bulanan)
ORDER BY a.nomor_registrasi,p.tahun_anggaran,p.bulan;

-- Versi berkas yang benar-benar dilampirkan pada masing-masing pengajuan.
SELECT a.nomor_registrasi,p.nomor_pengajuan,p.waktu_pengumpulan,
       b.jenis_dokumen,b.versi,b.nama_asli,b.storage_key,b.ukuran_byte
FROM pengajuan_laporan p JOIN laporan_bulanan l USING(id_laporan_bulanan)
JOIN awardee a USING(id_awardee)
JOIN pengajuan_berkas pb USING(id_laporan_bulanan,nomor_pengajuan)
JOIN berkas_keuangan_versi b ON b.id_berkas=pb.id_berkas
ORDER BY a.nomor_registrasi,p.nomor_pengajuan,b.jenis_dokumen;

-- Rekam pemeriksaan/revisi tidak dihapus ketika ada pengajuan baru.
SELECT id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,
       waktu_verifikasi,hasil_verifikasi,catatan_verifikasi
FROM verifikasi_laporan ORDER BY id_laporan_bulanan,nomor_pengajuan,waktu_verifikasi;

-- IPS terbaru yang sah, bukan versi baru yang masih belum diverifikasi.
SELECT a.nomor_registrasi,r.semester_ke,r.ips,r.ipk_kumulatif,r.versi,
       r.status_evaluasi_ips,a.status_awardee,u.status_aktif AS akun_tetap_aktif
FROM v_akademik_terverifikasi r JOIN awardee a USING(id_awardee)
JOIN akun_pengguna u ON u.id_akun=a.id_awardee
ORDER BY a.nomor_registrasi,r.semester_ke;

SELECT a.nomor_registrasi,h.status_sebelum,h.status_sesudah,h.alasan,h.waktu_perubahan
FROM riwayat_status_beasiswa h JOIN awardee a USING(id_awardee)
ORDER BY a.nomor_registrasi,h.waktu_perubahan;
