import { readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
try {
  const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
  await writeFile(new URL('../.env.local', import.meta.url), template.replace('BEZAKAT_SESSION_SECRET=""',
    `BEZAKAT_SESSION_SECRET="${randomBytes(48).toString('hex')}"`), { flag:'wx', mode:0o600 })
  console.log('.env.local dibuat. Isi dua password database di editor lokal; kunci sesi sudah dibuat.')
} catch (error) {
  console.log(error?.code === 'EEXIST' ? '.env.local sudah ada. Tidak dibaca atau ditimpa.' : 'Gagal membuat konfigurasi lokal.')
  process.exitCode = 1
}
