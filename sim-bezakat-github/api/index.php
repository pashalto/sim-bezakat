<?php
declare(strict_types=1);
if(!extension_loaded('pdo_pgsql')||!extension_loaded('mbstring')){
    http_response_code(503);header('Content-Type: application/json; charset=utf-8');
    echo '{"error":"Runtime PHP memerlukan pdo_pgsql dan mbstring."}';return;
}
// A single PHP function handles dynamic routes. Private PHP is never served as static.
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH)?:'/';
$route=$_GET['__route']??null;
if($route==='api'){require dirname(__DIR__).'/public/api.php';return;}
if($route==='export'){require dirname(__DIR__).'/public/export.php';return;}
if($route==='page'){require dirname(__DIR__).'/public/index.php';return;}
if(preg_match('~^/api/portal/(login|logout|session|drafts|reviews|receipt)/?$~D',$path,$match)){
    $_GET['action']=$match[1];require dirname(__DIR__).'/public/api.php';return;
}
if($path==='/api.php'){require dirname(__DIR__).'/public/api.php';return;}
if($path==='/export.php'){require dirname(__DIR__).'/public/export.php';return;}
if(in_array($path,['/','/index.php','/api/index.php'],true)){require dirname(__DIR__).'/public/index.php';return;}
http_response_code(404);echo 'Halaman tidak ditemukan.';
