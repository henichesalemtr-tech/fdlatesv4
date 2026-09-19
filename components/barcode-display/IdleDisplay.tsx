'use client'

import { memo } from 'react'
import DigitalClock from './DigitalClock'
import HijriDate from './HijriDate'
import PrayerDisplay from './PrayerDisplay'
import TopStudentsWidget from './TopStudentsWidget'
import AttendanceSummary from './AttendanceSummary'
import AnnouncementTicker from './AnnouncementTicker'

interface IdleDisplayProps {
  mosqueName?: string
  logoUrl?: string
}

const IdleDisplay = memo(function IdleDisplay({ 
  mosqueName = 'مؤسسة الفردوس',
  logoUrl = '/logo.png',
}: IdleDisplayProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #16a34a 0%, transparent 50%), radial-gradient(circle at 80% 80%, #15803d 0%, transparent 50%)',
          }} 
        />
      </div>

      {/* Grid layout: 75% left (prayer) | 25% right (students + stats) */}
      <div className="relative h-full flex overflow-hidden">
        
        {/* Left: 75% - Prayer Times */}
        <div className="w-[70%] flex flex-col p-8">
          {/* الصف العلوي: عمودين */}
          <div className="flex mb-6">
            {/* العمود الأيسر: اسم المسجد/الشعار + عنوان مواقيت الصلوات */}
      <div className="flex items-center gap-4">
        {logoUrl && <img src={logoUrl} alt="Logo" className="w-24 h-24 rounded-full" />}
        <div>
          <h2 className="text-4xl font-bold text-white">{mosqueName}</h2>
          <p className="text-gray-400 text-lg">مواقيت الصلوات</p>
        </div>
      </div>            {/* العمود الأيمن: الساعة والتاريخ الهجري */}
            <div className="w-1/2 flex flex-col pl-8 items-center text-center">
              <DigitalClock />
              <HijriDate />
            </div>
          </div>
          {/* الصف السفلي: عرض مواقيت الصلاة بعرض كامل */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <PrayerDisplay />
          </div>
        </div>

        {/* Right: 30% - Students + Stats + Announcements */}
        <div className="w-[30%] flex flex-col py-8 pl-8 overflow-hidden">

          {/* Top Students — box extended to show top 5 */}
          <div className="mb-4">
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <span>🏆</span> أفضل الطلاب
            </h3>
            <div className="max-h-100 overflow-y-auto scrollbar-hide">
              <TopStudentsWidget />
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="mb-4">
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <span>📊</span> حضور اليوم
            </h3>
            <AttendanceSummary />
          </div>

          {/* Announcements / جدول اليوم — reduced height to reclaim space */}
          <div className="flex-1 min-h-0">
            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
              <span>📅</span> جدول اليوم
            </h3>
            <div className="h-full max-h-[8.5rem]">
              <AnnouncementTicker />
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styling */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
})

export default IdleDisplay
