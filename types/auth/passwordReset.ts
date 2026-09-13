// Bentuk yang benar-benar dikirim dan diterima empat endpoint
// /v1/auth/password-reset/*. Semuanya @Public() di BE — pakai axiosPublic.

export interface RequestPasswordResetPayload {
  email: string
}

/**
 * Balasan untuk request DAN resend selalu sama, apa pun emailnya:
 * "If that email is registered, a reset link has been sent."
 *
 * Ini disengaja. Jangan pernah menampilkan pesan berbeda untuk email yang
 * tidak dikenal — form ini terbuka untuk publik, dan membedakannya membuat
 * siapa pun bisa menebak akun mana yang ada.
 */
export interface MessageResponse {
  message: string
}

export interface ValidateResetTokenResponse {
  valid: true
  expiresAt: string
}

export interface ResetPasswordPayload {
  token: string
  /** BE memakai nama `password`, bukan `newPassword`. Min 8, maks 72 karakter. */
  password: string
}