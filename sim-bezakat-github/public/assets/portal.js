'use strict';
// Browser-only interactions. All durable records go through PHP -> PostgreSQL.
let data=JSON.parse(document.querySelector('#portal-data')?.textContent||'null');
let report=data?.period?structuredClone(data.period):null;
if(report) report.answers={...report.answers};
let section=Number(document.querySelector('[data-section].bg-emerald-800')?.dataset.section || 0);
let dirty=false,busy=false;
let lockedElements=[];
const pending=new Map();let finalDecision=null, finalReason='';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,5000);}
async function api(action,method='GET',body){
  const response=await fetch('/api.php?action='+encodeURIComponent(action),{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':$('meta[name="csrf-token"]').content},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Permintaan gagal.');return result;
}
function destination(page,period){const url=new URL(location.href);url.searchParams.set('page',page);for(const k of ['panel','section','edit'])url.searchParams.delete(k);if(period)url.searchParams.set('period',period);else url.searchParams.delete('period');return url;}
async function save(clear=false){
  if(busy||!report)return false;if(data.preview){toast('Pratinjau hanya baca. Penyimpanan memakai PostgreSQL setelah login.');return false;}
  const target=data.drafts.find(d=>d.periodId===report.id);if(!target)throw new Error('Periode tidak ditemukan. Buka ulang laporan.');
  busy=true;document.body.setAttribute('aria-busy','true');lockedElements=$$('#portal-main fieldset,#portal-main button').map(el=>[el,el.disabled]);lockedElements.forEach(([el])=>el.disabled=true);
  try{
    const result=await api('drafts',clear?'DELETE':'PUT',clear?{periodId:target.periodId,version:target.version}:{periodId:target.periodId,version:target.version,answers:report.answers,activities:report.activities});
    Object.assign(target,result.draft);report.answers={...result.draft.answers};report.activities=result.draft.activities;dirty=false;
    if(clear){$('#delete-draft-title')?.closest('dialog').close();await changeSection(section);}
    toast(clear?'Draft berhasil dihapus':'Draf berhasil disimpan ke PostgreSQL.');return true;
  }finally{busy=false;document.body.removeAttribute('aria-busy');lockedElements.forEach(([el,disabled])=>{if(el.isConnected)el.disabled=disabled;});refreshDeleteButton();}
}
function hasOther(value) {
  return value === 'Lainnya' || (Array.isArray(value) && value.includes('Lainnya'));
}
function missingAnswer(q) {
  const value = report.answers[q.id];
  if (q.type === 'multi') {
    if (!Array.isArray(value) || !value.some(option => q.options.includes(option))) return q.id;
  } else if (q.type === 'single') {
    if (!q.options.includes(value)) return q.id;
  } else if (typeof value !== 'string' || !value.trim()) return q.id;
  if (q.options && hasOther(value) && !report.answers[q.id+'__other']?.trim()) return q.id+'__other';
  return null;
}
let sectionChanging = false;
async function navigateSection(next, saveFirst = false, start = section) {
  if (sectionChanging || busy) return;
  sectionChanging = true;
  try {
    const editable = ['draft','revision'].includes(report.reportStatus);
    for (let i = start; editable && i < next; i++) {
      const part = data.sections[i];
      if (report.reportStatus === 'revision' && report.sectionReviews?.[part.key]?.status === 'approved') continue;
      const question = part.questions.find(q => missingAnswer(q));
      if (!question) continue;
      if (section !== i) await changeSection(i, false);
      const field = missingAnswer(question);
      const number = part.questions.indexOf(question) + 1;
      const instruction = field === question.id ? 'Isi jawaban' : 'Isi keterangan Lainnya';
      toast(instruction + ' untuk ' + part.shortLabel + ', pertanyaan ' + number + ': ' + question.label);
      const group = document.getElementById('question-' + question.id);
      group?.querySelector('[data-question="' + CSS.escape(field) + '"]')?.focus({preventScroll:true});
      group?.scrollIntoView({block:'center'});
      return;
    }
    if (next === section) return;
    if (saveFirst && editable && !(await save())) return;
    await changeSection(next);
  } finally {
    sectionChanging = false;
  }
}
async function changeSection(next, scroll = true){
  const url=new URL(location.href);next=Math.max(0,Math.min(data.sections.length-1,Number(next)));url.searchParams.set('section',String(next));
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('Gagal membuka bagian laporan.');
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');const main=$('#portal-main',doc);if(!main)throw new Error('Sesi berakhir. Muat ulang halaman.');
  $('#portal-main').replaceWith(main);history.replaceState({},'',url);section=next;hydrateAnswers();if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}
function hydrateAnswers(){if(!report||data.page!=='report')return;
  $$('[data-question]').forEach(input=>{const value=report.answers[input.dataset.question];if(input.type==='radio')input.checked=value===input.value;else if(input.type==='checkbox')input.checked=Array.isArray(value)&&value.includes(input.value);else input.value=typeof value==='string'?value:'';});
  renderActivities();refreshChoices();
}
function refreshDeleteButton(){if(!report||data?.page!=='report')return;const has=report.activities.length>0||Object.values(report.answers).some(v=>Array.isArray(v)?v.length>0:String(v||'').trim());const target=data.drafts.find(d=>d.periodId===report.id);$$('[data-action=delete-dialog],[data-action=clear-draft]').forEach(button=>button.disabled=busy||!has||!target?.isOpen||report.reportStatus!=='draft'||!!report.submittedAt);}
function renderActivities(){const add=$('[data-action=add-activity]');if(!add)return;const container=add.closest('.rounded-2xl');
  $$('[data-activity-card]',container).forEach(el=>el.remove());$$(':scope > p,:scope > div.mt-5',container).forEach(el=>el.remove());
  const list=document.createElement('div');list.className='mt-5 space-y-4';list.dataset.activitiesList='1';
  for(const [index,activity] of report.activities.entries()){
    const wrapper=document.createElement('div');wrapper.innerHTML=$('#activity-template').innerHTML;
    const card=$('[data-activity-card]',wrapper);card.dataset.activityCard=activity.id;$$('[data-activity]',card).forEach(el=>el.dataset.activity=activity.id);$('p',card).textContent='Kegiatan '+(index+1);
    $$('[data-field]',card).forEach(input=>{input.value=activity[input.dataset.field]||'';input.disabled=add.disabled;});if(add.disabled)$$('button',card).forEach(b=>b.remove());list.append(card);
  }
  if(!report.activities.length){const p=document.createElement('p');p.className='mt-5 rounded-xl bg-white p-4 text-center text-[10px] text-slate-400';p.textContent='Belum ada kegiatan tambahan.';container.append(p);}else container.append(list);
}
function refreshChoices(){
  $$('[data-question][type=radio], [data-question][type=checkbox]').forEach(input=>{const label=input.closest('label');if(!label)return;label.classList.toggle('border-emerald-400',input.checked);label.classList.toggle('bg-emerald-50',input.checked);label.classList.toggle('text-emerald-900',input.checked);label.classList.toggle('border-slate-200',!input.checked);label.classList.toggle('text-slate-600',!input.checked);});
  $$('[data-other]').forEach(el=>{const value=report?.answers[el.dataset.other];el.hidden=!(value==='Lainnya'||Array.isArray(value)&&value.includes('Lainnya'));});
  refreshDeleteButton();
  if(data?.page==='report'&&report){let total=0,answered=0;for(const s of data.sections){const count=s.questions.filter(q=>!missingAnswer(q)).length;total+=s.questions.length;answered+=count;$$('[data-section-count]').filter(el=>el.dataset.sectionCount===s.key).forEach(el=>{[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());el.append(document.createTextNode(count+'/'+s.questions.length));});}const progress=Math.min(100,Math.round(answered/total*100));$$('[data-progress-label]').forEach(el=>el.textContent=progress+'%');$$('[data-progress-bar]').forEach(el=>el.style.width=progress+'%');}
}
async function headerPanel(panel){const current=$('header');if(!current)return;if(current.dataset.openPanel===panel)panel=null;const url=new URL(location.href);if(panel)url.searchParams.set('panel',panel);else url.searchParams.delete('panel');const r=await fetch(url);const doc=new DOMParser().parseFromString(await r.text(),'text/html');const head=$('header',doc);if(head){if(panel)head.dataset.openPanel=panel;$('header').replaceWith(head);}}
function reviewCard(button){return button.closest('[data-finance-card],[data-review-card]')||button.closest('section');}
function markReview(button,operation,issues=[],silent=false){
  const target=button.dataset.target;pending.set(target,{operation,target,issues});finalDecision=null;
  const card=reviewCard(button);const approved=operation.startsWith('approve');let badge=$('[data-staged]',card);const status=$('[data-status]',card);if(!badge){badge=document.createElement('span');badge.dataset.staged='1';badge.className='rounded-md bg-amber-50 px-2 py-1 text-[8px] font-extrabold text-amber-700';status.after(badge);}badge.textContent='Draft';
  status.textContent=approved?'Disetujui':'Perlu perbaikan';status.className='w-fit rounded-full px-2.5 py-1 text-[8px] font-extrabold '+(approved?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700');card.classList.toggle('border-rose-300',!approved);card.classList.toggle('border-slate-200',approved);
  $$('[data-review-editor],[data-finance-editor]').forEach(x=>x.hidden=true);updateReviewReady();if(!silent)toast('Keputusan disimpan sementara. Tekan Kirim Semua Hasil Pemeriksaan untuk menyimpan ke PostgreSQL.');
}
function reviewActions(){const actions=[];for(const s of data.sections){const r=pending.get(s.key)||report.sectionReviews[s.key];if(!r||(!r.operation&&!['approved','revision'].includes(r.status)))return null;actions.push(r.operation?r:{operation:r.status==='approved'?'approve-section':'revise-section',target:s.key,issues:r.issues||[]});}
  for(const doc of report.financeDocuments){const r=pending.get(doc.id);if(r)actions.push(r);else if(['approved','revision'].includes(doc.status))actions.push({operation:doc.status==='approved'?'approve-finance':'revise-finance',target:doc.id,issues:doc.status==='revision'?[{questionId:doc.id,reason:doc.reason||'Dokumen perlu diperbaiki.'}]:[]});else return null;}return actions;}
function updateReviewReady(){const ready=!!reviewActions();$$('[data-action=submit-reviews]').forEach(b=>b.disabled=!ready);let sections=0,finance=0;for(const s of data.sections)if(pending.has(s.key)||['approved','revision'].includes(report.sectionReviews[s.key]?.status))sections++;for(const d of report.financeDocuments)if(pending.has(d.id)||['approved','revision'].includes(d.status))finance++;
 $$('[data-review-count=sections]').forEach(el=>el.textContent='Bagian: '+sections+'/'+data.sections.length);$$('[data-review-count=finance]').forEach(el=>el.textContent='Dokumen: '+finance+'/'+report.financeDocuments.length);$$('[data-review-complete]').forEach(el=>{el.textContent=ready?'Siap dikirim':'Belum lengkap';el.className='rounded-lg px-3 py-2 text-[9px] font-extrabold '+(ready?'bg-emerald-700 text-white':'bg-slate-100 text-slate-500');});}
async function editableReviews(){if($('[data-action=submit-reviews]'))return;const url=new URL(location.href);url.searchParams.set('edit','1');const response=await fetch(url);const doc=new DOMParser().parseFromString(await response.text(),'text/html');const main=$('#portal-main',doc);if(!main)throw new Error('Gagal membuka pemeriksaan.');$('#portal-main').replaceWith(main);history.replaceState({},'',url);}
document.addEventListener('submit',async event=>{
  if(data)return;const form=event.target;if(!form.matches('form'))return;event.preventDefault();if(busy)return;busy=true;const button=$('button:not([type=button])',form);button.disabled=true;
  try{const v=new FormData(form);const r=await api('login','POST',{idBeasiswa:v.get('idBeasiswa'),password:v.get('password')});$('meta[name="csrf-token"]').content=r.csrf;location.href='/';}
  catch(e){toast(e.message);}finally{busy=false;button.disabled=false;}
});
document.addEventListener('input',event=>{
  const input=event.target;if(input.dataset.question&&report){const key=input.dataset.question;
    // A second activation of a checked radio emits click but no input event.
    if(input.type==='radio')return;
    else if(input.type==='checkbox'){
      let values=Array.isArray(report.answers[key])?report.answers[key]:[];
      if(data.exclusiveOptions.includes(input.value))values=input.checked?[input.value]:[];
      else{values=values.filter(x=>!data.exclusiveOptions.includes(x)&&x!==input.value);if(input.checked)values.push(input.value);}report.answers[key]=values;
      if (!hasOther(values)) delete report.answers[key+'__other'];
      hydrateAnswers();
    }else report.answers[key]=input.value;
    dirty=true;refreshChoices();
  }
  if(input.dataset.activity&&report){const activity=report.activities.find(a=>a.id===input.dataset.activity);if(activity){activity[input.dataset.field]=input.value;dirty=true;}}
});
document.addEventListener('change',event=>{const el=event.target;if(el.dataset.action==='filter-year'){const u=new URL(location.href);u.searchParams.set('year',el.value);location.href=u;}
  if(el.dataset.action==='select-receipt'){const card=el.closest('section');$('[data-action=receipt-dialog]',card).disabled=!el.checked;}
});
document.addEventListener('click',async event=>{
 const radio=event.target.closest('input[type=radio][data-question]');
 if (radio && report && !radio.matches(':disabled')) {
   const key=radio.dataset.question;
   if (report.answers[key] === radio.value) {
     delete report.answers[key];
     radio.checked=false;
   } else {
     report.answers[key]=radio.value;
   }
   if (!hasOther(report.answers[key])) delete report.answers[key+'__other'];
   const other=document.querySelector('[data-question="'+CSS.escape(key+'__other')+'"]');
   if (other && !hasOther(report.answers[key])) other.value='';
   dirty=true;
   refreshChoices();
   return;
 }
 const button=event.target.closest('button[data-action],button[data-nav],a[data-nav],button[data-section]');if(!button||button.disabled)return;
 event.preventDefault();try{
  if(button.dataset.nav){const page=button.dataset.nav;let period=button.dataset.period;
    if(page==='report'&&!period){period=data.drafts.find(d=>d.isOpen)?.periodId;if(!period){toast('Belum ada periode laporan yang dibuka.');return;}}
    location.href=destination(page,period);return;
  }
  if(button.dataset.section!==undefined){await navigateSection(Number(button.dataset.section));return;}
  switch(button.dataset.action){
   case 'toggle-password':{const input=$('input[name=password]');input.type=input.type==='password'?'text':'password';button.setAttribute('aria-label',input.type==='password'?'Tampilkan kata sandi':'Sembunyikan kata sandi');break;}
   case 'open-menu':$('aside').setAttribute('data-mobile-open','');$('#menu-backdrop').hidden=false;break;
   case 'close-menu':$('aside').removeAttribute('data-mobile-open');$('#menu-backdrop').hidden=true;break;
   case 'notifications':await headerPanel('notifications');break;
   case 'account-menu':await headerPanel('account');break;
   case 'logout':await api('logout','POST',{});location.href='/';break;
   case 'back':location.href=destination(data.page==='report'?'dashboard':data.user.role==='awardee'?'recap':data.user.role==='coordinator'?'awardees':'monitoring');break;
   case 'save-draft':await save();break;
   case 'next-section':await navigateSection(section+1,true);break;
   case 'previous-section':await navigateSection(section-1);break;
   case 'delete-dialog':$('#delete-draft-title').closest('dialog').showModal();break;
   case 'close-dialog':button.closest('dialog').close();break;
   case 'clear-draft':await save(true);break;
   case 'receipt-dialog':$('#receipt-dialog-title').closest('dialog').showModal();break;
   case 'confirm-receipt':if(data.preview){toast('Konfirmasi ini hanya simulasi pada versi asal.');button.closest('dialog').close();break;}await api('receipt','POST',{periodId:data.period.id});location.reload();break;
   case 'add-activity':{
     if(report.activities.length>=30)throw new Error('Maksimal 30 kegiatan.');const id='activity-'+crypto.randomUUID();
     const activity={id,name:'',type:'',role:'',description:'',evidence:''};report.activities.push(activity);dirty=true;
     renderActivities();refreshDeleteButton();break;
   }
   case 'remove-activity':report.activities=report.activities.filter(a=>a.id!==button.dataset.activity);renderActivities();refreshDeleteButton();dirty=true;break;
   case 'print':window.open('/export.php?period='+encodeURIComponent(data.period.id),'_blank','noopener');break;
   case 'edit-review':{const u=new URL(location.href);u.searchParams.set('edit','1');location.href=u;break;}
   case 'review-section':{const editor=$$('[data-review-editor]').find(e=>e.dataset.reviewEditor===button.dataset.target);editor.hidden=!editor.hidden;break;}
   case 'review-finance':{const editor=$$('[data-finance-editor]').find(e=>e.dataset.financeEditor===button.dataset.target);editor.hidden=!editor.hidden;break;}
   case 'choose-reason':{const editor=button.closest('[data-review-editor],[data-finance-editor]');$('textarea',editor).value=button.dataset.reason;break;}
   case 'approve-section':case 'approve-finance':markReview(button,button.dataset.action);break;
   case 'revise-section':{
     const editor=button.closest('[data-review-editor]');const reason=$('textarea',editor).value.trim();const selected=$$('input[data-review-question]:checked',editor).map(x=>x.value);if(!reason||!selected.length)throw new Error('Pilih minimal satu isian dan tulis alasan perbaikan.');markReview(button,'revise-section',selected.map(questionId=>({questionId,reason})));break;
   }
   case 'revise-finance':{const editor=button.closest('[data-finance-editor]');const reason=$('textarea',editor).value.trim();if(!reason)throw new Error('Tulis alasan perbaikan dokumen.');markReview(button,'revise-finance',[{questionId:button.dataset.target,reason}]);break;}
   case 'approve-all':await editableReviews();for(const s of data.sections)markReview($$('[data-action=approve-section]').find(b=>b.dataset.target===s.key),'approve-section',[],true);for(const d of report.financeDocuments)markReview($$('[data-action=approve-finance]').find(b=>b.dataset.target===d.id),'approve-finance',[],true);finalDecision='approved';updateReviewReady();toast('Semua ditandai disetujui dalam draft. Tekan Kirim Semua Hasil Pemeriksaan untuk menyimpan.');break;
   case 'open-reject':await editableReviews();$('[data-reject-editor]').hidden=false;break;
   case 'cancel-reject':$('[data-reject-editor]').hidden=true;break;
   case 'reject-all':{
     const reason=$('textarea[data-review-field=reject-reason]').value.trim();if(!reason)throw new Error('Tulis alasan penolakan terlebih dahulu.');
     for(const s of data.sections)markReview($$('[data-action=approve-section]').find(b=>b.dataset.target===s.key),'revise-section',s.questions.map(q=>({questionId:q.id,reason})),true);for(const d of report.financeDocuments)markReview($$('[data-action=approve-finance]').find(b=>b.dataset.target===d.id),'revise-finance',[{questionId:d.id,reason}],true);finalDecision='rejected';finalReason=reason;$('[data-reject-editor]').hidden=true;updateReviewReady();toast('Draft penolakan siap. Tekan Kirim Semua Hasil Pemeriksaan untuk menyimpan.');break;
   }
   case 'submit-reviews':{
     if(data.preview)throw new Error('Pratinjau hanya baca. Pemeriksaan disimpan ke PostgreSQL setelah login.');const actions=reviewActions();if(!actions)throw new Error('Periksa seluruh bagian dan dokumen sebelum mengirim.');
     const revisions=actions.filter(a=>a.operation.startsWith('revise')).length;const operation=finalDecision==='rejected'?'reject-report':revisions?'revise-report':'approve-report';actions.push({operation,target:'report',issues:operation==='approve-report'?[]:[{questionId:'report',reason:finalDecision==='rejected'?finalReason:`${revisions} bagian atau dokumen memerlukan perbaikan.`}]});
     button.disabled=true;try{await api('reviews','POST',{reportId:report.reportId,reviews:actions});const url=new URL(location.href);url.searchParams.delete('edit');location.href=url;}finally{button.disabled=false;}break;
   }
   default:toast('Fitur ini belum terhubung pada versi PostgreSQL asal.');
  }
 }catch(error){toast(error.message||'Operasi gagal.');}
});
$('#menu-backdrop')?.addEventListener('click',()=>{$('aside').removeAttribute('data-mobile-open');$('#menu-backdrop').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('aside')?.removeAttribute('data-mobile-open');if($('#menu-backdrop'))$('#menu-backdrop').hidden=true;if($('header')?.dataset.openPanel)void headerPanel(null);}});
document.addEventListener('pointerdown',e=>{if($('header')?.dataset.openPanel&&!e.target.closest('header .relative'))void headerPanel(null);});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
hydrateAnswers();
if (data?.page === 'report' && report && section > 0) {
  navigateSection(section, false, 0).catch(error => toast(error.message));
}
