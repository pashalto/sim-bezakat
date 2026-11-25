<?php
declare(strict_types=1);
define('NO_SESSION', true);
require dirname(__DIR__).'/app/bootstrap.php';
set_error_handler(static function(int $severity,string $message,string $file,int $line): never {throw new ErrorException($message,0,$severity,$file,$line);});
$count=0;
function check(bool $value,string $label): void {global $count;if(!$value)throw new RuntimeException('FAIL '.$label);$count++;echo "PASS $label\n";}
function rejected(Closure $fn,int $status=400): bool {try{$fn();return false;}catch(PortalError $e){return $e->status===$status;}}
$valid=['periodId'=>'9007199254740993','version'=>0,'answers'=>[],'activities'=>[]];
check(validate_draft($valid)===$valid,'bigint ID remains a string');
check(rejected(fn()=>validate_draft($valid+['ownerId'=>'other'])),'server-owned fields rejected');
check(rejected(fn()=>validate_draft(array_replace($valid,['version'=>1.2]))),'non-integer version rejected');
check(rejected(fn()=>validate_draft(array_replace($valid,['version'=>-1]))),'negative version rejected');
check(rejected(fn()=>validate_draft(array_replace($valid,['periodId'=>'1 OR 1=1']))),'invalid ID rejected');
check(rejected(fn()=>validate_draft(array_replace($valid,['answers'=>['unknown'=>'x']]))),'unknown question rejected');
$text=null;$multi=null;$other=null;foreach($GLOBALS['reportSections'] as $s)foreach($s['questions'] as $q){if($q['type']==='textarea')$text=$q;if($q['type']==='multi')$multi=$q;if(in_array('Lainnya',$q['options']??[],true))$other=$q;}
check(rejected(fn()=>validate_draft(array_replace($valid,['answers'=>[$text['id']=>str_repeat('a',5001)]]))),'text length enforced');
check(rejected(fn()=>validate_draft(array_replace($valid,['answers'=>[$multi['id']=>['not an option']]]))),'unknown multiple choice rejected');
check(rejected(fn()=>validate_draft(array_replace($valid,['answers'=>[$multi['id']=>[$multi['options'][0],$multi['options'][0]]]]))),'duplicate choices rejected');
check(validate_draft(array_replace($valid,['answers'=>[$other['id'].'__other'=>'Keterangan']]))['answers'][$other['id'].'__other']==='Keterangan','other text preserved');
check(rejected(fn()=>validate_draft(array_replace($valid,['activities'=>[['id'=>'x','name'=>'x']]]))),'activity allowlist enforced');
$activity=['id'=>'a','name'=>'Organisasi','type'=>'Sosial','role'=>'Anggota','description'=>'Kegiatan','evidence'=>'https://example.org'];
check(validate_draft(array_replace($valid,['activities'=>[$activity]]))['activities'][0]===$activity,'activity valid');
check(rejected(fn()=>write_draft(['role'=>'coordinator'], $valid),403),'coordinator cannot save awardee drafts');
check(rejected(fn()=>write_draft(['role'=>'ministry'], $valid,true),403),'ministry cannot clear drafts');
check(rejected(fn()=>review_reports(['role'=>'awardee'],[]),403),'awardee cannot review');
$batch=['reportId'=>'1','reviews'=>[['operation'=>'approve-section','target'=>$GLOBALS['reportSections'][0]['key']],['operation'=>'approve-report','target'=>'report']]];
check(count(validate_reviews($batch))===2,'review batch valid');
check(rejected(fn()=>validate_reviews(array_replace($batch,['reviews'=>[$batch['reviews'][0],$batch['reviews'][0],$batch['reviews'][1]]]))),'duplicate review targets rejected');
check(rejected(fn()=>validate_reviews(array_replace($batch,['reviews'=>[['operation'=>'revise-section','target'=>$GLOBALS['reportSections'][0]['key'],'issues'=>[]],$batch['reviews'][1]]]))),'revision reason required');
check(rejected(fn()=>validate_reviews(array_replace($batch,['reviews'=>[['operation'=>'revise-section','target'=>$GLOBALS['reportSections'][0]['key'],'issues'=>[['questionId'=>$text['id'],'reason'=>'Perbaiki']]],$batch['reviews'][1]]]))),'revision question must belong to section');
$fixture=json_decode(file_get_contents(__DIR__.'/preview-fixture.json'),true,512,JSON_THROW_ON_ERROR);
foreach($fixture['state']['periods'] as $p){check(in_array(finance_status($p),['draft','submitted','review','revision','approved','rejected'],true),'finance status '.$p['id']);}
check(!str_contains((string)tag('p',[],['<script>alert(1)</script>']),'<script>'),'HTML escaped');
check(!str_contains((string)tag('a',['href'=>'javascript:alert(1)'],['link']),'javascript:'),'unsafe link rejected');
check(json_encode(normalize_draft(['answers'=>[]]))==='{"answers":{}}','empty answer JSON shape preserved');
$bcrypt=json_decode(file_get_contents(__DIR__.'/bcrypt-fixture.json'),true,512,JSON_THROW_ON_ERROR);
check(password_verify($bcrypt['password'],$bcrypt['hash']),'bcryptjs 2b compatibility');
check(password_verify($bcrypt['password'],str_replace('$2b$','$2a$',$bcrypt['hash'])),'bcryptjs 2a compatibility');
echo "$count checks passed\n";
