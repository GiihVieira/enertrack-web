'use client'
import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

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
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Entrar</h1>
      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="seu@email.com" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
        Ainda não tem conta?{' '}
        <Link href="/auth/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
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
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L4 8v12l10 6 10-6V8L14 2z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
              <path d="M14 8v6l4 3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
              EnerTrack
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Monitoramento de consumo elétrico</p>
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