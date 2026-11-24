import 'server-only'
import { Pool, type PoolClient } from 'pg'
import { dbConfig, assertTarget } from '../../scripts/db-config.mjs'
const state=globalThis as unknown as { bezakatPool?:Pool }
export async function withDatabase<T>(work:(client:PoolClient)=>Promise<T>):Promise<T> {
 if(process.env.BEZAKAT_STORAGE!=='postgres') throw new Error('DATABASE_NOT_CONFIGURED')
 const pool=state.bezakatPool ??= new Pool({...dbConfig(),max:4,idleTimeoutMillis:15000})
 // Idle connection failures are handled without logging configuration details.
 if(pool.listenerCount('error')===0) pool.on('error',()=>{})
 const client=await pool.connect()
 try { await assertTarget(client); return await work(client) } finally {client.release()}
}
