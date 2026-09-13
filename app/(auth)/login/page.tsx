import { Suspense } from 'react'
import LoginPage from '@/components/pages/auth/login'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#142219]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#142219] via-[#24382B] to-[#4F6B52]" />
          <p className="relative text-sm text-[#F2ECDD]/70">Loading...</p>
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  )
}