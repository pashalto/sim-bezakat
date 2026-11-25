<?php
declare(strict_types=1);
function public_user(array $r): array {
    [$role,$label]=match($r['peran']) {
        'awardee'=>['awardee','Awardee'], 'koordinator'=>['coordinator','Koordinator Beasiswa'],
        'laz'=>['institution','Pengelola LAZ'], 'kemenag'=>['ministry','Pengelola Kemenag'],
        default=>throw new PortalError(403,'Peran akun tidak dikenal.'),
    };
    return ['id'=>(string)$r['id_akun'],'username'=>$r['id_beasiswa'],'name'=>$r['nama'],'role'=>$role,'roleLabel'=>$label];
}
function current_user(): array {
    if (empty($_SESSION['accountId']) || time()-($_SESSION['signedAt']??0)>28800) throw new PortalError(401,'Silakan masuk terlebih dahulu.');
    $r=query_one('SELECT * FROM sim_bezakat.v_portal_akun WHERE id_akun=?',[$_SESSION['accountId']]);
    if (!$r || !db_bool($r['status_aktif'])) { unset($_SESSION['accountId']); throw new PortalError(401,'Akun tidak aktif atau sesi berakhir.'); }
    return public_user($r);
}
function login(array $v): array {
    if (!is_string($v['idBeasiswa']??null) || !is_string($v['password']??null) || strlen($v['password'])>72) throw new PortalError(400,'Isi ID beasiswa dan kata sandi.');
    $id=strtoupper(trim($v['idBeasiswa']));
    // Match the actual v2 schema. The demo-only BZI-001 coordinator is not a valid DB ID.
    if (!preg_match('/^BZI-251-000[0-9]{4}$/D',$id) || $id==='BZI-251-0000000') throw new PortalError(401,'ID beasiswa atau kata sandi tidak sesuai.');
    // Shared per-ID lock file: persists across PHP sessions and concurrent requests.
    $file=fopen(ROOT.'/storage/login-'.hash('sha256',$id).'.json','c+');
    if (!$file || !flock($file,LOCK_EX)) throw new PortalError(503,'Pembatas login belum siap.');
    try {
        $attempt=json_decode(stream_get_contents($file)?:'{}',true)?:[];
        if (($attempt['until']??0)<=time()) $attempt=['count'=>0,'until'=>time()+900];
        if (($attempt['count']??0)>=10) throw new PortalError(429,'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
        $attempt['count']++;ftruncate($file,0);rewind($file);fwrite($file,json_encode($attempt));fflush($file);
        $r=query_one('SELECT * FROM sim_bezakat.v_portal_akun WHERE id_beasiswa=?',[$id]);
        // bcryptjs hashes are compatible with PHP password_verify ($2a/$2b/$2y).
        $hash=$r['password_hash']??'$2y$12$C6UzMDM.H6dfI/f/IKcEe.5oG.4C25FG0jtqf0ePOlCWMLvhqYOCi';
        $valid=password_verify($v['password'],$hash);
        if (!$r || !db_bool($r['status_aktif']) || !str_starts_with($hash,'$2') || !$valid) throw new PortalError(401,'ID beasiswa atau kata sandi tidak sesuai.');
        ftruncate($file,0);
    } finally { flock($file,LOCK_UN);fclose($file); }
    session_regenerate_id(true);$_SESSION['accountId']=(string)$r['id_akun'];$_SESSION['signedAt']=time();unset($_SESSION['csrf']);csrf();
    return public_user($r);
}
function profile_from(array $fields, array $academics=[]): array {
    $p=array_fill_keys(['ownerId','fullName','photoName','photoUrl','birthPlace','birthDate','gender','identityAddress','domicileType','domicileAddress','guardianName','guardianContact','socialMedia','university','studyProgram','studentNumber','sponsor','registrationNumber','gpaValue','gpaSemester'],'');
    $p['gpaType']='IPK';$p['gpaHistory']=[];
    foreach($fields as $k=>$v) if($v!==null) $p[$k]=$v;
    foreach($academics as $r) if((string)$r['ownerId']===(string)$p['ownerId']) {
        $p['gpaSemester']='Semester '.$r['semester'];
        if(($r['verifiedGpa']??null)!==null){$p['gpaHistory'][(int)$r['semester']-1]=$r['verifiedGpa'];$p['gpaValue']=number_format((float)$r['verifiedGpa'],2,',','');}
    }
    if($p['gpaHistory']) {for($i=0;$i<=max(array_keys($p['gpaHistory']));$i++)$p['gpaHistory'][$i]??=null;ksort($p['gpaHistory']);}
    return $p;
}
function portal_session(array $user): array {
    $row=query_one("SELECT sim_bezakat.portal_ringkasan(?) AS overview, CASE WHEN ?='awardee' THEN sim_bezakat.portal_daftar_draf(?) ELSE '[]'::jsonb END AS drafts, CASE WHEN ? IN ('awardee','coordinator') THEN sim_bezakat.portal_daftar_pemeriksaan(?) ELSE '[]'::jsonb END AS reviews",[$user['id'],$user['role'],$user['id'],$user['role'],$user['id']]);
    $overview=json_decode($row['overview'],true,512,JSON_THROW_ON_ERROR);$drafts=array_map('normalize_draft',json_decode($row['drafts'],true,512,JSON_THROW_ON_ERROR));$reviews=json_decode($row['reviews'],true,512,JSON_THROW_ON_ERROR);
    $profiles=[];foreach($overview['profiles'] as $p)$profiles[$p['ownerId']]=profile_from($p,$overview['academics']);
    $source=$user['role']==='awardee'?array_map(fn($d)=>array_merge($d,['ownerId'=>$user['id']]),$drafts):$overview['reports'];$periods=[];
    $statuses=['draf'=>'draft','perlu_revisi'=>'revision','disetujui'=>'approved','ditolak'=>'rejected','diajukan'=>'submitted'];
    foreach($source as $entry){
        $details=null;$review=null;
        foreach($overview['reports'] as $r)if((string)$r['ownerId']===(string)$entry['ownerId']&&(string)$r['periodId']===(string)$entry['periodId']){$details=$r;break;}
        foreach($reviews as $r)if((string)$r['reportId']===(string)($details['reportId']??'')){$review=$r['detail'];break;}
        $status=$statuses[$entry['status']]??'draft';if($status==='submitted')$status=$review['decision']['status']??$status;
        $finance=$details['financeDocuments']??[];
        foreach($finance as &$doc)if(isset($review['finance'][$doc['id']])){$fr=$review['finance'][$doc['id']];$doc['status']=$fr['status'];$doc['reason']=implode('; ',array_filter(array_column($fr['issues']??[],'reason')));}unset($doc);
        $periods[]=['id'=>$user['role']==='awardee'?(string)$entry['periodId']:$entry['ownerId'].':'.$entry['periodId'],'reportId'=>$details['reportId']??null,'ownerId'=>(string)$entry['ownerId'],'month'=>$entry['month'],'year'=>$entry['year'],'reportStatus'=>$status,'answers'=>$entry['answers']?:new stdClass(),'activities'=>$entry['activities'],'sectionReviews'=>$review['sections']??new stdClass(),'financeDocuments'=>$finance,'reviewHistory'=>$details['reviewHistory']??[],'submittedAt'=>$details['submittedAt']??null,'profileSnapshot'=>isset($details['snapshot'])?profile_from(array_merge($details['snapshot'],['ownerId'=>$entry['ownerId']])):null];
    }
    $user['scope']=array_map('strval',array_keys($profiles));$user['institution']=$overview['institution']??null;
    return ['user'=>$user,'state'=>['profiles'=>(object)$profiles,'periods'=>$periods,'transcripts'=>$overview['academics']],'drafts'=>$drafts,'activePeriod'=>$overview['activePeriod']];
}
function valid_target(array $v): bool {
    return is_string($v['periodId']??null)&&preg_match('/^-?\d{1,18}$/D',$v['periodId'])&&is_int($v['version']??null)&&$v['version']>=0&&$v['version']<=2147483646;
}
function validate_draft(array $v): array {
    if(array_diff(array_keys($v),['periodId','version','answers','activities'])||!valid_target($v)||!is_array($v['answers']??null)||!is_array($v['activities']??null)||!array_is_list($v['activities'])||count($v['activities'])>30)throw new PortalError(400,'Isian draf tidak valid.');
    $definitions=[];foreach($GLOBALS['reportSections'] as $s)foreach($s['questions'] as $q)$definitions[$q['id']]=$q;
    foreach($v['answers'] as $key=>$answer){
        $other=str_ends_with((string)$key,'__other');$q=$definitions[$other?substr($key,0,-7):$key]??null;
        if(!$q||($other&&!in_array('Lainnya',$q['options']??[],true)))throw new PortalError(400,'Pertanyaan tidak dikenali.');
        if($other||in_array($q['type'],['text','textarea'],true)){
            if(!is_string($answer)||mb_strlen($answer)>5000)throw new PortalError(400,'Teks terlalu panjang atau tidak valid.');
        }elseif($q['type']==='multi'){
            if(!is_array($answer)||!array_is_list($answer)||count($answer)>30||count(array_unique($answer,SORT_REGULAR))!==count($answer))throw new PortalError(400,'Pilihan jamak tidak valid.');
            foreach($answer as $a)if(!is_string($a)||!in_array($a,$q['options']??[],true)||(count($answer)>1&&in_array($a,$GLOBALS['exclusiveOptions'],true)))throw new PortalError(400,'Pilihan jamak tidak valid.');
        }elseif(!is_string($answer)||($answer!==''&&!in_array($answer,$q['options']??[],true)))throw new PortalError(400,'Pilihan tidak valid.');
    }
    foreach($v['activities'] as $a){
        if(!is_array($a))throw new PortalError(400,'Kegiatan tidak valid.');$keys=array_keys($a);sort($keys);
        if($keys!==['description','evidence','id','name','role','type'])throw new PortalError(400,'Kegiatan tidak valid.');
        foreach($a as $x)if(!is_string($x)||mb_strlen($x)>5000)throw new PortalError(400,'Kegiatan tidak valid.');
    }
    return $v;
}
function write_draft(array $user,array $v,bool $clear=false): mixed {
    if($user['role']!=='awardee')throw new PortalError(403,'Hanya awardee dapat mengubah draf miliknya.');
    if($clear){
        if(!valid_target($v)||array_diff(array_keys($v),['periodId','version']))throw new PortalError(400,'Periode atau versi draf tidak valid.');
        return sql_json('SELECT sim_bezakat.portal_hapus_isian_draf(?,?,?) AS draft',[$user['id'],$v['periodId'],$v['version']],'draft');
    }
    validate_draft($v);
    return sql_json('SELECT sim_bezakat.portal_simpan_draf(?,?,?,?::jsonb,?::jsonb) AS draft',[$user['id'],$v['periodId'],$v['version'],json_encode((object)$v['answers'],JSON_THROW_ON_ERROR),json_encode($v['activities'],JSON_THROW_ON_ERROR)],'draft');
}
function validate_reviews(array $v): array {
    $ops=['approve-report','revise-report','reject-report','approve-section','revise-section','approve-finance','revise-finance'];
    if(!is_string($v['reportId']??null)||!preg_match('/^-?\d{1,18}$/D',$v['reportId'])||!is_array($v['reviews']??null)||!array_is_list($v['reviews'])||count($v['reviews'])<2||count($v['reviews'])>50)throw new PortalError(400,'Batch pemeriksaan tidak valid.');
    $sections=array_column($GLOBALS['reportSections'],'key');$keys=[];$reportCount=0;$clean=[];
    foreach($v['reviews'] as $r){
        if(!is_array($r)||!in_array($r['operation']??null,$ops,true)||!is_string($r['target']??null)||mb_strlen($r['target'])>80)throw new PortalError(400,'Target pemeriksaan tidak valid.');
        $op=$r['operation'];$target=$r['target'];$kind=str_ends_with($op,'section')?'section':(str_ends_with($op,'finance')?'finance':'report');
        if($kind==='section'&&!in_array($target,$sections,true))throw new PortalError(400,'Bagian laporan tidak dikenal.');
        $keys[]=$target.':'.$kind;if($target==='report')$reportCount++;
        $issues=[];
        if(str_starts_with($op,'revise')||$op==='reject-report'){
            if(!is_array($r['issues']??null)||count($r['issues'])<1||count($r['issues'])>40)throw new PortalError(400,'Catatan revisi wajib diisi.');
            foreach($r['issues'] as $issue){
                if(!is_array($issue)||!is_string($issue['questionId']??null)||!is_string($issue['reason']??null)||mb_strlen($issue['questionId'])>100||!trim($issue['reason'])||mb_strlen($issue['reason'])>500)throw new PortalError(400,'Rincian revisi tidak valid.');
                if($op==='revise-section'){$section=$GLOBALS['reportSections'][array_search($target,$sections,true)];if(!in_array($issue['questionId'],array_column($section['questions'],'id'),true))throw new PortalError(400,'Isian revisi tidak termasuk bagian yang dipilih.');}
                $issues[]=['questionId'=>$issue['questionId'],'reason'=>trim($issue['reason'])];
            }
        }
        $clean[]=['operation'=>$op,'target'=>$target,'issues'=>$issues];
    }
    if(count(array_unique($keys))!==count($keys)||$reportCount!==1)throw new PortalError(400,'Target pemeriksaan tidak boleh ganda.');
    return $clean;
}
function review_reports(array $user,array $v): void {
    if($user['role']!=='coordinator')throw new PortalError(403,'Hanya koordinator dapat memeriksa laporan.');
    $reviews=validate_reviews($v);$db=database();$db->beginTransaction();
    try{foreach($reviews as $r)query_one('SELECT sim_bezakat.portal_simpan_pemeriksaan(?,?,?,?,?::jsonb) AS detail',[$user['id'],$v['reportId'],$r['operation'],$r['target'],json_encode($r['issues'],JSON_THROW_ON_ERROR)]);$db->commit();}
    catch(Throwable $e){$db->rollBack();throw $e;}
}
