<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/bootstrap.php';
try{
    $session=portal_session(current_user());$period=null;
    foreach($session['state']['periods'] as $p)if($p['id']===($_GET['period']??'')){$period=$p;break;}
    if(!$period)throw new PortalError(404,'Periode tidak ditemukan dalam cakupan akun.');
    $profiles=(array)$session['state']['profiles'];$profile=$profiles[$period['ownerId']]??null;
    if(!$profile)throw new PortalError(404,'Profil tidak tersedia.');
    $html=(string)view('Export',['period'=>$period,'profile'=>$profile]);
    $html=str_replace('onclick="window.print()"','id="print-report"',$html);
    $html=str_replace('</head>','<script src="/assets/export.js" defer></script></head>',$html);
    header('Content-Type: text/html; charset=utf-8');echo $html;
}catch(Throwable $e){[$status,$message]=failure($e);http_response_code($status);echo h($message);}
