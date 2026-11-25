<?php
// Original printable report, rendered by PHP.
$period=$props['period'];$profile=$props['profile'];
$reportProfile = (jget($period, 'profileSnapshot') ?? $profile);
$identityRows = [['Nama lengkap',jget($reportProfile, 'fullName')],['Tempat, tanggal lahir',('' . jstr((jtruth(jget($reportProfile, 'birthPlace')) ? jget($reportProfile, 'birthPlace') : '—')) . ', ' . jstr((jtruth(jget($reportProfile, 'birthDate')) ? jget($reportProfile, 'birthDate') : '—')) . '')],['Jenis kelamin',jget($reportProfile, 'gender')],['Alamat sesuai identitas',jget($reportProfile, 'identityAddress')],['Jenis domisili',jget($reportProfile, 'domicileType')],['Alamat domisili',jget($reportProfile, 'domicileAddress')],['Nama orang tua/wali',jget($reportProfile, 'guardianName')],['Kontak orang tua/wali',jget($reportProfile, 'guardianContact')],['Media sosial',jget($reportProfile, 'socialMedia')]];
$studentRows = [['Perguruan tinggi',jget($reportProfile, 'university')],['Program studi',jget($reportProfile, 'studyProgram')],['Nomor induk mahasiswa',jget($reportProfile, 'studentNumber')],['Nomor registrasi BeZakat',jget($reportProfile, 'registrationNumber')],['Lembaga penyantun',jget($reportProfile, 'sponsor')],['Status beasiswa',jget($reportProfile, 'scholarshipStatus')],['Indeks prestasi',('' . jstr(jget($reportProfile, 'gpaType')) . ' ' . jstr((jtruth(jget($reportProfile, 'gpaValue')) ? jget($reportProfile, 'gpaValue') : '—')) . '')],['Periode indeks prestasi',jget($reportProfile, 'gpaSemester')],['Riwayat indeks prestasi',(jtruth(jlen(jget($reportProfile, 'gpaHistory'))) ? jmethod(jmethod(jget($reportProfile, 'gpaHistory'), 'map', jfn(get_defined_vars(), function($__scope, $item = null, $index = null) { extract($__scope, EXTR_SKIP); return ('S' . jstr(jadd($index,1)) . ': ' . jstr((jtruth($item) ? $item : '—')) . ''); })), 'join', ' · ') : '—')]];
$renderRows = jfn(get_defined_vars(), function($__scope, $rows = null) { extract($__scope, EXTR_SKIP); return jmethod(jmethod($rows, 'map', jfn(get_defined_vars(), function($__scope, $__arg0 = null, $index = null) { extract($__scope, EXTR_SKIP); $label = $__arg0[0] ?? null;$value = $__arg0[1] ?? null;return ('<tr><td class="row-number">' . jstr(jadd($index,1)) . '</td><th>' . jstr(helper('escapePdfText', $label)) . '</th><td>' . jstr(helper('pdfValue', $value)) . '</td></tr>'); })), 'join', ''); });
$summarySection = jmethod($GLOBALS['reportSections'], 'find', jfn(get_defined_vars(), function($__scope, $section = null) { extract($__scope, EXTR_SKIP); return (jget($section, 'key') === 'ringkasan'); }));
$assessmentSections = jmethod($GLOBALS['reportSections'], 'filter', jfn(get_defined_vars(), function($__scope, $section = null) { extract($__scope, EXTR_SKIP); return (jget($section, 'key') !== 'ringkasan'); }));
$summaryQuestion = jget(jget($summarySection, 'questions'), 0);
$summaryIssue = jget(jmethod(jget(jget(jget($period, 'sectionReviews'), 'ringkasan'), 'issues'), 'find', jfn(get_defined_vars(), function($__scope, $item = null) { extract($__scope, EXTR_SKIP); return (jget($item, 'questionId') === jget($summaryQuestion, 'id')); })), 'reason');
$sectionLetters = ['D','E','F','G','H','I','J'];
$assessmentHtml = jmethod(jmethod($assessmentSections, 'map', jfn(get_defined_vars(), function($__scope, $section = null, $sectionIndex = null) { extract($__scope, EXTR_SKIP); $review = jget(jget($period, 'sectionReviews'), jget($section, 'key'));
return ('<section class="report-section">
      <div class="section-heading">
        <span>' . jstr(jget($sectionLetters, $sectionIndex)) . '.</span>
        <div><h2>' . jstr(helper('escapePdfText', jmethod(jget($section, 'label'), 'toUpperCase'))) . '</h2><p>' . jstr(helper('escapePdfText', jget($section, 'description'))) . '</p></div>
        <span class="section-status">' . jstr(helper('escapePdfText', helper('statusLabel', (jget($review, 'status') ?? 'draft')))) . '</span>
      </div>
      <div class="question-list">' . jstr(jmethod(jmethod(jget($section, 'questions'), 'map', jfn(get_defined_vars(), function($__scope, $question = null, $questionIndex = null) { extract($__scope, EXTR_SKIP); $issue = jget(jmethod(jget($review, 'issues'), 'find', jfn(get_defined_vars(), function($__scope, $item = null) { extract($__scope, EXTR_SKIP); return (jget($item, 'questionId') === jget($question, 'id')); })), 'reason');
return helper('renderPdfQuestion', $question,jget(jget($period, 'answers'), jget($question, 'id')),('' . jstr(jget($sectionLetters, $sectionIndex)) . '.' . jstr(jadd($questionIndex,1)) . ''),$issue); })), 'join', '')) . '</div>
    </section>'); })), 'join', '');
$activities = (jtruth(jlen(jget($period, 'activities'))) ? jmethod(jmethod(jget($period, 'activities'), 'map', jfn(get_defined_vars(), function($__scope, $activity = null, $index = null) { extract($__scope, EXTR_SKIP); return ('<tr>
        <td class="row-number">' . jstr(jadd($index,1)) . '</td>
        <td><strong>' . jstr(helper('escapePdfText', jget($activity, 'name'))) . '</strong><br><span class="muted">' . jstr(helper('escapePdfText', jget($activity, 'type'))) . ' · ' . jstr(helper('escapePdfText', jget($activity, 'role'))) . '</span></td>
        <td>' . jstr(helper('pdfValue', jget($activity, 'description'))) . '</td>
        <td>' . jstr(helper('pdfValue', jget($activity, 'evidence'))) . '</td>
      </tr>'); })), 'join', '') : '<tr><td colspan="4" class="empty">Tidak ada kegiatan organisasi atau kepanitiaan.</td></tr>');
$finance = (jtruth(jlen(jget($period, 'financeDocuments'))) ? jmethod(jmethod(jget($period, 'financeDocuments'), 'map', jfn(get_defined_vars(), function($__scope, $document = null, $index = null) { extract($__scope, EXTR_SKIP); return ('<tr>
        <td class="row-number">' . jstr(jadd($index,1)) . '</td>
        <td>' . jstr(helper('escapePdfText', (jtruth((jget($document, 'category') === 'current')) ? 'Realisasi bulan berjalan' : 'Rencana bulan berikutnya'))) . '</td>
        <td>' . jstr(helper('escapePdfText', jget($document, 'name'))) . '<br><span class="muted">' . jstr(helper('escapePdfText', helper('formatFileSize', jget($document, 'size')))) . ' · diunggah ' . jstr(helper('escapePdfText', helper('formatDateTime', jget($document, 'uploadedAt')))) . '</span></td>
        <td><span class="document-status">' . jstr(helper('escapePdfText', helper('statusLabel', jget($document, 'status')))) . '</span>' . jstr((jtruth(jget($document, 'reason')) ? ('<div class="review-note compact"><strong>Catatan:</strong> ' . jstr(helper('escapePdfText', jget($document, 'reason'))) . '</div>') : '')) . '</td>
      </tr>'); })), 'join', '') : '<tr><td colspan="4" class="empty">Belum ada dokumen keuangan.</td></tr>');
$history = (jtruth(jlen(jget($period, 'reviewHistory'))) ? jmethod(jmethod(jget($period, 'reviewHistory'), 'map', jfn(get_defined_vars(), function($__scope, $event = null, $index = null) { extract($__scope, EXTR_SKIP); return ('<tr>
        <td class="row-number">' . jstr(jadd($index,1)) . '</td>
        <td>' . jstr(helper('escapePdfText', helper('formatDateTime', jget($event, 'date')))) . '</td>
        <td>' . jstr(helper('escapePdfText', jget($event, 'actor'))) . '</td>
        <td>' . jstr(helper('escapePdfText', jget($event, 'text'))) . '</td>
      </tr>'); })), 'join', '') : '<tr><td colspan="4" class="empty">Belum ada riwayat pemeriksaan.</td></tr>');
$exportedStatus = helper('overallStatus', $period);
$exportedStatusLabel = (jtruth(($exportedStatus === 'incomplete')) ? 'Belum lengkap' : helper('statusLabel', $exportedStatus));
$photoUrl = helper('safePdfPhotoUrl', jget($profile, 'photoUrl'));
$photo = (jtruth($photoUrl) ? ('<img class="profile-photo" src="' . jstr(helper('escapePdfText', $photoUrl)) . '" alt="Foto terbaru ' . jstr(helper('escapePdfText', jget($reportProfile, 'fullName'))) . '">') : '<div class="photo-placeholder"><span>FOTO TERBARU</span><small>Belum tersedia</small></div>');
$submittedAt = (jtruth(jget($period, 'submittedAt')) ? helper('formatDateTime', jget($period, 'submittedAt')) : 'Belum dikirim');
$generatedAt=helper('longDateTime');
return new Html(('<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>SIM-BEZAKAT · ' . jstr(helper('escapePdfText', helper('periodLabel', jget($period, 'month'),jget($period, 'year')))) . '</title>
<style>
@page{size:A4;margin:14mm 14mm 16mm}*{box-sizing:border-box}html{background:#edf3f0}body{width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:#17251f;font-family:Arial,Helvetica,sans-serif;font-size:9.2pt;line-height:1.45;padding:14mm}
h1,h2,p{margin:0}.document-header{border-top:8px solid #126448;border-bottom:2px solid #126448;padding:12px 0 10px;text-align:center}.kicker{font-size:8pt;font-weight:700;letter-spacing:1.8px;color:#126448}.document-header h1{max-width:150mm;margin:6px auto 3px;font-size:17pt;line-height:1.25}.period-title{font-size:11pt;font-weight:700;color:#3c554b}
.cover-grid{display:grid;grid-template-columns:38mm 1fr;gap:12mm;align-items:center;margin:16mm 0 10mm}.profile-photo,.photo-placeholder{width:38mm;height:50mm;border:1.5px solid #126448}.profile-photo{display:block;object-fit:cover}.photo-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f2f7f4;color:#507066;font-weight:700;letter-spacing:.7px}.photo-placeholder small{margin-top:5px;font-size:7pt;font-weight:400;letter-spacing:0}.cover-name{font-size:19pt;line-height:1.2;color:#103e2f}.cover-registration{margin-top:5px;font-size:10pt;color:#52665e}.cover-meta{display:grid;grid-template-columns:42mm 1fr;margin-top:12px;border-top:1px solid #cbd8d2}.cover-meta dt,.cover-meta dd{margin:0;padding:5px 0;border-bottom:1px solid #cbd8d2}.cover-meta dt{font-weight:700}.status-pill{display:inline-block;border:1px solid #126448;background:#e7f3ed;color:#126448;padding:2px 7px;font-weight:700;text-transform:uppercase;font-size:7.5pt}
.document-note{margin:8mm 0 12mm;padding:7px 9px;border-left:3px solid #126448;background:#f2f7f4;color:#40564d;font-size:8pt}.section-heading{display:grid;grid-template-columns:8mm 1fr auto;gap:2mm;align-items:start;margin:8mm 0 3mm;padding:6px 7px;background:#126448;color:#fff;break-after:avoid}.section-heading>span:first-child,.section-heading h2{font-size:10.5pt;font-weight:700}.section-heading p{margin-top:2px;font-size:7.5pt;color:#dcece5}.section-status{align-self:center;border:1px solid #bad8ca;padding:2px 5px;font-size:7pt;font-weight:700;text-transform:uppercase}
table{width:100%;border-collapse:collapse}.form-table tr,.evidence-table tr{break-inside:avoid}.form-table th,.form-table td,.evidence-table th,.evidence-table td{border:1px solid #8ca39a;padding:5px 6px;text-align:left;vertical-align:top}.form-table th{width:35%;background:#eef5f1;font-weight:700}.row-number{width:8mm!important;text-align:center!important;background:#f7faf8!important;font-weight:700}.evidence-table thead th{background:#dcece5;color:#153e31}.evidence-table .empty{text-align:center;padding:12px;color:#64776f}.muted{color:#64776f;font-size:7.5pt}
.question-list{border:1px solid #8ca39a;border-bottom:0}.question{padding:7px 8px;border-bottom:1px solid #8ca39a;break-inside:avoid}.question-title{display:flex;gap:5px;font-weight:700}.question-number{min-width:11mm;color:#126448}.hint{margin:3px 0 0 13mm;color:#687b73;font-size:7.5pt;font-style:italic}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px;margin:6px 0 0 13mm}.choice{display:flex;align-items:flex-start;gap:4px}.box{font-family:"Arial Unicode MS","Segoe UI Symbol",Arial,sans-serif;color:#126448;font-size:11pt;line-height:1}.narrative{min-height:13mm;margin:6px 0 0 13mm;padding:6px 7px;border:1px solid #b7c8c0;background:#fbfcfb;white-space:pre-wrap}.review-note{margin:6px 0 0 13mm;padding:5px 7px;border-left:3px solid #b42318;background:#fff0ee;color:#7a271a;font-size:8pt}.review-note.compact{margin:4px 0 0;padding:4px 5px}.summary-box{min-height:28mm;padding:9px;border:1px solid #8ca39a;background:#fbfcfb;white-space:pre-wrap}.summary-meta{display:flex;gap:14px;margin-top:5px;color:#52665e;font-size:7.5pt}
.signoff{display:grid;grid-template-columns:1fr 58mm;gap:12mm;margin-top:10mm;break-inside:avoid}.signoff-note{color:#52665e;font-size:8pt}.signature{text-align:center}.signature-space{height:20mm}.footer{margin-top:12mm;padding-top:5px;border-top:1px solid #9eb0a8;color:#667970;font-size:7pt;text-align:center}
.no-print{position:fixed;z-index:10;right:18px;top:18px;padding:11px 16px;border:0;border-radius:7px;background:#126448;color:#fff;font-weight:700;box-shadow:0 6px 18px #0003;cursor:pointer}
@media print{html,body{background:#fff}body{width:auto;min-height:0;margin:0;padding:0}.no-print{display:none}.report-section{break-before:auto}.section-heading{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<button class="no-print" onclick="window.print()">Simpan sebagai PDF</button>
<header class="document-header">
  <p class="kicker">SISTEM INFORMASI MANAJEMEN BEASISWA ZAKAT INDONESIA</p>
  <h1>LAPORAN ASESMEN BULANAN<br>PENERIMA BEASISWA ZAKAT INDONESIA</h1>
  <p class="period-title">Periode ' . jstr(helper('escapePdfText', helper('periodLabel', jget($period, 'month'),jget($period, 'year')))) . '</p>
</header>
<section class="cover-grid">
  ' . jstr($photo) . '
  <div>
    <p class="kicker">IDENTITAS PENERIMA BEASISWA</p>
    <h2 class="cover-name">' . jstr(helper('escapePdfText', jget($reportProfile, 'fullName'))) . '</h2>
    <p class="cover-registration">' . jstr(helper('escapePdfText', jget($reportProfile, 'registrationNumber'))) . ' · ' . jstr(helper('escapePdfText', jget($reportProfile, 'university'))) . '</p>
    <dl class="cover-meta">
      <dt>Periode asesmen</dt><dd>' . jstr(helper('escapePdfText', helper('periodLabel', jget($period, 'month'),jget($period, 'year')))) . '</dd>
      <dt>Tanggal pengiriman</dt><dd>' . jstr(helper('escapePdfText', $submittedAt)) . '</dd>
      <dt>Status laporan</dt><dd><span class="status-pill">' . jstr(helper('escapePdfText', $exportedStatusLabel)) . '</span></dd>
      <dt>Dana diterima</dt><dd>' . jstr((jtruth((jget($period, 'allowanceReceived') === null)) ? '—' : (jtruth(jget($period, 'allowanceReceived')) ? 'Ya' : 'Tidak'))) . '</dd>
    </dl>
  </div>
</section>
<p class="document-note">Dokumen ini memuat data profil, jawaban asesmen, bukti kegiatan, laporan keuangan, serta hasil pemeriksaan koordinator sesuai data yang tersimpan pada SIM-BEZAKAT.</p>

<section>
  <div class="section-heading"><span>A.</span><div><h2>IDENTITAS DIRI</h2><p>Data pribadi penerima Beasiswa Zakat Indonesia</p></div></div>
  <table class="form-table"><tbody>' . jstr(($renderRows)($identityRows)) . '</tbody></table>
</section>
<section>
  <div class="section-heading"><span>B.</span><div><h2>DATA KEMAHASISWAAN</h2><p>Data akademik dan kepesertaan program beasiswa</p></div></div>
  <table class="form-table"><tbody>' . jstr(($renderRows)($studentRows)) . '</tbody></table>
</section>
<section>
  <div class="section-heading"><span>C.</span><div><h2>KABAR BULAN INI</h2><p>Ringkasan asesmen penerima beasiswa pada periode pelaporan</p></div><span class="section-status">' . jstr(helper('escapePdfText', helper('statusLabel', (jget(jget(jget($period, 'sectionReviews'), 'ringkasan'), 'status') ?? 'draft')))) . '</span></div>
  <div class="summary-box">' . jstr((jtruth($summaryQuestion) ? helper('pdfValue', jget(jget($period, 'answers'), jget($summaryQuestion, 'id'))) : '—')) . '</div>
  ' . jstr((jtruth($summaryIssue) ? ('<div class="review-note"><strong>Catatan pemeriksa:</strong> ' . jstr(helper('escapePdfText', $summaryIssue)) . '</div>') : '')) . '
  <div class="summary-meta"><span>Periode: ' . jstr(helper('escapePdfText', helper('periodLabel', jget($period, 'month'),jget($period, 'year')))) . '</span><span>Status: ' . jstr(helper('escapePdfText', $exportedStatusLabel)) . '</span></div>
</section>

' . jstr($assessmentHtml) . '

<section>
  <div class="section-heading"><span>K.</span><div><h2>RINCIAN AKTIVITAS ORGANISASI</h2><p>Kegiatan, peran, deskripsi, dan bukti pendukung</p></div></div>
  <table class="evidence-table"><thead><tr><th>No.</th><th>Kegiatan & peran</th><th>Uraian</th><th>Bukti</th></tr></thead><tbody>' . jstr($activities) . '</tbody></table>
</section>
<section>
  <div class="section-heading"><span>L.</span><div><h2>LAPORAN KEUANGAN & LAMPIRAN</h2><p>Dokumen realisasi dan rencana penggunaan dana</p></div></div>
  <table class="evidence-table"><thead><tr><th>No.</th><th>Kategori</th><th>Dokumen</th><th>Hasil pemeriksaan</th></tr></thead><tbody>' . jstr($finance) . '</tbody></table>
</section>
<section>
  <div class="section-heading"><span>M.</span><div><h2>HASIL & RIWAYAT PEMERIKSAAN</h2><p>Jejak keputusan dan catatan koordinator</p></div><span class="section-status">' . jstr(helper('escapePdfText', $exportedStatusLabel)) . '</span></div>
  <table class="evidence-table"><thead><tr><th>No.</th><th>Waktu</th><th>Pemeriksa</th><th>Catatan/keputusan</th></tr></thead><tbody>' . jstr($history) . '</tbody></table>
</section>
<section class="signoff">
  <p class="signoff-note">Laporan ini dihasilkan secara elektronik dari SIM-BEZAKAT. Status dan catatan pemeriksaan pada dokumen mengikuti data terakhir saat ekspor.</p>
  <div class="signature"><p>' . jstr(helper('escapePdfText', helper('longDate'))) . '</p><p>Koordinator Awardee</p><div class="signature-space"></div><p><strong>( .................................... )</strong></p></div>
</section>
<p class="footer">Dokumen SIM-BEZAKAT · Diekspor pada ' . jstr(helper('escapePdfText', $generatedAt)) . ' · ' . jstr(helper('escapePdfText', jget($reportProfile, 'registrationNumber'))) . '</p>
</body></html>'));
