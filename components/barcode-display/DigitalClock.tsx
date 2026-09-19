'use client'

import { useEffect, useState, memo } from 'react'

interface DigitalClockProps {
  timezone?: string
}

const DigitalClock = memo(function DigitalClock({ timezone = 'Africa/Algiers' }: DigitalClockProps) {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: timezone,
      })
      
      const dateFormatter = new Intl.DateTimeFormat('ar-DZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timezone,
      })

      setTime(formatter.format(now))
      setDate(dateFormatter.format(now))
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [timezone])

  if (!time) return <div className="h-24 bg-gray-800 rounded-2xl animate-pulse" />

  return (
    <div className="space-y-2">
      <div className="text-7xl font-bold text-white font-mono tracking-tight">
        {time}
      </div>
      <div className="text-lg text-gray-300">
        {date}
      </div>
    </div>
  )
})

export default DigitalClock
