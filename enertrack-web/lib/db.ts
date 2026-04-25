import { getCloudflareContext } from '@opennextjs/cloudflare'

export interface AppEnv {
  DB: D1Database
  SESSIONS: KVNamespace
  JWT_SECRET: string
}

export async function getEnv(_req?: unknown): Promise<AppEnv> {
  const ctx = await getCloudflareContext({ async: true })
  return ctx.env as unknown as AppEnv
}
