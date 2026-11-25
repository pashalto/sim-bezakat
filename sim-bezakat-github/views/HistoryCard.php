<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$events = $props['events'] ?? null;

extract(view_context('HistoryCard', get_defined_vars()), EXTR_OVERWRITE);
return tag('section', ['class' => 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'], [tag('h2', ['class' => 'text-xs font-extrabold'], ['Riwayat Pemeriksaan']),tag('div', ['class' => 'mt-5 space-y-5'], [(jtruth(jlen($events)) ? jmethod($events, 'map', jfn(get_defined_vars(), function($__scope, $event = null, $index = null) { extract($__scope, EXTR_SKIP); return tag('div', ['class' => 'flex gap-3'], [tag('span', ['class' => 'mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600 ring-4 ring-emerald-50'], []),tag('div', [], [tag('p', ['class' => 'text-[10px] font-bold leading-4 text-slate-700'], [jget($event, 'text')]),tag('p', ['class' => 'mt-1 text-[9px] text-slate-400'], [jget($event, 'actor'),' · ',helper('formatDateTime', jget($event, 'date'))])])]); })) : tag('p', ['class' => 'text-[10px] text-slate-400'], ['Belum ada riwayat.']))])]);
