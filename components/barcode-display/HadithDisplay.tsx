'use client'

import { useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Hadith {
  id?: number
  text: string
  source: string
  narrator?: string
  category: string
}

interface HadithDisplayProps {
  interval?: number // بالميلي ثانية
}

const HadithDisplay = memo(function HadithDisplay({ interval = 15000 }: HadithDisplayProps) {
  const [hadiths, setHadiths] = useState<Hadith[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  // 1. جلب البيانات من مجلد public
  useEffect(() => {
    async function loadHadiths() {
      try {
        const response = await fetch('/data/hadiths.json')
        const data = await response.json()
        if (data.hadiths && data.hadiths.length > 0) {
          setHadiths(data.hadiths)
        }
      } catch (error) {
        console.error('Error loading hadiths:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHadiths()
  }, [])

  // 2. إدارة التبديل التلقائي
  useEffect(() => {
    if (hadiths.length === 0) return

    const hadithTimer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % hadiths.length)
    }, interval)

    return () => clearInterval(hadithTimer)
  }, [hadiths, interval])

  if (loading) {
    return (
      <div className="w-full bg-slate-900 rounded-3xl p-10 text-center text-gray-400">
        جاري تحميل الأحاديث...
      </div>
    )
  }

  if (hadiths.length === 0) return null

  const currentHadith = hadiths[currentIndex]

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hadith':
        return '📖'
      case 'dua':
        return '🤲'
      case 'sunnah':
        return '☀️'
      default:
        return '✨'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'hadith':
        return 'الأربعون النووية'
      case 'dua':
        return 'دعاء'
      case 'sunnah':
        return 'سنة'
      default:
        return 'حكمة'
    }
  }

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl px-5 py-2 shadow-2xl border border-slate-700/50">
      {/* رأس الحديث */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-sm">{getCategoryIcon(currentHadith.category)}</span>
          <span className="text-sm md:text-base font-bold text-amber-300">
            {getCategoryLabel(currentHadith.category)}
          </span>
        </div>
        <span className="text-xs md:text-sm text-gray-400 font-mono">
          {currentIndex + 1} / {hadiths.length}
        </span>
      </div>

      {/* نص الحديث الرئيسي */}
      <div className="mb-1 min-h-[85px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentHadith.text}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="text-lg font-bold text-white leading-relaxed text-center"
          >
            {currentHadith.text}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* المصدر والراوي */}
      <div className="flex flex-col items-center justify-center mb-2 gap-1">
        {currentHadith.narrator && (
          <p className="text-lg md:text-base text-gray-300">
            عن {currentHadith.narrator}
          </p>
        )}
        <p className="text-lg md:text-base text-amber-200 font-semibold">
           {currentHadith.source}
        </p>
      </div>
    </div>
  )
})

export default HadithDisplay
