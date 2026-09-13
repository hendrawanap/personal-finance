import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const { exportExcel } = createRequire(import.meta.url)(
  './exportExcel.ts',
) as typeof import('./exportExcel')

test('generates and downloads a native xlsx workbook', async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(
    URL,
    'createObjectURL',
  )
  const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(
    URL,
    'revokeObjectURL',
  )
  let savedBlob: Blob | undefined
  let clicked = false

  const anchor = {
    href: '',
    download: '',
    click: () => {
      clicked = true
    },
    remove: () => undefined,
  }

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => anchor,
      body: { appendChild: () => undefined },
    },
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      savedBlob = blob
      return 'blob:excel-test'
    },
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: () => undefined,
  })

  try {
    await exportExcel({
      fileName: 'loyalty-test.xlsx',
      sheetName: 'Members',
      columns: [
        { header: 'Name', key: 'name', value: (row) => row.name },
        {
          header: 'Points',
          key: 'points',
          numberFormat: '#,##0',
          value: (row) => row.points,
        },
      ],
      rows: [{ name: 'Ada', points: 1200 }],
    })

    assert.equal(clicked, true)
    assert.equal(anchor.download, 'loyalty-test.xlsx')
    assert.equal(savedBlob?.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    const bytes = new Uint8Array(await savedBlob!.arrayBuffer())
    assert.equal(String.fromCharCode(...bytes.slice(0, 2)), 'PK')
    assert.ok(bytes.length > 1000)
  } finally {
    if (originalDocument) {
      Object.defineProperty(globalThis, 'document', originalDocument)
    } else {
      Reflect.deleteProperty(globalThis, 'document')
    }
    if (originalCreateObjectUrl) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl)
    }
    if (originalRevokeObjectUrl) {
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrl)
    }
  }
})
