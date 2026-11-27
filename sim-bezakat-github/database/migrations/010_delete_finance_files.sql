-- Finance deletion: remove the active document without destroying submission history.
-- Apply once as sim_bezakat_migrator after 009; never run from HTTP requests.
BEGIN;
SET LOCAL search_path=sim_bezakat,pg_catalog;
DO $$ BEGIN
 IF current_database()<>'sim_bezakat_dev' OR current_user<>'sim_bezakat_migrator'
    OR (SELECT max(version) FROM schema_version) IS DISTINCT FROM 9 THEN
   RAISE EXCEPTION 'Requires sim_bezakat_dev domain version 9 as migrator';
 END IF;
END $$;

CREATE TABLE penarikan_berkas_keuangan (
 id_berkas bigint PRIMARY KEY REFERENCES berkas_keuangan_versi ON DELETE RESTRICT,
 ditarik_oleh bigint NOT NULL REFERENCES awardee ON DELETE RESTRICT,
 ditarik_pada timestamptz NOT NULL DEFAULT waktu_sekarang()
);
REVOKE ALL ON penarikan_berkas_keuangan FROM PUBLIC,sim_bezakat_app;
CREATE TRIGGER penarikan_tetap BEFORE UPDATE OR DELETE ON penarikan_berkas_keuangan
 FOR EACH ROW EXECUTE FUNCTION tolak_perubahan();

-- Choose latest BEFORE filtering withdrawals: old versions must never reappear.
CREATE VIEW v_berkas_keuangan_aktif AS
SELECT latest.* FROM (
 SELECT DISTINCT ON (id_laporan_bulanan,jenis_dokumen) * FROM berkas_keuangan_versi
 ORDER BY id_laporan_bulanan,jenis_dokumen,versi DESC
) latest WHERE NOT EXISTS(SELECT FROM penarikan_berkas_keuangan p WHERE p.id_berkas=latest.id_berkas);
REVOKE ALL ON v_berkas_keuangan_aktif FROM PUBLIC,sim_bezakat_app;

CREATE FUNCTION portal_hapus_keuangan(aktor bigint,periode bigint,jenis text,dokumen bigint)
RETURNS TABLE(id text,history_retained boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
DECLARE laporan bigint; status text; pengajuan integer; terbuka boolean; terakhir bigint; riwayat boolean;
BEGIN
 IF NOT EXISTS(SELECT FROM akun_pengguna WHERE id_akun=aktor AND status_aktif AND peran='awardee') THEN
   RAISE EXCEPTION 'Akses ditolak' USING ERRCODE='42501'; END IF;
 IF jenis NOT IN ('periode_berjalan','rencana_berikutnya') OR jenis IS NULL THEN
   RAISE EXCEPTION 'Jenis dokumen tidak valid' USING ERRCODE='23514'; END IF;
 -- Same report-row lock as upload/review: a stale delete cannot erase a newer upload.
 SELECT id_laporan_bulanan INTO laporan FROM laporan_bulanan
   WHERE id_awardee=aktor AND id_periode_monitoring=periode FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT FROM berkas_keuangan_versi
   WHERE id_berkas=dokumen AND id_laporan_bulanan=laporan AND jenis_dokumen=jenis) THEN
   RAISE EXCEPTION 'Dokumen bukan milik akun/periode/jenis ini' USING ERRCODE='42501'; END IF;
 SELECT status_pengisian,nomor_pengajuan INTO status,pengajuan FROM v_status_laporan WHERE id_laporan_bulanan=laporan;
 SELECT waktu_sekarang()>=tanggal_buka AND waktu_sekarang()<tanggal_tenggat_cutoff INTO terbuka
   FROM periode_monitoring WHERE id_periode_monitoring=periode;
 IF NOT ((terbuka AND status='draf') OR status='perlu_revisi') THEN
   RAISE EXCEPTION 'Penghapusan terkunci' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT FROM pengajuan_berkas pb JOIN pemeriksaan_laporan_portal r USING(id_laporan_bulanan,nomor_pengajuan)
   WHERE pb.id_laporan_bulanan=laporan AND pb.nomor_pengajuan=pengajuan AND pb.jenis_dokumen=jenis
     AND r.rincian #>> ARRAY['finance',pb.id_berkas::text,'status']='approved') THEN
   RAISE EXCEPTION 'Dokumen sudah disetujui' USING ERRCODE='23514'; END IF;
 SELECT id_berkas INTO terakhir FROM v_berkas_keuangan_aktif WHERE id_laporan_bulanan=laporan AND jenis_dokumen=jenis;
 IF terakhir IS DISTINCT FROM dokumen THEN RAISE EXCEPTION 'Dokumen telah berubah' USING ERRCODE='40001'; END IF;
 SELECT EXISTS(SELECT FROM pengajuan_berkas WHERE id_berkas=dokumen) INTO riwayat;
 INSERT INTO penarikan_berkas_keuangan(id_berkas,ditarik_oleh) VALUES(dokumen,aktor);
 -- Blob storage is PostgreSQL bytea (009). Referenced history retains its bytes.
 IF NOT riwayat THEN DELETE FROM isi_berkas_keuangan WHERE id_berkas=dokumen; END IF;
 RETURN QUERY SELECT dokumen::text,riwayat;
END $$;
REVOKE ALL ON FUNCTION portal_hapus_keuangan(bigint,bigint,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portal_hapus_keuangan(bigint,bigint,text,bigint) TO sim_bezakat_app;

CREATE OR REPLACE FUNCTION siapkan_pengajuan() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, sim_bezakat, pg_temp AS $$
DECLARE l laporan_bulanan; p periode_monitoring; a awardee; s v_status_laporan; w timestamptz;
BEGIN
  SELECT * INTO l FROM laporan_bulanan WHERE id_laporan_bulanan=NEW.id_laporan_bulanan FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Laporan tidak ada' USING ERRCODE='23503'; END IF;
  SELECT * INTO s FROM v_status_laporan WHERE id_laporan_bulanan=l.id_laporan_bulanan;
  SELECT * INTO a FROM awardee WHERE id_awardee=l.id_awardee;
  SELECT * INTO p FROM periode_monitoring WHERE id_periode_monitoring=l.id_periode_monitoring;
  w:=waktu_sekarang();
  IF NEW.diajukan_oleh<>l.id_awardee THEN RAISE EXCEPTION 'Pengaju bukan pemilik' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM akun_pengguna WHERE id_akun=l.id_awardee AND status_aktif) THEN
    RAISE EXCEPTION 'Akun tidak aktif' USING ERRCODE='23514'; END IF;
  IF s.nomor_pengajuan=0 THEN
    IF w<p.tanggal_buka OR w>=p.tanggal_tenggat_cutoff THEN
      RAISE EXCEPTION 'Pengajuan pertama di luar periode WIB' USING ERRCODE='23514'; END IF;
  ELSIF s.status_pengisian<>'perlu_revisi' THEN
    RAISE EXCEPTION 'Pengajuan ulang membutuhkan permintaan revisi' USING ERRCODE='23514';
  ELSIF coalesce(btrim(NEW.catatan_perbaikan),'')='' THEN
    RAISE EXCEPTION 'Catatan perbaikan wajib diisi' USING ERRCODE='23514';
  END IF;
  IF coalesce(btrim(l.ringkasan_refleksi_diri),'')='' OR l.poin_sholat_berjamaah IS NULL
    OR l.frekuensi_qiyamullail IS NULL OR coalesce(btrim(l.hafalan_quran),'')=''
    OR l.skor_adaptasi_belajar IS NULL OR l.skor_kelola_stres IS NULL THEN
    RAISE EXCEPTION 'Evaluasi dan ringkasan laporan belum lengkap' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM v_berkas_keuangan_aktif WHERE id_laporan_bulanan=l.id_laporan_bulanan AND jenis_dokumen='periode_berjalan') THEN
    RAISE EXCEPTION 'Berkas keuangan periode berjalan wajib dilampirkan' USING ERRCODE='23514'; END IF;
  NEW.nomor_pengajuan:=s.nomor_pengajuan+1;
  NEW.waktu_pengumpulan:=w;
  NEW.snapshot_laporan:=to_jsonb(l) || jsonb_build_object(
    'realisasi_pengeluaran',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY id_realisasi_pengeluaran),'[]') FROM realisasi_pengeluaran r WHERE r.id_lpj_keuangan=l.id_lpj_keuangan),
    'prestasi',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY id_prestasi),'[]') FROM prestasi r WHERE r.id_awardee=l.id_awardee AND r.id_periode_monitoring=l.id_periode_monitoring));
  NEW.snapshot_profil:=to_jsonb(a);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION tautkan_berkas_pengajuan() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, sim_bezakat, pg_temp AS $$
BEGIN
  INSERT INTO pengajuan_berkas(id_laporan_bulanan,nomor_pengajuan,jenis_dokumen,id_berkas)
  SELECT DISTINCT ON (jenis_dokumen) NEW.id_laporan_bulanan,NEW.nomor_pengajuan,jenis_dokumen,id_berkas
    FROM v_berkas_keuangan_aktif WHERE id_laporan_bulanan=NEW.id_laporan_bulanan ORDER BY jenis_dokumen,versi DESC;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION portal_ringkasan(p_aktor bigint) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
WITH actor AS (
  SELECT id_akun, peran FROM akun_pengguna WHERE id_akun=p_aktor AND status_aktif
), scope AS (
  SELECT a.* FROM awardee a JOIN actor u ON
    (u.peran='awardee' AND a.id_awardee=u.id_akun)
    OR (u.peran='koordinator' AND a.id_koordinator=u.id_akun)
    OR (u.peran='laz' AND EXISTS (SELECT 1 FROM pengelola_lembaga_zakat z
       WHERE z.id_pengelola_laz=u.id_akun AND z.id_lembaga=a.id_lembaga))
    OR u.peran='kemenag'
), profiles AS (
  SELECT a.id_awardee::text AS "ownerId", nama_lengkap AS "fullName",
    u.id_beasiswa AS "registrationNumber", nim AS "studentNumber", nama_kampus AS university,
    program_studi AS "studyProgram", nama_laz AS sponsor, status_awardee AS "scholarshipStatus",
    CASE WHEN a.id_awardee=p_aktor THEN tanggal_lahir::text END AS "birthDate",
    CASE WHEN a.id_awardee=p_aktor THEN jenis_kelamin END AS gender,
    CASE WHEN a.id_awardee=p_aktor THEN alamat_domisili END AS "domicileAddress",
    CASE WHEN a.id_awardee=p_aktor THEN concat_ws(', ',akun_ig,akun_tiktok,akun_fb,akun_x) END AS "socialMedia",
    w.nama_wali AS "guardianName", w.nomor_telepon AS "guardianContact"
  FROM scope a JOIN akun_pengguna u ON u.id_akun=a.id_awardee
  JOIN perguruan_tinggi USING(id_perguruan_tinggi) JOIN lembaga_penyantun USING(id_lembaga)
  LEFT JOIN LATERAL (SELECT nama_wali,nomor_telepon FROM kontak_wali
    WHERE id_awardee=a.id_awardee AND a.id_awardee=p_aktor ORDER BY nomor_urut_kontak LIMIT 1) w ON true
), academics AS (
  SELECT DISTINCT ON (r.id_riwayat_akademik) r.id_awardee::text AS "ownerId",r.semester_ke AS semester,
    a.id_versi_akademik::text AS id,a.nama_berkas_khs AS name,a.ukuran_byte AS size,a.diajukan_pada AS "uploadedAt",
    CASE v.hasil_verifikasi WHEN 'terverifikasi' THEN 'approved' WHEN 'perlu_revisi' THEN 'revision' ELSE 'submitted' END AS status,
    v.catatan_pembinaan AS reason, t.ipk_kumulatif AS "verifiedGpa", t.ips AS "verifiedIps"
  FROM riwayat_akademik r JOIN scope USING(id_awardee) JOIN versi_akademik a USING(id_riwayat_akademik)
  LEFT JOIN verifikasi_akademik v USING(id_versi_akademik)
  LEFT JOIN v_akademik_terverifikasi t USING(id_riwayat_akademik)
  WHERE r.id_awardee=p_aktor ORDER BY r.id_riwayat_akademik, a.versi DESC
), reports AS (
  SELECT l.id_laporan_bulanan::text AS "reportId", l.id_awardee::text AS "ownerId",
    p.id_periode_monitoring::text AS "periodId",p.bulan AS month,p.tahun_anggaran AS year,
    s.status_pengisian AS status,s.waktu_pengumpulan AS "submittedAt",
    coalesce(l.jawaban_tambahan->'portal'->'answers',jsonb_strip_nulls(jsonb_build_object('executive_summary',l.ringkasan_refleksi_diri))) AS answers,
    coalesce(l.jawaban_tambahan->'portal'->'activities','[]') AS activities,
    (SELECT jsonb_build_object('fullName',snapshot_profil->>'nama_lengkap','studentNumber',snapshot_profil->>'nim',
      'studyProgram',snapshot_profil->>'program_studi','registrationNumber',snapshot_profil->>'nomor_registrasi')
     FROM pengajuan_laporan WHERE id_laporan_bulanan=l.id_laporan_bulanan AND nomor_pengajuan=s.nomor_pengajuan) AS snapshot,
    coalesce((SELECT jsonb_agg(to_jsonb(doc)) FROM (
      SELECT DISTINCT ON (b.jenis_dokumen) b.id_berkas::text AS id,
        CASE b.jenis_dokumen WHEN 'periode_berjalan' THEN 'current' ELSE 'next' END AS category,
        nama_asli AS name,ukuran_byte AS size,diunggah_pada AS "uploadedAt",versi AS version,
        CASE WHEN pb.id_berkas IS NULL THEN 'draft' WHEN s.status_pengisian='disetujui' THEN 'approved' ELSE 'submitted' END AS status
      FROM v_berkas_keuangan_aktif b LEFT JOIN pengajuan_berkas pb ON pb.id_berkas=b.id_berkas AND pb.nomor_pengajuan=s.nomor_pengajuan
      WHERE b.id_laporan_bulanan=l.id_laporan_bulanan ORDER BY b.jenis_dokumen,versi DESC
    ) doc),'[]') AS "financeDocuments",
    coalesce((SELECT jsonb_agg(to_jsonb(ev) ORDER BY date) FROM (
      SELECT waktu_pengumpulan AS date,'Awardee' AS actor,'Pengajuan '||nomor_pengajuan AS text
      FROM pengajuan_laporan WHERE id_laporan_bulanan=l.id_laporan_bulanan
      UNION ALL SELECT waktu_verifikasi,tahap_verifikasi,concat_ws(' · ',replace(hasil_verifikasi,'_',' '),catatan_verifikasi)
      FROM verifikasi_laporan WHERE id_laporan_bulanan=l.id_laporan_bulanan
    ) ev),'[]') AS "reviewHistory"
  FROM laporan_bulanan l JOIN scope USING(id_awardee) JOIN periode_monitoring p USING(id_periode_monitoring)
  JOIN v_status_laporan s USING(id_laporan_bulanan)
)
SELECT jsonb_build_object(
  'profiles',coalesce((SELECT jsonb_agg(to_jsonb(profiles)) FROM profiles),'[]'),
  'reports',coalesce((SELECT jsonb_agg(to_jsonb(reports) ORDER BY year DESC,month DESC) FROM reports),'[]'),
  'academics',coalesce((SELECT jsonb_agg(to_jsonb(academics) ORDER BY semester) FROM academics),'[]'),
  'activePeriod',(SELECT jsonb_build_object('month',bulan,'year',tahun_anggaran) FROM periode_monitoring
    WHERE waktu_sekarang()>=tanggal_buka AND waktu_sekarang()<tanggal_tenggat_cutoff),
  'institution',(SELECT nama_laz FROM pengelola_lembaga_zakat JOIN lembaga_penyantun USING(id_lembaga)
    WHERE id_pengelola_laz=p_aktor))
$$;
INSERT INTO schema_version(version) VALUES(10);
COMMIT;
