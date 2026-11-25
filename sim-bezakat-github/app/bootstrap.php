<?php
declare(strict_types=1);

const ROOT = __DIR__ . '/..';
date_default_timezone_set('Asia/Jakarta');
// Configuration is outside the public document root. Existing environment wins.
if (is_file(ROOT . '/.env.local')) {
    foreach (file(ROOT . '/.env.local', FILE_IGNORE_NEW_LINES) as $line) {
        if (preg_match('/^([A-Z][A-Z0-9_]*)=(.*)$/', trim($line), $m) && getenv($m[1]) === false) {
            putenv($m[1] . '=' . trim(trim($m[2]), "\"'"));
        }
    }
}
function env(string $name, string $default = ''): string { return getenv($name) === false ? $default : (string)getenv($name); }
final class PortalError extends RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}
require __DIR__.'/database.php';
require __DIR__.'/server-state.php';
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', env('VERCEL')==='1'?'/dev/stderr':ROOT.'/storage/php.log');
ini_set('session.use_strict_mode', '1');
ini_set('session.gc_maxlifetime', '28800');
session_name('sim_bezakat_php');
session_set_cookie_params(['lifetime'=>0, 'path'=>'/', 'secure'=>request_https(), 'httponly'=>true, 'samesite'=>'Strict']);
if (PHP_SAPI !== 'cli' || !defined('NO_SESSION')) {
    $handler = null;
    $stage = 'session.driver';
    try{
        if(session_driver()==='postgres'){
            $stage = 'session.register';
            $handler = new PostgresSessionHandler();
            if (!session_set_save_handler($handler, true)) throw new RuntimeException();
            ini_set('session.gc_probability','1');ini_set('session.gc_divisor','100');
        }else session_save_path(ROOT.'/storage');
        $stage = 'session.start';
        if(!@session_start())throw new RuntimeException('Session unavailable');
    }catch(Throwable $error){
        if ($handler !== null && $stage === 'session.start') $stage = $handler->stage;
        $state = null;
        if ($error instanceof PDOException) {
            $code = (string)($error->errorInfo[0] ?? $error->getCode());
            if (preg_match('/^[A-Z0-9]{5}$/D', $code)) $state = $code;
            elseif (preg_match('/^SQLSTATE\[([A-Z0-9]{5})\]/', $error->getMessage(), $matches)) $state = $matches[1];
        }
        // SAPI logging also works when the serverless filesystem is read-only.
        error_log('bezakat.session stage='.$stage.' sqlstate='.($state ?? 'none'), 4);
        // No filesystem fallback on serverless and no connection details in the response.
        http_response_code(503);header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');echo '{"error":"Penyimpanan sesi belum siap. Periksa konfigurasi database dan SQL serverless."}';exit;
    }
}
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
header('Cache-Control: no-store');
$questions = json_decode(file_get_contents(__DIR__.'/questions.json'), true, 512, JSON_THROW_ON_ERROR);
$GLOBALS['reportSections'] = $questions['reportSections'];
$GLOBALS['exclusiveOptions'] = $questions['exclusiveOptions'];
$GLOBALS['monthNames'] = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
$GLOBALS['reviewReasons'] = ['Belum lengkap','Data tidak konsisten','Bukti tidak sesuai','Berkas tidak terbaca','Tautan tidak dapat diakses'];
require __DIR__.'/portal.php';
require __DIR__.'/render.php';
require __DIR__.'/contexts.php';

function json_response(mixed $data, int $status=200): never {
    if(session_status()===PHP_SESSION_ACTIVE&&!session_write_close())throw new PortalError(503,'Sesi belum berhasil disimpan.');
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR); exit;
}
function failure(Throwable $e): array {
    if ($e instanceof PortalError) return [$e->status, $e->getMessage()];
    $state = $e instanceof PDOException ? ($e->errorInfo[0] ?? (string)$e->getCode()) : '';
    return match($state) {
        '40001' => [409,'Draf sudah berubah di sesi lain. Buka ulang sebelum mengedit lagi.'],
        '23514' => [409,'Laporan terkunci atau periode belum tersedia untuk operasi ini.'],
        '42501' => [403,'Akun tidak mempunyai akses.'],
        default => [503,'Koneksi database belum siap atau operasi gagal. Periksa konfigurasi lokal; detail rahasia tidak ditampilkan.'],
    };
}
function request_body(): array {
    if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) throw new PortalError(415,'Gunakan JSON.');
    $raw = file_get_contents('php://input', false, null, 0, 240001);
    if (strlen($raw) > 240000) throw new PortalError(413,'Isian terlalu besar.');
    try { $v = json_decode($raw, true, 64, JSON_THROW_ON_ERROR); }
    catch (JsonException) { throw new PortalError(400,'JSON tidak valid.'); }
    if (!is_array($v) || !str_starts_with(ltrim($raw), '{')) throw new PortalError(400,'Isian tidak valid.');
    $structure=json_decode($raw);
    if(property_exists($structure,'answers')&&!($structure->answers instanceof stdClass))throw new PortalError(400,'Jawaban harus berupa objek JSON.');
    return $v;
}
function csrf(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function check_request(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $scheme = request_https() ? 'https' : 'http';
    if ($origin !== $scheme.'://'.($_SERVER['HTTP_HOST'] ?? '')) throw new PortalError(403,'Permintaan harus berasal dari website ini.');
    if (!hash_equals(csrf(), $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) throw new PortalError(403,'Sesi formulir berakhir. Muat ulang halaman.');
}
