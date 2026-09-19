import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./TopStudentsWidget.tsx', import.meta.url), 'utf8')

describe('TopStudentsWidget polling contract', () => {
  it('refreshes every 30 seconds without exposing a refresh control', () => {
    expect(source).toContain('window.setInterval(() =>')
    expect(source).toContain('}, 30_000)')
    expect(source).toContain("cache: 'no-store'")
    expect(source).toContain('window.clearInterval(intervalId)')
    expect(source).not.toMatch(/Refresh|تحديث/)
  })

  it('keeps the previous ranking visible while a refresh is in flight or fails', () => {
    expect(source).toContain('Keep the current list rendered while the next ranking is fetched.')
    expect(source).toContain('Keep the last successful ranking visible during transient failures.')
    expect(source).toContain('setStudents(data.slice(0, 5))')
    expect(source).not.toContain('setStudents([])')
  })
})
