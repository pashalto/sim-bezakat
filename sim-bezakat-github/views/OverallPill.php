<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$status = $props['status'] ?? null;
$label = (jtruth(($status === 'incomplete')) ? 'Belum lengkap' : (jtruth(($status === 'approved')) ? 'Disetujui' : (jtruth(($status === 'revision')) ? 'Perlu perbaikan' : (jtruth(($status === 'rejected')) ? 'Ditolak' : (jtruth(($status === 'draft')) ? 'Belum dikirim' : 'Dalam proses')))));
$tone = (jtruth(($status === 'approved')) ? 'bg-emerald-100 text-emerald-800' : (jtruth(($status === 'revision')) ? 'bg-rose-100 text-rose-800' : (jtruth(($status === 'rejected')) ? 'bg-slate-900 text-white' : (jtruth(($status === 'incomplete')) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'))));
extract(view_context('OverallPill', get_defined_vars()), EXTR_OVERWRITE);
return tag('span', ['class' => ('w-fit rounded-full px-3 py-1.5 text-[9px] font-extrabold ' . jstr($tone) . '')], [$label]);
