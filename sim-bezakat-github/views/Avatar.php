<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$name = $props['name'] ?? null;
$size = $props['size'] ?? 'normal';

extract(view_context('Avatar', get_defined_vars()), EXTR_OVERWRITE);
return tag('span', ['class' => ('grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-amber-50 font-extrabold text-emerald-800 ' . jstr((jtruth(($size === 'small')) ? 'h-9 w-9 text-[10px]' : 'h-10 w-10 text-xs')) . '')], [helper('initials', $name)]);
