'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type FeePayment = {
  id: number; amount: string | null; paymentDate: string | null
  forMonth: string | null; notes: string | null
  studentId: number | null; firstName: string | null; lastName: string | null; studentNumber: string | null
}
type Expense = { id: number; category: string | null; amount: string | null; expenseDate: string | null; notes: string | null }
type Donation = { id: number; donorName: string | null; amount: string | null; donationDate: string | null; notes: string | null }
type SalaryPayment = { id: number; forMonth: string | null; baseSalary: string | null; bonus: string | null; deduction: string | null; netSalary: string | null; paymentDate: string | null; teacherId: number | null; teacherName: string | null }
type Student = { id: number; firstName: string; lastName: string; studentNumber: string }
type Teacher = { id: number; fullName: string; baseSalary: string | null }

type Tab = 'overview' | 'fees' | 'salaries' | 'expenses' | 'donations'

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [fees, setFees] = useState<FeePayment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [salaries, setSalaries] = useState<SalaryPayment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const [f, e, d, s, st, t] = await Promise.all([
      fetch('/api/finance/fees').then(r => r.json()),
      fetch('/api/finance/expenses').then(r => r.json()),
      fetch('/api/finance/donations').then(r => r.json()),
      fetch('/api/finance/salaries').then(r => r.json()),
      fetch('/api/students').then(r => r.json()),
      fetch('/api/teachers').then(r => r.json()),
    ])
    setFees(f); setExpenses(e); setDonations(d); setSalaries(s)
    setStudents(st); setTeachers(t); setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalFees = fees.reduce((s, f) => s + parseFloat(f.amount ?? '0'), 0)
  const totalDonations = donations.reduce((s, d) => s + parseFloat(d.amount ?? '0'), 0)
  const totalIncome = totalFees + totalDonations
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount ?? '0'), 0)
  const totalSalaries = salaries.reduce((s, p) => s + parseFloat(p.netSalary ?? '0'), 0)
  const totalOutcome = totalExpenses + totalSalaries
  const balance = totalIncome - totalOutcome

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    let url = '', body = {}
    if (tab === 'fees') {
      url = '/api/finance/fees'
      body = { studentId: form.studentId, amount: form.amount, paymentDate: form.date, forMonth: form.month, notes: form.notes }
    } else if (tab === 'expenses') {
      url = '/api/finance/expenses'
      body = { category: form.category, amount: form.amount, expenseDate: form.date, notes: form.notes }
    } else if (tab === 'donations') {
      url = '/api/finance/donations'
      body = { donorName: form.donorName, amount: form.amount, donationDate: form.date, notes: form.notes }
    } else if (tab === 'salaries') {
      url = '/api/finance/salaries'
      body = { teacherId: form.teacherId, forMonth: form.month, baseSalary: form.baseSalary, bonus: form.bonus, deduction: form.deduction, paymentDate: form.date }
    }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast.success('تمت الإضافة بنجاح'); setShowModal(false); setForm({}); load() }
    else { const err = await res.json(); toast.error(err.error) }
  }

  async function handleDelete(url: string, id: number) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    const res = await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) { toast.success('تم الحذف'); load() }
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'نظرة عامة', icon: '📊' },
    { key: 'fees', label: 'رسوم الطلاب', icon: '💳' },
    { key: 'salaries', label: 'الرواتب', icon: '💰' },
    { key: 'expenses', label: 'المصروفات', icon: '📦' },
    { key: 'donations', label: 'التبرعات', icon: '🤲' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        {tab !== 'overview' && (
          <button onClick={() => { setShowModal(true); setForm({}) }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            + إضافة جديدة
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mr-auto">
          <span>💰</span> إدارة المالية والرسوم
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'إجمالي الدخل', val: totalIncome, color: 'text-green-600', border: 'border-green-300', bg: 'bg-green-50' },
          { label: 'إجمالي المصاريف', val: totalOutcome, color: 'text-red-500', border: 'border-red-300', bg: 'bg-red-50' },
          { label: 'رسوم الطلاب', val: totalFees, color: 'text-blue-600', border: 'border-blue-300', bg: 'bg-blue-50' },
          { label: 'الرصيد الصافي', val: balance, color: balance >= 0 ? 'text-green-700' : 'text-red-600', border: balance >= 0 ? 'border-green-400' : 'border-red-400', bg: balance >= 0 ? 'bg-green-50' : 'bg-red-50' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border-2 ${c.border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${c.color}`}>{c.val.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg -mb-px border-b-2 transition-colors ${
              tab === t.key ? 'border-green-700 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: 'رسوم الطلاب', desc: 'تسجيل وإدارة رسوم الطلاب الشهرية', icon: '💳', color: 'border-blue-400', tab: 'fees' as Tab },
            { title: 'الرواتب', desc: 'صرف رواتب المعلمين والموظفين', icon: '💰', color: 'border-green-400', tab: 'salaries' as Tab },
            { title: 'المصروفات والتبرعات', desc: 'تسجيل المصاريف العامة والتبرعات', icon: '📦', color: 'border-yellow-400', tab: 'expenses' as Tab },
          ].map(c => (
            <button key={c.title} onClick={() => setTab(c.tab)}
              className={`bg-white text-right border-r-4 ${c.color} rounded-xl p-5 shadow-sm hover:shadow-md transition-all`}>
              <span className="text-3xl">{c.icon}</span>
              <h3 className="font-bold text-gray-800 mt-3">{c.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{c.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Fees Table */}
      {tab === 'fees' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="p-3 text-right">رقم الإيصال</th>
              <th className="p-3 text-right">الطالب</th>
              <th className="p-3 text-right">المبلغ (دج)</th>
              <th className="p-3 text-right">تاريخ الدفع</th>
              <th className="p-3 text-right">الشهر</th>
              <th className="p-3 text-right">حذف</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {fees.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="p-3"><span className="bg-gray-700 text-white text-xs px-2 py-0.5 rounded font-mono">#{f.id}</span></td>
                  <td className="p-3 font-medium">{f.firstName} {f.lastName} <span className="text-xs text-gray-400 font-mono ml-1">{f.studentNumber}</span></td>
                  <td className="p-3 font-bold text-green-600">{parseFloat(f.amount ?? '0').toFixed(2)}</td>
                  <td className="p-3 text-gray-500">{f.paymentDate ?? '-'}</td>
                  <td className="p-3 text-gray-500">{f.forMonth ?? '-'}</td>
                  <td className="p-3"><button onClick={() => handleDelete('/api/finance/fees', f.id)} className="bg-red-500 text-white p-1.5 rounded text-xs">🗑️</button></td>
                </tr>
              ))}
              {fees.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد مدفوعات مسجلة</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses Table */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-3 border-b bg-orange-50 flex items-center justify-between">
              <span className="font-bold text-orange-700">📦 المصروفات (الإجمالي: {totalExpenses.toFixed(2)} دج)</span>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">
                <th className="p-3 text-right">#</th><th className="p-3 text-right">الفئة</th>
                <th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">ملاحظات</th><th className="p-3 text-right">حذف</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-400 text-xs">{e.id}</td>
                    <td className="p-3 font-medium">{e.category ?? '-'}</td>
                    <td className="p-3 font-bold text-red-500">{parseFloat(e.amount ?? '0').toFixed(2)}</td>
                    <td className="p-3 text-gray-500">{e.expenseDate ?? '-'}</td>
                    <td className="p-3 text-gray-400 text-xs">{e.notes ?? '-'}</td>
                    <td className="p-3"><button onClick={() => handleDelete('/api/finance/expenses', e.id)} className="bg-red-500 text-white p-1.5 rounded text-xs">🗑️</button></td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد مصروفات</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Donations Table */}
      {tab === 'donations' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 border-b bg-blue-50 flex items-center justify-between">
            <span className="font-bold text-blue-700">🤲 التبرعات (الإجمالي: {totalDonations.toFixed(2)} دج)</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="p-3 text-right">#</th><th className="p-3 text-right">اسم المتبرع</th>
              <th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">التاريخ</th>
              <th className="p-3 text-right">ملاحظات</th><th className="p-3 text-right">حذف</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {donations.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-400 text-xs">{d.id}</td>
                  <td className="p-3 font-medium">{d.donorName ?? 'مجهول'}</td>
                  <td className="p-3 font-bold text-blue-600">{parseFloat(d.amount ?? '0').toFixed(2)}</td>
                  <td className="p-3 text-gray-500">{d.donationDate ?? '-'}</td>
                  <td className="p-3 text-gray-400 text-xs">{d.notes ?? '-'}</td>
                  <td className="p-3"><button onClick={() => handleDelete('/api/finance/donations', d.id)} className="bg-red-500 text-white p-1.5 rounded text-xs">🗑️</button></td>
                </tr>
              ))}
              {donations.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد تبرعات</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Salaries Table */}
      {tab === 'salaries' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="p-3 text-right">المعلم</th><th className="p-3 text-right">الشهر</th>
              <th className="p-3 text-right">الأساسي</th><th className="p-3 text-right">المكافأة</th>
              <th className="p-3 text-right">الخصم</th><th className="p-3 text-right">الصافي</th>
              <th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">حذف</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {salaries.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{s.teacherName ?? '-'}</td>
                  <td className="p-3 text-gray-500">{s.forMonth ?? '-'}</td>
                  <td className="p-3">{s.baseSalary}</td>
                  <td className="p-3 text-green-600">+{s.bonus}</td>
                  <td className="p-3 text-red-500">-{s.deduction}</td>
                  <td className="p-3 font-bold text-green-700">{s.netSalary}</td>
                  <td className="p-3 text-gray-500">{s.paymentDate ?? '-'}</td>
                  <td className="p-3"><button onClick={() => handleDelete('/api/finance/salaries', s.id)} className="bg-red-500 text-white p-1.5 rounded text-xs">🗑️</button></td>
                </tr>
              ))}
              {salaries.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-400">لا توجد مدفوعات رواتب</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">
                {tab === 'fees' ? '💳 تسجيل دفع رسوم' : tab === 'salaries' ? '💰 صرف راتب' : tab === 'expenses' ? '📦 إضافة مصروف' : '🤲 تسجيل تبرع'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-3">
              {tab === 'fees' && <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الطالب *</label>
                  <select value={form.studentId ?? ''} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">اختر طالباً...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentNumber})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (دج) *</label>
                    <input type="number" step="0.01" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                    <input type="month" value={form.month ?? ''} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الدفع</label>
                  <input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
              </>}
              {tab === 'salaries' && <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">المعلم *</label>
                  <select value={form.teacherId ?? ''} onChange={e => { const t = teachers.find(t => String(t.id) === e.target.value); setForm(f => ({ ...f, teacherId: e.target.value, baseSalary: t?.baseSalary ?? '' })) }} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">اختر...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">الراتب الأساسي *</label>
                    <input type="number" step="0.01" value={form.baseSalary ?? ''} onChange={e => setForm(f => ({ ...f, baseSalary: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">المكافأة</label>
                    <input type="number" step="0.01" value={form.bonus ?? '0'} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">الخصم</label>
                    <input type="number" step="0.01" value={form.deduction ?? '0'} onChange={e => setForm(f => ({ ...f, deduction: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">الشهر</label>
                    <input type="month" value={form.month ?? ''} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">تاريخ الصرف</label>
                    <input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" /></div>
                </div>
              </>}
              {tab === 'expenses' && <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                  <input value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="مثال: صيانة، مستلزمات..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
                    <input type="number" step="0.01" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                    <input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" /></div>
              </>}
              {tab === 'donations' && <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم المتبرع</label>
                  <input value={form.donorName ?? ''} onChange={e => setForm(f => ({ ...f, donorName: e.target.value }))} placeholder="اسم المتبرع (اختياري)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
                    <input type="number" step="0.01" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                    <input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
                </div>
              </>}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg">💾 حفظ</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
