<?php
// Opt-in test: use an isolated test database/Neon branch with deployment SQL 008.
declare(strict_types=1);
if(PHP_SAPI!=='cli'||($argv[1]??'')!=='--allow-state-test')exit("CLI only: php tests/serverless-state.php --allow-state-test (isolated test database)\n");
define('NO_SESSION',true);
require dirname(__DIR__).'/app/bootstrap.php';
if(session_driver()!=='postgres')exit("Set BEZAKAT_SESSION_DRIVER=postgres for this test.\n");
$count=0;
function state_assert(bool $value,string $label): void {global $count;if(!$value)throw new RuntimeException($label);$count++;echo 'PASS '.$label.PHP_EOL;}
$id=bin2hex(random_bytes(24));$first=new PostgresSessionHandler();$second=new PostgresSessionHandler();
try{
    state_assert(!$first->validateId($id),'unknown session rejected');
    state_assert($first->read($id)==='','new session starts empty');
    state_assert($first->write($id,'synthetic-session-data'),'session committed');$first->close();
    state_assert($second->validateId($id),'session ID valid on independent connection');
    state_assert($second->read($id)==='synthetic-session-data','session data survives connection change');
    state_assert($second->updateTimestamp($id,'synthetic-session-data'),'session timestamp refresh succeeds');$second->close();
    $denied=false;try{database()->query('SELECT * FROM sim_bezakat_runtime.sessions LIMIT 0');}catch(PDOException $e){$denied=($e->errorInfo[0]??'')==='42501';}
    state_assert($denied,'runtime role cannot read shared state tables directly');
    state_assert($first->destroy($id),'destroy shared session');
    state_assert(!$second->validateId($id),'destroyed session rejected on another connection');
    state_assert(is_int($second->gc(28800)),'bounded expired-state cleanup executes');
    echo $count.' shared-state checks passed'.PHP_EOL;
}finally{$first->destroy($id);$first->close();$second->close();}
