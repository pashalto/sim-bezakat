<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$icon = $props['icon'] ?? null;
$title = $props['title'] ?? null;
$description = $props['description'] ?? null;
$status = $props['status'] ?? null;
$action = $props['action'] ?? null;
$onClick = $props['onClick'] ?? null;

extract(view_context('ActionRow', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', ['class' => 'flex flex-col gap-4 rounded-xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/20 sm:flex-row sm:items-center'], [tag('span', ['class' => 'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500'], [view('Icon', ['name' => $icon,'children' => fragment([])])]),tag('div', ['class' => 'min-w-0 flex-1'], [tag('div', ['class' => 'flex flex-wrap items-center gap-2'], [tag('p', ['class' => 'text-xs font-extrabold text-slate-700'], [$title]),view('StatusPill', ['status' => $status,'children' => fragment([])])]),tag('p', ['class' => 'mt-1 text-[10px] text-slate-400'], [$description])]),tag('button', ['data-nav' => $target ?? null,'class' => 'flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-800 hover:text-white'], [$action,view('Icon', ['name' => 'arrow','class' => 'h-3.5 w-3.5','children' => fragment([])])])]);
