/**
 * Platform-agnostic HTTP client.
 *
 * Uses the Fetch API which is available in:
 *  - Browsers (window.fetch)
 *  - Next.js server components / route handlers (global fetch)
 *  - React Native (global fetch, polyfilled by Expo/Metro)
 *
 * On React Native, `AbortController` and `Response` are available since RN 0.60+.
 */

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RETRIES = 2
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    // Allow the caller's signal to also abort
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      // Browser: auto-cleanup
    }
    // Clear timer when signal aborts (prevents event-loop leak in Node)
    controller.signal.addEventListener('abort', () => clearTimeout(timer))
    return controller.signal
  }
  // Fallback: no AbortController (very old runtime) — no timeout
  return undefined as unknown as AbortSignal
}

async function doFetch(
  url: string,
  options: RequestOptions,
  attempt: number,
  maxRetries: number,
): Promise<Response> {
  const method = options.method ?? 'GET'
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  }

  let body: BodyInit | undefined
  if (options.body !== undefined && method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  // Combine timeout signal with caller-provided signal
  const signals: AbortSignal[] = []
  if (options.signal) signals.push(options.signal)
  const ts = timeoutSignal(timeoutMs)
  if (ts) signals.push(ts)

  let signal: AbortSignal | undefined
  if (signals.length === 1) {
    signal = signals[0]
  } else if (signals.length > 1 && typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
    signal = AbortSignal.any(signals)
  } else {
    signal = signals[0]
  }

  let response: Response
  try {
    response = await fetch(url, { method, headers, body, signal })
  } catch (err) {
    // Network error or abort — retry if attempts remain
    if (attempt < maxRetries && !signals.some(s => s?.aborted)) {
      await sleep(Math.min(500 * 2 ** attempt, 2000))
      return doFetch(url, options, attempt + 1, maxRetries)
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408)
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    )
  }

  if (response.status === 401) {
    throw new ApiError('Unauthorized', 401)
  }

  if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
    await sleep(Math.min(500 * 2 ** attempt, 2000))
    return doFetch(url, options, attempt + 1, maxRetries)
  }

  if (!response.ok) {
    let errorBody: unknown
    try {
      errorBody = await response.json()
    } catch {
      errorBody = await response.text().catch(() => undefined)
    }
    const message =
      (errorBody && typeof errorBody === 'object' && 'message' in errorBody
        ? String((errorBody as { message: string }).message)
        : undefined) ?? `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, errorBody)
  }

  return response
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface ApiClientConfig {
  baseUrl: string
  maxRetries?: number
  defaultTimeoutMs?: number
  getAuthToken?: () => string | null | undefined
  /** Called once on a 401 to obtain a fresh access token. If it resolves to a
   *  token, the original request is retried a single time with the new token.
   *  If it resolves null or rejects, the 401 propagates to the caller.
   *  Concurrent 401s share a single refresh (single-flight) to avoid stampede. */
  refreshAuthToken?: () => Promise<string | null>
}

export class ApiClient {
  private readonly baseUrl: string
  private readonly maxRetries: number
  private readonly defaultTimeoutMs: number
  private readonly getAuthToken?: () => string | null | undefined
  private readonly refreshAuthToken?: () => Promise<string | null>
  /** Single-flight refresh promise — concurrent 401s await the same refresh. */
  private refreshPromise: Promise<string | null> | null = null

  constructor(config: ApiClientConfig) {
    // Strip trailing slash for consistent URL joining
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
    this.getAuthToken = config.getAuthToken
    this.refreshAuthToken = config.refreshAuthToken
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    if (params) {
      const search = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          search.append(key, String(value))
        }
      }
      const qs = search.toString()
      if (qs) url += `?${qs}`
    }
    return url
  }

  /** Run a single refresh, deduped across concurrent 401s. */
  private async runRefresh(): Promise<string | null> {
    if (!this.refreshAuthToken) return null
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshAuthToken().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  async request<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path)
    const headers: Record<string, string> = { ...options?.headers }
    const token = this.getAuthToken?.()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await doFetch(
        url,
        {
          ...options,
          headers,
          timeoutMs: options?.timeoutMs ?? this.defaultTimeoutMs,
        },
        0,
        this.maxRetries,
      )

      // 204 No Content or empty body
      if (response.status === 204) {
        return undefined as T
      }
      const text = await response.text()
      if (!text) return undefined as T
      return JSON.parse(text) as T
    } catch (err) {
      // Token refresh flow: on a 401, attempt a single refresh then retry the
      // original request once with the fresh token. Without this, a 401
      // propagates immediately and the user is forced to re-authenticate.
      if (err instanceof ApiError && err.status === 401 && this.refreshAuthToken) {
        const fresh = await this.runRefresh()
        if (fresh) {
          const retryHeaders: Record<string, string> = { ...options?.headers, Authorization: `Bearer ${fresh}` }
          const retryResponse = await doFetch(
            url,
            {
              ...options,
              headers: retryHeaders,
              timeoutMs: options?.timeoutMs ?? this.defaultTimeoutMs,
            },
            0,
            this.maxRetries,
          )
          if (retryResponse.status === 204) return undefined as T
          const retryText = await retryResponse.text()
          if (!retryText) return undefined as T
          return JSON.parse(retryText) as T
        }
      }
      throw err
    }
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'GET', signal })
  }

  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, signal })
  }

  patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body, signal })
  }

  put<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, signal })
  }

  delete<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', signal })
  }
}
