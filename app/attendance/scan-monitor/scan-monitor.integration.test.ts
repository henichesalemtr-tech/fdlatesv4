import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const barcodeRoute = readFileSync(
  new URL('../../api/attendance/barcode/route.ts', import.meta.url),
  'utf8',
)
const scanLogsRoute = readFileSync(new URL('../../api/scan-logs/route.ts', import.meta.url), 'utf8')
const monitorLayout = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8')
const monitorPage = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

function occurrences(source: string, value: string) {
  return source.split(value).length - 1
}

describe('scan monitor integration contract', () => {
  it('records barcode scans in the shared scan_logs table without breaking attendance', () => {
    expect(barcodeRoute).toContain('scanLogs')
    expect(barcodeRoute).toContain("scanType: 'barcode'")
    expect(barcodeRoute).toContain("import { getAlgeriaNow } from '@/lib/algeria-time'")
    expect(barcodeRoute).toContain('await db.insert(scanLogs).values')
    expect(barcodeRoute).toContain('Barcode scan-log error:')
  })

  it('requires an administrator for both scan-log read and write endpoints', () => {
    expect(occurrences(scanLogsRoute, "session.role !== 'admin'")).toBe(2)
    expect(monitorLayout).toContain("export const dynamic = 'force-dynamic'")
    expect(monitorLayout).toContain("if (session.role !== 'admin') redirect('/dashboard')")
  })

  it('polls the shared API without allowing browser cache to hide new scans', () => {
    expect(monitorPage).toContain("{ cache: 'no-store' }")
    expect(monitorPage).toContain('setInterval(fetchData, 30000)')
  })
})
