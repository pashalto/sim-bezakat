-- Tambahan API draf. Rancangan laporan dan semua riwayat tetap dipakai.
BEGIN;
SET LOCAL search_path=sim_bezakat,pg_catalog;
DO $$ BEGIN
 IF current_database()<>'sim_bezakat_dev' THEN RAISE EXCEPTION 'Target wajib sim_bezakat_dev'; END IF;
 IF NOT EXISTS(SELECT 1 FROM schema_version WHERE version=2)
   OR EXISTS(SELECT 1 FROM schema_version WHERE version>=3) THEN RAISE EXCEPTION 'Butuh skema versi 2'; END IF;
END $$;
ALTER TABLE laporan_bulanan ADD COLUMN versi_draf integer NOT NULL DEFAULT 0 CHECK(versi_draf>=0),
 ADD COLUMN diperbarui_pada timestamptz NOT NULL DEFAULT waktu_sekarang();

CREATE VIEW v_portal_akun AS
 SELECT a.id_akun::text, a.id_beasiswa, a.peran, a.password_hash, a.status_aktif,
 coalesce(w.nama_lengkap,k.nama_pembina,l.nama_petugas_laz,m.nama_staf) AS nama
 FROM akun_pengguna a LEFT JOIN awardee w ON w.id_awardee=a.id_akun
 LEFT JOIN koordinator_beasiswa k ON k.id_koordinator=a.id_akun
 LEFT JOIN pengelola_lembaga_zakat l ON l.id_pengelola_laz=a.id_akun
 LEFT JOIN pengelola_kemenag m ON m.id_pengelola_kemenag=a.id_akun;

CREATE FUNCTION portal_daftar_draf(p_aktor bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM akun_pengguna WHERE id_akun=p_aktor AND peran='awardee' AND status_aktif) THEN
   RAISE EXCEPTION 'Akses ditolak' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
   'periodId',p.id_periode_monitoring::text,'reportId',l.id_laporan_bulanan::text,
   'month',p.bulan,'year',p.tahun_anggaran,'status',coalesce(s.status_pengisian,'draf'),
   'isOpen',waktu_sekarang()>=p.tanggal_buka AND waktu_sekarang()<p.tanggal_tenggat_cutoff,
   'version',coalesce(l.versi_draf,0),'savedAt',l.diperbarui_pada,
   'answers',coalesce(l.jawaban_tambahan->'portal'->'answers',
     CASE WHEN l.ringkasan_refleksi_diri IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('executive_summary',l.ringkasan_refleksi_diri) END),
   'activities',coalesce(l.jawaban_tambahan->'portal'->'activities','[]'::jsonb)
 ) ORDER BY p.tahun_anggaran DESC,p.bulan DESC)
 FROM periode_monitoring p LEFT JOIN laporan_bulanan l
   ON l.id_periode_monitoring=p.id_periode_monitoring AND l.id_awardee=p_aktor
 LEFT JOIN v_status_laporan s ON s.id_laporan_bulanan=l.id_laporan_bulanan
 WHERE l.id_laporan_bulanan IS NOT NULL OR
   (waktu_sekarang()>=p.tanggal_buka AND waktu_sekarang()<p.tanggal_tenggat_cutoff)), '[]'::jsonb);
END $$;

CREATE FUNCTION portal_simpan_draf(p_aktor bigint,p_periode bigint,p_versi integer,p_jawaban jsonb,p_kegiatan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sim_bezakat,pg_temp AS $$
DECLARE laporan laporan_bulanan; periode periode_monitoring; hasil jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM akun_pengguna WHERE id_akun=p_aktor AND peran='awardee' AND status_aktif) THEN
   RAISE EXCEPTION 'Akses ditolak' USING ERRCODE='42501'; END IF;
 IF p_versi IS NULL OR p_versi<0 OR p_jawaban IS NULL OR p_kegiatan IS NULL
   OR jsonb_typeof(p_jawaban)<>'object' OR jsonb_typeof(p_kegiatan)<>'array'
   OR octet_length(p_jawaban::text)>200000 OR octet_length(p_kegiatan::text)>40000 THEN
   RAISE EXCEPTION 'Isian tidak valid' USING ERRCODE='22023'; END IF;
 SELECT * INTO periode FROM periode_monitoring WHERE id_periode_monitoring=p_periode;
 IF NOT FOUND THEN RAISE EXCEPTION 'Periode tidak ditemukan' USING ERRCODE='22023'; END IF;
 SELECT * INTO laporan FROM laporan_bulanan
   WHERE id_awardee=p_aktor AND id_periode_monitoring=p_periode FOR UPDATE;
 IF NOT FOUND THEN
   IF waktu_sekarang()<periode.tanggal_buka OR waktu_sekarang()>=periode.tanggal_tenggat_cutoff THEN
     RAISE EXCEPTION 'Periode belum dibuka atau sudah tutup' USING ERRCODE='23514'; END IF;
   INSERT INTO laporan_bulanan(id_awardee,id_periode_monitoring) VALUES(p_aktor,p_periode)
     ON CONFLICT(id_awardee,id_periode_monitoring) DO NOTHING;
   SELECT * INTO laporan FROM laporan_bulanan
     WHERE id_awardee=p_aktor AND id_periode_monitoring=p_periode FOR UPDATE;
 END IF;
 IF laporan.versi_draf<>p_versi THEN RAISE EXCEPTION 'Draf berubah pada sesi lain' USING ERRCODE='40001'; END IF;
 IF NOT laporan_bisa_diubah(laporan.id_laporan_bulanan) THEN
   RAISE EXCEPTION 'Laporan terkirim terkunci' USING ERRCODE='23514'; END IF;
 UPDATE laporan_bulanan SET jawaban_tambahan=jsonb_set(jawaban_tambahan,'{portal}',
    jsonb_build_object('answers',p_jawaban,'activities',p_kegiatan)),
   ringkasan_refleksi_diri=CASE WHEN p_jawaban ? 'executive_summary' THEN p_jawaban->>'executive_summary' ELSE ringkasan_refleksi_diri END,
   versi_draf=versi_draf+1,diperbarui_pada=waktu_sekarang()
 WHERE id_laporan_bulanan=laporan.id_laporan_bulanan;
 SELECT item INTO hasil FROM jsonb_array_elements(portal_daftar_draf(p_aktor)) AS item
   WHERE item->>'periodId'=p_periode::text;
 RETURN hasil;
END $$;

-- Akun aplikasi hanya membaca view login dan memanggil dua fungsi terbatas.
-- Tidak mendapat INSERT/UPDATE/DELETE tabel, DDL, atau akses role migrator.
-- Temp schema tidak boleh menyamarkan tabel pada fungsi bersarang/trigger lama.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='sim_bezakat' AND p.prokind='f' LOOP
   EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog,sim_bezakat,pg_temp',f.oid::regprocedure);
 END LOOP;
END $$;
REVOKE TEMPORARY ON DATABASE sim_bezakat_dev FROM PUBLIC;
REVOKE ALL ON v_portal_akun FROM PUBLIC;
REVOKE ALL ON FUNCTION portal_daftar_draf(bigint),portal_simpan_draf(bigint,bigint,integer,jsonb,jsonb) FROM PUBLIC;
GRANT USAGE ON SCHEMA sim_bezakat TO sim_bezakat_app;
GRANT SELECT ON v_portal_akun TO sim_bezakat_app;
GRANT EXECUTE ON FUNCTION portal_daftar_draf(bigint),portal_simpan_draf(bigint,bigint,integer,jsonb,jsonb) TO sim_bezakat_app;
COMMENT ON FUNCTION portal_simpan_draf IS 'ID aktor wajib berasal dari sesi backend, bukan request browser. Perubahan draf tidak menandai laporan diajukan.';
INSERT INTO schema_version(version) VALUES(3);
COMMIT;
