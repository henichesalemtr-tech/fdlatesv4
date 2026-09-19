'use client'

import { useEffect, useState, memo } from 'react'

interface Schedule {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
  groupName: string
  subjectName: string
  teacherName: string
  roomName: string
}

// Helper to normalize Arabic strings (removes Hamza differences & extra spaces)
const normalizeArabicText = (text: string = ''): string => {
  return text
    .trim()
    .replace(/[أإآ]/g, 'ا') // Normalize Alif variations to simple 'ا'
    .replace(/\s+/g, ' ')
}

// Function to get today's day in Arabic (Normalized)
const getTodayDayInArabic = (): string => {
  // JS Index: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const daysArabic = ['الاحد', 'الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس', 'الجمعة', 'السبت']
  const today = new Date()
  return daysArabic[today.getDay()]
}

// Function to filter schedules by today's day and sort by time
const filterTodaySchedules = (allSchedules: Schedule[]): Schedule[] => {
  const todayDay = getTodayDayInArabic()
  
  return allSchedules
    .filter(schedule => {
      const dbDayNormalized = normalizeArabicText(schedule.dayOfWeek)
      const todayNormalized = normalizeArabicText(todayDay)
      return dbDayNormalized === todayNormalized
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

const AnnouncementTicker = memo(function AnnouncementTicker() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    fetch('/api/schedules')
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        const allSchedules = Array.isArray(data) ? data : []
        
        // 🔍 DEBUG: Check browser console (F12) to see what day your DB returns!
        console.log('Today is calculated as:', getTodayDayInArabic())
        console.log('All fetched schedules from API:', allSchedules)

        const todaySchedules = filterTodaySchedules(allSchedules)
        console.log('Filtered Today Schedules:', todaySchedules)

        setSchedules(todaySchedules)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch schedules:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (schedules.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % schedules.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [schedules.length])

  if (loading) {
    return <div className="h-12 bg-gray-800 rounded-lg animate-pulse" />
  }

  if (schedules.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-center">
        <p className="text-gray-400 text-sm">لا توجد جداول دراسية لهذا اليوم ({getTodayDayInArabic()})</p>
      </div>
    )
  }

  const current = schedules[currentIndex]

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/50 rounded-lg p-3 min-h-16">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="animate-fade-in">
            {/* Group Name + Subject/Time inline on first line */}
            <p className="text-green-300 font-bold text-sm truncate">
              فوج: {current.groupName}
            </p>
            {/* Subject and Time */}
            <p className="text-gray-300 text-xs mt-0.5 truncate">
              {current.subjectName} • {current.startTime} - {current.endTime}
            </p>
            {/* Room and Teacher */}
            <p className="text-gray-400 text-xs mt-0.5 truncate">
              🏫 {current.roomName || 'غير محدد'} | 👨‍🏫 {current.teacherName}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-400 flex-shrink-0 font-mono">
          {currentIndex + 1} / {schedules.length}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
      `}</style>
    </div>
  )
})

export default AnnouncementTicker
