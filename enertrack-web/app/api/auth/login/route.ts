import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { signToken, tokenCookieHeader } from '@/lib/auth'
import { getEnv } from '@/lib/db'

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})



export async function POST(req: NextRequest) {
  const env = await getEnv(req)

  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const user = await env.DB
      .prepare('SELECT id, name, email, password FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; name: string; email: string; password: string }>()

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    const token = await signToken({ sub: user.id, email: user.email, name: user.name }, env)

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { headers: { 'Set-Cookie': tokenCookieHeader(token) } }
    )
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
