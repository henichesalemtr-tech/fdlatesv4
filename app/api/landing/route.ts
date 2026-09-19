import { NextResponse } from 'next/server'
import { db } from '@/db'
import { settings } from '@/db/schemas/schema'
import { inArray } from 'drizzle-orm'

// Public endpoint — no auth required (landing page is public)
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(
        inArray(settings.key, [
          'landing_enabled',
          'landing_title',
          'landing_subtitle',
          'landing_description',
          'landing_show_stats',
          'landing_stat1_label', 'landing_stat1_value',
          'landing_stat2_label', 'landing_stat2_value',
          'landing_stat3_label', 'landing_stat3_value',
          'landing_feature1_title', 'landing_feature1_desc', 'landing_feature1_icon',
          'landing_feature2_title', 'landing_feature2_desc', 'landing_feature2_icon',
          'landing_feature3_title', 'landing_feature3_desc', 'landing_feature3_icon',
          'landing_feature4_title', 'landing_feature4_desc', 'landing_feature4_icon',
          'landing_show_register_btn',
          'landing_register_btn_text',
          'landing_login_btn_text',
          'landing_footer_text',
          'school_name',
          'contact_phone',
          'contact_email',
          'primary_color',
        ])
      )

    const map: Record<string, string> = {}
    rows.forEach(r => { if (r.key && r.value !== null) map[r.key] = r.value })

    return NextResponse.json(map)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
