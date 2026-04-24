'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { scanAndConnect, isBleSupported, type EnerTrackBle, type BleStatus } from '@/lib/ble'

// ─── Tipos e constantes ───────────────────────────────────────────────────────
type Step = 'intro' | 'scanning' | 'connected' | 'wifi' | 'provisioning' | 'success' | 'error'

const STEP_INDEX: Record<Step, number> = {
  intro: 0, scanning: 1, connected: 2, wifi: 3, provisioning: 4, success: 5, error: 5,
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()

  const [step,       setStep]       = useState<Step>('intro')
  const [ble,        setBle]        = useState<EnerTrackBle | null>(null)
  const [ssid,       setSsid]       = useState('')
  const [password,   setPassword]   = useState('')
  const [devName,    setDevName]    = useState('EnerTrack')
  const [statusMsg,  setStatusMsg]  = useState('')
  const [errorMsg,   setErrorMsg]   = useState('')
  const [deviceId,   setDeviceId]   = useState('')

  // ── Passo 1: escaneia e conecta via BLE ─────────────────────────────────────
  async function handleScan() {
    if (!isBleSupported()) {
      setErrorMsg('Seu browser não suporta Web Bluetooth. Use Chrome ou Edge.')
      setStep('error')
      return
    }

    setStep('scanning')
    setErrorMsg('')

    try {
      const device = await scanAndConnect()
      setBle(device)
      setDevName(device.deviceName)

      // Escuta status vindo do firmware
      device.onStatus(status => {
        setStatusMsg(status)
        if (status === 'wifi_ok')   { handleWifiSuccess(device) }
        if (status === 'wifi_fail') {
          setErrorMsg('O dispositivo não conseguiu conectar ao Wi-Fi. Verifique a senha.')
          setStep('wifi')
        }
      })

      setStep('connected')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('User cancelled')) {
        setStep('intro')  // Usuário fechou o picker — volta sem erro
      } else {
        setErrorMsg(msg)
        setStep('error')
      }
    }
  }

  // ── Passo 2: envia credenciais Wi-Fi ────────────────────────────────────────
  async function handleSendWifi() {
    if (!ble || !ssid) return
    setStep('provisioning')
    setStatusMsg('connecting')
    setErrorMsg('')

    try {
      await ble.sendWifiCredentials(ssid, password)
      // A partir daqui o firmware tenta conectar e notifica via BLE notify
      // handleWifiSuccess é chamado pelo listener onStatus acima
    } catch (err: unknown) {
      setErrorMsg('Falha ao enviar credenciais via Bluetooth.')
      setStep('wifi')
    }
  }

  // ── Passo 3: registra device no backend ─────────────────────────────────────
  async function handleWifiSuccess(device: EnerTrackBle) {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac_address: device.macAddress,
          name: device.deviceName,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setDeviceId(data.device?.id ?? '')
        device.disconnect()
        setStep('success')
      }
    } catch {
      // Registra falha mas não bloqueia — device já está online
      setStep('success')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const currentIdx = STEP_INDEX[step]

  return (
    <main className="page-center">
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                     fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}
          >
            ← Dashboard
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Adicionar dispositivo
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
            Conecte seu EnerTrack via Bluetooth
          </p>
        </div>

        {/* Step dots */}
        <div className="steps" style={{ marginBottom: 28 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`step-dot ${i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''}`}/>
          ))}
        </div>

        <div className="card animate-in" key={step}>
          <StepContent
            step={step}
            devName={devName}
            ssid={ssid} setSsid={setSsid}
            password={password} setPassword={setPassword}
            statusMsg={statusMsg}
            errorMsg={errorMsg}
            onScan={handleScan}
            onSendWifi={handleSendWifi}
            onRetry={() => { setStep('intro'); setBle(null) }}
            onFinish={() => router.push('/dashboard')}
          />
        </div>

        {/* Aviso Web Bluetooth */}
        {step === 'intro' && (
          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            Requer Chrome ou Edge — iOS Safari não suporta Web Bluetooth
          </p>
        )}
      </div>
    </main>
  )
}

// ─── Sub-componentes por step ─────────────────────────────────────────────────
function StepContent({
  step, devName, ssid, setSsid, password, setPassword,
  statusMsg, errorMsg, onScan, onSendWifi, onRetry, onFinish
}: {
  step: Step; devName: string
  ssid: string; setSsid: (v: string) => void
  password: string; setPassword: (v: string) => void
  statusMsg: string; errorMsg: string
  onScan: () => void; onSendWifi: () => void
  onRetry: () => void; onFinish: () => void
}) {
  if (step === 'intro') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <BleIcon size={64} />
      </div>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Pronto para conectar?</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          Certifique-se de que seu EnerTrack está ligado e próximo. O LED deve estar piscando, indicando que está em modo de configuração.
        </p>
      </div>
      <button className="btn btn-primary btn-full" onClick={onScan}>
        Buscar dispositivo
      </button>
    </div>
  )

  if (step === 'scanning') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 0' }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div className="pulse-ring" style={{ animationDelay: '0s' }} />
        <div className="pulse-ring" style={{ animationDelay: '0.6s' }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--bg-3)', borderRadius: '50%',
        }}>
          <BleIcon size={32} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 600 }}>Procurando dispositivos...</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          Selecione "EnerTrack-XXXX" na janela do browser
        </p>
      </div>
    </div>
  )

  if (step === 'connected') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(0,212,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <BleIcon size={22} color="var(--accent)" />
        </div>
        <div>
          <p style={{ fontWeight: 600 }}>{devName}</p>
          <span className="badge badge-ok">Conectado via BLE</span>
        </div>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>
        Dispositivo encontrado! Agora vamos configurar a rede Wi-Fi.
      </p>
      <button className="btn btn-primary btn-full" onClick={() => {}}>
        Configurar Wi-Fi →
      </button>
    </div>
  )

  if (step === 'wifi') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span className="badge badge-ok">BLE conectado</span>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>→ {devName}</span>
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600 }}>Configure o Wi-Fi</h2>

      {errorMsg && <p className="error-msg">{errorMsg}</p>}

      <div className="field">
        <label>Nome da rede (SSID)</label>
        <input
          type="text"
          placeholder="Minha Rede"
          value={ssid}
          onChange={e => setSsid(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label>Senha do Wi-Fi</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="off"
        />
      </div>
      <button
        className="btn btn-primary btn-full"
        onClick={onSendWifi}
        disabled={!ssid}
        style={{ marginTop: 4 }}
      >
        Enviar para o dispositivo
      </button>
    </div>
  )

  if (step === 'provisioning') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 0' }}>
      <WifiConnectingIcon />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 600 }}>Configurando Wi-Fi...</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          O dispositivo está tentando conectar à rede "{ssid}"
        </p>
        {statusMsg && (
          <span className="badge badge-info" style={{ marginTop: 10 }}>
            {statusMsg}
          </span>
        )}
      </div>
    </div>
  )

  if (step === 'success') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '16px 0' }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'rgba(0,212,160,0.12)', border: '1px solid rgba(0,212,160,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M6 14l6 6L22 8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: 18 }}>Tudo pronto!</p>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
          {devName} está online e já enviando leituras de energia.
        </p>
      </div>
      <button className="btn btn-primary btn-full" onClick={onFinish}>
        Ver dashboard
      </button>
    </div>
  )

  // error
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="error-msg">{errorMsg || 'Ocorreu um erro inesperado.'}</p>
      <button className="btn btn-outline btn-full" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  )
}

// ─── Ícones inline ─────────────────────────────────────────────────────────────
function BleIcon({ size = 24, color = 'var(--accent)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" strokeLinecap="round"/>
      <path d="M12 3v18M12 3l5 5-5 5M12 21l5-5-5-5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function WifiConnectingIcon() {
  return (
    <div style={{ position: 'relative', width: 64, height: 64 }}>
      <div className="pulse-ring" />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-3)', borderRadius: '50%',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="1.5">
          <path d="M1.5 8.5A16 16 0 0 1 22.5 8.5" strokeLinecap="round"/>
          <path d="M5 12a12 12 0 0 1 14 0" strokeLinecap="round"/>
          <path d="M8.5 15.5a7 7 0 0 1 7 0" strokeLinecap="round"/>
          <circle cx="12" cy="19" r="1" fill="var(--accent-2)"/>
        </svg>
      </div>
    </div>
  )
}
