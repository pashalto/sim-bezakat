<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$eyebrow = $props['eyebrow'] ?? null;
$title = $props['title'] ?? null;
$description = $props['description'] ?? null;
$action = $props['action'] ?? null;

extract(view_context('PageHeading', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', ['class' => 'mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end'], [tag('div', [], [tag('p', ['class' => 'text-xs font-extrabold text-emerald-700'], [$eyebrow]),tag('h1', ['class' => 'mt-2 text-2xl font-extrabold tracking-tight sm:text-[30px]'], [$title]),tag('p', ['class' => 'mt-2 max-w-3xl text-sm leading-6 text-slate-500'], [$description])]),$action]);
