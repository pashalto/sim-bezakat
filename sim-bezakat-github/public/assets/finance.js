'use strict';

const financeLimit = 2 * 1024 * 1024;
function financeSelection(input) {
  const form = input.form;
  const file = input.files[0];
  form.querySelector('[data-file-name]').textContent = file ? file.name : 'Pilih dokumen';
  const valid = file && file.size > 0 && file.size <= financeLimit && /\.(pdf|xlsx?)$/i.test(file.name);
  form.querySelector('button').disabled = !valid;
  form.querySelector('[role=status]').textContent = file && !valid ? 'Pilih berkas PDF atau Excel yang berisi data, maksimal 2 MiB.' : '';
}

document.addEventListener('change', event => {
  if (event.target.matches('[data-finance-upload] input[type=file]')) financeSelection(event.target);
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
  try {
    response = await fetch(url, {cache:'no-store', ...options});
  } catch {
    throw new Error('Koneksi ke portal terputus. Muat ulang untuk memeriksa dokumen sebelum mencoba lagi.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || result.error) throw new Error(result?.error || (response.status === 413 ?
    'Berkas terlalu besar. Ukuran maksimal 2 MiB.' : 'Server belum dapat memproses dokumen.'));
  return result;
}

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!form.matches('[data-finance-upload]')) return;
  event.preventDefault();
  const input = form.querySelector('input');
  if (input.disabled || !input.files[0]) return;
  const file = input.files[0];
  const status = form.querySelector('[role=status]');
  input.disabled = true;
  form.querySelector('button').disabled = true;
  status.textContent = 'Mengunggah dokumen…';
  try {
    const result = await financeRequest('/api.php?action=finance-upload', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-CSRF-Token':document.querySelector('meta[name=csrf-token]').content},
      body:JSON.stringify({periodId:form.dataset.period,category:form.dataset.category,name:file.name,content:await readFinanceFile(file)})
    });
    status.textContent = 'Versi ' + result.version + ' berhasil disimpan.';
    // Refresh this card only, preserving a file selected in the other category.
    const page = await fetch(location.href, {cache:'no-store'});
    const updated = new DOMParser().parseFromString(await page.text(), 'text/html');
    const card = updated.querySelector('[data-finance-category="'+form.dataset.category+'"]');
    if (card && page.ok) {
      const message = status.textContent;
      form.closest('section').replaceWith(card);
      toast(message);
    } else status.textContent += ' Muat ulang untuk melihat dokumen.';
  } catch (error) {
    if (status.textContent.startsWith('Versi ')) status.textContent += ' Muat ulang untuk melihat dokumen.';
    else {
      status.textContent = error.message || 'Unggahan gagal. Periksa koneksi lalu coba lagi.';
      input.disabled = false;
      form.querySelector('button').disabled = false;
    }
  }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('button[data-finance-download]');
  if (!button || button.disabled) return;
  button.disabled = true;
  try {
    const doc = await financeRequest('/api.php?action=finance-download&id='+encodeURIComponent(button.dataset.financeDownload));
    const bytes = Uint8Array.from(atob(doc.konten), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], {type:doc.mime}));
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.nama;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) {
    toast(error.message || 'Unduhan gagal. Periksa koneksi lalu coba lagi.');
  } finally {
    button.disabled = false;
  }
});
