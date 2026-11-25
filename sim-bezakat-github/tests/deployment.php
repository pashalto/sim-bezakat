<?php
declare(strict_types=1);
define('NO_SESSION',true);
require dirname(__DIR__).'/app/bootstrap.php';
$checks=0;
function deployment_assert(bool $condition,string $label): void {global $checks;if(!$condition)throw new RuntimeException('FAIL '.$label);$checks++;echo 'PASS '.$label.PHP_EOL;}
function config_rejected(): bool {try{database_config();return false;}catch(PortalError){return true;}}
$keys=['BEZAKAT_DB_HOST','BEZAKAT_DB_PORT','BEZAKAT_DB_NAME','BEZAKAT_DB_USER','BEZAKAT_DB_PASSWORD','BEZAKAT_DB_SSLMODE','BEZAKAT_DB_SSLROOTCERT','BEZAKAT_SESSION_DRIVER','VERCEL'];
$saved=[];foreach($keys as $key)$saved[$key]=getenv($key);
try{
    foreach(['BEZAKAT_DB_HOST'=>'127.0.0.1','BEZAKAT_DB_PORT'=>'5432','BEZAKAT_DB_NAME'=>'sim_bezakat_dev','BEZAKAT_DB_USER'=>'sim_bezakat_app','BEZAKAT_DB_PASSWORD'=>'synthetic-config-test','BEZAKAT_DB_SSLMODE'=>'disable','BEZAKAT_DB_SSLROOTCERT'=>'','BEZAKAT_SESSION_DRIVER'=>'files','VERCEL'=>'0'] as $k=>$v)putenv($k.'='.$v);
    deployment_assert(str_contains(database_config()['dsn'],'sslmode=disable'),'existing local PostgreSQL config supported');
    putenv('BEZAKAT_DB_HOST=ep-example-pooler.ap-southeast-1.aws.neon.tech');putenv('BEZAKAT_DB_SSLMODE=verify-full');
    deployment_assert(str_contains(database_config()['dsn'],'sslmode=verify-full'),'Neon pooled hostname with certificate verification');
    deployment_assert(in_array('options=endpoint=ep-example-pooler', explode(';', database_config()['dsn']), true), 'explicit pooled endpoint for libpq without SNI');
    putenv('BEZAKAT_DB_HOST=127.0.0.1');
    deployment_assert(!str_contains(database_config()['dsn'], ';options='), 'local PostgreSQL receives no Neon routing option');
    putenv('BEZAKAT_DB_HOST=ep-example-pooler.ap-southeast-1.aws.neon.tech');
    putenv('BEZAKAT_DB_NAME=neondb');deployment_assert(database_config()['database']==='neondb','database name is configurable');
    putenv('BEZAKAT_DB_NAME=sim_bezakat_dev;sslmode=disable');deployment_assert(config_rejected(),'DSN injection rejected');putenv('BEZAKAT_DB_NAME=sim_bezakat_dev');
    putenv('BEZAKAT_DB_SSLMODE=disable');deployment_assert(config_rejected(),'remote TLS downgrade rejected');putenv('BEZAKAT_DB_SSLMODE=verify-full');
    putenv('BEZAKAT_DB_USER=neondb_owner');deployment_assert(config_rejected(),'Neon admin cannot be runtime user');putenv('BEZAKAT_DB_USER=sim_bezakat_app');
    putenv('BEZAKAT_DB_HOST=untrusted.example.org');deployment_assert(config_rejected(),'unapproved remote host rejected');
    putenv('VERCEL=1');deployment_assert(request_https(),'Vercel proxy produces Secure cookies and HTTPS Origin');
    deployment_assert((function(){try{session_driver();return false;}catch(PortalError){return true;}})(),'file sessions forbidden on Vercel');
    putenv('BEZAKAT_SESSION_DRIVER');deployment_assert(session_driver()==='postgres','Vercel defaults to shared PostgreSQL sessions');
    $config=json_decode(file_get_contents(ROOT.'/vercel.json'),true,512,JSON_THROW_ON_ERROR);
    deployment_assert($config['functions']['api/index.php']['runtime']==='vercel-php@0.9.0','PHP runtime is version pinned');
    deployment_assert($config['framework']===null&&$config['outputDirectory']==='.'&&$config['buildCommand']==='','no Next.js preset/build');
    foreach(['/','/index.php','/api.php','/api/portal/login','/api/portal/drafts','/export.php','/assets/portal.css','/favicon.svg'] as $path){
        $route=null;foreach($config['routes'] as $candidate)if(preg_match('~^'.$candidate['src'].'$~D',$path)){$route=$candidate;break;}
        deployment_assert(isset($route['dest']),'explicit route '.$path);
    }
    foreach(['/app/database.php','/.env.local','/storage/php.log','/database/migrations/001_initial.sql','/public/api.php'] as $path){
        $route=null;foreach($config['routes'] as $candidate)if(preg_match('~^'.$candidate['src'].'$~D',$path)){$route=$candidate;break;}
        deployment_assert(($route['status']??0)===404,'private route blocked '.$path);
    }
}finally{foreach($saved as $k=>$v)$v===false?putenv($k):putenv($k.'='.$v);}
echo $checks.' deployment checks passed'.PHP_EOL;
