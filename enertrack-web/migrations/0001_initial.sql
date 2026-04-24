-- Migration 0001: schema inicial EnerTrack
-- Aplicar com: wrangler d1 migrations apply enertrack-db

CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,          -- bcrypt hash
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS devices (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mac_address  TEXT NOT NULL UNIQUE, -- identificador vindo do firmware
    name         TEXT NOT NULL DEFAULT 'EnerTrack',
    location     TEXT,                 -- ex: "Quadro principal", "Cozinha"
    active       INTEGER DEFAULT 1,
    registered_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS energy_readings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    irms       REAL NOT NULL,          -- Corrente RMS (A)
    watts      REAL NOT NULL,          -- Potência aparente (W)
    recorded_at INTEGER DEFAULT (unixepoch())
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_readings_device_time
    ON energy_readings(device_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_devices_user
    ON devices(user_id);
