import { z } from 'zod'

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default('https://api.chinooz.com'),
  EXPO_PUBLIC_APP_NAME: z.string().default('Chinooz'),
  EXPO_PUBLIC_USE_REAL_API: z.string().optional().default('false'),
})

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
  EXPO_PUBLIC_USE_REAL_API: process.env.EXPO_PUBLIC_USE_REAL_API,
})

if (!parsed.success && process.env.NODE_ENV !== 'production') {
  console.warn('[env] Invalid environment variables:', parsed.error.flatten().fieldErrors)
}

export const env = {
  apiUrl: parsed.success ? parsed.data.EXPO_PUBLIC_API_URL : 'https://api.chinooz.com',
  appName: parsed.success ? parsed.data.EXPO_PUBLIC_APP_NAME : 'Chinooz',
  useRealApi: parsed.success ? parsed.data.EXPO_PUBLIC_USE_REAL_API === 'true' : false,
}

export type Env = typeof env
