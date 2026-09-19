/**
 * lib/academic-season.ts
 * Central helper for the "academic season" boundary.
 *
 * The platform keeps historical attendance, absences and memorization records,
 * but the live counters (attendance ratios, absences count, memorization points)
 * only count records on/after `academic_season_start`. When an admin archives the
 * year and starts a new season, this boundary is advanced so the new season's
 * counters restart from zero. Memorization sessions themselves are NEVER deleted,
 * so each student's memorization record keeps following them through their path.
 */
import 'server-only'
import { db } from '@/db'
import { settings } from '@/db/schemas/schema'
import { eq, sql } from 'drizzle-orm'

// Fallback used only when the setting is missing or empty. Kept far in the past
// so existing data still counts until an admin explicitly starts a new season.
export const DEFAULT_SEASON_START = '1970-01-01'

/** Read the current season start date (ISO `YYYY-MM-DD`) from settings. */
export async function getSeasonStart(): Promise<string> {
  const rows = await db.select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'academic_season_start'))
  const raw = rows[0]?.value?.trim()
  if (!raw) return DEFAULT_SEASON_START
  // Validate the date; fall back to the default if malformed.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
    return DEFAULT_SEASON_START
  }
  return raw
}

/** Build a Drizzle SQL condition restricting `dateColumn` to the current season. */
export function afterSeasonStart(dateColumn: any, start: string) {
  return sql`${dateColumn} >= ${start}::date`
}
