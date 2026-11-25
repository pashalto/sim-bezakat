<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$label = $props['label'] ?? null;
$status = $props['status'] ?? null;

extract(view_context('StatusColumn', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', [], [tag('p', ['class' => 'mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400'], [$label]),view('StatusPill', ['status' => $status,'children' => fragment([])])]);
