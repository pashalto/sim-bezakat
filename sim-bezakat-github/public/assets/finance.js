'use strict';
const financeLimit = 2 * 1024 * 1024;
let financeBusy = false;
let financeDeleteTarget = null;
function financeSelection(input) {
  const form = input.form, file = input.files[0];
  form.querySelector('[data-file-name]').textContent = file ? file.name : (form.dataset.documentId ? 'Pilih berkas pengganti' : 'Pilih dokumen');
  const valid = file && file.size > 0 && file.size <= financeLimit && /\.(pdf|xlsx?)$/i.test(file.name);
  input.disabled = financeBusy || form.dataset.refreshRequired === '1';
  form.querySelector('[data-finance-submit]').disabled = input.disabled || !valid;
  form.querySelector('[data-finance-delete]').disabled = input.disabled || !(file || form.dataset.documentId);
}
function financeLock(busy) {
  financeBusy = busy;
  document.querySelectorAll('[data-finance-upload] input[type=file]').forEach(financeSelection);
  document.querySelectorAll('[data-finance-cancel],[data-finance-confirm]').forEach(button => button.disabled = busy);
}
document.addEventListener('change', event => {
  if (!event.target.matches('[data-finance-upload] input[type=file]')) return;
  financeSelection(event.target);
  const file = event.target.files[0];
  event.target.form.querySelector('[role=status]').textContent = file && (file.size === 0 || file.size > financeLimit || !/\.(pdf|xlsx?)$/i.test(file.name)) ? 'Pilih berkas PDF atau Excel yang berisi data, maksimal 2 MiB.' : '';
});
function readFinanceFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Berkas gagal dibaca. Pilih kembali berkas.'));
    reader.readAsDataURL(file);
  });
}
async function financeRequest(url, options) {
  let response;
  try { response = await fetch(url, {cache:'no-store', ...options}); }
  catch { throw new Error('Koneksi ke portal terputus. Muat ulang untuk memeriksa dokumen sebelum mencoba lagi.'); }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || result.error) throw new Error(result?.error || (response.status === 413 ? 'Berkas terlalu besar. Ukuran maksimal 2 MiB.' : 'Server belum dapat memproses dokumen.'));
  return result;
}
function financeHeaders() { return {'Content-Type':'application/json','X-CSRF-Token':document.querySelector('meta[name=csrf-token]').content}; }
async function financeRefresh(form) {
  const page = await fetch(location.href, {cache:'no-store'});
  const updated = new DOMParser().parseFromString(await page.text(), 'text/html');
  const card = updated.querySelector('[data-finance-category="'+form.dataset.category+'"]');
  if (!page.ok || !card) throw new Error('Muat ulang halaman untuk melihat keadaan dokumen terbaru.');
  form.closest('section').replaceWith(card);
}
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!form.matches('[data-finance-upload]')) return;
  event.preventDefault();
  const input = form.querySelector('input[type=file]');
  if (financeBusy || input.disabled || form.querySelector('[data-finance-submit]').disabled || !input.files[0]) return;
  const file = input.files[0], status = form.querySelector('[role=status]');
  let saved = false;
  financeLock(true); status.textContent = 'Mengunggah dokumen…';
  try {
    const result = await financeRequest('/api.php?action=finance-upload', {method:'POST', headers:financeHeaders(),body:JSON.stringify({periodId:form.dataset.period,category:form.dataset.category,name:file.name,content:await readFinanceFile(file)})});
    saved = true;
    await financeRefresh(form);
    toast('Versi ' + result.version + ' berhasil disimpan.');
  } catch (error) {
    if (saved) form.dataset.refreshRequired = '1';
    status.textContent = (saved ? 'Dokumen berhasil disimpan. ' : '') + error.message;
  } finally { financeLock(false); }
});
const financeDialog = document.querySelector('[data-finance-delete-dialog]');
if (financeDialog) {
  financeDialog.addEventListener('cancel', event => { if (financeBusy) event.preventDefault(); });
  financeDialog.addEventListener('close', () => { financeDeleteTarget = null; });
}
document.addEventListener('click', async event => {
  const remove = event.target.closest('[data-finance-delete]');
  if (remove && !remove.disabled && !financeBusy) {
    const form = remove.form, input = form.querySelector('input[type=file]'), file = input.files[0];
    financeDeleteTarget = {form,input,file,id:form.dataset.documentId};
    financeDialog.querySelector('[data-finance-delete-name]').textContent = file ? file.name : form.dataset.documentName;
    financeDialog.querySelector('[data-finance-delete-kind]').textContent = form.closest('section').dataset.financeLabel + (file ? ' · Pilihan berkas belum diunggah' : '');
    financeDialog.querySelector('[data-finance-delete-error]').hidden = true;
    financeDialog.showModal();
    return;
  }
  if (event.target.closest('[data-finance-cancel]') && !financeBusy) { financeDialog.close(); return; }
  if (event.target.closest('[data-finance-confirm]') && !financeBusy && financeDeleteTarget) {
    const target = financeDeleteTarget, status = target.form.querySelector('[role=status]');
    if (target.file) {
      if (target.input.files[0] !== target.file) { financeDialog.close(); return; }
      target.input.value = ''; financeSelection(target.input);
      status.textContent = 'Pilihan berkas dihapus. Dokumen tersimpan tetap tersedia.';
      financeDialog.close(); toast('Pilihan berkas dihapus.'); return;
    }
    let deleted = false;
    financeLock(true);
    try {
      await financeRequest('/api.php?action=finance-delete', {method:'DELETE',headers:financeHeaders(),body:JSON.stringify({periodId:target.form.dataset.period,category:target.form.dataset.category,documentId:target.id})});
      deleted = true;
      await financeRefresh(target.form);
      financeDialog.close(); toast('Dokumen berhasil dihapus. Anda dapat mengunggah kembali.');
    } catch (error) {
      if (deleted) {
        target.form.dataset.refreshRequired = '1';
        status.textContent = 'Dokumen berhasil dihapus. Muat ulang halaman untuk memperbarui kartu.';
        financeDialog.close(); toast(status.textContent);
      } else {
        const message = financeDialog.querySelector('[data-finance-delete-error]');
        message.textContent = error.message; message.hidden = false;
        status.textContent = error.message;
        // Reconcile a stale/locked target with the actual backend, preserving the other card.
        await financeRefresh(target.form).catch(() => {});
      }
    } finally { financeLock(false); }
    return;
  }
  const button = event.target.closest('button[data-finance-download]');
  if (!button || button.disabled) return;
  button.disabled = true;
  try {
    const doc = await financeRequest('/api.php?action=finance-download&id='+encodeURIComponent(button.dataset.financeDownload));
    const bytes = Uint8Array.from(atob(doc.konten), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], {type:doc.mime})), link = document.createElement('a');
    link.href = url; link.download = doc.nama; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) { toast(error.message || 'Unduhan gagal. Periksa koneksi lalu coba lagi.'); }
  finally { button.disabled = false; }
});
