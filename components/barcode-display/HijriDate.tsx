'use client'

import { useEffect, useState, memo } from 'react'
import { toHijri } from 'hijri-converter'

const HijriDate = memo(function HijriDate() {
  const [hijriDate, setHijriDate] = useState<string>('')

  useEffect(() => {
    try {
      const today = new Date()
      
      // toHijri expects (year, month [1-12], day)
      // returns { hy: year, hm: month, hd: day }
      const hijri = toHijri(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      )

      const months = [
        'محرّم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
        'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
        'رمضان', 'شوّال', 'ذو القعدة', 'ذو الحجة'
      ]

      const dayNum = hijri.hd
      const monthNum = hijri.hm
      const yearNum = hijri.hy

      setHijriDate(`${dayNum} ${months[monthNum - 1]} ${yearNum}`)
    } catch (error) {
      console.error('Hijri date error:', error)
      setHijriDate('---')
    }
  }, [])

  if (!hijriDate) return <div className="h-6 bg-gray-800 rounded animate-pulse w-40" />

  return (
    <div className="text-gray-400 text-base">
      <span className="text-gray-300 font-semibold">{hijriDate}</span> هـ
    </div>
  )
})

export default HijriDate
