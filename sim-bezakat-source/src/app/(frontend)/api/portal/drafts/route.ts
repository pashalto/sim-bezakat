import { sameOrigin, json, failure, body, login, session, currentUser, drafts, saveDraft } from '@/server/portal'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(){try{return json({drafts:await drafts(await currentUser())})}catch(e){return failure(e)}}
export async function PUT(request:Request){try{sameOrigin(request);const user=await currentUser();return json({draft:await saveDraft(user,await body(request))})}catch(e){return failure(e)}}
