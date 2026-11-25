<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$onBack = $props['onBack'] ?? null;

extract(view_context('AccessDenied', get_defined_vars()), EXTR_OVERWRITE);
return tag('div', ['class' => 'grid min-h-[65vh] place-items-center'], [tag('div', ['class' => 'max-w-md text-center'], [tag('span', ['class' => 'mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-700'], [view('Icon', ['name' => 'lock','class' => 'h-7 w-7','children' => fragment([])])]),tag('h1', ['class' => 'mt-5 text-2xl font-extrabold'], ['Akses tidak diizinkan']),tag('p', ['class' => 'mt-2 text-sm leading-6 text-slate-500'], ['Akun ini tidak memiliki izin untuk membuka halaman tersebut.']),tag('button', ['data-action' => 'back','class' => 'mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-extrabold text-white'], ['Kembali ke Dashboard'])])]);
