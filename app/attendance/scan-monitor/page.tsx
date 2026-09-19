'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'

type ScannedStudent = {
  id: number; studentId: number | null; name: string
  studentNumber: string | null; scanType: string; scanTime: string | null; createdAt: string
}
type NotScannedStudent = {
  studentId: number | null; name: string; studentNumber: string | null
  groupId: number | null; groupName: string | null
}
type Group = { id: number; name: string }

function SearchIcon() {
  return <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}

export default function ScanMonitorPage() {
  const [scanned, setScanned] = useState<ScannedStudent[]>([])
  const [notScanned, setNotScanned] = useState<NotScannedStudent[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [groupId, setGroupId] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'scanned' | 'not_scanned'>('scanned')
  const [exporting, setExporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ date })
    if (groupId) params.set('groupId', groupId)
    if (search) params.set('search', search)
    const res = await fetch(`/api/scan-logs?${params}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setScanned(data.scanned ?? [])
      setNotScanned(data.notScanned ?? [])
    }
    setLoading(false)
  }, [date, groupId, search])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then((data: Group[]) => setGroups(Array.isArray(data) ? data : []))
  }, [])

  async function handleExport() {
    setExporting(true)
    const params = new URLSearchParams({ date })
    if (groupId) params.set('groupId', groupId)
    window.open(`/api/scan-logs/export?${params}`, '_blank')
    setTimeout(() => setExporting(false), 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">متابعة المسح</h1>
            <p className="text-sm text-gray-500">
              مسح مباشر — تحديث تلقائي كل 30 ثانية
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            </p>
          </div>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60 transition-colors">
            📥 تصدير Excel
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">الفوج</label>
            <select value={groupId} onChange={e => setGroupId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">جميع الأفواج</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">بحث</label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن طالب..."
                className="w-full border border-gray-300 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{scanned.length}</div>
            <div className="text-xs text-green-600 mt-1">قاموا بالمسح</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{notScanned.length}</div>
            <div className="text-xs text-red-500 mt-1">لم يقوموا بالمسح</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="flex border-b">
            <button onClick={() => setActiveTab('scanned')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'scanned' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              ✅ مسحوا ({scanned.length})
            </button>
            <button onClick={() => setActiveTab('not_scanned')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'not_scanned' ? 'bg-red-50 text-red-700 border-b-2 border-red-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              ❌ لم يمسحوا ({notScanned.length})
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'scanned' ? (
            scanned.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">لا توجد عمليات مسح لهذا التاريخ</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">الاسم</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">رقم الطالب</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">نوع المسح</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">وقت المسح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scanned.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{s.studentNumber ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.scanType === 'qr' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {s.scanType === 'qr' ? 'QR' : 'باركود'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                          {s.scanTime ?? new Date(s.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            notScanned.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">جميع الطلبة قاموا بالمسح ✅</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">الاسم</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">رقم الطالب</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">الفوج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {notScanned.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{s.studentNumber ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{s.groupName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
