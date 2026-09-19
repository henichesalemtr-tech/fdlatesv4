import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { readdir, unlink, stat } from 'fs/promises'
import { join } from 'path'

async function cleanDir(dirPath: string): Promise<{ count: number; bytes: number }> {
  let count = 0
  let bytes = 0
  try {
    const entries = await readdir(dirPath)
    for (const entry of entries) {
      try {
        const fullPath = join(dirPath, entry)
        const s = await stat(fullPath)
        if (s.isFile()) {
          bytes += s.size
          await unlink(fullPath)
          count++
        }
      } catch {
        // Skip files that can't be deleted
      }
    }
  } catch {
    // Directory may not exist
  }
  return { count, bytes }
}

export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let totalCount = 0
  let totalBytes = 0

  // Clean /tmp
  const tmp = await cleanDir('/tmp')
  totalCount += tmp.count
  totalBytes += tmp.bytes

  // Clean Next.js cache if accessible
  const nextCache = await cleanDir(join(process.cwd(), '.next', 'cache', 'fetch-cache'))
  totalCount += nextCache.count
  totalBytes += nextCache.bytes

  const spaceMb = (totalBytes / (1024 * 1024)).toFixed(2)

  return NextResponse.json({
    success: true,
    filesDeleted: totalCount,
    spaceFreedMb: parseFloat(spaceMb),
  })
}
