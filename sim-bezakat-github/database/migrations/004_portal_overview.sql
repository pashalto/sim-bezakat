-- Read model for the existing portal. Only the backend supplies the authenticated actor.
BEGIN;
SET LOCAL search_path = sim_bezakat, pg_catalog;
DO $$ BEGIN
  IF current_database() <> 'sim_bezakat_dev' OR NOT EXISTS (SELECT 1 FROM schema_version WHERE version=3)
    THEN RAISE EXCEPTION 'Butuh sim_bezakat_dev versi 3'; END IF;
END $$;

CREATE FUNCTION portal_ringkasan(p_aktor bigint) RETURNS jsonb
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
      FROM berkas_keuangan_versi b LEFT JOIN pengajuan_berkas pb ON pb.id_berkas=b.id_berkas AND pb.nomor_pengajuan=s.nomor_pengajuan
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
REVOKE ALL ON FUNCTION portal_ringkasan(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portal_ringkasan(bigint) TO sim_bezakat_app;
INSERT INTO schema_version(version) VALUES (4);
COMMIT;
