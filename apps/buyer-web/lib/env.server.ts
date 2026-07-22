import { z } from 'zod'

const serverEnvSchema = z.object({
  AUTH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

type ServerEnv = z.infer<typeof serverEnvSchema>

let _serverEnv: ServerEnv | null = null

/**
 * Server-only environment validation.
 *
 * Call this from server components / route handlers / middleware only.
 * In production it throws if `AUTH_SECRET` is missing or too short,
 * preventing the app from booting with an insecure configuration.
 */
export function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv

  const parsed = serverEnvSchema.safeParse({
    AUTH_SECRET: process.env.AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  })

  if (!parsed.success) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `[env.server] Missing or invalid server environment variables:\n` +
          parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n') +
          '\nGenerate AUTH_SECRET with: openssl rand -base64 48',
      )
    }
    _serverEnv = {
      AUTH_SECRET: 'dev-fallback-secret-please-set-AUTH_SECRET-min-32-chars',
      NODE_ENV: 'development',
    }
    return _serverEnv
  }

  _serverEnv = parsed.data
  return _serverEnv
}
