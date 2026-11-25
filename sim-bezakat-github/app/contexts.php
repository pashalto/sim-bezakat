<?php
declare(strict_types=1);
/** PHP data preparation for the original layout's reusable views. */
function view_context(string $name,array $v): array {
    switch($name){
        case 'LoginPage':return ['username'=>'','password'=>'','showPassword'=>false,'error'=>$GLOBALS['pageError']??'','busy'=>false];
        case 'Header':$panel=in_array($_GET['panel']??'', ['notifications','account'],true)?$_GET['panel']:null;return ['noticePeriod'=>($v['account']['role']==='awardee'?$v['period']:null),'notificationsOpen'=>$panel==='notifications','panel'=>$panel];
        case 'MonthlyReportPage':
            $p=$v['period'];$sectionIndex=max(0,min(count($GLOBALS['reportSections'])-1,(int)($_GET['section']??0)));$s=$GLOBALS['reportSections'][$sectionIndex];$review=jget($p['sectionReviews'],$s['key']);
            $readOnly=!in_array($p['reportStatus'],['draft','revision'],true);$locked=$readOnly||(($review['status']??'')==='approved'&&$p['reportStatus']!=='draft');
            $eligible=$v['isActivePeriod']&&!$readOnly&&$p['reportStatus']==='draft'&&empty($p['submittedAt']);
            $entries=count($p['activities'])>0;foreach((array)$p['answers'] as $answer)if(is_array($answer)?count($answer)>0:trim(jstr($answer))!=='')$entries=true;
            return ['sectionIndex'=>$sectionIndex,'draft'=>$p,'confirmed'=>false,'saving'=>false,'deleting'=>false,'deleteError'=>'','eligible'=>$eligible,'canDelete'=>$eligible&&$entries,'section'=>$s,'review'=>$review,'locked'=>$locked,'issues'=>$review['issues']??[],'progress'=>report_completion($p),'persistDraft'=>true,'readOnly'=>$readOnly];
        case 'AllowanceConfirmationCard':
            $p=$v['period']??null;$now=time();$month=$p['month']??(int)date('n');$year=$p['year']??(int)date('Y');
            $next=strtotime(sprintf('%04d-%02d-10 00:00:00',$year,$month).' +1 month');
            $key=$p?$p['ownerId'].':'.$p['id']:null;$confirmed=$key&&isset($_SESSION['receipt'][$key]);
            return ['available'=>(bool)$p,'selected'=>false,'confirmed'=>$confirmed,'locked'=>!$p||$confirmed,'localReceipt'=>$confirmed];
        case 'GpaChart':
            $history=$v['history']??[];$values=array_filter($history,fn($x)=>is_int($x)||is_float($x));$yMin=min(2.5,...($values?:[2.5]));$points=[];
            foreach($history as $i=>$value)if($value!==null&&($v['scholarshipStatus']||$value>0))$points[]=['value'=>$value,'index'=>$i,'x'=>52+$i*640/max(7,count($history)-1),'y'=>28+(4-$value)/(4-$yMin)*174];
            $latestValues=$v['scholarshipStatus']?$values:array_filter($values,fn($x)=>$x>0);
            return ['width'=>720,'height'=>250,'left'=>52,'right'=>28,'top'=>28,'bottom'=>48,'chartWidth'=>640,'chartHeight'=>174,'yMin'=>$yMin,'yMax'=>4,'points'=>$points,'latestGpa'=>$latestValues?end($latestValues):null,'belowMinimumCount'=>count(array_filter($values,fn($x)=>$x>0&&$x<3))];
        case 'GpaRiskNotice':return [];
        case 'TranscriptPage':preg_match('/\d+/',$v['profile']['gpaSemester']??'',$m);return ['currentSemester'=>(int)($m[0]??1)];
        case 'FinancePage':return ['categories'=>[
            ['key'=>'current','title'=>'Perencanaan dan realisasi keuangan periode berjalan','description'=>'Jika perencanaan dan realisasi berada dalam satu workbook, cukup unggah satu berkas.'],
            ['key'=>'next','title'=>'Perencanaan keuangan bulan berikutnya','description'=>'Unggah dokumen rencana untuk periode selanjutnya.'],
        ]];
        case 'RecapPage':
            $ps=$v['periods'];$years=array_unique(array_column($ps,'year'));rsort($years);if(!$years)$years=[(int)date('Y')];$year=(int)($_GET['year']??$years[0]);$visible=array_values(array_filter($ps,fn($p)=>$p['year']===$year));
            usort($visible,fn($a,$b)=>$b['month']<=>$a['month']);
            return ['years'=>$years,'year'=>$year,'visible'=>$visible,'approvedCount'=>count(array_filter($visible,fn($p)=>$p['reportStatus']==='approved')),'submittedCount'=>count(array_filter($visible,fn($p)=>in_array($p['reportStatus'],['submitted','review'],true))),'revisionCount'=>count(array_filter($visible,fn($p)=>$p['reportStatus']==='revision'))];
        case 'AwardeeMatrix':return ['year'=>(int)($_GET['year']??$v['year'])];
        case 'ActionRow':return ['target'=>['Lengkapi Laporan Bulanan'=>'report','Unggah Dokumen Keuangan'=>'finance','Tindak Lanjut Perbaikan'=>'recap'][$v['title']]??'dashboard'];
        case 'StaffPeriodDetail':
            $p=$v['period'];$can=$v['account']['role']==='coordinator';$final=in_array($p['reportStatus'],['revision','approved','rejected'],true);$editing=!$final||($_GET['edit']??'')==='1';
            $sections=array_filter((array)$p['sectionReviews'],fn($r)=>in_array($r['status'],['approved','revision'],true));$finance=[];foreach($p['financeDocuments'] as $d)if(in_array($d['status'],['approved','revision'],true))$finance[$d['id']]=['status'=>$d['status'],'reason'=>$d['reason']??''];
            $n=count($sections);$m=count($finance);
            return ['canReview'=>$can,'readOnly'=>!$can||!$editing,'hasFinalDecision'=>$final,'editingReview'=>$editing,'reviewing'=>null,'selectedQuestions'=>[],'reason'=>'','financeReview'=>null,'savingReview'=>'','bulkRejectOpen'=>false,'bulkRejectReason'=>'','finalDraftDecision'=>null,'draftSectionReviews'=>$sections,'draftFinanceReviews'=>$finance,'reviewedSections'=>$n,'reviewedFinance'=>$m,'reviewComplete'=>$n===count($GLOBALS['reportSections'])&&$m===count($p['financeDocuments'])];
        default:return [];
    }
}
