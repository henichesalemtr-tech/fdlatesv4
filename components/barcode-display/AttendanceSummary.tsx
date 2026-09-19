'use client'

import { useEffect, useState, memo } from 'react'

interface DashboardStats {
  today: {
    present: number
    absent: number
    date: string
  }
}

const AttendanceSummary = memo(function AttendanceSummary() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!stats) {
    return <div className="text-gray-400 text-sm">لا توجد بيانات</div>
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-200 text-xs font-medium">حاضر اليوم</p>
          <p className="text-3xl font-bold text-green-300 mt-1">
            {stats.today.present}
          </p>
          <p className="text-xs text-green-400/70 mt-1">طالب</p>
        </div>

        <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200 text-xs font-medium">غائب اليوم</p>
          <p className="text-3xl font-bold text-red-300 mt-1">
            {stats.today.absent}
          </p>
          <p className="text-xs text-red-400/70 mt-1">طالب</p>
        </div>
      </div>
    </div>
  )
})

export default AttendanceSummary
