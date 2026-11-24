import 'server-only'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { randomUUID } from 'node:crypto'
import { compare, hash } from 'bcryptjs'
import { withDatabase } from './database'
import { reportSections, exclusiveOptions } from '@/lib/report-questions'
import type { PortalUser, StoredDraft } from '@/lib/portal-contract'
import type { ReportReviewInput } from '@/lib/portal-contract'

export class PortalError extends Error { constructor(public status:number,message:string){super(message)} }
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export function failure(error:unknown){
 if(error instanceof PortalError) return json({error:error.message},error.status)
 const code=(error as {code?:string})?.code
 if(code==='40001') return json({error:'Draf sudah berubah di sesi lain. Buka ulang sebelum mengedit lagi.'},409)
 if(code==='23514') return json({error:'Laporan terkunci atau periode belum tersedia untuk membuat draf.'},409)
 if(code==='42501') return json({error:'Akun tidak mempunyai akses.'},403)
 return json({error:'Koneksi database belum siap atau operasi gagal. Periksa penyiapan lokal; detail rahasia tidak ditampilkan.'},503)
}
export function sameOrigin(request:Request){
 const origin=request.headers.get('origin')
 const url=new URL(request.url)
 const host=request.headers.get('host')
 const expected=host?`${url.protocol}//${host}`:url.origin
 if(origin!==expected) throw new PortalError(403,'Permintaan harus berasal dari website ini.')
}
export async function body(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json')) throw new PortalError(415,'Gunakan JSON.')
 // Bound the actual streamed body, not just a client-supplied Content-Length.
 const reader=request.body?.getReader(); let bytes=0; const chunks:Uint8Array[]=[]
 if(!reader) throw new PortalError(400,'Isian kosong.')
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;
  if(bytes>240000){await reader.cancel();throw new PortalError(413,'Isian terlalu besar.')} chunks.push(value)}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown}catch{throw new PortalError(400,'JSON tidak valid.')}
}
export async function session(){
 const secret=process.env.BEZAKAT_SESSION_SECRET
 if(!secret || secret.length<32) throw new Error('SESSION_NOT_CONFIGURED')
 return getIronSession<{accountId?:string}>(await cookies(),{password:secret,cookieName:'sim-bezakat-session',ttl:8*60*60,
   cookieOptions:{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/'}})
}
const roles={awardee:['awardee','Awardee'],koordinator:['coordinator','Koordinator Beasiswa'],laz:['institution','Pengelola LAZ'],kemenag:['ministry','Pengelola Kemenag']} as const
type AccountRow={id_akun:string;id_beasiswa:string;peran:keyof typeof roles;nama:string;password_hash:string;status_aktif:boolean}
function publicUser(row:AccountRow):PortalUser{
 const [role,roleLabel]=roles[row.peran]
 return {id:row.id_akun,username:row.id_beasiswa,name:row.nama,role,roleLabel}
}
export async function currentUser(){
 const s=await session(); if(!s.accountId)throw new PortalError(401,'Silakan masuk terlebih dahulu.')
 const row=await withDatabase(async c=>(await c.query<AccountRow>('SELECT * FROM sim_bezakat.v_portal_akun WHERE id_akun=$1',[s.accountId])).rows[0])
 if(!row?.status_aktif)throw new PortalError(401,'Akun tidak aktif atau sesi berakhir.')
 return publicUser(row)
}
// Batas percobaan per ID untuk server lokal tunggal. Tidak menyimpan password.
let dummyHash: Promise<string> | undefined
const attempts=new Map<string,{count:number;until:number}>()
export async function login(value:unknown){
 const v=value as {idBeasiswa?:unknown;password?:unknown}
 if(!v || typeof v.idBeasiswa!=='string' || typeof v.password!=='string' || v.password.length>72)
  throw new PortalError(400,'Isi ID beasiswa dan kata sandi.')
 const id=v.idBeasiswa.trim().toUpperCase()
 if(!/^BZI-251-000\d{4}$/.test(id))throw new PortalError(401,'ID beasiswa atau kata sandi tidak sesuai.')
 const now=Date.now();for(const [key,a] of attempts){if(a.until<=now)attempts.delete(key)}
 const a=attempts.get(id)??{count:0,until:now+15*60*1000}
 if(a.count>=10)throw new PortalError(429,'Terlalu banyak percobaan. Coba lagi dalam 15 menit.')
 a.count++;attempts.set(id,a)
 const row=await withDatabase(async c=>(await c.query<AccountRow>('SELECT * FROM sim_bezakat.v_portal_akun WHERE id_beasiswa=$1',[id])).rows[0])
 const hasHash=!!row?.password_hash?.startsWith('$2')
 const valid=await compare(v.password,hasHash ? row.password_hash : await (dummyHash ??= hash(randomUUID(), 12)))
 if(!row?.status_aktif || !hasHash || !valid)throw new PortalError(401,'ID beasiswa atau kata sandi tidak sesuai.')
 attempts.delete(id)
 const s=await session();s.accountId=row.id_akun;await s.save();return publicUser(row)
}
export async function drafts(user:PortalUser){
 if(user.role!=='awardee')return [] as StoredDraft[]
 return withDatabase(async c=>(await c.query('SELECT sim_bezakat.portal_daftar_draf($1) AS drafts',[user.id])).rows[0].drafts as StoredDraft[])
}
function object(v:unknown):v is Record<string,unknown>{return !!v && typeof v==='object' && !Array.isArray(v)}
function validDraftTarget(value: Record<string, unknown>) {
  return typeof value.periodId === 'string' && /^-?\d{1,18}$/.test(value.periodId) &&
    Number.isInteger(value.version) && Number(value.version) >= 0 && Number(value.version) <= 2147483646
}
export function validateDraft(value:unknown){
 if(!object(value)||Object.keys(value).some(k=>!['periodId','version','answers','activities'].includes(k))||
  !validDraftTarget(value)||
  !object(value.answers)||!Array.isArray(value.activities)||value.activities.length>30)throw new PortalError(400,'Isian draf tidak valid.')
 const definitions=new Map(reportSections.flatMap(s=>s.questions.map(q=>[q.id,q] as const)))
 for(const [key,answer] of Object.entries(value.answers)){
  const other=key.endsWith('__other');const q=definitions.get(other?key.slice(0,-7):key)
  if(!q || (other&&!q.options?.includes('Lainnya')))throw new PortalError(400,'Pertanyaan tidak dikenali.')
  if(other||q.type==='text'||q.type==='textarea'){
   if(typeof answer!=='string'||answer.length>5000)throw new PortalError(400,'Teks terlalu panjang atau tidak valid.')
  }else if(q.type==='multi'){
   if(!Array.isArray(answer)||answer.length>30||new Set(answer).size!==answer.length||answer.some(x=>typeof x!=='string'||!q.options?.includes(x))||
    (answer.length>1&&answer.some(x=>exclusiveOptions.includes(x))))throw new PortalError(400,'Pilihan jamak tidak valid.')
  }else if(typeof answer!=='string'||(answer!==''&&!q.options?.includes(answer)))throw new PortalError(400,'Pilihan tidak valid.')
 }
 for(const a of value.activities){
  if(!object(a)||Object.keys(a).sort().join(',')!=='description,evidence,id,name,role,type'||
   Object.values(a).some(x=>typeof x!=='string'||x.length>5000))throw new PortalError(400,'Kegiatan tidak valid.')
 }
 return value
}
export async function saveDraft(user:PortalUser,value:unknown){
 if(user.role!=='awardee')throw new PortalError(403,'Hanya awardee dapat menyimpan draf miliknya.')
 const v=validateDraft(value)
 return withDatabase(async c=>(await c.query('SELECT sim_bezakat.portal_simpan_draf($1,$2,$3,$4::jsonb,$5::jsonb) AS draft',
  [user.id,v.periodId,v.version,JSON.stringify(v.answers),JSON.stringify(v.activities)])).rows[0].draft as StoredDraft)
}

export async function clearDraft(user: PortalUser, value: unknown) {
  if (user.role !== 'awardee') throw new PortalError(403, 'Hanya awardee dapat menghapus isian draf miliknya.')
  if (!object(value) || !validDraftTarget(value) || Object.keys(value).some(k => !['periodId','version'].includes(k))) {
    throw new PortalError(400, 'Periode atau versi draf tidak valid.')
  }
  return withDatabase(async client => {
    const result = await client.query<{draft: StoredDraft}>(
      'SELECT sim_bezakat.portal_hapus_isian_draf($1,$2,$3) AS draft', [user.id, value.periodId, value.version],
    )
    return result.rows[0].draft
  })
}

const reviewOperations = new Set<ReportReviewInput['operation']>([
  'approve-section', 'revise-section', 'approve-finance', 'revise-finance',
])
export async function reviewReport(user: PortalUser, value: unknown) {
  if (user.role !== 'coordinator') throw new PortalError(403, 'Hanya koordinator dapat memeriksa laporan.')
  if (!object(value)) throw new PortalError(400, 'Pemeriksaan tidak valid.')
  const reportId = value.reportId
  const operation = value.operation
  const target = value.target
  const issues = value.issues
  if (typeof reportId !== 'string' || !/^-?\d{1,18}$/.test(reportId) ||
      typeof operation !== 'string' || !reviewOperations.has(operation as ReportReviewInput['operation']) ||
      typeof target !== 'string' || target.length > 80) {
    throw new PortalError(400, 'Target pemeriksaan tidak valid.')
  }
  const sectionKeys = reportSections.map(section => section.key)
  if (operation.endsWith('section') && !sectionKeys.includes(target)) {
    throw new PortalError(400, 'Bagian laporan tidak dikenal.')
  }
  let cleanIssues: ReportReviewInput['issues'] = []
  if (operation.startsWith('revise')) {
    if (!Array.isArray(issues) || issues.length === 0 || issues.length > 40) {
      throw new PortalError(400, 'Catatan revisi wajib diisi.')
    }
    cleanIssues = issues.map(issue => {
      if (!object(issue) || typeof issue.questionId !== 'string' || typeof issue.reason !== 'string' ||
          issue.questionId.length > 100 || !issue.reason.trim() || issue.reason.length > 500) {
        throw new PortalError(400, 'Rincian revisi tidak valid.')
      }
      return { questionId: issue.questionId, reason: issue.reason.trim() }
    })
    if (operation === 'revise-section') {
      const section = reportSections.find(item => item.key === target)
      if (cleanIssues.some(issue => !section?.questions.some(question => question.id === issue.questionId))) {
        throw new PortalError(400, 'Isian revisi tidak termasuk bagian yang dipilih.')
      }
    }
  }
  return withDatabase(async client => {
    const { rows: [row] } = await client.query<{detail: unknown}>(
      'SELECT sim_bezakat.portal_simpan_pemeriksaan($1,$2,$3,$4,$5::jsonb) AS detail',
      [user.id, reportId, operation, target, JSON.stringify(cleanIssues)],
    )
    return row.detail
  })
}
