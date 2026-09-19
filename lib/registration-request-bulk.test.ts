import { describe, expect, it } from 'vitest'
import { normalizeRegistrationRequestIds } from './registration-request-bulk'

describe('normalizeRegistrationRequestIds', () => {
  it('keeps positive integer IDs, removes duplicates, and rejects invalid values', () => {
    expect(normalizeRegistrationRequestIds([3, '3', 0, -4, 'bad', 2.5, 8])).toEqual([3, 8])
  })

  it('returns an empty list for missing or non-array input', () => {
    expect(normalizeRegistrationRequestIds(undefined)).toEqual([])
    expect(normalizeRegistrationRequestIds({ ids: [1] })).toEqual([])
    expect(normalizeRegistrationRequestIds([])).toEqual([])
  })
})
