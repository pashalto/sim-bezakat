<?php
declare(strict_types=1);
define('NO_SESSION', true);
require dirname(__DIR__).'/app/bootstrap.php';
set_error_handler(static function(int $severity,string $message,string $file,int $line): never {throw new ErrorException($message,0,$severity,$file,$line);});
$fixture=json_decode(file_get_contents(__DIR__.'/preview-fixture.json'),true,512,JSON_THROW_ON_ERROR);
$state=$fixture['state'];$account=$fixture['accounts'][0];$profile=$state['profiles'][$account['id']];$period=null;
foreach($state['periods'] as $p)if($p['ownerId']===$account['id']&&$p['month']===$fixture['activePeriod']['month']&&$p['year']===$fixture['activePeriod']['year'])$period=$p;
$period??=$state['periods'][0];
$GLOBALS['portalData']=['user'=>$account,'activePeriod'=>$fixture['activePeriod']];
$props=['account'=>$account,'profile'=>$profile,'period'=>$period,'currentPeriod'=>$period,'periods'=>$state['periods'],'profiles'=>$state['profiles'],'history'=>$profile['gpaHistory'],'transcripts'=>$state['transcripts'],'referencePeriod'=>$fixture['activePeriod'],'connected'=>true,'persistDraft'=>true,'clearDraft'=>true,'persistReview'=>true,'isActivePeriod'=>true];
$cases=['LoginPage','Sidebar','Header','AwardeeDashboard','ProfilePage','TranscriptPage','MonthlyReportPage','FinancePage','RecapPage','PeriodDetail','Export'];
$failed=0;
foreach($cases as $name){try{$result=view($name,$props);if(!$result->value)throw new RuntimeException('Empty view');echo "PASS $name\n";}catch(Throwable $e){$failed++;echo "FAIL $name: ".$e->getMessage().' '.$e->getFile().':'.$e->getLine()."\n";}}
foreach($fixture['accounts'] as $staff)if($staff['role']!=='awardee'){
    $staff['scope']??=array_keys($state['profiles']);
    foreach(['StaffDashboard','AwardeeMatrix','StaffAccountPage','StaffPeriodDetail'] as $name){try{view($name,array_merge($props,['account'=>$staff]));echo 'PASS '.$staff['role'].' '.$name."\n";}catch(Throwable $e){$failed++;echo 'FAIL '.$staff['role'].' '.$name.': '.$e->getMessage().' '.$e->getFile().':'.$e->getLine()."\n";}}
}
exit($failed?1:0);
