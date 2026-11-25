<?php
declare(strict_types=1);
require dirname(__DIR__).'/app/bootstrap.php';
$page=(string)($_GET['page']??'dashboard');
$preview=isset($_GET['preview'])&&env('BEZAKAT_ENABLE_PREVIEW')==='1'&&in_array($_SERVER['REMOTE_ADDR']??'', ['127.0.0.1','::1'],true);
$GLOBALS['preview']=$preview;
$data=null;$GLOBALS['pageError']='';
try {
    if($preview){
        $fixture=json_decode(file_get_contents(ROOT.'/tests/preview-fixture.json'),true,512,JSON_THROW_ON_ERROR);
        $role=(string)($_GET['role']??'awardee');$user=null;
        foreach($fixture['accounts'] as $a)if($a['role']===$role){$user=$a;break;}
        if(!$user)throw new PortalError(400,'Peran pratinjau tidak dikenal.');
        $state=$fixture['state'];$scope=$user['role']==='awardee'?[$user['id']]:($user['scope']??array_keys($state['profiles']));
        $user['scope']=$scope;$state['profiles']=array_intersect_key($state['profiles'],array_flip($scope));
        $state['periods']=array_values(array_filter($state['periods'],fn($p)=>in_array($p['ownerId'],$scope,true)));
        $drafts=array_map(fn($p)=>['periodId'=>$p['id'],'version'=>0,'isOpen'=>$p['month']===$fixture['activePeriod']['month']&&$p['year']===$fixture['activePeriod']['year']],$state['periods']);
        $data=['user'=>$user,'state'=>$state,'drafts'=>$drafts,'activePeriod'=>$fixture['activePeriod']];
    }elseif(!empty($_SESSION['accountId']))$data=portal_session(current_user());
}catch(Throwable $e){[$status,$message]=failure($e);if($status!==401)$GLOBALS['pageError']=$message;}
$GLOBALS['portalData']=$data;
?><!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="csrf-token" content="<?=h(csrf())?>"><title>SIM-BEZAKAT</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/portal.css"><link rel="stylesheet" href="/assets/native.css"><script src="/assets/portal.js" defer></script></head>
<body class="min-h-screen bg-white text-zinc-950 antialiased"><div id="root" tabindex="-1">
<?php if(!$data): echo view('LoginPage'); else:
    $account=$data['user'];$state=$data['state'];$profiles=(array)$state['profiles'];$periods=$state['periods'];$activePeriod=$data['activePeriod'];
    $allowed=$account['role']==='awardee'?['dashboard','profile','transcript','report','finance','recap','recap-detail']:['dashboard','awardees','monitoring','staff-detail','account'];
    if(!in_array($page,$allowed,true)){$page='forbidden';http_response_code(403);}
    $current=null;$selected=null;$profile=$profiles[$account['id']]??null;
    foreach($periods as $p){if($p['ownerId']===$account['id']&&$activePeriod&&$p['month']===$activePeriod['month']&&$p['year']===$activePeriod['year'])$current=$p;if($p['id']===($_GET['period']??''))$selected=$p;}
    if(isset($_GET['period'])&&!$selected){$page='forbidden';http_response_code(404);}
    $editing=$selected??$current;
    $GLOBALS['editingPeriod']=$editing;
?>
<div class="min-h-screen bg-[#f5f6f1] text-slate-900">
<button id="menu-backdrop" aria-label="Tutup menu" class="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden" hidden></button>
<?=view('Sidebar',['account'=>$account,'active'=>$page,'open'=>false])?>
<div class="lg:pl-[252px]">
<?=view('Header',['account'=>$account,'period'=>$activePeriod])?>
<main class="mx-auto max-w-[1480px] p-5 sm:p-7 lg:p-9" id="portal-main">
<?php
try {
    $props=['account'=>$account,'profile'=>$profile,'periods'=>$periods,'profiles'=>$profiles,'connected'=>true,'referencePeriod'=>$activePeriod??['month'=>0,'year'=>(int)date('Y')]];
    if($page==='forbidden')echo view('AccessDenied');
    elseif($account['role']==='awardee'){
        switch($page){
            case 'dashboard':
                if($current&&$profile)echo view('AwardeeDashboard',$props+['currentPeriod'=>$current]);
                else{echo view('PageHeading',['eyebrow'=>'Periode aktif','title'=>'Belum ada periode terbuka','description'=>'Laporan sebelumnya dapat dibuka melalui menu Rekapitulasi.']);echo tag('div',['class'=>'mt-6 max-w-md'],[view('AllowanceConfirmationCard')]);}break;
            case 'profile':if($profile)echo view('ProfilePage',$props);break;
            case 'transcript':echo view('TranscriptPage',$props+['transcripts'=>array_values(array_filter($state['transcripts'],fn($t)=>$t['ownerId']===$account['id']))]);break;
            case 'report':if($editing){echo view('MonthlyReportPage',$props+['period'=>$editing,'isActivePeriod'=>$current&&$editing['id']===$current['id'],'persistDraft'=>true,'clearDraft'=>true]);}else echo view('PageHeading',['eyebrow'=>'Laporan Bulanan','title'=>'Belum ada periode terbuka','description'=>'Laporan sebelumnya dapat dibuka melalui Rekapitulasi.']);break;
            case 'finance':if($current)echo view('FinancePage',$props+['period'=>$current]);else echo view('PageHeading',['eyebrow'=>'Keuangan','title'=>'Belum ada periode terbuka','description'=>'Dokumen sebelumnya dapat dibuka melalui Rekapitulasi.']);break;
            case 'recap':echo view('RecapPage',$props);break;
            case 'recap-detail':if($selected)echo view('PeriodDetail',array_merge($props,['period'=>$selected,'profile'=>$selected['profileSnapshot']??$profile,'openReport'=>true]));else echo view('AccessDenied');break;
        }
    }else{
        switch($page){
            case 'dashboard':echo view('StaffDashboard',$props);break;
            case 'awardees':case 'monitoring':echo view('AwardeeMatrix',$props);break;
            case 'staff-detail':if($selected)echo view('StaffPeriodDetail',array_merge($props,['period'=>$selected,'profile'=>$profiles[$selected['ownerId']],'persistReview'=>true]));else echo view('AccessDenied');break;
            case 'account':echo view('StaffAccountPage',$props);break;
        }
    }
}catch(Throwable $e){error_log('View failure: '.$e->getMessage());http_response_code(500);echo tag('p',['role'=>'alert','class'=>'rounded-xl bg-rose-50 p-4 text-sm text-rose-800'],['Halaman belum dapat dimuat. Periksa log lokal.']);}
?>
</main></div></div>
<template id="activity-template"><?=view('ActivityEditor',['activities'=>[['id'=>'__new__','name'=>'','type'=>'','role'=>'','description'=>'','evidence'=>'']],'disabled'=>false])?></template>
<script type="application/json" id="portal-data"><?=json_encode(['user'=>$account,'page'=>$page,'period'=>$editing,'drafts'=>$data['drafts'],'sections'=>$GLOBALS['reportSections'],'exclusiveOptions'=>$GLOBALS['exclusiveOptions'],'preview'=>$preview],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR)?></script>
<?php endif; ?>
</div><div id="toast" role="status" class="fixed right-5 top-5 z-[70] max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-xl" hidden></div></body></html>
