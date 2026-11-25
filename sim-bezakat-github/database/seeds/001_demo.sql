-- Jalankan melalui npm run db:seed. Hash akun fiktif dibuat ketika seed dijalankan.
-- Hash bcrypt cost 12 dengan salt berbeda; tidak pernah dipakai untuk akun asli.
-- Data sepenuhnya fiktif. Tidak mengimpor identitas mahasiswa dari dokumen sumber.
-- Hanya untuk database development kosong. ID negatif mencadangkan namespace demo;
-- ID otomatis aplikasi tetap positif, sehingga sequence tidak berbenturan.
BEGIN;
SET LOCAL search_path=sim_bezakat,pg_catalog;
DO $$ BEGIN
  IF current_database() NOT IN ('sim_bezakat_dev','sim_bezakat_test') THEN
    RAISE EXCEPTION 'Seed hanya untuk sim_bezakat_dev/sim_bezakat_test'; END IF;
  IF EXISTS (SELECT 1 FROM akun_pengguna) THEN
    RAISE EXCEPTION 'Database sudah berisi akun; seed dibatalkan tanpa menimpa data'; END IF;
END $$;
INSERT INTO lembaga_penyantun VALUES
(-1,'DEMO-LAZ-A','LAZ Contoh A',3.00,'REKENING-FIKTIF-A'),
(-2,'DEMO-LAZ-B','LAZ Contoh B',3.25,'REKENING-FIKTIF-B');
INSERT INTO perguruan_tinggi VALUES(-1,'DEMO-PT','Universitas Contoh Nusantara','Kota Contoh');
INSERT INTO akun_pengguna(id_akun,peran,id_beasiswa,email_kontak,password_hash,nomor_telepon) VALUES
(-1,'kemenag','BZI-251-0000006','kemenag@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 0),'000000000001'),
(-2,'koordinator','BZI-251-0000004','koordinator@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 1),'000000000002'),
(-3,'laz','BZI-251-0000005','laz-a@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 2),'000000000003'),
(-4,'koordinator','BZI-251-0000008','koordinator-b@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 3),'000000000004'),
(-5,'laz','BZI-251-0000009','laz-b@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 4),'000000000005'),
(-101,'awardee','BZI-251-0000001','awardee-a@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 5),'000000000101'),
(-102,'awardee','BZI-251-0000002','awardee-b@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 6),'000000000102'),
(-103,'awardee','BZI-251-0000003','awardee-c@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 7),'000000000103'),
(-104,'awardee','BZI-251-0000007','awardee-d@example.invalid', (current_setting('sim_bezakat.seed_hashes')::jsonb ->> 8),'000000000104');
INSERT INTO pengelola_kemenag(id_pengelola_kemenag,nip,nama_staf,jabatan_struktural,unit_direktorat)
VALUES(-1,'DEMO-NIP-001','Siti Contoh','Pengelola','Unit Contoh');
INSERT INTO koordinator_beasiswa(id_koordinator,kode_koordinator,nama_pembina,wilayah_binaan) VALUES
(-2,'DEMO-KO-A','Nadia Contoh','Wilayah Contoh A'),(-4,'DEMO-KO-B','Pembina Contoh B','Wilayah Contoh B');
INSERT INTO pengelola_lembaga_zakat(id_pengelola_laz,id_lembaga,id_staf_laz,nama_petugas_laz,divisi_pendayagunaan) VALUES
(-3,-1,'DEMO-STAF-A','Rahman Contoh','Pendidikan'),(-5,-2,'DEMO-STAF-B','Petugas LAZ Contoh B','Pendidikan');
INSERT INTO awardee(id_awardee,nomor_registrasi,id_lembaga,id_koordinator,id_perguruan_tinggi,nim,nik,nama_lengkap,jenis_kelamin,tanggal_lahir,alamat_domisili,program_studi,jenjang_studi) VALUES
(-101,'BZI-251-0000001',-1,-2,-1,'DEMO-NIM-A','0000000000000101','Aulia Contoh','P','2005-01-01','Alamat Fiktif A','Ilmu Komputer','S1'),
(-102,'BZI-251-0000002',-1,-2,-1,'DEMO-NIM-B','0000000000000102','Fikri Contoh','L','2005-02-01','Alamat Fiktif B','Ilmu Komputer','S1'),
(-103,'BZI-251-0000003',-2,-4,-1,'DEMO-NIM-C','0000000000000103','Salma Contoh','P','2005-03-01','Alamat Fiktif C','Matematika','S1'),
(-104,'BZI-251-0000007',-1,-2,-1,'DEMO-NIM-D','0000000000000104','Mahasiswa Contoh D','L','2005-04-01','Alamat Fiktif D','Statistika','S1');
INSERT INTO kontak_wali SELECT id_awardee,1,'Wali Contoh','Orang tua','000000000000' FROM awardee;

-- Periode menyesuaikan waktu WIB saat seed; tanggal 1-9 masih periode sebelumnya.
DO $$ DECLARE d date;
BEGIN
  d:=(waktu_sekarang() AT TIME ZONE 'Asia/Jakarta')::date;
  IF extract(day FROM d)<10 THEN d:=(d-interval '1 month')::date; END IF;
  INSERT INTO periode_monitoring(id_periode_monitoring,id_pengelola_kemenag,tahun_anggaran,bulan)
    VALUES(-1,-1,extract(year FROM d)::integer,extract(month FROM d)::smallint);
  d:=(date_trunc('month',d)+interval '1 month')::date;
  INSERT INTO periode_monitoring(id_periode_monitoring,id_pengelola_kemenag,tahun_anggaran,bulan)
    VALUES(-2,-1,extract(year FROM d)::integer,extract(month FROM d)::smallint);
END $$;
INSERT INTO laporan_bulanan(id_laporan_bulanan,id_awardee,id_periode_monitoring,
  ringkasan_refleksi_diri,poin_sholat_berjamaah,frekuensi_sholat_berjamaah,frekuensi_qiyamullail,hafalan_quran,bacaan_juz,skor_adaptasi_belajar,skor_kelola_stres)
VALUES(-1,-101,-1,'Refleksi fiktif awal.',4,80,5,'10 surat',2,4,3),
(-2,-101,-2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(-3,-102,-1,'Draf contoh B.',3,70,4,'8 surat',1,3,3);

-- Storage key contoh: belum ada file fisik; bukan bukti unggahan sungguhan.
INSERT INTO berkas_keuangan_versi(id_berkas,id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh,versi_template)
VALUES(-11,-1,'periode_berjalan','keuangan-demo-v1.pdf','application/pdf',1024,'contoh/keuangan/a/v1.pdf',-101,'template-1');
INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh) VALUES(-1,-101);
INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,hasil_verifikasi,catatan_verifikasi)
VALUES(-1,1,'koordinator',-2,'perlu_revisi','Contoh: perjelas dokumen keuangan.');
UPDATE laporan_bulanan SET ringkasan_refleksi_diri='Refleksi fiktif setelah perbaikan.' WHERE id_laporan_bulanan=-1;
INSERT INTO berkas_keuangan_versi(id_berkas,id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,diunggah_oleh,versi_template)
VALUES(-12,-1,'periode_berjalan','keuangan-demo-v2.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',2048,'contoh/keuangan/a/v2.xlsx',-101,'template-1');
INSERT INTO pengajuan_laporan(id_laporan_bulanan,diajukan_oleh,catatan_perbaikan)
VALUES(-1,-101,'Dokumen contoh sudah diperjelas.');
INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,hasil_verifikasi) VALUES(-1,2,'koordinator',-2,'disetujui');
INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_pengelola_laz,hasil_verifikasi) VALUES(-1,2,'laz',-3,'disetujui');
INSERT INTO verifikasi_laporan(id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_pengelola_kemenag,hasil_verifikasi) VALUES(-1,2,'kemenag',-1,'disetujui');
INSERT INTO prestasi(id_awardee,id_periode_monitoring,uraian_prestasi,tingkat_prestasi,tautan_berkas_bukti_prestasi)
VALUES(-103,-1,'Juara lomba fiktif','Kampus','contoh/prestasi/c.pdf');

INSERT INTO riwayat_akademik(id_riwayat_akademik,id_awardee,semester_ke) VALUES
(-1011,-101,1),(-1021,-102,1),(-1022,-102,2),(-1031,-103,1),(-1033,-103,3);
INSERT INTO versi_akademik(id_versi_akademik,id_riwayat_akademik,ips,ipk_kumulatif,nama_berkas_khs,ukuran_byte,tautan_berkas_khs,diajukan_oleh) VALUES
(-10111,-1011,3.00,2.80,'khs-a-1.pdf',1000,'contoh/khs/a/s1-v1.pdf',-101),
(-10211,-1021,2.90,3.10,'khs-b-1.pdf',1000,'contoh/khs/b/s1-v1.pdf',-102),
(-10221,-1022,2.80,3.05,'khs-b-2.pdf',1000,'contoh/khs/b/s2-v1.pdf',-102),
(-10311,-1031,2.70,2.70,'khs-c-1.pdf',1000,'contoh/khs/c/s1-v1.pdf',-103),
(-10331,-1033,2.90,2.90,'khs-c-3.pdf',1000,'contoh/khs/c/s3-v1.pdf',-103);
INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10111,-2,'terverifikasi');
INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10211,-2,'terverifikasi');
INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10221,-2,'terverifikasi');
INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10311,-4,'terverifikasi');
INSERT INTO verifikasi_akademik(id_versi_akademik,id_koordinator,hasil_verifikasi) VALUES(-10331,-4,'terverifikasi');
SET CONSTRAINTS ALL IMMEDIATE;
-- Seed memakai ID eksplisit: nomor otomatis berikutnya dimulai dari 10.
SELECT setval('id_beasiswa_seq',9,true);
COMMIT;
