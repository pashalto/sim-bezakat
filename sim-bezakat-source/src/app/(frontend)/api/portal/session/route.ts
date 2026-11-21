import { currentUser, failure, json } from '@/server/portal'
import { portalSession } from '@/server/portal-overview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return json(await portalSession(await currentUser()))
  } catch (error) {
    return failure(error)
  }
}
