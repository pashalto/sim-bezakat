<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$label = $props['label'] ?? null;
$value = $props['value'] ?? null;
$type = $props['type'] ?? 'text';
$onChange = $props['onChange'] ?? null;

extract(view_context('ProfileField', get_defined_vars()), EXTR_OVERWRITE);
return tag('label', ['class' => (jtruth(($type === 'textarea')) ? 'sm:col-span-2' : '')], [tag('span', ['class' => 'mb-2 block text-[11px] font-bold text-slate-700'], [$label]),(jtruth(($type === 'textarea')) ? tag('textarea', ['rows' => 3,'class' => 'form-input resize-y','data-question' => isset($question) ? jget($question,'id') : null], [$value]) : tag('input', ['type' => $type,'value' => $value,'class' => 'form-input','data-question' => isset($question) ? jget($question,'id') : null], []))]);
