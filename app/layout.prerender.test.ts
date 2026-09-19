import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8')
const attendanceLayoutSource = readFileSync(
  new URL('./attendance/layout.tsx', import.meta.url),
  'utf8',
)
const clientWrapperSources = [
  readFileSync(new URL('../components/AgentationClient.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../components/ToasterClient.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../components/HappySeedsWatermarkClient.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('../components/MobileLayoutClient.tsx', import.meta.url), 'utf8'),
]

describe('prerender client boundaries', () => {
  it('keeps browser-only root components behind no-SSR client wrappers', () => {
    expect(layoutSource).toContain('<AgentationClient />')
    expect(layoutSource).toContain('<ToasterClient />')
    expect(layoutSource).toContain('<HappySeedsWatermarkClient />')
    expect(clientWrapperSources).toHaveLength(4)
    for (const source of clientWrapperSources) {
      expect(source).toContain("'use client'")
      expect(source).toContain('{ ssr: false }')
    }
  })

  it('marks the authenticated attendance segment as dynamic', () => {
    expect(attendanceLayoutSource).toContain('export const dynamic = \'force-dynamic\'')
    expect(attendanceLayoutSource).toContain('@/components/MobileLayoutClient')
  })
})
