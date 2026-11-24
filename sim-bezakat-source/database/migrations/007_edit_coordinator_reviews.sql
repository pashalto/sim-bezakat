-- Koordinator dapat mengoreksi keputusan sendiri selama tahap LAZ/Kemenag belum dimulai.
BEGIN;
SET LOCAL search_path = sim_bezakat, pg_catalog;
DO $$ BEGIN
  IF current_database() <> 'sim_bezakat_dev' OR NOT EXISTS (SELECT 1 FROM schema_version WHERE version=6)
    THEN RAISE EXCEPTION 'Butuh sim_bezakat_dev versi 6'; END IF;
END $$;

CREATE FUNCTION jaga_koreksi_verifikasi() RETURNS trigger
LANGUAGE plpgsql
SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
DECLARE
  pemilik_fungsi name;
BEGIN
  SELECT pg_get_userbyid(proowner) INTO pemilik_fungsi
  FROM pg_proc
  WHERE oid='sim_bezakat.portal_simpan_pemeriksaan(bigint,bigint,text,text,jsonb)'::regprocedure;
  IF current_setting('sim_bezakat.koreksi_koordinator',true) IS DISTINCT FROM '1'
    OR current_user<>pemilik_fungsi OR OLD.tahap_verifikasi<>'koordinator' THEN
    RAISE EXCEPTION 'Riwayat verifikasi hanya dapat dikoreksi melalui alur pemeriksaan koordinator'
      USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.id_verifikasi<>OLD.id_verifikasi
    OR NEW.id_laporan_bulanan<>OLD.id_laporan_bulanan
    OR NEW.nomor_pengajuan<>OLD.nomor_pengajuan
    OR NEW.tahap_verifikasi<>OLD.tahap_verifikasi
    OR NEW.id_koordinator IS DISTINCT FROM OLD.id_koordinator
    OR NEW.id_pengelola_laz IS NOT NULL OR NEW.id_pengelola_kemenag IS NOT NULL THEN
    RAISE EXCEPTION 'Identitas verifikasi tidak dapat diubah' USING ERRCODE='23514';
  END IF;
  NEW.waktu_verifikasi:=waktu_sekarang();
  RETURN NEW;
END $$;

DROP TRIGGER verifikasi_tetap ON verifikasi_laporan;
CREATE TRIGGER verifikasi_tetap BEFORE UPDATE OR DELETE ON verifikasi_laporan
FOR EACH ROW EXECUTE FUNCTION jaga_koreksi_verifikasi();

CREATE OR REPLACE FUNCTION portal_simpan_pemeriksaan(
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
  hasil_baru text;
  semua_bagian boolean;
  semua_keuangan boolean;
  ada_revisi boolean;
  catatan text;
  bagian_json jsonb;
  keuangan_json jsonb;
  bagian_wajib constant text[]:=ARRAY[
    'keluarga','akademik','pengembangan','organisasi',
    'ruhiyah','prestasi','sosial','ringkasan'
  ];
BEGIN
  IF p_operasi NOT IN ('approve-report','revise-report','reject-report',
      'approve-section','revise-section','approve-finance','revise-finance')
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
  IF NOT FOUND OR a.id_koordinator<>p_aktor OR s.nomor_pengajuan=0 THEN
    RAISE EXCEPTION 'Laporan tidak berada dalam cakupan koordinator' USING ERRCODE='42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM verifikasi_laporan
    WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
      AND tahap_verifikasi IN ('laz','kemenag')
  ) THEN
    RAISE EXCEPTION 'Pemeriksaan tidak dapat diedit karena tahap lanjutan sudah dimulai'
      USING ERRCODE='23514';
  END IF;
  IF p_operasi LIKE '%finance' AND NOT EXISTS (
    SELECT 1 FROM pengajuan_berkas WHERE id_laporan_bulanan=p_laporan
      AND nomor_pengajuan=s.nomor_pengajuan AND id_berkas::text=p_target
  ) THEN RAISE EXCEPTION 'Berkas tidak termasuk pengajuan aktif' USING ERRCODE='23514'; END IF;
  IF (p_operasi LIKE 'revise-%' OR p_operasi='reject-report') AND jsonb_array_length(p_isu)=0 THEN
    RAISE EXCEPTION 'Catatan revisi wajib diisi' USING ERRCODE='23514';
  END IF;

  INSERT INTO pemeriksaan_laporan_portal(id_laporan_bulanan,nomor_pengajuan,id_koordinator)
  VALUES(p_laporan,s.nomor_pengajuan,p_aktor)
  ON CONFLICT DO NOTHING;
  SELECT rincian INTO detail FROM pemeriksaan_laporan_portal
    WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
      AND id_koordinator=p_aktor FOR UPDATE;

  IF p_operasi='approve-report' THEN
    SELECT jsonb_object_agg(bagian,jsonb_build_object('status','approved','issues','[]'::jsonb))
      INTO STRICT bagian_json FROM unnest(bagian_wajib) bagian;
    SELECT coalesce(jsonb_object_agg(id_berkas::text,jsonb_build_object('status','approved','issues','[]'::jsonb)),'{}'::jsonb)
      INTO keuangan_json FROM pengajuan_berkas
      WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan;
    detail:=jsonb_set(jsonb_set(detail,'{sections}',bagian_json,true),'{finance}',keuangan_json,true);
    detail:=jsonb_set(detail,'{decision}',jsonb_build_object('status','approved','issues','[]'::jsonb),true);
    hasil_baru:='disetujui';
    catatan:='Laporan diterima oleh koordinator.';
  ELSIF p_operasi IN ('revise-report','reject-report') THEN
    SELECT string_agg(DISTINCT value->>'reason','; ') INTO catatan FROM jsonb_array_elements(p_isu);
    hasil_baru:=CASE WHEN p_operasi='reject-report' THEN 'ditolak' ELSE 'perlu_revisi' END;
    detail:=jsonb_set(detail,'{decision}',jsonb_build_object(
      'status',CASE WHEN p_operasi='reject-report' THEN 'rejected' ELSE 'revision' END,
      'issues',p_isu),true);
  ELSE
    detail:=detail-'decision';
    detail:=jsonb_set(
      detail,
      CASE WHEN p_operasi LIKE '%section' THEN ARRAY['sections',p_target] ELSE ARRAY['finance',p_target] END,
      jsonb_build_object(
        'status',CASE WHEN p_operasi LIKE 'approve-%' THEN 'approved' ELSE 'revision' END,
        'issues',p_isu
      ),
      true
    );
    SELECT EXISTS (
      SELECT 1 FROM jsonb_each(coalesce(detail->'sections','{}'::jsonb)) e WHERE e.value->>'status'='revision'
      UNION ALL
      SELECT 1 FROM jsonb_each(coalesce(detail->'finance','{}'::jsonb)) e WHERE e.value->>'status'='revision'
    ) INTO ada_revisi;
    SELECT NOT EXISTS (
      SELECT 1 FROM unnest(bagian_wajib) bagian
      WHERE detail#>>ARRAY['sections',bagian,'status'] IS DISTINCT FROM 'approved'
    ) INTO semua_bagian;
    SELECT NOT EXISTS (
      SELECT 1 FROM pengajuan_berkas b
      WHERE b.id_laporan_bulanan=p_laporan AND b.nomor_pengajuan=s.nomor_pengajuan
        AND detail#>>ARRAY['finance',b.id_berkas::text,'status'] IS DISTINCT FROM 'approved'
    ) INTO semua_keuangan;
    IF ada_revisi THEN
      hasil_baru:='perlu_revisi';
      SELECT string_agg(DISTINCT issue->>'reason','; ') INTO catatan
      FROM (
        SELECT jsonb_array_elements(coalesce(value->'issues','[]'::jsonb)) AS issue
        FROM jsonb_each(coalesce(detail->'sections','{}'::jsonb))
        UNION ALL
        SELECT jsonb_array_elements(coalesce(value->'issues','[]'::jsonb)) AS issue
        FROM jsonb_each(coalesce(detail->'finance','{}'::jsonb))
      ) daftar_isu;
    ELSIF semua_bagian AND semua_keuangan THEN
      hasil_baru:='disetujui';
      catatan:='Seluruh bagian laporan dan dokumen keuangan disetujui.';
    END IF;
  END IF;

  UPDATE pemeriksaan_laporan_portal SET rincian=detail,diperbarui_pada=waktu_sekarang()
  WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
    AND id_koordinator=p_aktor;

  PERFORM set_config('sim_bezakat.koreksi_koordinator','1',true);
  IF hasil_baru IS NULL THEN
    DELETE FROM verifikasi_laporan
    WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
      AND tahap_verifikasi='koordinator';
  ELSIF EXISTS (
    SELECT 1 FROM verifikasi_laporan
    WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
      AND tahap_verifikasi='koordinator'
  ) THEN
    UPDATE verifikasi_laporan
    SET hasil_verifikasi=hasil_baru,catatan_verifikasi=catatan
    WHERE id_laporan_bulanan=p_laporan AND nomor_pengajuan=s.nomor_pengajuan
      AND tahap_verifikasi='koordinator';
  ELSE
    INSERT INTO verifikasi_laporan(
      id_laporan_bulanan,nomor_pengajuan,tahap_verifikasi,id_koordinator,
      hasil_verifikasi,catatan_verifikasi
    ) VALUES(p_laporan,s.nomor_pengajuan,'koordinator',p_aktor,hasil_baru,catatan);
  END IF;
  RETURN detail;
END $$;

REVOKE ALL ON FUNCTION jaga_koreksi_verifikasi() FROM PUBLIC;
INSERT INTO schema_version(version) VALUES (7);
COMMIT;
