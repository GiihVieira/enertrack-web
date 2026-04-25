import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

// Ativa bindings D1/KV em desenvolvimento local (npm run dev)
initOpenNextCloudflareForDev()

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '192.168.1.*',
    '192.168.0.*',
    '10.0.0.*',
  ],
}

export default nextConfig
