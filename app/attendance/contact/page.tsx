'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type AbsenceRecord = {
  attendanceId: number
  status: string
  attendanceDate: string
  studentId: number
  studentFirstName: string
  studentLastName: string
  studentPhone: string | null
  guardianName: string | null
  startTime: string | null
  groupName: string | null
  subjectName: string | null
}

type ContactSettings = {
  countryCode: string
  msgAbsent: string
  msgLate: string
}

function formatPhone(phone: string | null | undefined, countryCode: string): string {
  if (!phone) return ''
  let p = phone.trim()
  if (p.startsWith('0')) p = p.slice(1)
  p = p.replace(/\s+/g, '')
  if (!p.startsWith('+')) {
    const cc = countryCode.replace('+', '')
    return cc + p
  }
  return p.replace('+', '')
}

function formatMessage(template: string, name: string, date: string, time?: string | null): string {
  return template
    .replace('{student_name}', name)
    .replace('{date}', date)
    .replace('{time}', time?.slice(0, 5) ?? '')
}

export default function ContactPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [absences, setAbsences] = useState<AbsenceRecord[]>([])
  const [settings, setSettings] = useState<ContactSettings>({
    countryCode: '+213',
    msgAbsent: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} غائب(ة) عن الحصة اليوم {date}. يرجى التواصل معنا للتوضيح.',
    msgLate: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} تأخر(ت) عن الحصة اليوم {date}.',
  })
  const [loading, setLoading] = useState(false)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)

  async function fetchAbsences() {
    setLoading(true)
    const res = await fetch(`/api/attendance/contact?date=${date}`)
    const data = await res.json()
    setAbsences(data.absences ?? [])
    if (data.settings) setSettings(data.settings)
    setLoading(false)
  }

  useEffect(() => { fetchAbsences() }, [date])

  const toggleCard = (id: number) => {
    setExpandedCard(expandedCard === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - متجاوب بالكامل */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3">
          <Link href="/attendance"
            className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm flex items-center justify-center md:justify-start gap-2 transition-colors w-full md:w-auto">
            <span>←</span> العودة لإدارة الحضور
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2">
            <span>📞</span> الاتصال بأولياء الأمور
          </h1>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 max-w-7xl mx-auto">
        {/* Date selector - متجاوب */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 sm:max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">اختر التاريخ</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent" 
              />
            </div>
            <button 
              onClick={fetchAbsences}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <span>🔍</span> بحث
            </button>
          </div>
        </div>

        {/* Summary - متجاوب */}
        {!loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 md:px-5 mb-5 flex items-start md:items-center gap-3 shadow-sm">
            <span className="text-yellow-600 text-xl mt-0.5 md:mt-0">⚠️</span>
            <div className="flex-1">
              <p className="text-yellow-800 font-bold text-sm md:text-base">
                {absences.length === 0
                  ? '✅ لا يوجد غياب أو تأخر في هذا اليوم'
                  : `${absences.length} حالة غياب/تأخر في ${date}`}
              </p>
              {absences.length > 0 && (
                <p className="text-yellow-600 text-xs mt-0.5">
                  غياب: {absences.filter(a => a.status === 'absent').length} |
                  تأخر: {absences.filter(a => a.status === 'late').length}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 text-center shadow-sm">
            <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">جاري التحميل...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && absences.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 text-center shadow-sm">
            <p className="text-5xl mb-4">✅</p>
            <p className="text-gray-500 font-medium">لا يوجد غياب أو تأخر مسجل في هذا اليوم</p>
          </div>
        )}

        {/* Desktop Table - يظهر فقط على الشاشات الكبيرة (md وما فوق) */}
        {!loading && absences.length > 0 && (
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-3 text-right text-gray-600 font-semibold">#</th>
                    <th className="p-3 text-right text-gray-600 font-semibold">الطالب</th>
                    <th className="p-3 text-right text-gray-600 font-semibold">الفوج / المادة</th>
                    <th className="p-3 text-right text-gray-600 font-semibold">الحالة</th>
                    <th className="p-3 text-right text-gray-600 font-semibold">الولي / الهاتف</th>
                    <th className="p-3 text-right text-gray-600 font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {absences.map((a, idx) => {
                    const studentName = `${a.studentFirstName} ${a.studentLastName}`
                    const targetPhone = a.studentPhone
                    const formattedPhone = formatPhone(targetPhone, settings.countryCode)
                    const msgTemplate = a.status === 'absent' ? settings.msgAbsent : settings.msgLate
                    const message = formatMessage(msgTemplate, studentName, a.attendanceDate, a.startTime)
                    const waLink = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}` : ''
                    const smsLink = formattedPhone ? `sms:+${formattedPhone}?body=${encodeURIComponent(message)}` : ''
                    const telLink = formattedPhone ? `tel:+${formattedPhone}` : ''

                    return (
                      <tr key={a.attendanceId} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-gray-500">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-gray-800">{studentName}</p>
                        </td>
                        <td className="p-3">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{a.groupName ?? '-'}</span>
                          <br />
                          <span className="text-xs text-gray-500 mt-0.5 inline-block">
                            {a.subjectName ?? '-'} {a.startTime ? `(${a.startTime.slice(0,5)})` : ''}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            a.status === 'absent' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-gray-800'
                          }`}>
                            {a.status === 'absent' ? 'غائب' : 'متأخر'}
                          </span>
                        </td>
                        <td className="p-3">
                          {a.guardianName && (
                            <p className="text-gray-700 text-xs font-medium mb-1">{a.guardianName}</p>
                          )}
                          {targetPhone ? (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                              {targetPhone}
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs">لا يوجد رقم</span>
                          )}
                        </td>
                        <td className="p-3">
                          {formattedPhone ? (
                            <div className="flex gap-1.5">
                              <a href={telLink}
                                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                                title="اتصال">
                                📞
                              </a>
                              <a href={waLink} target="_blank" rel="noreferrer"
                                className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                                title="واتساب">
                                💬 واتساب
                              </a>
                              <a href={smsLink}
                                className="bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                                title="رسالة نصية">
                                ✉️ SMS
                              </a>
                            </div>
                          ) : (
                            <span className="bg-red-100 text-red-500 px-2.5 py-1 rounded text-xs">رقم غير متوفر</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile Cards - تظهر فقط على الهاتف (أقل من md) */}
        {!loading && absences.length > 0 && (
          <div className="md:hidden space-y-3">
            {absences.map((a, idx) => {
              const studentName = `${a.studentFirstName} ${a.studentLastName}`
              const targetPhone = a.studentPhone
              const formattedPhone = formatPhone(targetPhone, settings.countryCode)
              const msgTemplate = a.status === 'absent' ? settings.msgAbsent : settings.msgLate
              const message = formatMessage(msgTemplate, studentName, a.attendanceDate, a.startTime)
              const waLink = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}` : ''
              const smsLink = formattedPhone ? `sms:+${formattedPhone}?body=${encodeURIComponent(message)}` : ''
              const telLink = formattedPhone ? `tel:+${formattedPhone}` : ''
              const isExpanded = expandedCard === a.attendanceId

              return (
                <div 
                  key={a.attendanceId} 
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm active:shadow-md transition-shadow"
                >
                  {/* Card Header - دائماً مرئي */}
                  <div 
                    onClick={() => toggleCard(a.attendanceId)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-gray-400 text-sm font-medium w-6">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-800 text-sm truncate">{studentName}</p>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                            a.status === 'absent' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-gray-800'
                          }`}>
                            {a.status === 'absent' ? 'غائب' : 'متأخر'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {a.groupName ?? '-'} • {a.subjectName ?? '-'} {a.startTime ? `(${a.startTime.slice(0,5)})` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mr-2">
                      {formattedPhone ? (
                        <a 
                          href={waLink} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm shadow-sm transition-colors"
                          title="واتساب سريع"
                        >
                          💬
                        </a>
                      ) : (
                        <span className="text-red-400 text-xs">لا رقم</span>
                      )}
                      <span className={`text-gray-400 text-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Card Body - يتوسع عند الضغط */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      
                      {/* معلومات الولي */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">ولي الأمر</p>
                        <p className="text-sm font-medium text-gray-800">{a.guardianName ?? 'غير محدد'}</p>
                        {targetPhone ? (
                          <p className="font-mono text-xs text-gray-600 mt-1 bg-white px-2 py-1 rounded border border-gray-200 inline-block">
                            {targetPhone}
                          </p>
                        ) : (
                          <p className="text-red-400 text-xs mt-1">لا يوجد رقم هاتف</p>
                        )}
                      </div>

                      {/* أزرار الإجراءات - كبيرة وسهلة الضغط */}
                      {formattedPhone ? (
                        <div className="grid grid-cols-3 gap-2">
                          <a 
                            href={telLink}
                            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 transition-colors shadow-sm"
                          >
                            <span className="text-lg">📞</span>
                            <span>اتصال</span>
                          </a>
                          <a 
                            href={waLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 transition-colors shadow-sm"
                          >
                            <span className="text-lg">💬</span>
                            <span>واتساب</span>
                          </a>
                          <a 
                            href={smsLink}
                            className="bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 transition-colors shadow-sm"
                          >
                            <span className="text-lg">✉️</span>
                            <span>SMS</span>
                          </a>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                          <p className="text-red-500 text-sm font-medium">⚠️ رقم الهاتف غير متوفر</p>
                        </div>
                      )}

                      {/* معاينة الرسالة */}
                      {formattedPhone && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs text-green-700 font-medium mb-1">📝 نص الرسالة:</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
