export function normalizeRegistrationRequestIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set<number>(value
    .map(item => Number(item))
    .filter((item): item is number => Number.isInteger(item) && item > 0)))
}
