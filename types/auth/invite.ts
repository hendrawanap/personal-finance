export interface VerifyInviteResponse {
  valid: true;
  name: string;
  /** Sudah disamarkan BE — halaman set-password bisa dibuka siapa saja. */
  email: string;
  expiresAt: string;
}

export interface AcceptInvitePayload {
  token: string;
  password: string;
}

export interface AcceptInviteResponse {
  message: string;
}