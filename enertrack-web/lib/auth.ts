import { SignJWT, jwtVerify } from 'jose'

const TOKEN_COOKIE = 'et_token'
const TOKEN_TTL    = 60 * 60 * 24 * 7  // 7 dias em segundos

function getSecret(env?: { JWT_SECRET?: string }) {
  const raw = env?.JWT_SECRET ?? process.env.JWT_SECRET ?? 'dev-insecure-secret'
  return new TextEncoder().encode(raw)
}

export interface JwtPayload {
  sub: string    // user id
  email: string
  name: string
}

export async function signToken(payload: JwtPayload, env?: { JWT_SECRET?: string }) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(getSecret(env))
}

export async function verifyToken(
  token: string,
  env?: { JWT_SECRET?: string }
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(env))
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

export function tokenCookieHeader(token: string) {
  return `${TOKEN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${TOKEN_TTL}; Path=/`
}

export function clearCookieHeader() {
  return `${TOKEN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`
}

export { TOKEN_COOKIE }
