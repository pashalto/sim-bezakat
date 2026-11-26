<?php
if ($GLOBALS['preview'] ?? false) return fragment([]);
return tag('button', [
    'type'=>'button','data-finance-download'=>$props['document']['id'],
    'class'=>'mt-3 text-xs font-extrabold text-emerald-700',
], ['Unduh berkas']);
