'use client'
import { useState, useEffect, useCallback } from 'react'

type LogEntry = {
  id: number
  userFullName: string | null
  userRole: string | null
  action: string
  entity: string | null
  entityId: number | null
  description: string
  metadata: string | null
  createdAt: string
}

const actionColors: Record<string, { bg: string; text: string; label: string }> = {
  create:       { bg: 'bg-green-100',  text: 'text-green-700',  label: 'إضافة' },
  update:       { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'تعديل' },
  delete:       { bg: 'bg-red-100',    text: 'text-red-700',    label: 'حذف' },
  login:        { bg: 'bg-purple-100', text: 'text-purple-700', label: 'دخول' },
  logout:       { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'خروج' },
  attendance:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'حضور' },
  notification: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'إشعار' },
}

const entityIcons: Record<string, string> = {
  student: '👨‍🎓', teacher: '👨‍🏫', group: '📚',
  attendance: '📋', notification: '🔔', user: '👤', default: '📝',
}

const roleLabels: Record<string, string> = {
  admin: 'مدير', teacher: 'معلم', guardian: 'ولي أمر',
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (filterAction) params.set('action', filterAction)
    if (filterEntity) params.set('entity', filterEntity)
    const res = await fetch(`/api/activity-logs?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [page, filterAction, filterEntity])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function formatDate(dt: string) {
    return new Date(dt).toLocaleString('ar-DZ', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-500">{total} سجل إجمالي</div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🗂️</span> سجل العمليات
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">نوع العملية</label>
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            <option value="">الكل</option>
            <option value="create">إضافة</option>
            <option value="update">تعديل</option>
            <option value="delete">حذف</option>
            <option value="attendance">حضور</option>
            <option value="notification">إشعار</option>
            <option value="login">دخول</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">القسم</label>
          <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            <option value="">الكل</option>
            <option value="student">طالب</option>
            <option value="teacher">معلم</option>
            <option value="group">فوج</option>
            <option value="attendance">حضور</option>
            <option value="notification">إشعار</option>
            <option value="user">مستخدم</option>
          </select>
        </div>
        <button onClick={() => { setFilterAction(''); setFilterEntity(''); setPage(1) }}
          className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
          مسح الفلتر
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3 animate-pulse">🗂️</div>
            <p>جاري التحميل...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>لا توجد سجلات بعد</p>
            <p className="text-xs mt-1">ستظهر العمليات هنا بمجرد البدء باستخدام النظام</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600">
                  <th className="p-3 text-right font-semibold">التاريخ والوقت</th>
                  <th className="p-3 text-right font-semibold">المستخدم</th>
                  <th className="p-3 text-right font-semibold">العملية</th>
                  <th className="p-3 text-right font-semibold">القسم</th>
                  <th className="p-3 text-right font-semibold">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => {
                  const act = actionColors[log.action] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: log.action }
                  const icon = entityIcons[log.entity ?? ''] ?? entityIcons.default
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: log.userRole === 'admin' ? '#1a5c35' : '#2563eb' }}>
                            {(log.userFullName ?? '؟')[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{log.userFullName ?? 'غير معروف'}</p>
                            <p className="text-gray-400 text-[10px]">{roleLabels[log.userRole ?? ''] ?? log.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${act.bg} ${act.text}`}>
                          {act.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.entity && (
                          <span className="flex items-center gap-1.5 text-gray-600 text-xs">
                            <span>{icon}</span>
                            <span>{log.entity === 'student' ? 'طالب'
                              : log.entity === 'teacher' ? 'معلم'
                              : log.entity === 'group' ? 'فوج'
                              : log.entity === 'attendance' ? 'حضور'
                              : log.entity === 'notification' ? 'إشعار'
                              : log.entity === 'user' ? 'مستخدم'
                              : log.entity}
                            </span>
                            {log.entityId && <span className="text-gray-400">#{log.entityId}</span>}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-gray-700 text-xs max-w-xs">{log.description}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
            ← السابق
          </button>
          <span className="text-sm text-gray-600">صفحة {page} من {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
            التالي →
          </button>
        </div>
      )}
    </div>
  )
}
