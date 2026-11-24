BEGIN;
SET LOCAL search_path = sim_bezakat, pg_catalog;
DO $$
BEGIN
  IF current_database() <> 'sim_bezakat_dev'
     OR NOT EXISTS (SELECT 1 FROM schema_version WHERE version = 4)
     OR EXISTS (SELECT 1 FROM schema_version WHERE version >= 5) THEN
    RAISE EXCEPTION 'Migration membutuhkan sim_bezakat_dev versi 4';
  END IF;
END $$;

CREATE FUNCTION portal_hapus_isian_draf(p_aktor bigint, p_periode bigint, p_versi integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, sim_bezakat, pg_temp AS $$
DECLARE
  laporan laporan_bulanan;
  periode periode_monitoring;
  hasil jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM akun_pengguna
                 WHERE id_akun = p_aktor AND peran = 'awardee' AND status_aktif) THEN
    RAISE EXCEPTION 'Akses ditolak' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO periode FROM periode_monitoring WHERE id_periode_monitoring = p_periode;
  IF NOT FOUND OR waktu_sekarang() < periode.tanggal_buka
               OR waktu_sekarang() >= periode.tanggal_tenggat_cutoff THEN
    RAISE EXCEPTION 'Periode tidak aktif' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO laporan FROM laporan_bulanan
    WHERE id_awardee = p_aktor AND id_periode_monitoring = p_periode FOR UPDATE;
  IF NOT FOUND THEN
    -- Simpan nomor versi juga untuk isian yang baru ada di formulir.
    -- Tab lain dengan versi lama tidak boleh mengembalikan isian setelah penghapusan.
    INSERT INTO laporan_bulanan(id_awardee, id_periode_monitoring) VALUES (p_aktor, p_periode)
      ON CONFLICT (id_awardee, id_periode_monitoring) DO NOTHING;
    SELECT * INTO STRICT laporan FROM laporan_bulanan
      WHERE id_awardee = p_aktor AND id_periode_monitoring = p_periode FOR UPDATE;
  END IF;
  IF waktu_sekarang() >= periode.tanggal_tenggat_cutoff OR EXISTS (
    SELECT 1 FROM pengajuan_laporan WHERE id_laporan_bulanan = laporan.id_laporan_bulanan
  ) THEN
    RAISE EXCEPTION 'Draf telah diajukan atau periode telah ditutup' USING ERRCODE = '23514';
  END IF;
  IF laporan.versi_draf IS DISTINCT FROM p_versi THEN
    RAISE EXCEPTION 'Versi draf berubah' USING ERRCODE = '40001';
  END IF;
  UPDATE laporan_bulanan SET
    jawaban_tambahan = jawaban_tambahan - 'portal', ringkasan_refleksi_diri = NULL,
    versi_draf = versi_draf + 1, diperbarui_pada = waktu_sekarang()
    WHERE id_laporan_bulanan = laporan.id_laporan_bulanan;
  SELECT item INTO STRICT hasil FROM jsonb_array_elements(portal_daftar_draf(p_aktor)) AS item
    WHERE item->>'periodId' = p_periode::text;
  RETURN hasil;
END $$;
REVOKE ALL ON FUNCTION portal_hapus_isian_draf(bigint,bigint,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portal_hapus_isian_draf(bigint,bigint,integer) TO sim_bezakat_app;
INSERT INTO schema_version(version) VALUES (5);
COMMIT;
