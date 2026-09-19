'use client'

import { useEffect, useState, useRef } from 'react'
import { PrayerTimes, CalculationMethod, Coordinates } from 'adhan'
import HadithDisplay from './HadithDisplay'

type PrayerData = {
  name: string
  arabicName: string
  time: string
  iqamaMinutes: number
  icon: string
  isCurrent: boolean
}

interface PrayerDisplayProps {
  latitude?: number
  longitude?: number
  timezone?: string
  iqamaMinutes?: Record<string, number>
}

const PRAYER_NAMES: Record<string, { ar: string; icon: string }> = {
  fajr: { ar: 'الفجر', icon: '🌙' },
  dhuhr: { ar: 'الظهر', icon: '☀️' },
  asr: { ar: 'العصر', icon: '⛅' },
  maghrib: { ar: 'المغرب', icon: '🌅' },
  isha: { ar: 'العشاء', icon: '⭐' },
}

const DEFAULT_IQAMA_TIMES: Record<string, number> = {
  fajr: 20,
  dhuhr: 20,
  asr: 15,
  maghrib: 10,
  isha: 15,
}

// مدينة الدبيلة — ولاية الوادي، الجزائر (نفس إحداثيات رابط الخريطة المرفق)
// 33.5056745°N, 6.9379105°E — المنطقة الزمنية UTC+1 (Africa/Algiers، بلا توقيت صيفي)
const DEBILA_COORDS = { latitude: 33.5056745, longitude: 6.9379105 }

// نافذة يبدأ فيها الأذان عند بلوغ وقت الأذان (ثوانٍ)
const ADHAN_START_WINDOW_MS = 30 * 1000

export default function PrayerDisplay({
  latitude = DEBILA_COORDS.latitude,
  longitude = DEBILA_COORDS.longitude,
  timezone = 'Africa/Algiers',
  iqamaMinutes = DEFAULT_IQAMA_TIMES,
}: PrayerDisplayProps) {
  const [prayerTimes, setPrayerTimes] = useState<PrayerData[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [activePrayer, setActivePrayer] = useState<{
    name: string
    countdown: string
    icon: string
    progress: number // 0..1: التقدم من الأذان نحو الإقامة
    elapsed: boolean // صحيح عندما انتهى وقت الإقامة (يظهر التنبيه الوامض)
  } | null>(null)
  // عداد الوقت المتبقي على الصلاة القادمة (يظهر دائماً خارج نافذة الأذان→الإقامة)
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{
    name: string
    countdown: string
    icon: string
  } | null>(null)

  // إعدادات الأذان: تفعيل الصوت + مسار ملف الأذان (ثلقي من الإعدادات)
  const [adhanEnabled, setAdhanEnabled] = useState(true)
  const [adhanUrl, setAdhanUrl] = useState('/audio/adhan.mp3')
  const playedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // تحميل إعدادات صوت الأذان
  useEffect(() => {
    let active = true
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: { key: string; value: string | null }[]) => {
        const map: Record<string, string> = {}
        data.forEach(s => { if (s.key && s.value != null) map[s.key] = s.value })
        if (active) {
          if (map.adhan_sound_enabled != null) setAdhanEnabled(map.adhan_sound_enabled === 'true')
          if (map.adhan_audio_url) setAdhanUrl(map.adhan_audio_url)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    try {
      const coords = new Coordinates(latitude, longitude)
      // طريقة الحساب المعتمدة رسمياً في الجزائر (وزارة الشؤون الدينية وفق معتمِدمواقع مواقيت
      // مثل Mawaqit): زاوية الفجر 18° والعشاء 17° = طريقة رابطة العالم الإسلامي (MWL).
      // نضيف تحويضات الدقائق التي تطابق مواقيت المسجد المنشورة في صفحة Mawaqit
      // (الفجر +1، العصر +3، المغرب +4، العشاء +2) لمطابقة الأوقات الفعلية.
      const params = CalculationMethod.MuslimWorldLeague()
      params.adjustments = { fajr: 1, sunrise: 0, dhuhr: 0, asr: 3, maghrib: 4, isha: 2 }
      const today = new Date()

      const times = new PrayerTimes(coords, today, params)

      const prayerList = [
        { name: 'fajr', adhanTime: times.fajr, iqamaMinutes: iqamaMinutes.fajr || 10 },
        { name: 'dhuhr', adhanTime: times.dhuhr, iqamaMinutes: iqamaMinutes.dhuhr || 10 },
        { name: 'asr', adhanTime: times.asr, iqamaMinutes: iqamaMinutes.asr || 10 },
        { name: 'maghrib', adhanTime: times.maghrib, iqamaMinutes: iqamaMinutes.maghrib || 5 },
        { name: 'isha', adhanTime: times.isha, iqamaMinutes: iqamaMinutes.isha || 10 },
      ]

      const now = currentTime.getTime()
      let activePrayerData: any = null

      // تحديد الصلاة النشطة: إما ضمن نافذة الأذان→الإقامة (يعرض العداد)،
      // أو ضمن نافذة التنبيه بعد انتهاء وقت الإقامة (5 ثوانٍ).
      const IQAMA_ALERT_MS = 5 * 1000
      for (let i = 0; i < prayerList.length; i++) {
        const prayer = prayerList[i]
        const adhanAt = prayer.adhanTime.getTime()
        const iqamaAt = adhanAt + prayer.iqamaMinutes * 60000

        // نافذة العداد: من لحظة الأذان حتى وقت الإقامة
        if (now >= adhanAt && now < iqamaAt) {
          activePrayerData = { prayer, elapsed: false }
          break
        }
        // نافذة التنبيه: بعد انتهاء وقت الإقامة بـ5 ثوانٍ
        if (now >= iqamaAt && now < iqamaAt + IQAMA_ALERT_MS) {
          activePrayerData = { prayer, elapsed: true }
          break
        }
      }

      // الصلاة المعنية بوقت الإقامة (تتوهج حدودها دائماً): أقرب صلاة لم يحن وقت إقامتها.
      // بعد انتهاء وقت الإقامة ينتقل التوهج إلى الصلاة التالية، وبعد العشاء يعود إلى الفجر.
      let currentPrayerName = ''
      for (let i = 0; i < prayerList.length; i++) {
        const iqamaAt = prayerList[i].adhanTime.getTime() + prayerList[i].iqamaMinutes * 60000
        if (now < iqamaAt) {
          currentPrayerName = prayerList[i].name
          break
        }
      }
      if (!currentPrayerName && prayerList.length > 0) {
        currentPrayerName = prayerList[0].name
      }

      // حساب البيانات
      const prayers: PrayerData[] = prayerList.map(prayer => ({
        name: prayer.name,
        arabicName: PRAYER_NAMES[prayer.name].ar,
        time: formatTime(prayer.adhanTime),
        iqamaMinutes: prayer.iqamaMinutes,
        icon: PRAYER_NAMES[prayer.name].icon,
        isCurrent: prayer.name === currentPrayerName,
      }))

      setPrayerTimes(prayers)

      // عداد الوقت المتبقي على الصلاة القادمة (أقرب أذان لم يحن بعد)
      let nextAdhanData: { adhanTime: Date; name: string } | null = null
      for (let i = 0; i < prayerList.length; i++) {
        if (prayerList[i].adhanTime.getTime() > now) {
          nextAdhanData = { adhanTime: prayerList[i].adhanTime, name: prayerList[i].name }
          break
        }
      }
      // إن مضت كل صلوات اليوم، نعرض فجر الغد
      if (!nextAdhanData && prayerList.length > 0) {
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        const tomorrowTimes = new PrayerTimes(coords, tomorrow, params)
        nextAdhanData = { adhanTime: tomorrowTimes.fajr, name: 'fajr' }
      }

      if (nextAdhanData) {
        const diff = nextAdhanData.adhanTime.getTime() - now
        const hours = Math.floor(diff / 3600000)
        const minutes = Math.floor((diff % 3600000) / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setNextPrayerInfo({
          name: PRAYER_NAMES[nextAdhanData.name].ar,
          countdown: `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
          icon: '',
        })
      } else {
        setNextPrayerInfo(null)
      }

      // تشغيل صوت الأذان عند بلوغ وقت الأذان (مرة واحدة لكل أذان في اليوم)
      const todayKey = today.toDateString()
      if (adhanEnabled) {
        for (const prayer of prayerList) {
          const adhanAt = prayer.adhanTime.getTime()
          if (now >= adhanAt && now < adhanAt + ADHAN_START_WINDOW_MS) {
            const key = `${todayKey}-${prayer.name}`
            if (!playedRef.current.has(key)) {
              playedRef.current.add(key)
              const audio = new Audio(adhanUrl)
              audio.play().catch(() => {})
            }
          }
        }
      }

      // حساب العد التنازلي للإقامة + شريط التقدم (يظهر فقط أثناء نافذة الأذان→الإقامة)
      if (activePrayerData) {
        const prayer = activePrayerData.prayer
        const adhanTime = prayer.adhanTime.getTime()
        const iqamaTime = adhanTime + prayer.iqamaMinutes * 60000

        let countdown = ''
        let progress = 0

        if (!activePrayerData.elapsed) {
          const diff = iqamaTime - now
          const hours = Math.floor(diff / 3600000)
          const minutes = Math.floor((diff % 3600000) / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          countdown = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          // التقدم بين الأذان والإقامة (0..1)
          const totalWindow = prayer.iqamaMinutes * 60000
          const elapsed = Math.max(0, now - adhanTime)
          progress = totalWindow > 0 ? Math.min(1, elapsed / totalWindow) : 0
        }

        setActivePrayer({
          name: PRAYER_NAMES[prayer.name].ar,
          countdown,
          icon: '',
          progress,
          elapsed: activePrayerData.elapsed,
        })
      } else {
        setActivePrayer(null)
      }

      setLoading(false)
    } catch (error) {
      console.error('خطأ في حساب أوقات الصلاة:', error)
      setLoading(false)
    }
  }, [currentTime, latitude, longitude, iqamaMinutes, adhanEnabled, adhanUrl])

  if (loading) {
    return <div className="text-gray-400 text-center p-8">جاري التحميل...</div>
  }

  return (
    <div className="w-full">
      {/* العداد الدائم للوقت المتبقي على الصلاة القادمة — يظهر عندما لا يكون هناك
          نافذة أذان→إقامة نشطة ولا تنبيه إقامة */}
      {!activePrayer && nextPrayerInfo && (
        <div className="text-center mb-8 pb-6 border-b border-gray-600/30">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider">
            <span className="ml-3">{nextPrayerInfo.icon}</span>
            متبقي على صلاة {nextPrayerInfo.name}: {nextPrayerInfo.countdown}
          </h1>
          <p className="text-blue-300 text-base mt-2"> موعد أذان الصلاة القادمة</p>
        </div>
      )}

      {/* رسالة الصلاة النشطة: عدّاد الإقامة + شريط التقدم (فقط أثناء الأذان→الإقامة)،
          وعند انتهاء وقت الإقامة يومض الشريط 5 ثوانٍ كتنبيه ثم يختفي */}
      {activePrayer && !activePrayer.elapsed && (
        <div className="text-center mb-8 pb-6 border-b border-gray-600/30">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider">
            <span className="ml-3">{activePrayer.icon}</span>
            صلاة {activePrayer.name} بعد {activePrayer.countdown}
          </h1>
          <p className="text-green-300 text-base mt-2">⏳ المتبقي على إقامة الصلاة</p>
          {/* شريط التقدم نحو الإقامة */}
          <div className="max-w-md mx-auto mt-4">
            <div className="h-3 rounded-full bg-gray-700/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.round((activePrayer.progress || 0) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>🔊 الأذان</span>
              <span>🕌 الإقامة</span>
            </div>
          </div>
        </div>
      )}

      {activePrayer && activePrayer.elapsed && (
        <div className="text-center mb-8 pb-6 border-b border-gray-600/30">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider animate-pulse">
            🕌 حان وقت إقامة صلاة {activePrayer.name}
          </h1>
          <p className="text-amber-300 text-lg mt-2 animate-pulse">🔔 انتهى وقت الإقامة — يُقام للصلاة الآن</p>
          {/* الشريط الوامض كتنبيه */}
          <div className="max-w-md mx-auto mt-4">
            <div className="h-3 rounded-full bg-gray-700/60 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full w-full animate-pulse" />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>🔊 الأذان</span>
              <span>🕌 الإقامة</span>
            </div>
          </div>
        </div>
      )}

      {/* شبكة الصلوات الأفقية */}
      <div className="grid grid-cols-5 gap-4 md:gap-6 lg:gap-8 w-full">
        {prayerTimes.map((prayer) => (
          <div
            key={prayer.name}
            className={`flex flex-col items-center justify-center rounded-3xl p-6 md:p-8 transition-all duration-300 ${
              prayer.isCurrent
                ? 'bg-purple-900/25 border-2 border-purple-400/70 shadow-[0_0_26px_rgba(192,132,252,0.40)] ring-1 ring-purple-400/50'
                : 'bg-gray-900/50 border border-gray-700/50 hover:border-gray-600/50'
            }`}
          >
            {/* اسم الصلاة */}
            <p className={`text-lg md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 ${
              prayer.isCurrent ? 'text-white' : 'text-gray-300'
            }`}>
              {prayer.arabicName}
            </p>

            {/* الوقت - كبير جداً */}
            <p className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-4 ${
              prayer.isCurrent ? 'text-white' : 'text-white'
            }`}>
              {prayer.time}
            </p>

            {/* الإقامة في صندوق صغير */}
            <div className={`rounded-2xl px-4 md:px-5 py-2 md:py-3 text-center ${
              prayer.isCurrent
                ? 'bg-purple-900/60 border border-purple-300/30'
                : 'bg-gray-800/60 border border-gray-600/30'
            }`}>
              <p className={`text-lg md:text-xl lg:text-2xl font-bold ${
                prayer.isCurrent ? 'text-purple-100' : 'text-gray-300'
              }`}>
                {prayer.iqamaMinutes}+
              </p>
            </div>
          </div>
        ))}
      </div>
    <div className="mt-10">
      <HadithDisplay/>
    </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ar-DZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
