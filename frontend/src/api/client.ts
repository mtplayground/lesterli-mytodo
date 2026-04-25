import { useAuthStore } from '../stores/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')

type JsonBody = Record<string, unknown>

export type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: BodyInit | JsonBody | null
  headers?: HeadersInit
}

type ApiErrorResponse = {
  error?: string
  message?: string
}

export class ApiClientError extends Error {
  status: number
  error: string

  constructor(message: string, status: number, error: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.error = error
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = useAuthStore.getState().token
  let requestBody: BodyInit | null | undefined

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (isJsonBody(options.body)) {
    requestBody = JSON.stringify(options.body)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  } else {
    requestBody = options.body
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body: requestBody,
  })
  const payload = await parseResponse(response)

  if (!response.ok) {
    const apiError = normalizeError(payload, response.status)
    throw new ApiClientError(apiError.message, response.status, apiError.error)
  }

  return payload as T
}

export const apiClient = {
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  patch: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH' }),
  post: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST' }),
  put: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT' }),
}

function buildUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

function isJsonBody(value: ApiRequestOptions['body']): value is JsonBody {
  return Boolean(value) && !(value instanceof FormData) && typeof value === 'object'
}

function normalizeError(
  payload: unknown,
  status: number,
): {
  error: string
  message: string
} {
  if (isApiErrorResponse(payload)) {
    return {
      error: payload.error ?? 'request_failed',
      message: payload.message ?? `Request failed with status ${status}`,
    }
  }

  return {
    error: 'request_failed',
    message: `Request failed with status ${status}`,
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return typeof payload === 'object' && payload !== null
}
