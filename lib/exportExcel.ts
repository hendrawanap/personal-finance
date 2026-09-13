export type ExcelCellValue = string | number | boolean | Date | null

export type ExcelColumn<Row> = {
  header: string
  key: string
  width?: number
  numberFormat?: string
  value: (row: Row) => ExcelCellValue
}

type ExportExcelOptions<Row> = {
  fileName: string
  sheetName: string
  columns: ExcelColumn<Row>[]
  rows: Row[]
}

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function exportExcel<Row>({
  fileName,
  sheetName,
  columns,
  rows,
}: ExportExcelOptions<Row>): Promise<void> {
  const excelJs = await import('exceljs')
  const Workbook = excelJs.default?.Workbook ?? excelJs.Workbook
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31))

  workbook.creator = 'Xenia Dashboard'
  workbook.created = new Date()

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 18,
  }))

  for (const row of rows) {
    worksheet.addRow(
      Object.fromEntries(
        columns.map((column) => [column.key, column.value(row)]),
      ),
    )
  }

  const header = worksheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F6B52' },
  }
  header.alignment = { vertical: 'middle' }
  header.height = 22

  columns.forEach((column, index) => {
    if (column.numberFormat) {
      worksheet.getColumn(index + 1).numFmt = column.numberFormat
    }
  })

  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: EXCEL_MIME_TYPE })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = href
  anchor.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(href)
}
