<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$icon = $props['icon'] ?? null;
$label = $props['label'] ?? null;
$value = $props['value'] ?? null;
$note = $props['note'] ?? null;
$tone = $props['tone'] ?? null;
$compact = $props['compact'] ?? false;
$tones = ['emerald' => 'bg-emerald-50 text-emerald-700','amber' => 'bg-amber-50 text-amber-700','rose' => 'bg-rose-50 text-rose-700','slate' => 'bg-slate-100 text-slate-600'];
extract(view_context('DashboardStat', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', ['class' => 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'], [tag('div', ['class' => 'flex items-start justify-between gap-3'], [tag('div', [], [tag('p', ['class' => 'text-[11px] font-semibold text-slate-500'], [$label]),tag('p', ['class' => ('mt-3 font-extrabold tracking-tight text-slate-900 ' . jstr((jtruth($compact) ? 'text-lg' : 'text-2xl')) . '')], [$value]),tag('p', ['class' => 'mt-1 text-[10px] text-slate-400'], [$note])]),tag('span', ['class' => ('grid h-10 w-10 shrink-0 place-items-center rounded-xl ' . jstr(jget($tones, $tone)) . '')], [view('Icon', ['name' => $icon,'class' => 'h-[18px] w-[18px]','children' => fragment([])])])])]);
