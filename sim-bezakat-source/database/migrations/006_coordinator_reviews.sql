-- Pemeriksaan bertahap koordinator untuk portal, sebelum keputusan final dicatat.
BEGIN;
SET LOCAL search_path = sim_bezakat, pg_catalog;
DO $$ BEGIN
  IF current_database() <> 'sim_bezakat_dev' OR NOT EXISTS (SELECT 1 FROM schema_version WHERE version=5)
    THEN RAISE EXCEPTION 'Butuh sim_bezakat_dev versi 5'; END IF;
END $$;

CREATE TABLE pemeriksaan_laporan_portal (
  id_laporan_bulanan bigint NOT NULL,
  nomor_pengajuan integer NOT NULL,
  id_koordinator bigint NOT NULL REFERENCES koordinator_beasiswa ON DELETE RESTRICT,
  rincian jsonb NOT NULL DEFAULT '{"sections":{},"finance":{}}'::jsonb
    CHECK (jsonb_typeof(rincian)='object'),
  diperbarui_pada timestamptz NOT NULL DEFAULT waktu_sekarang(),
  PRIMARY KEY (id_laporan_bulanan,nomor_pengajuan,id_koordinator),
  FOREIGN KEY (id_laporan_bulanan,nomor_pengajuan)
    REFERENCES pengajuan_laporan ON DELETE RESTRICT
);

CREATE FUNCTION portal_simpan_pemeriksaan(
  p_aktor bigint,
  p_laporan bigint,
  p_operasi text,
  p_target text,
  p_isu jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
DECLARE
  s v_status_laporan;
  a awardee;
  detail jsonb;
  status_baru text;
  semua_bagian boolean;
  semua_keuangan boolean;
  catatan text;
  bagian_wajib constant text[]:=ARRAY[
    'keluarga','akademik','pengembangan','organisasi',
    'ruhiyah','prestasi','sosial','ringkasan'
  ];
BEGIN
  IF p_operasi NOT IN ('approve-section','revise-section','approve-finance','revise-finance')
    OR coalesce(btrim(p_target),'')='' OR jsonb_typeof(p_isu)<>'array' THEN
    RAISE EXCEPTION 'Pemeriksaan tidak valid' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM akun_pengguna
    WHERE id_akun=p_aktor AND peran='koordinator' AND status_aktif
  ) THEN RAISE EXCEPTION 'Koordinator tidak aktif' USING ERRCODE='42501'; END IF;
  IF p_operasi LIKE '%section' AND NOT p_target=ANY(bagian_wajib) THEN
    RAISE EXCEPTION 'Bagian laporan tidak dikenal' USING ERRCODE='23514';
  END IF;
  SELECT * INTO s FROM v_status_laporan WHERE id_laporan_bulanan=p_laporan;
  SELECT aw.* INTO a FROM laporan_bulanan l JOIN awardee aw USING(id_awardee)
    WHERE l.id_laporan_bulanan=p_laporan FOR UPDATE OF l;
  IF NOT FOUND OR a.id_koordinator<>p_aktor OR s.nomor_pengajuan=0 OR s.status_pengisian<>'diajukan' THEN
    RAISE EXCEPTION 'Laporan tidak berada dalam antrean koordinator' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM verifikasi_laporan WHERE id_laporan_bulanan=p_laporan
      AND nomor_pengajuan=s.nomor_pengajuan AND tahap_verifikasi='koordinator') THEN
    RAISE EXCEPTION 'Pemeriksaan koordinator sudah selesai' USING ERRCODE='23514';
  END IF;
  IF p_operasi LIKE '%finance' AND NOT EXISTS (
    SELECT 1 FROM pengajuan_berkas WHERE id_laporan_bulanan=p_laporan
      AND nomor_pengajuan=s.nomor_pengajuan AND id_berkas::text=p_target
  ) THEN RAISE EXCEPTION 'Berkas tidak termasuk pengajuan aktif' USING ERRCODE='23514'; END IF;
  IF p_operasi LIKE 'revise-%' AND jsonb_array_length(p_isu)=0 THEN
    RAISE EXCEPTION 'Catatan revisi wajib diisi' USING ERRCODE='23514';
  END IF;

  INSERT INTO pemeriksaan_laporan_portal(id_laporan_bulanan,nomor_pengajuan,id_koordinator)
  VALUES(p_laporan,s.nomor_pengajuan,p_aktor)
  ON CONFLICT DO NOTHING;
  SELECT rincian INTO detail FROM pemeriksaan_laporan_portal
    WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
      AND id_koordinator=p_aktor FOR UPDATE;
  status_baru:=CASE WHEN p_operasi LIKE 'approve-%' THEN 'approved' ELSE 'revision' END;
  detail:=jsonb_set(
    detail,
    CASE WHEN p_operasi LIKE '%section' THEN ARRAY['sections',p_target] ELSE ARRAY['finance',p_target] END,
    jsonb_build_object('status',status_baru,'issues',p_isu),
    true
  );
  UPDATE pemeriksaan_laporan_portal SET rincian=detail,diperbarui_pada=waktu_sekarang()
    WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
      AND id_koordinator=p_aktor;

  IF status_baru='revision' THEN
    SELECT string_agg(DISTINCT value->>'reason','; ') INTO catatan
      FROM jsonb_array_elements(p_isu);
    INSERT INTO verifikasi_laporan(
      id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,
      hasil_verifikasi,catatan_verifikasi
    ) VALUES(p_laporan,s.nomor_pengajuan,'koordinator',p_aktor,'perlu_revisi',catatan);
  ELSE
    SELECT NOT EXISTS (
      SELECT 1 FROM unnest(bagian_wajib) bagian
      WHERE detail#>>ARRAY['sections',bagian,'status'] IS DISTINCT FROM 'approved'
    ) INTO semua_bagian;
    SELECT NOT EXISTS (
      SELECT 1 FROM pengajuan_berkas b
      WHERE b.id_laporan_bulanan=p_laporan AND b.nomor_pengajuan=s.nomor_pengajuan
        AND detail#>>ARRAY['finance',b.id_berkas::text,'status'] IS DISTINCT FROM 'approved'
    ) INTO semua_keuangan;
    IF semua_bagian AND semua_keuangan THEN
      INSERT INTO verifikasi_laporan(
        id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,
        hasil_verifikasi,catatan_verifikasi
      ) VALUES(p_laporan,s.nomor_pengajuan,'koordinator',p_aktor,'disetujui',
        'Seluruh bagian laporan dan dokumen keuangan disetujui.');
    END IF;
  END IF;
  RETURN detail;
END $$;

CREATE FUNCTION portal_daftar_pemeriksaan(p_aktor bigint) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
SELECT coalesce(jsonb_agg(jsonb_build_object(
  'reportId',p.id_laporan_bulanan::text,
  'detail',p.rincian
)),'[]'::jsonb)
FROM pemeriksaan_laporan_portal p
JOIN laporan_bulanan l USING(id_laporan_bulanan)
JOIN awardee a USING(id_awardee)
JOIN akun_pengguna u ON u.id_akun=p_aktor AND u.status_aktif
WHERE (u.peran='awardee' AND a.id_awardee=p_aktor)
   OR (u.peran='koordinator' AND a.id_koordinator=p_aktor)
$$;

REVOKE ALL ON FUNCTION portal_simpan_pemeriksaan(bigint,bigint,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION portal_daftar_pemeriksaan(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portal_simpan_pemeriksaan(bigint,bigint,text,text,jsonb) TO sim_bezakat_app;
GRANT EXECUTE ON FUNCTION portal_daftar_pemeriksaan(bigint) TO sim_bezakat_app;
INSERT INTO schema_version(version) VALUES (6);
COMMIT;
