import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getEnv } from '@/lib/db'

const schema = z.object({
  mac_address: z.string().min(4).max(20),
  irms:        z.number().nonnegative(),
  watts:       z.number().nonnegative(),
})



export async function POST(req: NextRequest) {
  const env = await getEnv(req)

  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const { mac_address, irms, watts } = parsed.data

    // Busca device pelo MAC
    const device = await env.DB
      .prepare('SELECT id FROM devices WHERE mac_address = ? AND active = 1')
      .bind(mac_address)
      .first<{ id: string }>()

    if (!device) {
      return NextResponse.json({ error: 'Device não registrado' }, { status: 404 })
    }

    await env.DB
      .prepare('INSERT INTO energy_readings (device_id, irms, watts) VALUES (?, ?, ?)')
      .bind(device.id, irms, watts)
      .run()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[readings/ingest]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Retorna últimas N leituras de um device (usado pelo dashboard via SSE ou polling)
export async function GET(req: NextRequest) {
  const env = await getEnv(req)

  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get('device_id')
  const limit    = Math.min(Number(searchParams.get('limit') ?? 60), 500)

  if (!deviceId) {
    return NextResponse.json({ error: 'device_id obrigatório' }, { status: 400 })
  }

  const { results } = await env.DB
    .prepare(`
      SELECT irms, watts, recorded_at
      FROM energy_readings
      WHERE device_id = ?
      ORDER BY recorded_at DESC
      LIMIT ?
    `)
    .bind(deviceId, limit)
    .all()

  // Retorna em ordem cronológica para o gráfico
  return NextResponse.json({ readings: results.reverse() })
}
