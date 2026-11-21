-- Hanya database development khusus dengan seed versi 2; semua baris uji ROLLBACK.
BEGIN;
SET LOCAL search_path=sim_bezakat,pg_catalog;
DO $$ BEGIN
  IF current_database() NOT IN ('sim_bezakat_dev','sim_bezakat_test')
    OR NOT EXISTS(SELECT 1 FROM akun_pengguna WHERE id_akun=-101 AND id_beasiswa='BZI-251-0000001') THEN
    RAISE EXCEPTION 'Pengujian membutuhkan database development dan seed versi 2';
  END IF;
END $$;
-- Ekstensi hanya diperlukan pengujian hash, bukan migration aplikasi.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE TEMP TABLE login_results(nama text PRIMARY KEY,hasil text NOT NULL);
CREATE FUNCTION pg_temp.login_ok(nama text,nilai boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF nilai IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',nama; END IF;
  INSERT INTO login_results VALUES(nama,'PASS');
END $$;
DO $$ DECLARE salah text; a bigint; b bigint; id_a text; id_b text;
BEGIN
  PERFORM pg_temp.login_ok('Sembilan akun mempunyai ID sah dan unik',
    (SELECT count(*)=9 AND count(DISTINCT id_beasiswa)=9 AND bool_and(id_beasiswa ~ '^BZI-251-000[0-9]{4}$') FROM akun_pengguna));
  PERFORM pg_temp.login_ok('Kolom email login sudah diganti',
    NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='sim_bezakat' AND table_name='akun_pengguna' AND column_name='email_login'));
  PERFORM pg_temp.login_ok('Password demo cocok dengan hash setiap akun',
    (SELECT bool_and(password_hash=public.crypt(current_setting('sim_bezakat.test_password'),password_hash)) FROM akun_pengguna));
  PERFORM pg_temp.login_ok('Password salah ditolak',
    (SELECT bool_and(password_hash<>public.crypt('salah',password_hash)) FROM akun_pengguna));
  PERFORM pg_temp.login_ok('Hash memakai salt berbeda',
    (SELECT count(DISTINCT password_hash)=9 AND bool_and(password_hash LIKE '$2a$12$%') FROM akun_pengguna));
  FOREACH salah IN ARRAY ARRAY['BZI-251-0000000','BZI-251-00000001','BZI-251-000001','BZI-252-0000001','bzi-251-0000001','BZI-251-000ABCD',' BZI-251-0000001'] LOOP
    BEGIN
      UPDATE akun_pengguna SET id_beasiswa=salah WHERE id_akun=-101;
      RAISE EXCEPTION 'ID tidak sah lolos: %',salah;
    EXCEPTION WHEN check_violation THEN
      PERFORM pg_temp.login_ok('Tolak format '||salah,true);
    END;
  END LOOP;
  BEGIN
    UPDATE akun_pengguna SET id_beasiswa='BZI-251-0000001' WHERE id_akun=-1;
    RAISE EXCEPTION 'ID duplikat lintas peran lolos';
  EXCEPTION WHEN unique_violation THEN
    PERFORM pg_temp.login_ok('ID unik lintas peran',true);
  END;
  BEGIN
    UPDATE akun_pengguna SET id_beasiswa=NULL WHERE id_akun=-101;
    RAISE EXCEPTION 'ID null lolos';
  EXCEPTION WHEN not_null_violation THEN
    PERFORM pg_temp.login_ok('ID wajib diisi',true);
  END;
  INSERT INTO akun_pengguna(peran,password_hash,nomor_telepon)
    VALUES('koordinator','!TEST_NO_AUTH_ACCOUNT!','000') RETURNING id_akun,id_beasiswa INTO a,id_a;
  INSERT INTO koordinator_beasiswa(id_koordinator,kode_koordinator,nama_pembina,wilayah_binaan)
    VALUES(a,'TEST-ID-A','Contoh Uji A','Contoh');
  INSERT INTO akun_pengguna(peran,password_hash,nomor_telepon)
    VALUES('koordinator','!TEST_NO_AUTH_ACCOUNT!','000') RETURNING id_akun,id_beasiswa INTO b,id_b;
  INSERT INTO koordinator_beasiswa(id_koordinator,kode_koordinator,nama_pembina,wilayah_binaan)
    VALUES(b,'TEST-ID-B','Contoh Uji B','Contoh');
  PERFORM pg_temp.login_ok('Nomor otomatis berurutan dan melebihi seed',right(id_a,4)::int>9 AND right(id_b,4)::int=right(id_a,4)::int+1);
  PERFORM pg_temp.login_ok('Dua akun baru boleh tanpa email',(SELECT count(*)=2 FROM akun_pengguna WHERE id_akun IN(a,b) AND email_kontak IS NULL));
  PERFORM pg_temp.login_ok('Sequence tidak berputar dan terbatas 9999',(SELECT seqmax=9999 AND NOT seqcycle FROM pg_sequence WHERE seqrelid='sim_bezakat.id_beasiswa_seq'::regclass));
END $$;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT nama,hasil FROM login_results ORDER BY nama;
SELECT count(*) AS jumlah_uji_login_lulus FROM login_results;
ROLLBACK;
-- PostgreSQL sequence tidak di-ROLLBACK: pengujian dapat meninggalkan celah nomor.
