<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$status = $props['status'] ?? null;
$tones = ['draft' => 'bg-slate-100 text-slate-600','submitted' => 'bg-amber-50 text-amber-700','review' => 'bg-violet-50 text-violet-700','revision' => 'bg-rose-50 text-rose-700','approved' => 'bg-emerald-50 text-emerald-700','rejected' => 'bg-slate-900 text-white'];
extract(view_context('StatusPill', get_defined_vars()), EXTR_OVERWRITE);
return tag('span', ['data-status' => true,'class' => ('w-fit rounded-full px-2.5 py-1 text-[8px] font-extrabold ' . jstr(jget($tones, $status)) . '')], [helper('statusLabel', $status)]);
