<?php
declare(strict_types=1);
/** Only this type bypasses HTML escaping. Database/user strings never do. */
final class Html { public function __construct(public string $value) {} public function __toString(): string {return $this->value;} }
function h(mixed $v): string {return htmlspecialchars(jstr($v),ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function inline_style(array $v): string {$out=[];foreach($v as $k=>$x)if(in_array($k,['width','height'],true)&&preg_match('/^\d+(?:\.\d+)?%?$/D',jstr($x)))$out[]=$k.':'.$x;return implode(';',$out);}
function fragment(array $children): Html {
    $out='';foreach($children as $v){if($v instanceof Html)$out.=$v->value;elseif(is_array($v))$out.=fragment($v)->value;elseif($v!==null&&!is_bool($v))$out.=h($v);}return new Html($out);
}
function tag(string $name,array $attrs=[],array $children=[]): Html {
    $renames=['strokeWidth'=>'stroke-width','strokeLinecap'=>'stroke-linecap','strokeLinejoin'=>'stroke-linejoin','strokeDasharray'=>'stroke-dasharray','textAnchor'=>'text-anchor','fontSize'=>'font-size','fontWeight'=>'font-weight','floodColor'=>'flood-color','colorInterpolationFilters'=>'color-interpolation-filters'];
    $out='<'.$name;
    foreach($attrs as $key=>$val){
        if($val===null||$val===false||$val instanceof Closure)continue;
        if(!preg_match('/^[a-zA-Z][a-zA-Z0-9:_-]*$/D',$key)||str_starts_with(strtolower($key),'on'))continue;
        $key=$renames[$key]??$key;
        if(in_array($key,['src','href'],true)&&preg_match('/^\s*(?:javascript|vbscript):/i',jstr($val)))continue;
        if($key==='src'&&!preg_match('~^(?:/|data:image/(?:png|jpeg|webp|gif);base64,)~',jstr($val)))continue;
        $out.=' '.$key.($val===true?'':'="'.h($val).'"');
    }
    $out.='>';
    if(!in_array($name,['img','input','br','hr','meta','link','source','area'],true)){
        $content=fragment($children)->value;
        if($name==='select'&&array_key_exists('value',$attrs))$content=preg_replace_callback('~<option([^>]*)>(.*?)</option>~s',static function($m)use($attrs){preg_match('~\bvalue="([^"]*)"~',$m[1],$value);$option=html_entity_decode($value[1]??strip_tags($m[2]),ENT_QUOTES,'UTF-8');return '<option'.$m[1].($option===jstr($attrs['value'])?' selected':'').'>'.$m[2].'</option>';},$content);
        $out.=$content.'</'.$name.'>';
    }
    return new Html($out);
}
function jget(mixed $obj,mixed $key): mixed {return is_array($obj)?($obj[$key]??null):(is_object($obj)?($obj->{(string)$key}??null):(is_string($obj)&&is_numeric($key)?mb_substr($obj,(int)$key,1):null));}
function jlen(mixed $v): int {return is_array($v)?count($v):(is_string($v)?mb_strlen($v):0);}
function jtruth(mixed $v): bool {return is_array($v)||is_object($v)?true:($v!==null&&$v!==false&&$v!==''&&$v!==0&&$v!==0.0);}
function jstr(mixed $v): string {return $v===null?'':($v===true?'true':($v===false?'false':(is_array($v)?implode(',',array_map('jstr',$v)):(string)$v)));}
function jnumber(mixed $v): int|float {return is_numeric($v)?0+$v:(int)(bool)$v;}
function jtype(mixed $v): string {return is_string($v)?'string':(is_int($v)||is_float($v)?'number':(is_bool($v)?'boolean':'object'));}
function jadd(mixed $a,mixed $b): mixed {return is_string($a)||is_string($b)?jstr($a).jstr($b):($a??0)+($b??0);}
function jentries(mixed $v): array {$out=[];foreach((array)$v as $k=>$x)$out[]=[$k,$x];return $out;}
function jfn(array $scope,Closure $fn): Closure {return static fn(...$args)=>$fn($scope,...$args);}
function jmethod(mixed $v,string $method,mixed ...$args): mixed {
    switch($method){
        case 'map': $out=[];foreach((array)$v as $i=>$x)$out[]=$args[0]($x,$i);return $out;
        case 'filter': $out=[];foreach((array)$v as $i=>$x)if(jtruth($args[0]($x,$i)))$out[]=$x;return $out;
        case 'find': foreach((array)$v as $i=>$x)if(jtruth($args[0]($x,$i)))return $x;return null;
        case 'findIndex':foreach((array)$v as $i=>$x)if(jtruth($args[0]($x,$i)))return $i;return -1;
        case 'some':foreach((array)$v as $i=>$x)if(jtruth($args[0]($x,$i)))return true;return false;
        case 'every':foreach((array)$v as $i=>$x)if(!jtruth($args[0]($x,$i)))return false;return true;
        case 'reduce':$acc=$args[1]??null;foreach((array)$v as $i=>$x)$acc=$args[0]($acc,$x,$i);return $acc;
        case 'includes':return is_array($v)?in_array($args[0],$v,true):str_contains(jstr($v),jstr($args[0]));
        case 'indexOf':$index=array_search($args[0],(array)$v,true);return $index===false?-1:$index;
        case 'slice':$start=(int)($args[0]??0);$length=isset($args[1])?((int)$args[1]<0?jlen($v)+(int)$args[1]-$start:(int)$args[1]-$start):null;return is_array($v)?array_slice($v,$start,$length):mb_substr(jstr($v),$start,$length);
        case 'sort':$copy=(array)$v;isset($args[0])?usort($copy,$args[0]):sort($copy);return $copy;
        case 'reverse':return array_reverse((array)$v);
        case 'join':return implode($args[0]??',',array_map('jstr',(array)$v));
        case 'split':return explode($args[0],jstr($v));
        case 'trim':return trim(jstr($v));
        case 'toUpperCase':return mb_strtoupper(jstr($v));
        case 'toLowerCase':return mb_strtolower(jstr($v));
        case 'toFixed':return $v===null?null:number_format((float)$v,(int)($args[0]??0),'.','');
        case 'replace':return str_replace($args[0],$args[1],jstr($v));
        case 'from':$len=(int)jget($args[0],'length');return array_map(fn($i)=>$args[1](null,$i),range(0,max(0,$len-1)));
        default:throw new RuntimeException('Unsupported view method: '.$method);
    }
}
function helper(string $name,mixed ...$args): mixed {
    return match($name){
        'periodLabel'=>($GLOBALS['monthNames'][($args[0]??1)-1]??'').' '.($args[1]??''),
        'statusLabel'=>['draft'=>'Belum dikirim','submitted'=>'Terkirim','review'=>'Menunggu pemeriksaan ulang','revision'=>'Perlu perbaikan','approved'=>'Disetujui','rejected'=>'Ditolak'][$args[0]??'draft']??'Belum dikirim',
        'initials'=>mb_strtoupper(implode('',array_map(fn($p)=>mb_substr($p,0,1),array_slice(explode(' ',jstr($args[0])),0,2)))),
        'formatAnswer'=>is_array($args[0]??null)?(implode(', ',$args[0])?:'Belum diisi'):($args[0]??'Belum diisi'),
        'formatDateTime'=>format_datetime($args[0]??''),
        'formatFileSize'=>($args[0]??0)>1048576?number_format($args[0]/1048576,2).' MB':round(($args[0]??0)/1024).' KB',
        'answeredInSection'=>answered_in_section($args[0],$args[1]),
        'reportCompletion'=>report_completion($args[0]),
        'financeStatus'=>finance_status($args[0]),
        'overallStatus'=>overall_status($args[0]),
        'matrixTone'=>['approved'=>'bg-emerald-600','rejected'=>'bg-slate-800','revision'=>'bg-rose-500','incomplete'=>'bg-amber-500','draft'=>'bg-slate-400'][$args[0]]??'bg-violet-500',
        'activePeriodFor'=>$GLOBALS['portalData']['activePeriod']??['month'=>(int)date('n'),'year'=>(int)date('Y')],
        'escapePdfText'=>h($args[0]??'—'),
        'pdfValue'=>($args[0]??'')===''?'—':h($args[0]),
        'renderPdfQuestion'=>pdf_question(...$args),
        'safePdfPhotoUrl'=>safe_photo_url($args[0]??''),
        'longDate'=>date('j').' '.($GLOBALS['monthNames'][(int)date('n')-1]).' '.date('Y'),
        'longDateTime'=>date('j').' '.($GLOBALS['monthNames'][(int)date('n')-1]).' '.date('Y').' pukul '.date('H.i'),
        default=>throw new RuntimeException('Unsupported view helper: '.$name),
    };
}
function answered_in_section(array $p,array $s): int {$count=0;foreach($s['questions'] as $q){$v=jget($p['answers'],$q['id']);if(is_array($v)?count($v)>0:trim(jstr($v))!=='')$count++;}return $count;}
function report_completion(array $p): int {$total=0;$filled=0;foreach($GLOBALS['reportSections'] as $s){$total+=count($s['questions']);$filled+=answered_in_section($p,$s);}return $total?min(100,(int)round($filled/$total*100)):0;}
function finance_status(array $p): string {
    $docs=$p['financeDocuments']??[];if(!$docs)return 'draft';
    foreach(['rejected','revision'] as $s)if(in_array($s,array_column($docs,'status'),true))return $s;
    foreach(['approved','draft'] as $s)if(count(array_filter($docs,fn($d)=>$d['status']===$s))===count($docs))return $s;
    return in_array('review',array_column($docs,'status'),true)?'review':'submitted';
}
function overall_status(array $p): string {
    $r=$p['reportStatus'];$f=finance_status($p);
    if($r==='rejected'||$f==='rejected')return 'rejected';if($r==='revision'||$f==='revision')return 'revision';
    if($r==='approved'&&$f==='approved')return 'approved';if($r==='draft'&&$f==='draft')return 'draft';
    if($r==='approved'&&$f!=='approved')return 'incomplete';return 'submitted';
}
function detail_page(): string {return ($GLOBALS['portalData']['user']['role']??'awardee')==='awardee'?'recap-detail':'staff-detail';}
function format_datetime(string $value): string {if(!$value)return '—';$time=strtotime($value);$months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];return date('j',$time).' '.$months[(int)date('n',$time)-1].' '.date('Y, H.i',$time);}
function pdf_question(array $q,mixed $value,string $number,?string $issue=null): string {
    $selected=is_array($value)?$value:($value?[$value]:[]);$options=$q['options']??[];
    if($options){$answer='<div class="choices">';foreach($options as $option)$answer.='<span class="choice"><span class="box">'.(in_array($option,$selected,true)?'☒':'☐').'</span>'.h($option).'</span>';$answer.='</div>';}
    else $answer='<div class="narrative">'.helper('pdfValue',is_array($value)?implode(', ',$value):$value).'</div>';
    return '<article class="question"><div class="question-title"><span class="question-number">'.h($number).'.</span><span>'.h($q['label']).'</span></div>'.(!empty($q['hint'])?'<p class="hint">'.h($q['hint']).'</p>':'').$answer.($issue?'<div class="review-note"><strong>Catatan pemeriksa:</strong> '.h($issue).'</div>':'').'</article>';
}
function safe_photo_url(string $url): string {
    if(preg_match('~^data:image/(?:png|jpe?g|gif|webp);base64,~i',$url))return $url;
    if(str_starts_with($url,'/')&&!str_starts_with($url,'//'))return $url;
    $host=parse_url($url,PHP_URL_HOST);$scheme=parse_url($url,PHP_URL_SCHEME);return $host&&$host===parse_url((!empty($_SERVER['HTTPS'])?'https':'http').'://'.($_SERVER['HTTP_HOST']??'localhost'),PHP_URL_HOST)&&in_array($scheme,['http','https'],true)?$url:'';
}
function view(string $name,array $props=[]): Html {
    if($name==='Icon'){
        static $icons;$icons??=require __DIR__.'/icons.php';
        return tag('svg',['viewBox'=>'0 0 24 24','fill'=>'none','stroke'=>'currentColor','stroke-width'=>'1.8','stroke-linecap'=>'round','stroke-linejoin'=>'round','class'=>$props['class']??'h-5 w-5','aria-hidden'=>'true'],[$icons[$props['name']]??'']);
    }
    if(!preg_match('/^[A-Za-z]+$/D',$name)||!is_file(ROOT.'/views/'.$name.'.php'))throw new RuntimeException('Unknown view '.$name);
    $Array=null; $demoNow=null;
    return require ROOT.'/views/'.$name.'.php';
}
