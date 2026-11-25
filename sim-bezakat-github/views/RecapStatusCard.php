<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$label = $props['label'] ?? null;
$value = $props['value'] ?? null;
$note = $props['note'] ?? null;
$tone = $props['tone'] ?? null;
$tones = ['emerald' => 'border-emerald-200 bg-emerald-50 text-emerald-800','terracotta' => 'border-orange-200 bg-orange-50 text-orange-800','rose' => 'border-rose-200 bg-rose-50 text-rose-800'];
$dots = ['emerald' => 'bg-emerald-600','terracotta' => 'bg-orange-600','rose' => 'bg-rose-600'];
extract(view_context('RecapStatusCard', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', ['class' => ('rounded-2xl border p-5 ' . jstr(jget($tones, $tone)) . '')], [tag('div', ['class' => 'flex items-center justify-between'], [tag('p', ['class' => 'text-[11px] font-extrabold'], [$label]),tag('span', ['class' => ('h-2.5 w-2.5 rounded-full ' . jstr(jget($dots, $tone)) . '')], [])]),tag('p', ['class' => 'mt-3 text-3xl font-extrabold'], [$value]),tag('p', ['class' => 'mt-1 text-[9px] opacity-70'], [$note])]);
