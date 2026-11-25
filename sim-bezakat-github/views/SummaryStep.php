<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$period = $props['period'] ?? null;
$section = $props['section'] ?? null;
$confirmed = $props['confirmed'] ?? null;
$setConfirmed = $props['setConfirmed'] ?? null;
$setAnswer = $props['setAnswer'] ?? null;
$locked = $props['locked'] ?? null;
$question = jget(jget($section, 'questions'), 0);
extract(view_context('SummaryStep', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', [], [view('QuestionInput', ['question' => $question,'number' => 1,'value' => jget(jget($period, 'answers'), jget($question, 'id')),'disabled' => $locked,'otherValue' => '','children' => fragment([])]),tag('div', ['class' => 'mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5'], [tag('p', ['class' => 'text-xs font-extrabold text-slate-800'], ['Pemeriksaan kelengkapan']),tag('div', ['class' => 'mt-4 grid gap-2 sm:grid-cols-2'], [jmethod(jmethod($GLOBALS['reportSections'], 'slice', 0,(-1)), 'map', jfn(get_defined_vars(), function($__scope, $item = null) { extract($__scope, EXTR_SKIP); $count = helper('answeredInSection', $period,$item);
return tag('div', ['class' => 'flex items-center justify-between rounded-xl bg-white px-3 py-2.5'], [tag('span', ['class' => 'text-[10px] font-semibold text-slate-600'], [jget($item, 'label')]),tag('span', ['class' => ('flex items-center gap-1 text-[9px] font-extrabold ' . jstr((jtruth(($count > 0)) ? 'text-emerald-700' : 'text-amber-700')) . '')], [view('Icon', ['name' => (jtruth(($count > 0)) ? 'check' : 'clock'),'class' => 'h-3.5 w-3.5','children' => fragment([])]),(jtruth(($count > 0)) ? 'Terisi' : 'Belum terisi')])]); }))])]),tag('label', ['class' => 'mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold leading-5 text-emerald-900'], [tag('input', ['type' => 'checkbox','checked' => $confirmed,'class' => 'mt-0.5 h-4 w-4 accent-emerald-700'], []),'Saya menyatakan data yang diisi sesuai dengan kondisi dan kegiatan yang sebenarnya.'])]);
