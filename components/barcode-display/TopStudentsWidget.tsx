'use client'

import { useEffect, useState, memo } from 'react'

interface TopStudent {
  id: number
  name: string
  studentNumber: string
  absences: number
  ratingScore: number
  score: number
}

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
const COLORS = ['#ca8a04', '#6b7280', '#b45309', '#64748b', '#64748b']
const BG_COLORS = ['rgba(202, 138, 4, 0.1)', 'rgba(45, 109, 236, 0.1)', 'rgba(102, 175, 97, 0.1)', 'rgba(100, 116, 139, 0.1)', 'rgba(100, 116, 139, 0.1)']

const TopStudentsWidget = memo(function TopStudentsWidget() {
  const [students, setStudents] = useState<TopStudent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      try {
        const response = await fetch('/api/dashboard/top-students', {
          cache: 'no-store',
        })
        if (!response.ok) return

        const data = await response.json()
        if (cancelled || !Array.isArray(data)) return

        // Keep the current list rendered while the next ranking is fetched.
        // React replaces it atomically only after the fresh response arrives.
        setStudents(data.slice(0, 5))
      } catch {
        // Keep the last successful ranking visible during transient failures.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => {
      void refresh()
    }, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">لا توجد بيانات كافية</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {students.map((student, idx) => (
        <div
          key={student.id}
          className="flex items-center gap-3 p-3 rounded-lg border transition-all"
          style={{
            background: BG_COLORS[idx],
            borderColor: COLORS[idx] + '44',
          }}
        >
          <div className="text-3xl font-bold flex-shrink-0">{MEDALS[idx]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate text-sm">{student.name}</p>
            <p className="text-gray-400 text-xs font-mono">{student.studentNumber}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-lg" style={{ color: COLORS[idx] }}>
              {student.score.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">غياب: {student.absences}</p>
          </div>
        </div>
      ))}
    </div>
  )
})

export default TopStudentsWidget
