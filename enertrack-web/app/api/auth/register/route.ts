import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { signToken, tokenCookieHeader } from '@/lib/auth'
import { getEnv } from '@/lib/db'

const schema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
})



export async function POST(req: NextRequest) {
  const env = await getEnv(req)

  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    // Verifica duplicidade
    const existing = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()

    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 10)

    const result = await env.DB
      .prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?) RETURNING id, name, email')
      .bind(name, email, hash)
      .first<{ id: string; name: string; email: string }>()

    if (!result) throw new Error('Falha ao criar usuário')

    const token = await signToken({ sub: result.id, email: result.email, name: result.name }, env)

    return NextResponse.json(
      { user: { id: result.id, name: result.name, email: result.email } },
      { status: 201, headers: { 'Set-Cookie': tokenCookieHeader(token) } }
    )
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
