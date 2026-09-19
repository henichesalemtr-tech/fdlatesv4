'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type User = {
  id: number; role: string; username: string; phone: string | null
  fullName: string | null; email: string | null; status: string
  teacherId: number | null; createdAt: string
}

type Role = { id: number; name: string; label: string }

// Static colour palette for role badges
const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-red-500 text-white',
  teacher:  'bg-blue-500 text-white',
  guardian: 'bg-purple-500 text-white',
}
function roleColor(name: string): string {
  return ROLE_COLORS[name] ?? 'bg-gray-500 text-white'
}

export default function UsersPage() {
  const [users, setUsers]       = useState<User[]>([])
  const [roles, setRoles]       = useState<Role[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  /**
   * Task 6 — after any role / permission change we must invalidate every
   * cached view of the user's identity: server components (sidebar, dashboard,
   * navigation) via router.refresh(), plus any stale cached permissions kept
   * in the browser.
   */
  function refreshApp() {
    try {
      localStorage.removeItem('permissions')
      localStorage.removeItem('userRole')
      sessionStorage.removeItem('permissions')
    } catch { /* ignore */ }
    router.refresh()
  }

  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    username: '', password: '', fullName: '',
    role: 'admin', phone: '', email: '', status: 'active',
  })

  async function load() {
    setLoading(true)
    const [userData, rolesData] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/roles').then(r => r.json()),
    ])
    setUsers(userData)
    setRoles(rolesData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditUser(null)
    setForm({ username: '', password: '', fullName: '', role: roles[0]?.name ?? 'admin', phone: '', email: '', status: 'active' })
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({ username: u.username, password: '', fullName: u.fullName ?? '', role: u.role, phone: u.phone ?? '', email: u.email ?? '', status: u.status })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url    = editUser ? `/api/users/${editUser.id}` : '/api/users'
    const method = editUser ? 'PUT' : 'POST'
    const body   = editUser
      ? { fullName: form.fullName, role: form.role, phone: form.phone, email: form.email, status: form.status, ...(form.password ? { password: form.password } : {}) }
      : form
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(editUser ? 'تم تحديث المستخدم' : 'تم إضافة المستخدم بنجاح')
        refreshApp()
        setShowModal(false)
        load()
      } else {
        toast.error(data.error ?? 'حدث خطأ غير متوقع')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال، يرجى المحاولة مجدداً')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); refreshApp(); load() }
    else { const err = await res.json(); toast.error(err.error) }
  }

  const roleLabel = (name: string) =>
    roles.find(r => r.name === name)?.label ?? name

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={openAdd}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          + إضافة مستخدم
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>👥</span> إدارة المستخدمين والصلاحيات
        </h1>
      </div>

      {/* Role cards */}
      {roles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {roles.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${roleColor(r.name)}`}>{r.label}</span>
              <p className="text-xs text-gray-500 leading-relaxed">{r.name}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-right">اسم المستخدم</th>
                <th className="p-3 text-right">الاسم الكامل</th>
                <th className="p-3 text-right">الدور</th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">تاريخ الإنشاء</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold text-gray-800">{u.username}</td>
                  <td className="p-3 text-gray-700">{u.fullName ?? '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(u.role)}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-500">{u.phone ?? '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {u.status === 'active' ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-DZ') : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(u.id)} className="bg-red-500 text-white p-1.5 rounded text-xs">🗑️</button>
                      <button onClick={() => openEdit(u)}       className="bg-blue-500 text-white p-1.5 rounded text-xs">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا يوجد مستخدمون</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم *</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور {editUser ? '(اتركها فارغة للإبقاء على الحالية)' : '*'}
                </label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editUser}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                  <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg">
                  💾 حفظ
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
