import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Chinooz Seller'),
  NEXT_PUBLIC_APP_ID: z.string().default('chinooz-seller-web'),
})

type ClientEnv = z.infer<typeof clientEnvSchema>

let _env: ClientEnv | null = null

export function getClientEnv(): ClientEnv {
  if (_env) return _env

  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_ID: process.env.NEXT_PUBLIC_APP_ID,
  })

  if (!parsed.success) {
    console.warn('[env] Invalid environment variables, using defaults:', parsed.error.flatten().fieldErrors)
    _env = clientEnvSchema.parse({})
    return _env
  }

  _env = parsed.data
  return _env
}
