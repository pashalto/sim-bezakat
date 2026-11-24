import { body, currentUser, failure, json, reviewReports, sameOrigin } from '@/server/portal'
import { portalSession } from '@/server/portal-overview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    sameOrigin(request)
    const user = await currentUser()
    await reviewReports(user, await body(request))
    return json(await portalSession(user))
  } catch (error) {
    return failure(error)
  }
}
