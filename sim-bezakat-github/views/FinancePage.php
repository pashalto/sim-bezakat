<?php
$period = $props['period'];
$categories = view_context('FinancePage', [])['categories'];
$preview = $GLOBALS['preview'] ?? false;
$open = $props['isActivePeriod'] ?? false;
$month = $period['month'];
$year = $period['year'];
ob_start(); ?>
<div class="min-w-0">
<?=view('PageHeading', [
    'eyebrow'=>'Keuangan · '.helper('periodLabel',$month,$year),
    'title'=>'Dokumen Keuangan',
    'description'=>'Unggah dokumen Excel atau PDF untuk periode ini.',
    'action'=>tag('div',['class'=>'rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600'],
        ['Tenggat 9 ',helper('periodLabel',$month % 12 + 1,$year + ($month === 12 ? 1 : 0)),' · 23.59 WIB'])
])?>
<div class="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
    <?=view('Icon',['name'=>'alert','class'=>'mt-0.5 h-5 w-5 shrink-0 text-amber-700'])?>
    <p class="text-[11px] leading-5 text-amber-800"><?= $preview ? 'Pratinjau hanya baca. Masuk sebagai awardee untuk mengunggah.' : 'Pilih satu berkas PDF, XLSX, atau XLS per kategori, maksimal 2 MiB. Tekan Unggah untuk menyimpan versinya.' ?></p>
</div>
<div class="grid gap-6 xl:grid-cols-2">
<?php foreach ($categories as $category):
    $doc = null;
    foreach ($period['financeDocuments'] as $item) if ($item['category'] === $category['key']) { $doc=$item; break; }
    $editable = !$preview && ($doc['status'] ?? '') !== 'approved'
        && (($period['reportStatus'] === 'draft' && $open) || $period['reportStatus'] === 'revision');
?>
<section data-finance-category="<?=h($category['key'])?>" data-finance-label="<?=h($category['title'])?>" class="rounded-2xl border bg-white p-5 shadow-sm sm:p-6 <?=($doc['status'] ?? '') === 'revision' ? 'border-rose-300' : 'border-slate-200'?>">
    <div class="flex items-start justify-between gap-4">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><?=view('Icon',['name'=>'wallet'])?></span>
        <?=view('StatusPill',['status'=>$doc['status'] ?? 'draft'])?>
    </div>
    <h2 class="mt-5 text-sm font-extrabold leading-6 text-slate-800"><?=h($category['title'])?></h2>
    <p class="mt-2 min-h-10 text-[11px] leading-5 text-slate-500"><?=h($category['description'])?></p>
    <?php if ($doc): ?>
    <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="truncate text-xs font-extrabold text-slate-700"><?=h($doc['name'])?></p>
        <p class="mt-1 text-[10px] text-slate-500">Versi <?=h($doc['version'] ?? 1)?> · <?=h(helper('formatFileSize',$doc['size']))?> · <?=h(helper('formatDateTime',$doc['uploadedAt']))?></p>
        <?php if (!empty($doc['reason'])): ?><p class="mt-2 text-xs text-rose-700"><?=h($doc['reason'])?></p><?php endif ?>
        <?=view('FinanceDownload',['document'=>$doc])?>
    </div>
    <?php endif; if ($editable): ?>
    <form data-finance-upload data-category="<?=h($category['key'])?>" data-period="<?=h($period['id'])?>" data-document-id="<?=h($doc['id'] ?? '')?>" data-document-name="<?=h($doc['name'] ?? '')?>">
        <label class="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center hover:border-emerald-300">
            <?=view('Icon',['name'=>'upload','class'=>'h-6 w-6 text-emerald-700'])?>
            <span class="mt-3 text-xs font-extrabold text-slate-700" data-file-name><?=$doc ? 'Pilih berkas pengganti' : 'Pilih dokumen'?></span>
            <span class="mt-1 text-[10px] text-slate-500">PDF atau Excel · Maksimal 2 MiB</span>
            <input class="sr-only" type="file" required accept=".pdf,.xlsx,.xls" aria-label="Pilih berkas untuk <?=h($category['title'])?>">
        </label>
        <div class="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" data-finance-delete <?=!$doc ? 'disabled' : ''?> class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Hapus</button>
            <button type="submit" data-finance-submit disabled class="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50">Unggah</button>
        </div>
        <p role="status" class="mt-2 text-xs font-semibold text-slate-700"></p>
    </form>
    <?php elseif (!$doc || !$preview): ?>
    <p class="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500"><?=$doc ? 'Penggantian berkas terkunci.' : 'Belum ada dokumen. Unggahan terkunci untuk laporan ini.'?></p>
    <?php endif ?>
</section>
<?php endforeach ?>
</div>
<dialog data-finance-delete-dialog aria-labelledby="finance-delete-title" aria-describedby="finance-delete-description" class="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
    <h2 id="finance-delete-title" class="text-base font-extrabold">Hapus Dokumen?</h2>
    <p id="finance-delete-description" class="mt-2 text-sm leading-6 text-slate-600">Apakah Anda yakin ingin menghapus dokumen ini? Anda perlu mengunggah ulang apabila dokumen masih diperlukan.</p>
    <dl class="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
        <dt class="font-extrabold">Nama dokumen</dt><dd data-finance-delete-name class="mt-1 break-words"></dd>
        <dt class="mt-3 font-extrabold">Jenis dokumen</dt><dd data-finance-delete-kind class="mt-1"></dd>
    </dl>
    <p data-finance-delete-error role="alert" class="mt-3 text-xs font-semibold text-rose-700" hidden></p>
    <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" data-finance-cancel autofocus class="rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600">Batal</button>
        <button type="button" data-finance-confirm class="rounded-xl bg-rose-700 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">Hapus Dokumen</button>
    </div>
</dialog></div>
<?php return new Html(ob_get_clean());
