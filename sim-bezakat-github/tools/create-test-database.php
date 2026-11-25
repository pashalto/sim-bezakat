<?php
/** Explicit, one-time setup of a NEW development database. Never touches Fase 3. */
declare(strict_types=1);
define('NO_SESSION', true);
if(PHP_SAPI!=='cli'||($argv[1]??'')!=='--create-new-dev')exit("Hanya CLI: php tools/create-test-database.php --create-new-dev\n");
require dirname(__DIR__).'/app/bootstrap.php';
$stage='pemeriksaan target';
try{
    $admin=new PDO('pgsql:host=127.0.0.1;port=5432;dbname=postgres;connect_timeout=5','postgres',env('BEZAKAT_ADMIN_PASSWORD')?:null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    if($admin->query("SELECT count(*) FROM pg_database WHERE datname='sim_bezakat_dev'")->fetchColumn())throw new RuntimeException('Target already exists');
    if($admin->query("SELECT count(*) FROM pg_roles WHERE rolname IN ('sim_bezakat_app','sim_bezakat_migrator')")->fetchColumn())throw new RuntimeException('Roles already exist');
    $appPassword=env('BEZAKAT_DB_PASSWORD')?:bin2hex(random_bytes(24));$migrationPassword=bin2hex(random_bytes(24));$testPassword=bin2hex(random_bytes(12));
    $stage='pembuatan role terbatas';
    $admin->beginTransaction();
    foreach(['sim_bezakat_app'=>$appPassword,'sim_bezakat_migrator'=>$migrationPassword] as $role=>$password)$admin->exec('CREATE ROLE '.$role.' LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '.$admin->quote($password));
    $admin->commit();$stage='pembuatan database baru';
    $admin->exec('CREATE DATABASE sim_bezakat_dev OWNER sim_bezakat_migrator');
    $db=new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sim_bezakat_dev;connect_timeout=5','sim_bezakat_migrator',$migrationPassword,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $db->exec('REVOKE CREATE ON SCHEMA public FROM PUBLIC');$db->exec('GRANT CONNECT ON DATABASE sim_bezakat_dev TO sim_bezakat_app');
    $config="BEZAKAT_DB_HOST=127.0.0.1\nBEZAKAT_DB_PORT=5432\nBEZAKAT_DB_NAME=sim_bezakat_dev\nBEZAKAT_DB_USER=sim_bezakat_app\nBEZAKAT_DB_PASSWORD=\"$appPassword\"\nBEZAKAT_ENABLE_PREVIEW=0\n# Akun fiktif database baru; lihat README. Tidak untuk akun asli.\nBEZAKAT_TEST_PASSWORD=\"$testPassword\"\n";
    file_put_contents(ROOT.'/.env.local',$config,LOCK_EX);
    // Private migration credentials are separate from the application config.
    file_put_contents(ROOT.'/storage/migration.local.json',json_encode(['user'=>'sim_bezakat_migrator','password'=>$migrationPassword],JSON_THROW_ON_ERROR),LOCK_EX);
    foreach(glob(ROOT.'/database/migrations/*.sql') as $file){$stage='migration '.basename($file);$db->exec(file_get_contents($file));echo 'Terpasang: '.basename($file).PHP_EOL;}
    $stage='seed fiktif ke database baru kosong';$hashes=[];for($i=0;$i<9;$i++)$hashes[]=password_hash($testPassword,PASSWORD_BCRYPT,['cost'=>12]);
    $s=$db->prepare("SELECT set_config('sim_bezakat.seed_hashes', ?, false)");$s->execute([json_encode($hashes,JSON_THROW_ON_ERROR)]);
    $db->exec(file_get_contents(ROOT.'/database/seeds/001_demo.sql'));
    echo "Database baru sim_bezakat_dev siap dengan data fiktif. Database Fase 3 tidak diubah.\nKredensial disimpan lokal tanpa dicetak.\n";
}catch(Throwable $e){if(isset($admin)&&$admin->inTransaction())$admin->rollBack();fwrite(STDERR,'Penyiapan berhenti pada '.$stage.'. Kode: '.$e->getCode().". Tidak ada database dihapus.\n");exit(1);}
