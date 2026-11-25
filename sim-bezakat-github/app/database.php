<?php
declare(strict_types=1);
function database_config(): array {
    if (!extension_loaded('pdo_pgsql')) throw new PortalError(503,'Aktifkan ekstensi pdo_pgsql pada PHP.');
    $host=env('BEZAKAT_DB_HOST','127.0.0.1'); $port=env('BEZAKAT_DB_PORT','5432');
    $name=env('BEZAKAT_DB_NAME','sim_bezakat_dev'); $user=env('BEZAKAT_DB_USER','sim_bezakat_app');
    $local=in_array($host,['127.0.0.1','localhost','::1'],true);
    $ssl=env('BEZAKAT_DB_SSLMODE',$local?'disable':'verify-full');
    if ((!$local&&!preg_match('/^[a-z0-9][a-z0-9.-]*\.neon\.tech$/iD',$host)) || !ctype_digit($port) || (int)$port<1 || (int)$port>65535 || !preg_match('/^[a-zA-Z_][a-zA-Z0-9_-]{0,62}$/D',$name) || $user!=='sim_bezakat_app' || env('BEZAKAT_DB_PASSWORD')==='' || !in_array($ssl,$local?['disable','require','verify-full']:['verify-full'],true)) {
        throw new PortalError(503,'Konfigurasi PostgreSQL belum lengkap. Isi .env.local dengan koneksi akun aplikasi yang sudah ada.');
    }
    $ca=env('BEZAKAT_DB_SSLROOTCERT');
    if($ssl==='verify-full'&&$ca==='')foreach(['/etc/pki/tls/certs/ca-bundle.crt','/etc/ssl/certs/ca-certificates.crt','/etc/ssl/cert.pem'] as $candidate)if(is_readable($candidate)){$ca=$candidate;break;}
    if($ca!==''&&(!is_readable($ca)||strpbrk($ca,";\r\n")!==false))throw new PortalError(503,'Berkas CA PostgreSQL tidak tersedia atau tidak valid.');
    return ['dsn'=>"pgsql:host=$host;port=$port;dbname=$name;sslmode=$ssl;connect_timeout=10;application_name=sim-bezakat-php".($ca!==''?';sslrootcert='.$ca:''),'user'=>$user,'password'=>env('BEZAKAT_DB_PASSWORD'),'database'=>$name];
}
function database_connect(): PDO {
    $config=database_config();
    $options=[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES=>false, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::ATTR_PERSISTENT=>false,
    ];
    // Keep native bound parameters without named prepared-statement session state.
    $disablePrepares=class_exists('Pdo\\Pgsql')?\Pdo\Pgsql::ATTR_DISABLE_PREPARES:constant('PDO::PGSQL_ATTR_DISABLE_PREPARES');
    $options[$disablePrepares]=true;
    $connection=new PDO($config['dsn'],$config['user'],$config['password'],$options);
    $row=$connection->query("SELECT current_database() AS db, current_user AS usr, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolbypassrls, r.rolreplication, d.datdba=r.oid AS owns_db, EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS has_memberships FROM pg_roles r JOIN pg_database d ON d.datname=current_database() WHERE r.rolname=current_user")->fetch();
    foreach (['rolsuper','rolcreatedb','rolcreaterole','rolbypassrls','rolreplication','owns_db','has_memberships'] as $flag) {
        if (db_bool($row[$flag]??false)) throw new PortalError(503,'Gunakan akun aplikasi terbatas sim_bezakat_app seperti pada proyek asal.');
    }
    if (($row['db']??'')!==$config['database'] || ($row['usr']??'')!==$config['user']) throw new PortalError(503,'Target database tidak sesuai.');
    // Timeouts are set on the role during deployment, not session SET on a pooler.
    return $connection;
}
function database(): PDO {
    static $db;return $db??=database_connect();
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
