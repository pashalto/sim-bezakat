-- Jalankan sesudah 001_initial.sql. Password dan seluruh PK/FK lama dipertahankan.
BEGIN;
SET LOCAL search_path=sim_bezakat,pg_catalog;
LOCK TABLE akun_pengguna, awardee IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM schema_version WHERE version=1)
     OR EXISTS(SELECT 1 FROM schema_version WHERE version>=2) THEN
    RAISE EXCEPTION 'Migration ini membutuhkan skema versi 1 dan hanya dijalankan sekali';
  END IF;
END $$;

ALTER TABLE akun_pengguna RENAME COLUMN email_login TO email_kontak;
ALTER TABLE akun_pengguna ALTER COLUMN email_kontak DROP NOT NULL;
ALTER TABLE akun_pengguna ADD COLUMN id_beasiswa text;

-- Pertahankan nomor registrasi awardee yang sudah cocok dengan format baru.
UPDATE akun_pengguna a SET id_beasiswa=w.nomor_registrasi
FROM awardee w WHERE w.id_awardee=a.id_akun
  AND w.nomor_registrasi ~ '^BZI-251-000[0-9]{4}$'
  AND w.nomor_registrasi <> 'BZI-251-0000000';
CREATE SEQUENCE id_beasiswa_seq MINVALUE 1 MAXVALUE 9999 START 1 NO CYCLE;
DO $$ DECLARE tertinggi integer; akun record; jumlah integer;
BEGIN
  SELECT coalesce(max(right(id_beasiswa,4)::integer),0) INTO tertinggi
    FROM akun_pengguna WHERE id_beasiswa IS NOT NULL;
  SELECT count(*) INTO jumlah FROM akun_pengguna WHERE id_beasiswa IS NULL;
  IF tertinggi+jumlah>9999 THEN
    RAISE EXCEPTION 'Kapasitas format ID habis. Tentukan perluasan format sebelum melanjutkan';
  END IF;
  IF tertinggi>0 THEN PERFORM setval('id_beasiswa_seq',tertinggi,true); END IF;
  FOR akun IN SELECT id_akun FROM akun_pengguna WHERE id_beasiswa IS NULL ORDER BY id_akun LOOP
    UPDATE akun_pengguna SET id_beasiswa='BZI-251-000'||lpad(nextval('id_beasiswa_seq')::text,4,'0')
      WHERE id_akun=akun.id_akun;
  END LOOP;
END $$;
-- Selesaikan constraint trigger profil setelah backfill sebelum ALTER TABLE.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE akun_pengguna
  ALTER COLUMN id_beasiswa SET NOT NULL,
  ALTER COLUMN id_beasiswa SET DEFAULT ('BZI-251-000'||lpad(nextval('sim_bezakat.id_beasiswa_seq')::text,4,'0')),
  ADD CONSTRAINT akun_id_beasiswa_format CHECK (id_beasiswa ~ '^BZI-251-000[0-9]{4}$' AND id_beasiswa<>'BZI-251-0000000'),
  ADD CONSTRAINT akun_id_beasiswa_unique UNIQUE(id_beasiswa);
ALTER SEQUENCE id_beasiswa_seq OWNED BY akun_pengguna.id_beasiswa;
REVOKE ALL ON SEQUENCE id_beasiswa_seq FROM PUBLIC;
COMMENT ON TABLE akun_pengguna IS 'Superclass empat peran; login memakai id_beasiswa unik. Email opsional untuk kontak. Password disimpan sebagai hash backend.';
COMMENT ON COLUMN akun_pengguna.id_beasiswa IS 'BZI-251-000 + nomor 4 digit, 0001..9999. Gunakan DEFAULT untuk akun baru; sequence dapat berlubang jika transaksi batal.';
COMMENT ON COLUMN akun_pengguna.email_kontak IS 'Email lama dipertahankan sebagai kontak opsional, bukan identitas login.';
INSERT INTO schema_version(version) VALUES(2);
COMMIT;
