import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EnerTrack Home',
  description: 'Monitoramento de consumo de energia elétrica',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
