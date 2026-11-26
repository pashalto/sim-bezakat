BEGIN;
SET LOCAL search_path = sim_bezakat, pg_catalog;
DO $$ BEGIN
  IF current_database() <> 'sim_bezakat_dev' OR current_user <> 'sim_bezakat_migrator'
    OR (SELECT max(version) FROM schema_version) IS DISTINCT FROM 7 THEN
    RAISE EXCEPTION 'Memerlukan sim_bezakat_dev versi domain 7 dan role migrator';
  END IF;
END $$;

CREATE TABLE isi_berkas_keuangan (
  id_berkas bigint PRIMARY KEY REFERENCES berkas_keuangan_versi ON DELETE RESTRICT,
  isi bytea NOT NULL CHECK (octet_length(isi) BETWEEN 1 AND 2097152)
);
REVOKE ALL ON isi_berkas_keuangan FROM PUBLIC, sim_bezakat_app;

CREATE FUNCTION portal_unggah_keuangan(aktor bigint, periode bigint, jenis text, nama text, mime text, isi bytea)
RETURNS TABLE(id text, version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
DECLARE
  terbuka boolean;
  laporan bigint;
  status text;
  pengajuan integer;
  berkas bigint;
  nomor integer;
BEGIN
  IF NOT EXISTS (SELECT FROM akun_pengguna WHERE id_akun=aktor AND status_aktif AND peran='awardee') THEN
    RAISE EXCEPTION 'Akses ditolak' USING ERRCODE='42501';
  END IF;
  SELECT waktu_sekarang() >= tanggal_buka AND waktu_sekarang() < tanggal_tenggat_cutoff INTO terbuka
    FROM periode_monitoring WHERE id_periode_monitoring=periode;
  IF NOT FOUND THEN RAISE EXCEPTION 'Periode tidak tersedia' USING ERRCODE='23514'; END IF;
  IF terbuka THEN
    INSERT INTO laporan_bulanan(id_awardee,id_periode_monitoring) VALUES(aktor,periode)
      ON CONFLICT(id_awardee,id_periode_monitoring) DO NOTHING;
  END IF;
  SELECT id_laporan_bulanan INTO laporan FROM laporan_bulanan
    WHERE id_awardee=aktor AND id_periode_monitoring=periode FOR UPDATE;
  SELECT status_pengisian, nomor_pengajuan INTO status,pengajuan FROM v_status_laporan WHERE id_laporan_bulanan=laporan;
  IF laporan IS NULL OR NOT ((terbuka AND status='draf') OR status='perlu_revisi') THEN
    RAISE EXCEPTION 'Unggahan terkunci' USING ERRCODE='23514';
  END IF;
  IF EXISTS (
    SELECT FROM pengajuan_berkas pb JOIN pemeriksaan_laporan_portal r USING(id_laporan_bulanan,nomor_pengajuan)
    WHERE pb.id_laporan_bulanan=laporan AND pb.nomor_pengajuan=pengajuan AND pb.jenis_dokumen=jenis
      AND r.rincian #>> ARRAY['finance',pb.id_berkas::text,'status']='approved'
  ) THEN RAISE EXCEPTION 'Dokumen disetujui' USING ERRCODE='23514'; END IF;
  INSERT INTO berkas_keuangan_versi(id_laporan_bulanan,jenis_dokumen,nama_asli,mime_type,ukuran_byte,storage_key,sha256,diunggah_oleh)
    VALUES(laporan,jenis,nama,mime,octet_length(isi),'private/finance/'||gen_random_uuid(),encode(sha256(isi),'hex'),aktor)
    RETURNING id_berkas,versi INTO berkas,nomor;
  INSERT INTO isi_berkas_keuangan VALUES(berkas,isi);
  RETURN QUERY SELECT berkas::text,nomor;
END $$;

CREATE FUNCTION portal_unduh_keuangan(aktor bigint, berkas bigint)
RETURNS TABLE(nama text,mime text,konten text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
  SELECT b.nama_asli,b.mime_type,encode(f.isi,'base64')
  FROM berkas_keuangan_versi b JOIN isi_berkas_keuangan f USING(id_berkas)
  JOIN laporan_bulanan l USING(id_laporan_bulanan) JOIN awardee a USING(id_awardee)
  JOIN akun_pengguna u ON u.id_akun=aktor AND u.status_aktif
  WHERE b.id_berkas=berkas AND (
    (u.peran='awardee' AND a.id_awardee=aktor) OR
    (u.peran='koordinator' AND a.id_koordinator=aktor) OR
    (u.peran='laz' AND EXISTS (SELECT FROM pengelola_lembaga_zakat z WHERE z.id_pengelola_laz=aktor AND z.id_lembaga=a.id_lembaga)) OR
    u.peran='kemenag'
  )
$$;
REVOKE ALL ON FUNCTION portal_unggah_keuangan(bigint,bigint,text,text,text,bytea),portal_unduh_keuangan(bigint,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portal_unggah_keuangan(bigint,bigint,text,text,text,bytea),portal_unduh_keuangan(bigint,bigint) TO sim_bezakat_app;
INSERT INTO schema_version(version) VALUES(9);
COMMIT;
