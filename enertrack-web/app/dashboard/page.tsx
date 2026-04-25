'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Device {
  id: string
  name: string
  mac_address: string
  location: string | null
  registered_at: number
}

interface Reading {
  irms: number
  watts: number
  recorded_at: number
}

const POLL_INTERVAL = 5000  // 5s — mesmo intervalo do firmware

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()

  const [devices,       setDevices]       = useState<Device[]>([])
  const [activeDevice,  setActiveDevice]  = useState<Device | null>(null)
  const [readings,      setReadings]      = useState<Reading[]>([])
  const [loading,       setLoading]       = useState(true)
  const [liveReading,   setLiveReading]   = useState<Reading | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Carrega devices do usuário
  useEffect(() => {
    fetch('/api/devices')
      .then(r => r.ok ? r.json() as Promise<{ devices: Device[] }> : Promise.reject(r.status))
      .then(data => {
        setDevices(data.devices ?? [])
        if (data.devices?.length > 0) setActiveDevice(data.devices[0])
      })
      .catch(err => { if (err === 401) router.push('/auth/login') })
      .finally(() => setLoading(false))
  }, [router])

  // Polling de leituras quando device ativo muda
  const fetchReadings = useCallback(async (deviceId: string) => {
    const res = await fetch(`/api/readings?device_id=${deviceId}&limit=60`)
    if (!res.ok) return
    const data = await res.json() as { readings: Reading[] }
    const list: Reading[] = data.readings ?? []
    setReadings(list)
    if (list.length > 0) setLiveReading(list[list.length - 1])
  }, [])

  useEffect(() => {
    if (!activeDevice) return

    fetchReadings(activeDevice.id)

    pollRef.current = setInterval(() => fetchReadings(activeDevice.id), POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeDevice, fetchReadings])

  // ─── Métricas derivadas ────────────────────────────────────────────────────
  const avgWatts = readings.length
    ? readings.reduce((s, r) => s + r.watts, 0) / readings.length
    : 0

  const maxWatts = readings.length
    ? Math.max(...readings.map(r => r.watts))
    : 0

  const estimatedKwh = (avgWatts * 24) / 1000   // estimativa diária
  const estimatedCost = estimatedKwh * 0.85      // R$ 0,85/kWh (média Brasil 2024)

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Carregando...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L4 8v12l10 6 10-6V8L14 2z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
            <path d="M14 8v6l4 3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>EnerTrack</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/onboarding" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 13 }}>
            + Device
          </Link>
          <button
            onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/auth/login'))}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>

        {/* Sem devices */}
        {devices.length === 0 && (
          <EmptyState />
        )}

        {devices.length > 0 && (
          <>
            {/* Seletor de device */}
            {devices.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {devices.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDevice(d)}
                    className={`btn ${activeDevice?.id === d.id ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    {d.name}
                    {d.location && <span style={{ opacity: 0.6, marginLeft: 6 }}>· {d.location}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Leitura em tempo real */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <h2 style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Potência atual
                </h2>
                <LiveDot active={!!liveReading} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontSize: 56, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: liveReading ? 'var(--accent)' : 'var(--muted)',
                  letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {liveReading ? liveReading.watts.toFixed(1) : '—'}
                </span>
                <span style={{ fontSize: 20, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>W</span>
              </div>
              {liveReading && (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  {liveReading.irms.toFixed(2)} A · atualizado há poucos segundos
                </p>
              )}
            </div>

            {/* Cards de métricas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12, marginBottom: 28,
            }}>
              <MetricCard label="Média (última hora)" value={avgWatts.toFixed(0)} unit="W" />
              <MetricCard label="Pico" value={maxWatts.toFixed(0)} unit="W" color="var(--warn)" />
              <MetricCard label="Estimativa diária" value={estimatedKwh.toFixed(2)} unit="kWh" />
              <MetricCard label="Custo estimado/dia" value={`R$ ${estimatedCost.toFixed(2)}`} unit="" />
            </div>

            {/* Gráfico de barras simples (CSS) */}
            {readings.length > 0 && (
              <div className="card">
                <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Histórico — últimas {readings.length} leituras
                </p>
                <MiniChart readings={readings} />
              </div>
            )}

            {readings.length === 0 && activeDevice && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                  Aguardando leituras do dispositivo...
                </p>
                <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                  O EnerTrack envia dados a cada {POLL_INTERVAL / 1000}s quando está online
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function LiveDot({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: active ? 'var(--accent)' : 'var(--muted)',
      boxShadow: active ? '0 0 0 2px rgba(0,212,160,0.25)' : 'none',
    }} />
  )
}

function MetricCard({ label, value, unit, color = 'var(--text)' }: {
  label: string; value: string; unit: string; color?: string
}) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{unit}</span>}
      </div>
    </div>
  )
}

function MiniChart({ readings }: { readings: Reading[] }) {
  const max = Math.max(...readings.map(r => r.watts), 1)
  const slice = readings.slice(-48)  // máx 48 barras

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
      {slice.map((r, i) => {
        const h = Math.max((r.watts / max) * 80, 2)
        const isLast = i === slice.length - 1
        return (
          <div
            key={r.recorded_at}
            title={`${r.watts.toFixed(1)} W`}
            style={{
              flex: 1,
              height: h,
              borderRadius: 3,
              background: isLast ? 'var(--accent)' : 'var(--bg-3)',
              border: `1px solid ${isLast ? 'var(--accent)' : 'var(--border)'}`,
              transition: 'height 0.3s ease',
            }}
          />
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 400, gap: 16, textAlign: 'center',
    }}>
      <svg width="48" height="48" viewBox="0 0 28 28" fill="none">
        <path d="M14 2L4 8v12l10 6 10-6V8L14 2z" stroke="var(--border-hi)" strokeWidth="1.5" fill="none"/>
        <path d="M14 8v6l4 3" stroke="var(--border-hi)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div>
        <p style={{ fontWeight: 600, fontSize: 16 }}>Nenhum dispositivo ainda</p>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          Adicione seu primeiro EnerTrack para começar a monitorar
        </p>
      </div>
      <Link href="/onboarding" className="btn btn-primary">
        Adicionar dispositivo
      </Link>
    </div>
  )
}