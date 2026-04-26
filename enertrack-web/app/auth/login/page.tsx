'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/onboarding'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Falha no login'); return }
      router.push(redirect)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card animate-in">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Bem-vindo de volta</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
          Entre na sua conta para continuar
        </p>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="seu@email.com" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/>
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}
          style={{ marginTop: 4, height: 44, fontSize: 15 }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
        Ainda não tem conta?{' '}
        <Link href="/auth/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
          Criar conta
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="page-center">
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo com tagline */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <Logo size={56} showTagline />
        </div>

        <Suspense fallback={
          <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
            Carregando...
          </div>
        }>
          <LoginForm />
        </Suspense>

      </div>
    </main>
  )
}
