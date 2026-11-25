<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$label = $props['label'] ?? null;
$value = $props['value'] ?? null;

extract(view_context('Info', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', ['class' => 'rounded-xl bg-slate-50 p-4'], [tag('dt', ['class' => 'text-[9px] font-bold uppercase tracking-wide text-slate-400'], [$label]),tag('dd', ['class' => 'mt-1 text-xs font-extrabold text-slate-700'], [$value])]);
