import { adminLogin } from '@/services/auth/auth.service'
import { ApiErrorResponse } from '@/types/auth/api'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'Invalid email or password. Please try again.',
  'Account not verified': 'Your account has not been verified yet.',
}

function parseLoginError(error: unknown): string | null {
  if (!error) return null

  if (isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.errors?.[0]?.message
    return (
      (apiMessage && ERROR_MESSAGES[apiMessage]) ??
      apiMessage ??
      'Terjadi kesalahan. Silakan coba lagi.'
    )
  }

  return 'Terjadi kesalahan. Silakan coba lagi.'
}

export function useAdminLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const mutation = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => {
      toast.success(`Welcome, ${data.user.name}`)

      const redirect = searchParams.get('redirect')
      // guard: cuma terima internal path, tolak URL eksternal (open redirect)
      const target =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : '/dashboard'

      router.push(target)
    },
  })

  return {
    ...mutation,
    errorMessage: parseLoginError(mutation.error),
  }
}