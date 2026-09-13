import XeniaDashboard from '@/components/pages/dashboard'
import React, { Suspense } from 'react'

export default function page() {
  return (
    // Suspense wajib: halaman ini membaca URL search params (nuqs)
    <Suspense>
      <XeniaDashboard />
    </Suspense>
  )
}
