<?php
declare(strict_types=1);

function session_driver(): string {
    $driver=env('BEZAKAT_SESSION_DRIVER',env('VERCEL')==='1'?'postgres':'files');
    if(!in_array($driver,['files','postgres'],true)||(env('VERCEL')==='1'&&$driver!=='postgres'))throw new PortalError(503,'Gunakan penyimpanan sesi PostgreSQL pada Vercel.');
    return $driver;
}
function request_https(): bool {
    // VERCEL is platform-provided. Do not trust client-supplied forwarded headers.
    return env('VERCEL')==='1'||(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off');
}

/** One dedicated connection/transaction per session read->write. Row locks work
 * with transaction pooling; no session-level advisory locks or local files. */
final class PostgresSessionHandler implements SessionHandlerInterface, SessionUpdateTimestampHandlerInterface {
    public string $stage = 'session.start';
    private ?PDO $db=null;
    private function db(): PDO {return $this->db??=database_connect($this->stage);}
    private function key(string $id): string {return hash('sha256',$id);}
    private function call(string $function,array $params): mixed {
        $names=['session_valid','session_read','session_write','session_delete','session_gc'];
        if(!in_array($function,$names,true))throw new LogicException('Invalid session function');
        $db = $this->db();
        $this->stage = $function;
        $statement=$db->prepare('SELECT sim_bezakat_runtime.'.$function.'('.implode(',',array_fill(0,count($params),'?')).') AS value');
        $statement->execute($params);return $statement->fetchColumn();
    }
    public function open(string $path,string $name): bool {return true;}
    public function close(): bool {
        if($this->db?->inTransaction())$this->db->commit();$this->db=null;return true;
    }
    public function validateId(string $id): bool {return db_bool($this->call('session_valid',[$this->key($id)]));}
    public function read(string $id): string|false {
        $db = $this->db();
        $this->stage = 'session.begin';
        if (!$db->inTransaction()) $db->beginTransaction();
        $encoded=$this->call('session_read',[$this->key($id)]);
        $data=base64_decode((string)$encoded,true);return $data===false?'':$data;
    }
    public function write(string $id,string $data): bool {
        $this->call('session_write',[$this->key($id),base64_encode($data)]);
        if($this->db()->inTransaction())$this->db()->commit();return true;
    }
    public function updateTimestamp(string $id,string $data): bool {return $this->write($id,$data);}
    public function destroy(string $id): bool {
        $this->call('session_delete',[$this->key($id)]);
        if($this->db()->inTransaction())$this->db()->commit();return true;
    }
    public function gc(int $max_lifetime): int|false {return (int)$this->call('session_gc',[]);}
}

function login_attempt_begin(string $id): mixed {
    if(session_driver()==='postgres'){
        $result=query_one('SELECT sim_bezakat_runtime.login_attempt(?) AS allowed',[hash('sha256',$id)]);
        if(!db_bool($result['allowed']??false))throw new PortalError(429,'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
        return 'postgres';
    }
    $file=fopen(ROOT.'/storage/login-'.hash('sha256',$id).'.json','c+');
    if(!$file||!flock($file,LOCK_EX))throw new PortalError(503,'Pembatas login belum siap.');
    $attempt=json_decode(stream_get_contents($file)?:'{}',true)?:[];
    if(($attempt['until']??0)<=time())$attempt=['count'=>0,'until'=>time()+900];
    if(($attempt['count']??0)>=10){flock($file,LOCK_UN);fclose($file);throw new PortalError(429,'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');}
    $attempt['count']++;ftruncate($file,0);rewind($file);fwrite($file,json_encode($attempt));fflush($file);return $file;
}
function login_attempt_end(mixed $token,string $id,bool $success): void {
    if($token==='postgres'){
        if($success)query_one('SELECT sim_bezakat_runtime.login_clear(?)',[hash('sha256',$id)]);
    }else{
        if($success)ftruncate($token,0);flock($token,LOCK_UN);fclose($token);
    }
}
