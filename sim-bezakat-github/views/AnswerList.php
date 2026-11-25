<?php
// Imported original markup; native PHP rendering. Edit this view freely.
$period = $props['period'] ?? null;
$section = $props['section'] ?? null;

extract(view_context('AnswerList', get_defined_vars()), EXTR_OVERWRITE);
return tag('dl', ['class' => 'space-y-4'], [jmethod(jget($section, 'questions'), 'map', jfn(get_defined_vars(), function($__scope, $question = null) { extract($__scope, EXTR_SKIP); $value = jget(jget($period, 'answers'), jget($question, 'id'));
$issue = jmethod(jget(jget(jget($period, 'sectionReviews'), jget($section, 'key')), 'issues'), 'find', jfn(get_defined_vars(), function($__scope, $item = null) { extract($__scope, EXTR_SKIP); return (jget($item, 'questionId') === jget($question, 'id')); }));
return tag('div', ['class' => ('rounded-lg p-3 ' . jstr((jtruth($issue) ? 'border border-rose-200 bg-rose-50' : 'bg-slate-50')) . '')], [tag('dt', ['class' => 'text-[9px] font-bold leading-4 text-slate-400'], [jget($question, 'label')]),tag('dd', ['class' => 'mt-1 text-[11px] font-semibold leading-5 text-slate-700'], [helper('formatAnswer', $value)]),(jtruth($issue) ? tag('p', ['class' => 'mt-2 text-[9px] font-extrabold text-rose-700'], [jget($issue, 'reason')]) : null)]); }))]);
