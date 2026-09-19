import { env } from './env'

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

class RequestError extends Error {
  constructor(public message: string, public status?: number) {
    super(message)
    this.name = 'RequestError'
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = typeof window === 'undefined' 
    ? env.NEXT_PUBLIC_API_URL 
    : window.location.origin

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || response.statusText,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error(`Fetch error for ${fullUrl}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const apiClient = {
  get: <T>(url: string, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body: unknown, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'DELETE' }),
}

/**
 * Normalise any Response into an ApiResponse<T>.
 * Handles 204 No Content, bare payloads, and envelope shapes.
 */
export async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  if (res.status === 204) return { success: true, data: undefined as T }
  let body: unknown
  try { body = await res.json() } catch { body = undefined }

  if (!res.ok) {
    const err =
      (body && typeof body === 'object' && 'error' in body)
        ? (body as Record<string, unknown>).error
        : res.statusText
    const msg = (err && typeof err === 'object' && 'message' in err)
      ? (err as Record<string, string>).message
      : String(err ?? res.statusText)
    return { success: false, error: msg }
  }

  if (body && typeof body === 'object' && 'success' in body) {
    const env = body as Record<string, unknown>
    if (!env.success) {
      const err = env.error
      const msg = (err && typeof err === 'object' && 'message' in err)
        ? (err as Record<string, string>).message
        : String(err ?? 'Unknown error')
      return { success: false, error: msg }
    }
    return { success: true, data: ('data' in env ? env.data : body) as T }
  }

  return { success: true, data: body as T }
}
