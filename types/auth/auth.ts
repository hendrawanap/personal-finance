export interface AdminLoginRequest {
  identifier: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

export interface AdminLoginData {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface ApiEnvelope<T> {
  data: T
  errors: unknown
  meta?: { success: boolean; message?: string }
}