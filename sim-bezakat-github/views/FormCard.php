<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$title = $props['title'] ?? null;
$icon = $props['icon'] ?? null;
$children = $props['children'] ?? null;
$editable = $props['editable'] ?? false;

extract(view_context('FormCard', get_defined_vars()), EXTR_OVERWRITE);
return tag('section', ['class' => 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7'], [tag('div', ['class' => 'mb-6 flex items-center gap-3'], [tag('span', ['class' => 'grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700'], [view('Icon', ['name' => $icon,'class' => 'h-[18px] w-[18px]','children' => fragment([])])]),tag('h2', ['class' => 'text-sm font-extrabold'], [$title]),(jtruth($editable) ? tag('span', ['class' => 'ml-auto rounded-full bg-emerald-50 px-3 py-1 text-[8px] font-extrabold text-emerald-700'], ['Dapat diubah']) : null)]),$children]);
