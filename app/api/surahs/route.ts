import { NextResponse } from 'next/server'
import { db } from '@/db'
import { surahs } from '@/db/schemas/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  const data = await db.select().from(surahs).orderBy(asc(surahs.number))
  return NextResponse.json(data)
}
