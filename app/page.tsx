import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/db'
import { settings } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import LandingPage from '@/components/LandingPage'

export default async function Home() {
  const session = await getSession()

  // If logged in → go to dashboard immediately
  if (session) {
    redirect('/dashboard')
  }

  // Check if landing page is enabled.
  // Database reads are wrapped so the entry point never hard-fails when the
  // database is temporarily unreachable (e.g. during preview / offline); when
  // unavailable we fall back to showing the landing page instead of an error.
  let landingEnabled = true
  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'landing_enabled'))
      .limit(1)
    landingEnabled = row?.value === 'true'
  } catch {
    // DB unreachable → keep the landing page visible rather than crashing.
  }

  if (!landingEnabled) {
    redirect('/login')
  }

  return <LandingPage />
}
