import { sameOrigin, json, failure, body, login, session, currentUser, drafts, saveDraft } from '@/server/portal'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request:Request){try{sameOrigin(request);(await session()).destroy();return json({ok:true})}catch(e){return failure(e)}}
