<?php
// PHP built-in server router. Only public/ can serve static files.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)?:'/';
if(preg_match('~^/api/portal/(login|logout|session|drafts|reviews|receipt)/?$~',$path,$m)){$_GET['action']=$m[1];require __DIR__.'/public/api.php';return true;}
if($path==='/api/index.php'){require __DIR__.'/api/index.php';return true;}
if($path==='/'||$path==='/index.php'){require __DIR__.'/public/index.php';return true;}
if($path==='/api.php'){require __DIR__.'/public/api.php';return true;}
if($path==='/export.php'){require __DIR__.'/public/export.php';return true;}
$file=realpath(__DIR__.'/public'.rawurldecode($path));
if($file&&str_starts_with($file,realpath(__DIR__.'/public').DIRECTORY_SEPARATOR)&&is_file($file)&&strtolower(pathinfo($file,PATHINFO_EXTENSION))!=='php')return false;
http_response_code(404);echo 'Halaman tidak ditemukan.';
