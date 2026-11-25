<?php
declare(strict_types=1);
function database(): PDO {
    static $db;
    if ($db) return $db;
    if (!extension_loaded('pdo_pgsql')) throw new PortalError(503,'Aktifkan ekstensi pdo_pgsql pada PHP.');
    $host=env('BEZAKAT_DB_HOST','127.0.0.1'); $port=env('BEZAKAT_DB_PORT','5432');
    $name=env('BEZAKAT_DB_NAME','sim_bezakat_dev'); $user=env('BEZAKAT_DB_USER','sim_bezakat_app');
    if (!in_array($host,['127.0.0.1','localhost','::1'],true) || !ctype_digit($port) || (int)$port<1 || (int)$port>65535 || $name!=='sim_bezakat_dev' || $user!=='sim_bezakat_app' || env('BEZAKAT_DB_PASSWORD')==='') {
        throw new PortalError(503,'Konfigurasi PostgreSQL belum lengkap. Isi .env.local dengan koneksi akun aplikasi yang sudah ada.');
    }
    $connection=new PDO("pgsql:host=$host;port=$port;dbname=$name;connect_timeout=5;application_name=sim-bezakat-php",$user,env('BEZAKAT_DB_PASSWORD'),[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    ]);
    $row=$connection->query("SELECT current_database() AS db, current_user AS usr, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls, r.rolreplication, d.datdba=r.oid AS owns_db, EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS has_memberships FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user")->fetch();
    foreach (['rolsuper','rolcreatedb','rolcreaterole','rolbypassrls','rolreplication','owns_db','has_memberships'] as $flag) {
        if (db_bool($row[$flag]??false)) throw new PortalError(503,'Gunakan akun aplikasi terbatas sim_bezakat_app seperti pada proyek asal.');
    }
    if (($row['db']??'')!==$name || ($row['usr']??'')!==$user) throw new PortalError(503,'Target database tidak sesuai.');
    $connection->exec("SET statement_timeout = '10s'");
    return $db=$connection;
}
function db_bool(mixed $v): bool { return $v===true || $v===1 || $v==='1' || $v==='t' || $v==='true'; }
function query_one(string $sql, array $params=[]): array {
    $statement=database()->prepare($sql); $statement->execute($params); return $statement->fetch() ?: [];
}
function sql_json(string $sql, array $params, string $key): mixed {
    $row=query_one($sql,$params);$value=json_decode($row[$key]??'null',true,512,JSON_THROW_ON_ERROR);
    if($key==='draft'&&is_array($value))$value=normalize_draft($value);
    if($key==='drafts'&&is_array($value))$value=array_map('normalize_draft',$value);
    return $value;
}
function normalize_draft(array $value): array {$value['answers']=(object)($value['answers']??[]);return $value;}
