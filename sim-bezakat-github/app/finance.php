<?php
declare(strict_types=1);

const FINANCE_LIMIT = 2097152;

// Inspect only the workbook manifest. The portal never extracts the archive or reads cell data.
function finance_xlsx(string $bytes): bool {
    if (!str_starts_with($bytes, "PK\x03\x04")) return false;
    if (!class_exists(PharData::class) || !function_exists('simplexml_load_string')) {
        throw new PortalError(503, 'Pemeriksaan XLSX memerlukan ekstensi PHP Phar dan SimpleXML.');
    }
    $dir = sys_get_temp_dir().'/bezakat-'.bin2hex(random_bytes(16));
    if (!mkdir($dir, 0700)) throw new PortalError(503, 'Pemeriksaan Excel belum tersedia. Coba lagi.');
    $file = $dir.'/book.zip';
    try {
        if (file_put_contents($file, $bytes) !== strlen($bytes)) {
            throw new PortalError(503, 'Pemeriksaan Excel belum tersedia. Coba lagi.');
        }
        try {
            $archive = new PharData($file);
            if (!isset($archive['xl/workbook.xml'], $archive['[Content_Types].xml'])) return false;
            $manifest = $archive['[Content_Types].xml'];
            if ($manifest->getSize() > 131072) return false;
            $xml = simplexml_load_string($manifest->getContent(), SimpleXMLElement::class, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
            if (!$xml) return false;
            $xml->registerXPathNamespace('ct', 'http://schemas.openxmlformats.org/package/2006/content-types');
            return (bool)$xml->xpath('/ct:Types/ct:Override[@PartName="/xl/workbook.xml" and @ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"]');
        } catch (Exception) {
            return false;
        }
    } finally {
        $opened = isset($archive);
        unset($manifest, $archive);
        if ($opened) Phar::unlinkArchive($file);
        if (is_file($file)) unlink($file);
        rmdir($dir);
    }
}

function finance_xls(string $bytes): bool {
    if (strlen($bytes) < 512 || !str_starts_with($bytes, "\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
        || substr($bytes, 28, 2) !== "\xfe\xff") return false;
    $shift = unpack('v', substr($bytes, 30, 2))[1];
    if (!in_array($shift, [9, 12], true)) return false;
    // Workbook/Book is a named stream in an Excel compound-file directory.
    foreach (['Workbook','Book'] as $name) {
        $pattern = mb_convert_encoding($name."\0", 'UTF-16LE', 'UTF-8');
        $pos = 1 << $shift;
        while (($pos = strpos($bytes, $pattern, $pos)) !== false) {
            if ($pos % 128 === 0 && substr($bytes, $pos + 64, 3) === pack('vC', strlen($pattern), 2)) return true;
            $pos++;
        }
    }
    return false;
}

function finance_mime(string $name, string $bytes): string {
    if ($bytes === '' || strlen($bytes) > FINANCE_LIMIT) throw new PortalError(413, 'Berkas harus berisi data dan maksimal 2 MiB.');
    if ($name === '' || strlen($name) > 240 || preg_match('~[[:cntrl:]/\\\\]~u', $name)) throw new PortalError(422, 'Nama berkas tidak valid.');
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if ($ext === 'pdf' && preg_match('/^%PDF-\d\.\d\b/', $bytes) && preg_match('/%%EOF\s*$/D', substr($bytes,-1024))) return 'application/pdf';
    if ($ext === 'xlsx' && finance_xlsx($bytes)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if ($ext === 'xls' && finance_xls($bytes)) return 'application/vnd.ms-excel';
    throw new PortalError(415, 'Isi dan ekstensi harus sesuai dengan berkas PDF, Excel .xlsx, atau Excel .xls.');
}

function finance_upload(array $user): never {
    if ($user['role'] !== 'awardee') throw new PortalError(403, 'Hanya awardee yang dapat mengunggah dokumen.');
    // A text envelope also survives the serverless PHP bridge in both directions.
    $input = request_body(2801000);
    $period = $input['periodId'] ?? null;
    $category = $input['category'] ?? null;
    $name = $input['name'] ?? null;
    $content = $input['content'] ?? null;
    if (!is_string($period) || !preg_match('/^-?\d{1,18}$/D', $period) ||
        !in_array($category,['current','next'],true) || !is_string($name) || !is_string($content)) {
        throw new PortalError(422, 'Periode, kategori, atau berkas tidak valid.');
    }
    $bytes = base64_decode($content, true);
    if ($bytes === false) throw new PortalError(422, 'Berkas tidak dapat dibaca. Pilih kembali berkas.');
    $mime = finance_mime($name, $bytes);
    $result = query_one("SELECT * FROM sim_bezakat.portal_unggah_keuangan(?,?,?,?,?,decode(?,'base64'))",
        [$user['id'],$period,$category === 'current' ? 'periode_berjalan' : 'rencana_berikutnya',$name,$mime,$content]);
    json_response($result, 201);
}

function finance_download(array $user): never {
    $id = $_GET['id'] ?? null;
    if (!is_string($id) || !preg_match('/^-?\d{1,18}$/D', $id)) throw new PortalError(404, 'Dokumen tidak tersedia.');
    $file = query_one('SELECT * FROM sim_bezakat.portal_unduh_keuangan(?,?)', [$user['id'],$id]);
    if (!$file) throw new PortalError(404, 'Isi berkas belum tersedia atau dokumen berada di luar cakupan akun.');
    json_response($file);
}


function finance_delete_input(array $input): array {
    if (array_diff(array_keys($input), ['periodId','category','documentId']) ||
        !is_string($input['periodId'] ?? null) || !preg_match('/^-?\d{1,18}$/D', $input['periodId']) ||
        !is_string($input['documentId'] ?? null) || !preg_match('/^-?\d{1,18}$/D', $input['documentId']) ||
        !in_array($input['category'] ?? null, ['current','next'], true)) {
        throw new PortalError(422, 'Periode, jenis, atau identitas dokumen tidak valid.');
    }
    return $input;
}

function finance_delete(array $user): never {
    if ($user['role'] !== 'awardee') throw new PortalError(403, 'Hanya awardee dapat menghapus dokumen miliknya.');
    $input = finance_delete_input(request_body());
    try {
        $result = query_one('SELECT * FROM sim_bezakat.portal_hapus_keuangan(?,?,?,?)',
            [$user['id'], $input['periodId'], $input['category'] === 'current' ? 'periode_berjalan' : 'rencana_berikutnya', $input['documentId']]);
    } catch (PDOException $error) {
        $state = $error->errorInfo[0] ?? (string)$error->getCode();
        if ($state === '40001') throw new PortalError(409, 'Dokumen sudah berubah. Muat ulang kartu sebelum menghapus.');
        if ($state === '23514') throw new PortalError(409, 'Dokumen tidak dapat dihapus: laporan/periode terkunci atau dokumen sudah disetujui.');
        throw $error;
    }
    json_response(['id'=>$result['id'], 'category'=>$input['category'], 'historyRetained'=>db_bool($result['history_retained'])]);
}
