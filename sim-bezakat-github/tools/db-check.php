<?php
// Read-only metadata check. Never creates roles, tables, migrations, or seed data.
declare(strict_types=1);
define('NO_SESSION', true);
require dirname(__DIR__).'/app/bootstrap.php';
try{
    $db=database();$db->beginTransaction();$db->exec('SET TRANSACTION READ ONLY');
    $expected=['portal_ringkasan','portal_daftar_draf','portal_simpan_draf','portal_hapus_isian_draf','portal_daftar_pemeriksaan','portal_simpan_pemeriksaan','portal_unggah_keuangan','portal_unduh_keuangan'];
    foreach($expected as $name){$s=$db->prepare("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='sim_bezakat' AND p.proname=?");$s->execute([$name]);if((int)$s->fetchColumn()!==1)throw new PortalError(503,'Fungsi skema terbaru belum tersedia: '.$name);}
    $db->query('SELECT * FROM sim_bezakat.v_portal_akun LIMIT 0');
    if(session_driver()==='postgres'){
        foreach(['session_valid','session_read','session_write','session_delete','session_gc','login_attempt','login_clear'] as $name){
            $s=$db->prepare("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='sim_bezakat_runtime' AND p.proname=? AND has_function_privilege(current_user,p.oid,'EXECUTE')");$s->execute([$name]);
            if((int)$s->fetchColumn()!==1)throw new PortalError(503,'SQL serverless belum lengkap: '.$name);
        }
    }
    $db->rollBack();echo 'Koneksi akun aplikasi berhasil. View akun dan fungsi portal dan penyimpanan keuangan tersedia. Tidak memerlukan hak baca tabel internal schema_version.'.PHP_EOL;
}catch(Throwable $e){if(isset($db)&&$db->inTransaction())$db->rollBack();[$status,$message]=failure($e);fwrite(STDERR,$message.PHP_EOL);exit(1);}
