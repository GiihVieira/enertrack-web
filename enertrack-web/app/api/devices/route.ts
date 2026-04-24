import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken, TOKEN_COOKIE } from '@/lib/auth'
import { getEnv } from '@/lib/db'

const schema = z.object({
  mac_address: z.string().min(4).max(20),
  name:        z.string().min(1).max(80).default('EnerTrack'),
  location:    z.string().max(80).optional(),
})



export async function POST(req: NextRequest) {
  const env = await getEnv(req)

  // Autenticação via cookie
  const token = req.cookies.get(TOKEN_COOKIE)?.value
  const user  = token ? await verifyToken(token, env) : null
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { mac_address, name, location } = parsed.data

    // Upsert: se já existe, atualiza o user_id (permite re-onboarding)
    const device = await env.DB
      .prepare(`
        INSERT INTO devices (user_id, mac_address, name, location)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(mac_address) DO UPDATE SET
          user_id  = excluded.user_id,
          name     = excluded.name,
          location = excluded.location
        RETURNING id, mac_address, name, location
      `)
      .bind(user.sub, mac_address, name, location ?? null)
      .first<{ id: string; mac_address: string; name: string; location: string | null }>()

    return NextResponse.json({ device }, { status: 201 })
  } catch (err) {
    console.error('[devices/register]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Lista devices do usuário autenticado
export async function GET(req: NextRequest) {
  const env = await getEnv(req)

  const token = req.cookies.get(TOKEN_COOKIE)?.value
  const user  = token ? await verifyToken(token, env) : null
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { results } = await env.DB
    .prepare('SELECT id, mac_address, name, location, registered_at FROM devices WHERE user_id = ? AND active = 1')
    .bind(user.sub)
    .all()

  return NextResponse.json({ devices: results })
}
