/// <reference types="@types/web-bluetooth" />

// UUIDs devem coincidir com config.h do firmware
const SERVICE_UUID      = '12345678-1234-1234-1234-123456789abc'
const CHAR_SSID_UUID    = '12345678-1234-1234-1234-123456789ab1'
const CHAR_PASS_UUID    = '12345678-1234-1234-1234-123456789ab2'
const CHAR_STATUS_UUID  = '12345678-1234-1234-1234-123456789ab3'
const CHAR_ENERGY_UUID  = '12345678-1234-1234-1234-123456789ab4'

export type BleStatus = 'idle' | 'scanning' | 'connecting' | 'connected' |
                        'sending' | 'wifi_connecting' | 'wifi_ok' | 'wifi_fail' | 'error'

export interface EnerTrackBle {
  deviceName: string
  macAddress: string
  sendWifiCredentials(ssid: string, password: string): Promise<void>
  onStatus(cb: (status: string) => void): void
  onEnergy(cb: (data: { irms: number; watts: number }) => void): void
  disconnect(): void
}

// Verifica suporte do browser
export function isBleSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

// Converte string em Uint8Array para escrita BLE
function strToBytes(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer
}

export async function scanAndConnect(): Promise<EnerTrackBle> {
  if (!isBleSupported()) {
    throw new Error('Web Bluetooth não suportado neste browser. Use Chrome ou Edge.')
  }

  // Solicita dispositivo ao usuário — abre o picker nativo do browser
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'EnerTrack' }],
    optionalServices: [SERVICE_UUID],
  })

  if (!device.gatt) throw new Error('GATT não disponível no dispositivo')

  const server  = await device.gatt.connect()
  const service = await server.getPrimaryService(SERVICE_UUID)

  const charSsid   = await service.getCharacteristic(CHAR_SSID_UUID)
  const charPass   = await service.getCharacteristic(CHAR_PASS_UUID)
  const charStatus = await service.getCharacteristic(CHAR_STATUS_UUID)
  const charEnergy = await service.getCharacteristic(CHAR_ENERGY_UUID)

  // Extrai MAC do nome do device (ex: "EnerTrack-A1B2" → "A1B2")
  const macSuffix = device.name?.split('-')[1] ?? 'UNKNOWN'

  return {
    deviceName: device.name ?? 'EnerTrack',
    macAddress: macSuffix,

    async sendWifiCredentials(ssid, password) {
      await charSsid.writeValueWithResponse(strToBytes(ssid))
      await charPass.writeValueWithResponse(strToBytes(password))
    },

    onStatus(cb) {
      charStatus.startNotifications()
      charStatus.addEventListener('characteristicvaluechanged', (e: Event) => {
        const val = (e.target as BluetoothRemoteGATTCharacteristic).value
        if (!val) return
        cb(new TextDecoder().decode(val))
      })
    },

    onEnergy(cb) {
      charEnergy.startNotifications()
      charEnergy.addEventListener('characteristicvaluechanged', (e: Event) => {
        const val = (e.target as BluetoothRemoteGATTCharacteristic).value
        if (!val) return
        try { cb(JSON.parse(new TextDecoder().decode(val))) } catch {}
      })
    },

    disconnect() {
      device.gatt?.disconnect()
    },
  }
}