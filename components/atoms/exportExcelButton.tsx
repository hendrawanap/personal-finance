'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Download04Icon, Loading03Icon } from 'hugeicons-react'

import { Buttons } from '@/components/atoms/buttons'

type ExportExcelButtonProps = {
  onExport: () => Promise<void>
  disabled?: boolean
  label?: string
}

export function ExportExcelButton({
  onExport,
  disabled,
  label = 'Export Excel',
}: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (disabled || isExporting) return

    setIsExporting(true)
    try {
      await onExport()
      toast.success('Excel file downloaded.')
    } catch {
      toast.error('Failed to export the Excel file. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Buttons
      style="second"
      type="button"
      onClick={handleExport}
      disabled={disabled || isExporting}
      icon={
        isExporting ? (
          <Loading03Icon size={16} className="animate-spin" />
        ) : (
          <Download04Icon size={16} />
        )
      }
    >
      {isExporting ? 'Exporting...' : label}
    </Buttons>
  )
}
