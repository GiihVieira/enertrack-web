# EnerTrack Web

EnerTrack Web is a real-time energy monitoring application built for the EnerTrack ecosystem. It connects the web experience, device onboarding flow, and backend ingestion layer so users can register devices, provision them over Bluetooth, and track recent power consumption data from a browser.

## Overview

This repository contains the web client and server-side API used by the EnerTrack project. The application is built with Next.js and prepared for deployment on Cloudflare using OpenNext. It stores users, devices, and readings in Cloudflare D1 and uses JWT-based authentication with an HTTP-only cookie.

## Features

- User registration and login
- Protected dashboard and onboarding routes
- Device registration and reassignment by MAC address
- Web Bluetooth onboarding flow for EnerTrack devices
- Real-time style dashboard with polling for recent readings
- Energy reading ingestion endpoint for firmware or backend clients
- Cloudflare-ready deployment using D1, KV, Wrangler, and OpenNext

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Cloudflare Workers
- OpenNext for Cloudflare
- Cloudflare D1
- Cloudflare KV
- Zod
- `jose` for JWT handling
- `bcryptjs` for password hashing

## Project Structure

```text
.
├── README.md
└── enertrack-web/
    ├── app/
    │   ├── api/
    │   ├── auth/
    │   ├── dashboard/
    │   └── onboarding/
    ├── components/
    ├── lib/
    ├── migrations/
    ├── package.json
    └── wrangler.toml
```

## Application Flow

1. Users create an account or log in.
2. Protected routes redirect unauthenticated users to the login page.
3. During onboarding, the browser connects to an EnerTrack device over Web Bluetooth.
4. Wi-Fi credentials are sent to the device.
5. The device is registered in the database using its MAC address.
6. The firmware posts energy readings to the API.
7. The dashboard polls the latest readings and displays current power, averages, peaks, and estimated daily usage.

## Prerequisites

- Node.js 20 or newer
- npm
- A Cloudflare account
- Wrangler CLI access
- A provisioned D1 database
- A KV namespace for session-related storage

## Getting Started

From the project root:

```bash
cd enertrack-web
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

Local development uses `.dev.vars`.

Example:

```env
JWT_SECRET="replace-with-a-secure-random-secret"
```

Notes:

- `.dev.vars` is for local development only.
- In production, store secrets with Wrangler:

```bash
wrangler secret put JWT_SECRET
```

## Database

The project includes a D1 migration in [`enertrack-web/migrations/0001_initial.sql`](./enertrack-web/migrations/0001_initial.sql).

It creates:

- `users`
- `devices`
- `energy_readings`

Run migrations locally:

```bash
cd enertrack-web
npm run db:migrate:local
```

Run migrations against the configured Cloudflare database:

```bash
cd enertrack-web
npm run db:migrate
```

## Available Scripts

Inside `enertrack-web/`:

- `npm run dev` starts the Next.js development server
- `npm run build` creates a production build
- `npm run start` starts the production server
- `npm run lint` runs linting
- `npm run preview` builds and previews the Cloudflare deployment locally
- `npm run deploy` builds and deploys with OpenNext for Cloudflare
- `npm run db:migrate` applies D1 migrations remotely
- `npm run db:migrate:local` applies D1 migrations locally

## API Summary

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Devices:

- `GET /api/devices`
- `POST /api/devices`

Readings:

- `GET /api/readings?device_id=<id>&limit=<n>`
- `POST /api/readings`

## Cloudflare Deployment

The Cloudflare deployment is configured in [`enertrack-web/wrangler.toml`](./enertrack-web/wrangler.toml).

Current bindings include:

- D1 database binding: `DB`
- KV namespace binding: `SESSIONS`
- secret: `JWT_SECRET`

To preview the Cloudflare build locally:

```bash
cd enertrack-web
npm run preview
```

To deploy:

```bash
cd enertrack-web
npm run deploy
```

## Browser Compatibility

The onboarding flow depends on Web Bluetooth, which is typically supported in Chromium-based browsers such as Chrome and Edge. Safari on iOS does not support Web Bluetooth, so device provisioning should be done on a compatible browser.

## Security Notes

- Authentication uses signed JWTs stored in an HTTP-only cookie.
- Passwords are hashed with `bcryptjs`.
- Production secrets should never be committed to the repository.
- The local fallback secret in development should be replaced before any shared or public deployment.

## License

This repository includes a `LICENSE` file at the root. Refer to it for licensing details.
