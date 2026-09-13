import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import toast from 'react-hot-toast'
import qs from 'qs'
import { v } from './apiVersion'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const isBrowser = typeof window !== 'undefined'

// ── Helper token & bahasa ──
// Self-contained biar nggak gantung ke util yang belum ada di xenia.
// Ganti ke util-mu sendiri kalau nanti sudah punya (mis. getAccessTokenClient).
const getAccessToken = (): string | null =>
  (getCookie('accessToken') as string | undefined) ?? null

const getRefreshToken = (): string | null =>
  (getCookie('refreshToken') as string | undefined) ?? null

const getLanguage = (): string => {
  if (!isBrowser) return 'id'
  return localStorage.getItem('lang') ?? 'id'
}

// ── State buat antre request saat token lagi di-refresh ──
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token available')

    const response = await axios.post(
      `${API_BASE_URL}${v('auth', '/refresh')}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      },
    )

    // ⚠️ xenia membungkus response (lihat catatan #1): { data: {...}, errors, meta }
    const payload = response.data?.data ?? response.data
    const newAccessToken = payload?.accessToken
    const newRefreshToken = payload?.refreshToken

    if (newAccessToken) {
      setCookie('accessToken', newAccessToken)
      if (newRefreshToken) setCookie('refreshToken', newRefreshToken)
      return newAccessToken
    }
    return null
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return null
  }
}

/**
 * ===============================
 * axiosPublic — endpoint tanpa token
 * (login, register, check-email, dll.)
 * ===============================
 */
export const axiosPublic: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

axiosPublic.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers['x-lang'] = getLanguage()
    return config
  },
  (error) => Promise.reject(error),
)

axiosPublic.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const data = error.response?.data as
      | {
        errors?: { code?: string; message?: string }[] | null
        meta?: { message?: string }
      }
      | undefined

    const message =
      data?.errors?.find((e) => e?.message)?.message ??
      data?.meta?.message ??
      'Terjadi kesalahan'

    if (status && status >= 400) {
      toast.error(status >= 500 ? `Server error: ${message}` : message)
    }
    return Promise.reject(error)
  },
)

/**
 * ===============================
 * axiosPrivate — endpoint butuh token
 * Auto-attach access token + auto-refresh saat 401.
 * ===============================
 */
export const axiosPrivate: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

axiosPrivate.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    config.headers['x-lang'] = getLanguage()
    return config
  },
  (error) => Promise.reject(error),
)

axiosPrivate.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }
    const status = error.response?.status
    const data = error.response?.data as
      | {
        errors?: { code?: string; message?: string }[] | null
        meta?: { message?: string }
      }
      | undefined

    const message =
      data?.errors?.find((e) => e?.message)?.message ??
      data?.meta?.message ??
      'Terjadi kesalahan'

    // ── 401: coba refresh token sekali ──
    if (status === 401 && originalRequest && !originalRequest._retry) {
      // Kalau refresh lagi jalan, antre dulu sampai selesai
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return axiosPrivate(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()

        if (newToken) {
          processQueue(null, newToken)
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
          }
          return axiosPrivate(originalRequest)
        }

        // Refresh gagal → bersihkan sesi & tendang ke login
        processQueue(error, null)
        deleteCookie('accessToken')
        deleteCookie('refreshToken')
        toast.error('Sesi kamu sudah habis, silakan login ulang')
        if (isBrowser) {
          setTimeout(() => {
            window.location.href = '/login'
          }, 1500)
        }
        return Promise.reject(error)
      } catch (refreshError) {
        processQueue(error, null)
        deleteCookie('accessToken')
        deleteCookie('refreshToken')
        toast.error('Sesi kamu sudah habis, silakan login ulang')
        if (isBrowser) {
          setTimeout(() => {
            window.location.href = '/login'
          }, 1500)
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // ── 403: ditolak PermissionsGuard, bukan kesalahan input ──
    // Pesan mentah dari Nest ('Forbidden resource') tidak memberi tahu apa pun
    // ke orang yang membacanya, jadi diganti kalimat yang menyebut apa yang
    // harus dilakukan. Halaman yang mau menampilkan panel khusus bisa memakai
    // isForbidden() dari lib/apiError.ts.
    if (status === 403) {
      toast.error(
        'Kamu tidak punya akses untuk aksi ini. Hubungi administrator kalau seharusnya punya.',
      )
      return Promise.reject(error)
    }

    // ── Error lain (400, 404, 5xx) ──
    if (status && status >= 400 && status !== 401) {
      toast.error(status >= 500 ? `Server error: ${message}` : message)
    }
    return Promise.reject(error)
  },
)

/**
 * Helper build query string, mis. buildQuery({ page: 1, limit: 10 })
 * → "?page=1&limit=10"
 */
export const buildQuery = <T extends Record<string, unknown>>(
  params?: T,
): string => (params ? `?${qs.stringify(params)}` : '')
