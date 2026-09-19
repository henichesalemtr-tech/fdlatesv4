'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

type Teacher = {
  id: number;
  teacherNumber: string;
  fullName: string;
  qualification: string | null;
  phone: string | null;
  email: string | null;
  hireDate: string | null;
  baseSalary: string | null;
  status: string;
  userId: number | null;
}

type Group = { id: number; name: string; groupNumber: string }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [showModal, setShowModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [teacherGroups, setTeacherGroups] = useState<number[]>([])
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)

  const [form, setForm] = useState({
    fullName: '',
    qualification: '',
    phone: '',
    email: '',
    hireDate: '',
    baseSalary: '',
    status: 'active',
    createAccount: false,
    password: '',
  })

  async function fetchTeachers() {
    setLoading(true)
    try {
      const res = await fetch('/api/teachers')
      const data = await res.json()
      setTeachers(data)
    } catch {
      toast.error('حدث خطأ أثناء جلب قائمة المعلمين')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
    fetch('/api/groups')
      .then((r) => r.json())
      .then(setAllGroups)
      .catch(() => {})
  }, [])

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchesSearch =
        t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.teacherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.phone && t.phone.includes(searchTerm))

      const matchesStatus =
        statusFilter === 'all' ? true : t.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [teachers, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const total = teachers.length
    const active = teachers.filter((t) => t.status === 'active').length
    const withAccount = teachers.filter((t) => t.userId !== null).length
    return { total, active, withAccount }
  }, [teachers])

  async function openGroupAssign(t: Teacher) {
    setSelectedTeacher(t)
    try {
      const res = await fetch(`/api/teachers/${t.id}/groups`)
      const data = await res.json()
      setTeacherGroups((data as Group[]).map((g) => g.id))
      setShowGroupModal(true)
    } catch {
      toast.error('تعذر جلب الأفواج المخصصة')
    }
  }

  async function saveGroupAssign() {
    if (!selectedTeacher) return
    const res = await fetch(`/api/teachers/${selectedTeacher.id}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds: teacherGroups }),
    })
    if (res.ok) {
      toast.success(`تم تحديث أفواج ${selectedTeacher.fullName}`)
      setShowGroupModal(false)
    } else {
      toast.error('حدث خطأ أثناء حفظ الأفواج')
    }
  }

  function openAdd() {
    setEditTeacher(null)
    setForm({
      fullName: '',
      qualification: '',
      phone: '',
      email: '',
      hireDate: '',
      baseSalary: '',
      status: 'active',
      createAccount: false,
      password: '',
    })
    setShowModal(true)
  }

  function openEdit(t: Teacher) {
    setEditTeacher(t)
    setForm({
      fullName: t.fullName,
      qualification: t.qualification ?? '',
      phone: t.phone ?? '',
      email: t.email ?? '',
      hireDate: t.hireDate ?? '',
      baseSalary: t.baseSalary ?? '',
      status: t.status,
      createAccount: false,
      password: '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editTeacher
      ? `/api/teachers/${editTeacher.id}`
      : '/api/teachers'
    const method = editTeacher ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      toast.success(
        editTeacher ? 'تم تحديث بيانات المعلم' : 'تم إضافة المعلم بنجاح'
      )
      setShowModal(false)
      fetchTeachers()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ غير متوقع')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المعلم؟')) return
    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('تم الحذف بنجاح')
      fetchTeachers()
    } else {
      toast.error('تعذر حذف المعلم')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-4 py-4" dir="rtl">
      {/* رأس الصفحة والعنوان */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>👨‍🏫</span> إدارة المعلمين
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            قائمة المعلمين، إدارة الحسابات والأفواج المخصصة.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition-all"
        >
          <span>➕</span> إضافة معلم جديد
        </button>
      </div>

      {/* شريط الإحصائيات - بطاقات أفقية متجاوبة */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-500">الإجمالي</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-800 mt-0.5">{stats.total}</p>
          </div>
          <span className="hidden sm:block p-2.5 bg-gray-100 rounded-lg text-gray-600 text-lg">👥</span>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-500">النشطون</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 mt-0.5">{stats.active}</p>
          </div>
          <span className="hidden sm:block p-2.5 bg-emerald-50 rounded-lg text-emerald-600 text-lg">✅</span>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-gray-500">بحساب</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-0.5">{stats.withAccount}</p>
          </div>
          <span className="hidden sm:block p-2.5 bg-blue-50 rounded-lg text-blue-600 text-lg">💻</span>
        </div>
      </div>

      {/* أدوات البحث والفلترة */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="بحث بالاسم، الرقم، أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute right-3 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">جميع الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">غير نشط</option>
        </select>
      </div>

      {/* حالة التحميل */}
      {loading && (
        <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
          <span className="animate-spin text-2xl inline-block mb-2">🔄</span>
          <p className="text-sm">جاري التحميل...</p>
        </div>
      )}

      {/* العرض للشاشات الصغيرة (الهواتف) - وضع البطاقات */}
      {!loading && (
        <div className="block md:hidden space-y-3">
          {filteredTeachers.map((t) => (
            <div
              key={t.id}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
                <div>
                  <Link
                    href={`/teachers/${t.id}`}
                    className="font-bold text-gray-900 text-base hover:text-emerald-600"
                  >
                    {t.fullName}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    مؤهل: {t.qualification ?? 'غير محدد'}
                  </p>
                </div>
                <span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded text-xs font-semibold border border-slate-200">
                  {t.teacherNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">الهاتف</span>
                  <span className="font-mono font-medium text-gray-800 dir-ltr text-right block">
                    {t.phone ?? '-'}
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">الحساب</span>
                  {t.userId ? (
                    <span className="text-emerald-600 font-medium">✅ يمتلك حساب</span>
                  ) : (
                    <span className="text-gray-400">لا يوجد</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    t.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openGroupAssign(t)}
                    className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 active:bg-purple-100"
                  >
                    📚 الأفواج
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-lg active:bg-gray-200 text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg active:bg-red-100 text-xs"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredTeachers.length === 0 && (
            <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-gray-200 text-sm">
              لا يوجد معلمون مطبق عليهم خيار البحث.
            </div>
          )}
        </div>
      )}

      {/* العرض الشاشات الكبيرة (أجهزة الكمبيوتر والتابلت) - وضع الجدول */}
      {!loading && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs">
                  <th className="p-3.5 font-semibold">رقم المعلم</th>
                  <th className="p-3.5 font-semibold">الاسم الكامل</th>
                  <th className="p-3.5 font-semibold">الهاتف</th>
                  <th className="p-3.5 font-semibold">المؤهل</th>
                  <th className="p-3.5 font-semibold">حساب المستخدم</th>
                  <th className="p-3.5 font-semibold">الحالة</th>
                  <th className="p-3.5 font-semibold">الأفواج</th>
                  <th className="p-3.5 font-semibold text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 font-mono px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
                        {t.teacherNumber}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-gray-900">
                      <Link
                        href={`/teachers/${t.id}`}
                        className="text-emerald-700 hover:text-emerald-900 hover:underline font-semibold"
                      >
                        {t.fullName}
                      </Link>
                    </td>
                    <td className="p-3.5 text-gray-600 font-mono dir-ltr text-right">
                      {t.phone ?? '-'}
                    </td>
                    <td className="p-3.5 text-gray-600">{t.qualification ?? '-'}</td>
                    <td className="p-3.5">
                      {t.userId ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          لديه حساب
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full text-xs font-medium">
                          لا يوجد
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          t.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {t.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => openGroupAssign(t)}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <span>📚</span> تخصيص الأفواج
                      </button>
                    </td>
                    <td className="p-3.5 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(t)}
                          title="تعديل"
                          className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          title="حذف"
                          className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTeachers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">
                      لا يوجد معلمون مطبق عليهم خيار البحث.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نافذة الإضافة والتعديل المنبثقة - متوافقة مع شاشات الجوال */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between z-10">
              <h2 className="font-bold text-gray-800 text-base">
                {editTeacher ? '✏️ تعديل بيانات المعلم' : '➕ إضافة معلم جديد'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  required
                  placeholder="مثال: د. محمد العبدالله"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="05XXXXXXXX"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    المؤهل العلمي
                  </label>
                  <input
                    value={form.qualification}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, qualification: e.target.value }))
                    }
                    placeholder="مثال: ماجستير"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  الحالة
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              {!editTeacher && (
                <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3.5 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.createAccount}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          createAccount: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-blue-900">
                      إنشاء حساب مستخدم لهذا المعلم
                    </span>
                  </label>
                  {form.createAccount && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] text-blue-600">
                        سيتم إسناد رقم الهاتف كاسم مستخدم تلقائياً.
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          كلمة المرور <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={form.password}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, password: e.target.value }))
                          }
                          required={form.createAccount}
                          placeholder="••••••••"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  حفظ البيانات
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تخصيص الأفواج المنبثقة - متوافقة مع شاشات الجوال */}
      {showGroupModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800 text-base">📚 تخصيص الأفواج</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  أفواج: <span className="font-semibold text-gray-700">{selectedTeacher.fullName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
                {allGroups.map((g) => {
                  const isSelected = teacherGroups.includes(g.id)
                  return (
                    <label
                      key={g.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/60 shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setTeacherGroups((prev) =>
                            prev.includes(g.id)
                              ? prev.filter((id) => id !== g.id)
                              : [...prev, g.id]
                          )
                        }
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <p className="font-medium text-gray-800 text-xs sm:text-sm">{g.name}</p>
                        <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {g.groupNumber}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveGroupAssign}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  حفظ ({teacherGroups.length})
                </button>
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}