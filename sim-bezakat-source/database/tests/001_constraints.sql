-- Integration test untuk PostgreSQL asli + seed demo. Semua perubahan ROLLBACK.
-- Pemilik skema boleh mengganti fungsi jam HANYA dalam transaksi pengujian ini
-- agar batas waktu dapat diuji tanpa menunggu kalender. Tidak ada parameter jam
-- dari client pada fungsi/trigger produksi. ROLLBACK memulihkan definisi aslinya.
BEGIN;
SET LOCAL search_path=sim_bezakat,pg_catalog;
DO $$ BEGIN
  IF current_database() NOT IN ('sim_bezakat_dev','sim_bezakat_test') THEN
    RAISE EXCEPTION 'Test hanya di database development khusus'; END IF;
  IF NOT EXISTS(SELECT 1 FROM akun_pengguna WHERE id_akun=-101 AND email_kontak='awardee-a@example.invalid') THEN
    RAISE EXCEPTION 'Jalankan seed fiktif di database kosong terlebih dahulu'; END IF;
END $$;
CREATE TEMP TABLE test_results (nama text PRIMARY KEY, hasil text NOT NULL);
CREATE FUNCTION pg_temp.ok(nama text, nilai boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF nilai IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',nama; END IF;
  INSERT INTO test_results VALUES(nama,'PASS');
END $$;
CREATE FUNCTION pg_temp.expect_error(nama text, perintah text, kode text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE perintah;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE<>kode THEN RAISE EXCEPTION 'FAIL %: expected %, got % (%)',nama,kode,SQLSTATE,SQLERRM; END IF;
    INSERT INTO test_results VALUES(nama,'PASS'); RETURN;
  END;
  RAISE EXCEPTION 'FAIL %: perintah seharusnya ditolak',nama;
END $$;
CREATE FUNCTION pg_temp.set_test_time(waktu timestamptz) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('CREATE OR REPLACE FUNCTION sim_bezakat.waktu_sekarang() RETURNS timestamptz LANGUAGE sql VOLATILE AS %L',format('SELECT %L::timestamptz',waktu));
END $$;

DO $$
DECLARE n_awardee bigint; n_riwayat bigint; asli timestamptz;
BEGIN
  asli:=waktu_sekarang();
  PERFORM pg_temp.ok('Seed: dua IPS rendah berurutan menonaktifkan beasiswa',(SELECT status_awardee='nonaktif' FROM awardee WHERE id_awardee=-102));
  PERFORM pg_temp.ok('Seed: IPS semester 1 dan 3 tidak dianggap berurutan',(SELECT status_awardee='evaluasi' FROM awardee WHERE id_awardee=-103));
  PERFORM pg_temp.ok('Seed: IPS tepat 3,00 tidak rendah meskipun IPK 2,80',(SELECT status_awardee='aktif' FROM awardee WHERE id_awardee=-101));
  PERFORM pg_temp.ok('Akun beasiswa nonaktif tetap aktif',(SELECT status_aktif FROM akun_pengguna WHERE id_akun=-102));
  PERFORM pg_temp.ok('Riwayat pengajuan dan versi berkas seed tetap lengkap',(SELECT count(*)=2 FROM pengajuan_laporan WHERE id_laporan_bulanan=-1) AND (SELECT count(*)=2 FROM berkas_keuangan_versi WHERE id_laporan_bulanan=-1));
  PERFORM pg_temp.ok('Seed disetujui setelah tiga tahap pada pengajuan kedua',(SELECT status_pengisian='disetujui' AND nomor_pengajuan=2 FROM v_status_laporan WHERE id_laporan_bulanan=-1));
  PERFORM pg_temp.ok('Snapshot pertama tidak ditimpa revisi',(SELECT snapshot_laporan->>'ringkasan_refleksi_diri'='Refleksi fiktif awal.' FROM pengajuan_laporan WHERE id_laporan_bulanan=-1 AND nomor_pengajuan=1));
  PERFORM pg_temp.ok('Lampiran pengajuan pertama tetap versi pertama',(SELECT id_berkas=-11 FROM pengajuan_berkas WHERE id_laporan_bulanan=-1 AND nomor_pengajuan=1));

  PERFORM pg_temp.expect_error('Email unik lintas peran', $q$INSERT INTO akun_pengguna(peran,email_kontak,password_hash,nomor_telepon) VALUES('laz','awardee-a@example.invalid','!DEMO_NO_AUTH_ACCOUNT!','000')$q$,'23505');
  PERFORM pg_temp.expect_error('Subclass harus sesuai peran akun',$q$INSERT INTO koordinator_beasiswa(id_koordinator,kode_koordinator,nama_pembina,wilayah_binaan) VALUES(-101,'TEST-KO','Test','Test')$q$,'23503');
  PERFORM pg_temp.expect_error('Akun tanpa subclass ditolak saat akhir transaksi',$q$INSERT INTO akun_pengguna(peran,email_kontak,password_hash,nomor_telepon) VALUES('laz','orphan@example.invalid','!DEMO_NO_AUTH_ACCOUNT!','000'); SET CONSTRAINTS ALL IMMEDIATE$q$,'23514');
  PERFORM pg_temp.expect_error('Kontak wali terakhir tidak boleh hilang',$q$DELETE FROM kontak_wali WHERE id_awardee=-104; SET CONSTRAINTS ALL IMMEDIATE$q$,'23514');
  PERFORM pg_temp.expect_error('Laporan unik per awardee dan periode','INSERT INTO laporan_bulanan(id_awardee,id_periode_monitoring) VALUES(-101,-1)','23505');
  PERFORM pg_temp.expect_error('FK awardee laporan wajib valid','INSERT INTO laporan_bulanan(id_awardee,id_periode_monitoring) VALUES(-999999,-1)','23503');
  PERFORM pg_temp.expect_error('Nilai skor harus 1 sampai 5','INSERT INTO laporan_bulanan(id_awardee,id_periode_monitoring,poin_sholat_berjamaah) VALUES(-104,-1,6)','23514');
  PERFORM pg_temp.expect_error('Periode unik tahun dan bulan','INSERT INTO periode_monitoring(id_pengelola_kemenag,tahun_anggaran,bulan) SELECT -1,tahun_anggaran,bulan FROM periode_monitoring WHERE id_periode_monitoring=-1','23505');
  PERFORM pg_temp.expect_error('Identitas periode tidak berubah','UPDATE periode_monitoring SET bulan=1 WHERE id_periode_monitoring=-1','23514');
  PERFORM pg_temp.expect_error('Pengajuan lama tidak dapat dihapus','DELETE FROM pengajuan_laporan WHERE id_laporan_bulanan=-1','23514');
  PERFORM pg_temp.expect_error('Verifikasi lama tidak dapat ditimpa', $q$UPDATE verifikasi_laporan SET catatan_verifikasi='ubah' WHERE id_laporan_bulanan=-1$q$,'23514');
  PERFORM pg_temp.expect_error('Berkas lama tidak dapat ditimpa', $q$UPDATE berkas_keuangan_versi SET nama_asli='baru.pdf' WHERE id_berkas=-11$q$,'23514');
  PERFORM pg_temp.expect_error('Laporan terkirim tidak dapat dihapus','DELETE FROM laporan_bulanan WHERE id_laporan_bulanan=-1','23514');
  PERFORM pg_temp.expect_error('Laporan disetujui tidak dapat diedit',$q$UPDATE laporan_bulanan SET ringkasan_refleksi_diri='ubah' WHERE id_laporan_bulanan=-1$q$,'23514');
  PERFORM pg_temp.expect_error('Lampiran historis tidak dapat diganti','UPDATE pengajuan_berkas SET id_berkas=-12 WHERE id_laporan_bulanan=-1 AND nomor_pengajuan=1','23514');
  PERFORM pg_temp.expect_error('Status beasiswa tidak diubah manual',$q$UPDATE awardee SET status_awardee='aktif' WHERE id_awardee=-102$q$,'23514');

  INSERT INTO laporan_bulanan(id_laporan_bulanan,id_awardee,id_periode_monitoring) VALUES(-10,-104,-1);
  PERFORM pg_temp.ok('Draf boleh belum lengkap',(SELECT status_pengisian='draf' FROM v_status_laporan WHERE id_laporan_bulanan=-10));
  PERFORM pg_temp.expect_error('Draf belum lengkap tidak dapat diajukan','INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh) VALUES(-10,-104)','23514');
  PERFORM pg_temp.expect_error('Unggahan milik awardee lain ditolak',$q$INSERT INTO berkas_keuangan_versi(id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh) VALUES(-10,'periode_berjalan','a.pdf','application/pdf',1,'test/a.pdf',-101)$q$,'23514');
  PERFORM pg_temp.expect_error('Ekstensi dan MIME berkas harus cocok',$q$INSERT INTO berkas_keuangan_versi(id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh) VALUES(-10,'periode_berjalan','a.xlsx','application/pdf',1,'test/a.xlsx',-104)$q$,'23514');
  PERFORM pg_temp.expect_error('Ukuran berkas harus positif',$q$INSERT INTO berkas_keuangan_versi(id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh) VALUES(-10,'periode_berjalan','a.pdf','application/pdf',0,'test/a.pdf',-104)$q$,'23514');
  PERFORM pg_temp.expect_error('Lokasi berkas tidak boleh traversal',$q$INSERT INTO berkas_keuangan_versi(id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh) VALUES(-10,'periode_berjalan','a.pdf','application/pdf',1,'../a.pdf',-104)$q$,'23514');
  INSERT INTO laporan_bulanan(id_laporan_bulanan,id_awardee,id_periode_monitoring) VALUES(-20,-104,-2);
  DELETE FROM laporan_bulanan WHERE id_laporan_bulanan=-20;
  PERFORM pg_temp.ok('Draf kosong belum diajukan boleh dihapus',NOT EXISTS(SELECT 1 FROM laporan_bulanan WHERE id_laporan_bulanan=-20));

  -- Kalender eksplisit WIB, termasuk tahun kabisat dan pergantian tahun.
  INSERT INTO periode_monitoring(id_periode_monitoring,id_pengelola_kemenag,tahun_anggaran,bulan) VALUES(-90,-1,2024,2),(-91,-1,2001,12);
  PERFORM pg_temp.ok('Februari kabisat mencakup 1 sampai 29',(SELECT tanggal_awal_laporan='2024-02-01'::date AND tanggal_akhir_laporan='2024-02-29'::date FROM periode_monitoring WHERE id_periode_monitoring=-90));
  PERFORM pg_temp.ok('Periode Desember berakhir Januari tahun berikutnya',(SELECT tanggal_tenggat_cutoff='2002-01-10 00:00:00+07'::timestamptz FROM periode_monitoring WHERE id_periode_monitoring=-91));
  SET LOCAL TIME ZONE 'UTC';
  PERFORM pg_temp.ok('WIB tidak mengikuti timezone koneksi',(SELECT tanggal_buka='2024-02-09 17:00:00+00'::timestamptz FROM periode_monitoring WHERE id_periode_monitoring=-90));
  SET LOCAL TIME ZONE 'Asia/Jakarta';
  INSERT INTO laporan_bulanan(id_laporan_bulanan,id_awardee,id_periode_monitoring,ringkasan_refleksi_diri,poin_sholat_berjamaah,frekuensi_qiyamullail,hafalan_quran,skor_adaptasi_belajar,skor_kelola_stres)
  VALUES(-90,-104,-90,'Versi awal test',4,2,'10 surat',4,3),(-91,-103,-90,'Test cutoff sebelum',4,2,'10 surat',4,3),(-92,-102,-90,'Test cutoff tepat',4,2,'10 surat',4,3);
  INSERT INTO berkas_keuangan_versi(id_berkas,id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh)
  VALUES(-901,-90,'periode_berjalan','v1.pdf','application/pdf',1,'test/old-v1.pdf',-104),
        (-911,-91,'periode_berjalan','v1.pdf','application/pdf',1,'test/cutoff-before.pdf',-103),
        (-921,-92,'periode_berjalan','v1.pdf','application/pdf',1,'test/cutoff-exact.pdf',-102);
  PERFORM pg_temp.set_test_time('2024-02-09 23:59:59.999999+07');
  PERFORM pg_temp.expect_error('Sebelum tanggal 10 00:00 WIB pengajuan ditolak','INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh) VALUES(-90,-104)','23514');
  PERFORM pg_temp.set_test_time('2024-02-10 00:00:00+07');
  INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh,waktu_pengumpulan) VALUES(-90,-104,'2000-01-01');
  PERFORM pg_temp.ok('Tepat tanggal 10 00:00 WIB diterima dan waktu client diabaikan',(SELECT waktu_pengumpulan='2024-02-10 00:00:00+07'::timestamptz FROM pengajuan_laporan WHERE id_laporan_bulanan=-90 AND nomor_pengajuan=1));
  PERFORM pg_temp.expect_error('Pengajuan ganda saat menunggu verifikasi ditolak','INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh) VALUES(-90,-104)','23514');
  PERFORM pg_temp.expect_error('Koordinator di luar binaan ditolak',$q$INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,hasil_verifikasi) VALUES(-90,1,'koordinator',-4,'disetujui')$q$,'23514');
  PERFORM pg_temp.expect_error('Pelaksana harus tepat satu FK',$q$INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,id_pengelola_laz,hasil_verifikasi) VALUES(-90,1,'koordinator',-2,-3,'disetujui')$q$,'23514');
  PERFORM pg_temp.expect_error('Revisi harus disertai catatan',$q$INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,hasil_verifikasi) VALUES(-90,1,'koordinator',-2,'perlu_revisi')$q$,'23514');
  INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,hasil_verifikasi,catatan_verifikasi)
  VALUES(-90,1,'koordinator',-2,'perlu_revisi','Perjelas berkas.');
  PERFORM pg_temp.ok('Kewajiban pengumpulan tetap terpenuhi saat revisi',(SELECT kewajiban_pengumpulan_terpenuhi AND status_pengisian='perlu_revisi' FROM v_status_laporan WHERE id_laporan_bulanan=-90));
  PERFORM pg_temp.set_test_time('2024-03-09 23:59:59.999999+07');
  INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh) VALUES(-91,-103);
  PERFORM pg_temp.ok('Detik terakhir tanggal 9 masih diterima',EXISTS(SELECT 1 FROM pengajuan_laporan WHERE id_laporan_bulanan=-91));
  PERFORM pg_temp.set_test_time('2024-03-10 00:00:00+07');
  PERFORM pg_temp.expect_error('Tepat cutoff pengajuan pertama ditolak','INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh) VALUES(-92,-102)','23514');
  INSERT INTO periode_monitoring(id_pengelola_kemenag,tahun_anggaran,bulan) VALUES(-1,2024,3);
  UPDATE laporan_bulanan SET ringkasan_refleksi_diri='Revisi setelah periode berikutnya dibuka' WHERE id_laporan_bulanan=-90;
  INSERT INTO berkas_keuangan_versi(id_berkas,id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh)
  VALUES(-902,-90,'periode_berjalan','v2.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',2,'test/old-v2.xlsx',-104);
  INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh,catatan_perbaikan) VALUES(-90,-104,'Perbaikan setelah cutoff.');
  PERFORM pg_temp.ok('Revisi laporan lama diterima setelah periode baru dibuka',(SELECT count(*)=2 FROM pengajuan_laporan WHERE id_laporan_bulanan=-90));
  PERFORM pg_temp.ok('Versi berkas lama dan baru tetap tersedia',(SELECT count(*)=2 FROM berkas_keuangan_versi WHERE id_laporan_bulanan=-90) AND (SELECT id_berkas=-901 FROM pengajuan_berkas WHERE id_laporan_bulanan=-90 AND nomor_pengajuan=1) AND (SELECT id_berkas=-902 FROM pengajuan_berkas WHERE id_laporan_bulanan=-90 AND nomor_pengajuan=2));
  PERFORM pg_temp.expect_error('Verifikasi pengajuan lama tidak dipakai untuk pengajuan baru',$q$INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_pengelola_laz,hasil_verifikasi) VALUES(-90,2,'laz',-3,'disetujui')$q$,'23514');
  INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,hasil_verifikasi) VALUES(-90,2,'koordinator',-2,'disetujui');
  PERFORM pg_temp.expect_error('LAZ di luar lembaga ditolak',$q$INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_pengelola_laz,hasil_verifikasi) VALUES(-90,2,'laz',-5,'disetujui')$q$,'23514');
  INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_pengelola_laz,hasil_verifikasi) VALUES(-90,2,'laz',-3,'disetujui');
  PERFORM pg_temp.ok('Dua tahap belum menjadi persetujuan akhir',(SELECT status_pengisian='diajukan' FROM v_status_laporan WHERE id_laporan_bulanan=-90));
  INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_pengelola_kemenag,hasil_verifikasi) VALUES(-90,2,'kemenag',-1,'disetujui');
  PERFORM pg_temp.ok('Tiga tahap pada versi sama menyetujui laporan',(SELECT status_pengisian='disetujui' FROM v_status_laporan WHERE id_laporan_bulanan=-90));
  PERFORM pg_temp.set_test_time(asli);

  SELECT count(*) INTO n_awardee FROM awardee;
  INSERT INTO riwayat_akademik(id_riwayat_akademik,id_awardee,semester_ke) VALUES(-1041,-104,1),(-1042,-104,2),(-1043,-104,3);
  PERFORM pg_temp.expect_error('Satu baris akademik per awardee dan semester','INSERT INTO riwayat_akademik(id_awardee,semester_ke) VALUES(-104,1)','23505');
  PERFORM pg_temp.expect_error('Semester minimal satu','INSERT INTO riwayat_akademik(id_awardee,semester_ke) VALUES(-104,0)','23514');
  PERFORM pg_temp.expect_error('IPS tidak boleh di atas 4',$q$INSERT INTO versi_akademik(id_riwayat_akademik,ips,ipk_kumulatif,nama_berkas_khs,ukuran_byte,tautan_berkas_khs,diajukan_oleh) VALUES(-1041,4.01,3,'a.pdf',1,'test/invalid.pdf',-104)$q$,'23514');
  PERFORM pg_temp.expect_error('IPS tidak boleh negatif',$q$INSERT INTO versi_akademik(id_riwayat_akademik,ips,ipk_kumulatif,nama_berkas_khs,ukuran_byte,tautan_berkas_khs,diajukan_oleh) VALUES(-1041,-0.01,3,'a.pdf',1,'test/invalid.pdf',-104)$q$,'23514');
  INSERT INTO versi_akademik(id_versi_akademik,id_riwayat_akademik,ips,ipk_kumulatif,nama_berkas_khs,ukuran_byte,tautan_berkas_khs,diajukan_oleh)
  VALUES(-10411,-1041,2.99,3.5,'s1.pdf',1,'test/khs-s1.pdf',-104),(-10421,-1042,0.00,3.2,'s2.pdf',1,'test/khs-s2.pdf',-104);
  PERFORM pg_temp.ok('Dua IPS rendah belum diverifikasi tidak menonaktifkan',(SELECT status_awardee='aktif' FROM awardee WHERE id_awardee=-104));
  PERFORM pg_temp.expect_error('Verifikasi akademik harus oleh koordinator binaan',$q$INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10411,-4,'terverifikasi')$q$,'23514');
  INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10411,-2,'terverifikasi');
  PERFORM pg_temp.ok('Satu IPS rendah terverifikasi menghasilkan evaluasi',(SELECT status_awardee='evaluasi' FROM awardee WHERE id_awardee=-104));
  SELECT count(*) INTO n_riwayat FROM riwayat_akademik WHERE id_awardee=-104;
  INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10421,-2,'terverifikasi');
  PERFORM pg_temp.ok('Dua IPS berurutan termasuk 0,00 menonaktifkan',(SELECT status_awardee='nonaktif' FROM awardee WHERE id_awardee=-104));
  PERFORM pg_temp.ok('Penonaktifan tidak menghapus akun awardee atau riwayat',(SELECT count(*)=n_awardee FROM awardee) AND (SELECT status_aktif FROM akun_pengguna WHERE id_akun=-104) AND (SELECT count(*)=n_riwayat FROM riwayat_akademik WHERE id_awardee=-104));
  PERFORM pg_temp.ok('Riwayat perubahan status dicatat',(SELECT count(*)=2 FROM riwayat_status_beasiswa WHERE id_awardee=-104));
  PERFORM pg_temp.expect_error('Nilai akademik terverifikasi tidak bisa ditimpa','UPDATE versi_akademik SET ips=4 WHERE id_versi_akademik=-10411','23514');
  PERFORM pg_temp.expect_error('Riwayat verifikasi akademik tidak boleh dihapus','DELETE FROM verifikasi_akademik WHERE id_versi_akademik=-10411','23514');
  INSERT INTO versi_akademik(id_versi_akademik,id_riwayat_akademik,ips,ipk_kumulatif,nama_berkas_khs,ukuran_byte,tautan_berkas_khs,diajukan_oleh)
  VALUES(-10422,-1042,4,3.8,'s2-koreksi.pdf',1,'test/khs-s2-koreksi.pdf',-104);
  PERFORM pg_temp.ok('Koreksi belum diverifikasi tidak mengganti IPS sah',(SELECT ips=0 FROM v_akademik_terverifikasi WHERE id_awardee=-104 AND semester_ke=2));
  INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10422,-2,'terverifikasi');
  PERFORM pg_temp.ok('Koreksi akademik menyimpan versi lama',(SELECT count(*)=2 FROM versi_akademik WHERE id_riwayat_akademik=-1042) AND (SELECT ips=4 FROM v_akademik_terverifikasi WHERE id_awardee=-104 AND semester_ke=2));
  PERFORM pg_temp.ok('Koreksi tidak mengaktifkan ulang beasiswa otomatis',(SELECT status_awardee='nonaktif' FROM awardee WHERE id_awardee=-104));
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT nama,hasil FROM test_results ORDER BY nama;
SELECT count(*) AS jumlah_uji_lulus FROM test_results;
ROLLBACK;
