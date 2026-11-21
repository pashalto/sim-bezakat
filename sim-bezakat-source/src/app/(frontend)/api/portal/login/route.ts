import { timingSafeEqual, createHash } from 'node:crypto'
import { sameOrigin, json, failure, body, login, PortalError } from '@/server/portal'
import { demoAccounts } from '@/lib/demo-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function demoLogin(input: unknown) {
  const value = input as {idBeasiswa?: unknown; password?: unknown} | null
  const password = process.env.BEZAKAT_DEMO_PASSWORD
  if (!password) throw new PortalError(503, 'Isi BEZAKAT_DEMO_PASSWORD di .env.local untuk mode demo.')
  if (typeof value?.idBeasiswa !== 'string' || typeof value.password !== 'string') {
    throw new PortalError(400, 'Isi ID beasiswa dan kata sandi.')
  }
  const id = value.idBeasiswa.trim().toUpperCase()
  const user = demoAccounts.find(account => account.username === id)
  const digest = (text: string) => createHash('sha256').update(text).digest()
  if (!timingSafeEqual(digest(password), digest(value.password)) || !user) {
    throw new PortalError(401, 'ID beasiswa atau kata sandi tidak sesuai.')
  }
  return user
}

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const input = await body(request)
    const user = process.env.BEZAKAT_STORAGE === 'demo' ? demoLogin(input) : await login(input)
    return json({ user })
  } catch (error) {
    return failure(error)
  }
}
