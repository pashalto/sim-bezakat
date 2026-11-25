<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/bootstrap.php';
$action=(string)($_GET['action']??'');$method=$_SERVER['REQUEST_METHOD'];
try{
    if($method!=='GET')check_request();
    if($action==='login'&&$method==='POST'){
        $user=login(request_body());json_response(['user'=>$user,'csrf'=>csrf()]);
    }
    if($action==='logout'&&$method==='POST'){
        $_SESSION=[];session_regenerate_id(true);csrf();json_response(['ok'=>true]);
    }
    $user=current_user();
    if($action==='receipt'&&$method==='POST'){
        $input=request_body();$session=portal_session($user);
        if($user['role']!=='awardee')throw new PortalError(403,'Akses ditolak.');
        $period=null;foreach($session['drafts'] as $d)if($d['periodId']===($input['periodId']??null)&&$d['isOpen'])$period=$d;
        if(!$period)throw new PortalError(409,'Periode konfirmasi sudah berakhir.');
        // This feature was a local browser simulation in the source. Still no DB claim.
        $_SESSION['receipt'][$user['id'].':'.$period['periodId']]=true;json_response(['ok'=>true,'simulation'=>true]);
    }
    if($action==='session'&&$method==='GET')json_response(portal_session($user));
    if($action==='drafts'){
        if($method==='GET')json_response(['drafts'=>$user['role']==='awardee'?sql_json('SELECT sim_bezakat.portal_daftar_draf(?) AS drafts',[$user['id']],'drafts'):[]]);
        if(in_array($method,['PUT','DELETE'],true))json_response(['draft'=>write_draft($user,request_body(),$method==='DELETE')]);
    }
    if($action==='reviews'&&$method==='POST'){review_reports($user,request_body());json_response(portal_session($user));}
    if(in_array($action,['session','login','logout','drafts','reviews'],true)){header('Allow: '.match($action){'drafts'=>'GET, PUT, DELETE','session'=>'GET',default=>'POST'});throw new PortalError(405,'Metode tidak diizinkan.');}
    throw new PortalError(404,'Endpoint tidak ditemukan.');
}catch(Throwable $e){[$status,$message]=failure($e);json_response(['error'=>$message],$status);}
