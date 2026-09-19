'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

type ScannedStudent = {
  id: number
  studentNumber: string
  firstName: string
  lastName: string
  time: string
  status: 'present' | 'late' | 'absent'
}

type SyncResult = {
  skipped?: boolean
  reason?: string
  updated?: number
  absent?: number
  late?: number
  elapsed?: number
  lateThreshold?: number
  absentThreshold?: number
}

type Group = { id: number; name: string; groupNumber: string }

export default function AutoAttendancePage() {
  const [enabled, setEnabled]           = useState(false)
  const [syncEnabled, setSyncEnabled]   = useState(false)
  const [scanning, setScanning]         = useState(false)
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([])
  const [manualCode, setManualCode]     = useState('')
  const [error, setError]               = useState('')
  const [cameraReady, setCameraReady]   = useState(false)
  const [groups, setGroups]             = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [syncStatus, setSyncStatus]     = useState<SyncResult | null>(null)
  const [syncLoading, setSyncLoading]   = useState(false)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const animFrameRef  = useRef<number | null>(null)
  const processingRef = useRef(false)
  const scannedRef    = useRef<Set<string>>(new Set())
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scannedIdsRef = useRef<number[]>([])

  // Load settings & groups on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/settings?key=auto_attendance').then(r => r.json()),
      fetch('/api/settings?key=schedule_sync_enabled').then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
    ]).then(([att, sync, grps]) => {
      setEnabled(att.value === 'true')
      setSyncEnabled(sync.value === 'true')
      setGroups(grps ?? [])
    }).catch(() => setEnabled(true))
  }, [])

  // Keep refs in sync
  useEffect(() => {
    scannedRef.current = new Set(scannedStudents.map(s => s.studentNumber))
    scannedIdsRef.current = scannedStudents.map(s => s.id)
  }, [scannedStudents])

  // ── sync with schedule ────────────────────────────────────────────────────
  const runSync = useCallback(async () => {
    if (!syncEnabled || !selectedGroup || !scanning) return
    setSyncLoading(true)
    const today = new Date().toISOString().split('T')[0]
    try {
      const res = await fetch('/api/attendance/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: parseInt(selectedGroup),
          scannedStudentIds: scannedIdsRef.current,
          date: today,
        }),
      })
      const data: SyncResult = await res.json()
      setSyncStatus(data)
      if (data.updated && data.updated > 0) {
        const msg = [
          data.absent ? `${data.absent} غائب` : '',
          data.late   ? `${data.late} متأخر`   : '',
        ].filter(Boolean).join(' ، ')
        toast.warning(`🔄 مزامنة الجدول: ${msg}`)
      }
    } catch {
      // silent
    } finally {
      setSyncLoading(false)
    }
  }, [syncEnabled, selectedGroup, scanning])

  // Start/stop sync interval when scanning changes
  useEffect(() => {
    if (scanning && syncEnabled && selectedGroup) {
      runSync() // immediate first check
      syncIntervalRef.current = setInterval(runSync, 60_000)
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      setSyncStatus(null)
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [scanning, syncEnabled, selectedGroup, runSync])

  // ── QR processing ─────────────────────────────────────────────────────────
  const processQRCode = useCallback(async (studentNumber: string) => {
    if (scannedRef.current.has(studentNumber)) {
      toast.info(`الطالب ${studentNumber} تم تسجيله مسبقاً`)
      return
    }
    const res = await fetch(`/api/students?search=${encodeURIComponent(studentNumber)}`)
    const studentsList = await res.json()
    const student = studentsList.find((s: { studentNumber: string }) => s.studentNumber === studentNumber)
    if (!student) {
      toast.error(`رقم التسجيل ${studentNumber} غير موجود`)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{ studentId: student.id, status: 'present' }],
        date: today,
        groupId: selectedGroup ? parseInt(selectedGroup) : undefined,
      }),
    })

    const now = new Date()
    const newRecord: ScannedStudent = {
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      time: now.toLocaleTimeString('ar-DZ'),
      status: 'present',
    }
    setScannedStudents(prev => [newRecord, ...prev])
    toast.success(`✅ حاضر: ${student.firstName} ${student.lastName}`)
  }, [selectedGroup])

  // ── camera scanning loop ──────────────────────────────────────────────────
  const scanFrame = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) { animFrameRef.current = requestAnimationFrame(scanFrame); return }

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    if (!processingRef.current) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      processingRef.current = true
      try {
        const jsQR = (await import('jsqr')).default
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          await processQRCode(code.data)
          await new Promise(r => setTimeout(r, 1500))
        }
      } catch { /* ignore */ } finally {
        processingRef.current = false
      }
    }
    animFrameRef.current = requestAnimationFrame(scanFrame)
  }, [processQRCode])

  async function startScanner() {
    setError('')
    setCameraReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true)
          setScanning(true)
          animFrameRef.current = requestAnimationFrame(scanFrame)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed'))
        setError('تم رفض الإذن للوصول إلى الكاميرا. يرجى السماح للمتصفح باستخدام الكاميرا.')
      else if (msg.includes('NotFound'))
        setError('لم يتم العثور على كاميرا. تأكد من توصيل الكاميرا بجهازك.')
      else setError('تعذر الوصول إلى الكاميرا: ' + msg)
    }
  }

  function stopScanner() {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
    setCameraReady(false)
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [])

  async function processManual() {
    if (!manualCode.trim()) return
    await processQRCode(manualCode.trim())
    setManualCode('')
  }

  const presentCount = scannedStudents.filter(s => s.status === 'present').length
  const lateCount    = scannedStudents.filter(s => s.status === 'late').length
  const absentCount  = scannedStudents.filter(s => s.status === 'absent').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">تفعيل التحضير التلقائي:</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📷</span> التحضير التلقائي (QR Scanner)
        </h1>
      </div>

      {!enabled ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 text-center">
          <p className="text-yellow-700 font-medium">ميزة التحضير التلقائي معطلة حالياً</p>
          <p className="text-yellow-600 text-sm mt-1">قم بتفعيلها من خلال زر التبديل أعلاه</p>
        </div>
      ) : (
        <>
          {/* Sync badge + group selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">اختر الفوج (لتفعيل المزامنة)</label>
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                <option value="">— بدون تحديد فوج —</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.groupNumber})</option>
                ))}
              </select>
            </div>

            {syncEnabled ? (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
                selectedGroup
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${selectedGroup && scanning ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                {selectedGroup
                  ? scanning
                    ? syncLoading ? 'جارٍ المزامنة...' : '🔄 المزامنة مع الجدول نشطة'
                    : 'المزامنة جاهزة — ابدأ المسح'
                  : 'اختر فوجاً لتفعيل المزامنة'}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border bg-gray-50 border-gray-200 text-gray-400">
                <span>⏸️</span> المزامنة معطلة — فعّلها من الإعدادات
              </div>
            )}

            {/* Sync timing info */}
            {syncEnabled && syncStatus && !syncStatus.skipped && (
              <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center text-xs">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="font-bold text-gray-700" translate="no">{syncStatus.elapsed ?? 0}</p>
                  <p className="text-gray-400">دقيقة منذ البداية</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2">
                  <p className="font-bold text-yellow-700" translate="no">{syncStatus.lateThreshold}</p>
                  <p className="text-yellow-600">حدّ التأخر</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="font-bold text-red-700" translate="no">{syncStatus.absentThreshold}</p>
                  <p className="text-red-600">حدّ الغياب</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-700 mb-4 text-center">مسح QR Code / الباركود</h2>

              <div className="relative w-full rounded-lg overflow-hidden bg-gray-900 min-h-[300px] flex items-center justify-center">
                <video ref={videoRef}
                  className={`w-full h-auto rounded-lg ${scanning ? 'block' : 'hidden'}`}
                  playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {scanning && cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-52 h-52 border-4 border-green-400 rounded-xl opacity-80">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                    </div>
                  </div>
                )}
                {!scanning && (
                  <div className="text-center text-gray-400 p-8">
                    <p className="text-5xl mb-3">📷</p>
                    <p className="text-sm">اضغط &quot;تشغيل الكاميرا&quot; لبدء المسح</p>
                  </div>
                )}
                {scanning && !cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
                    <div className="text-white text-center">
                      <div className="animate-spin text-4xl mb-3">⏳</div>
                      <p className="text-sm">جارٍ تشغيل الكاميرا...</p>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

              <div className="flex gap-3 mt-4">
                {!scanning ? (
                  <button onClick={startScanner}
                    className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg text-sm font-medium">
                    📷 تشغيل الكاميرا
                  </button>
                ) : (
                  <button onClick={stopScanner}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium">
                    ⏹️ إيقاف الكاميرا
                  </button>
                )}
              </div>

              {/* Manual entry */}
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">أو إدخال رقم الطالب يدوياً:</p>
                <div className="flex gap-2">
                  <input
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && processManual()}
                    placeholder="S001"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono"
                  />
                  <button onClick={processManual}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                    تسجيل
                  </button>
                </div>
              </div>
            </div>

            {/* Scanned list */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-700">سجل الحضور المسجل اليوم</h2>
                <div className="flex gap-2 text-xs">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium" translate="no">{presentCount} حاضر</span>
                  {lateCount > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium" translate="no">{lateCount} متأخر</span>}
                  {absentCount > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium" translate="no">{absentCount} غائب</span>}
                </div>
              </div>

              {scannedStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-400 flex-1">
                  <p className="text-3xl mb-3">📋</p>
                  <p>لم يتم تسجيل أي حضور بعد</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto flex-1">
                  {scannedStudents.map((s, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                      s.status === 'present' ? 'bg-green-50 border-green-200'
                      : s.status === 'late'  ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                    }`}>
                      <div>
                        <p className="font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-gray-500 font-mono">{s.studentNumber}</p>
                      </div>
                      <div className="text-left">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          s.status === 'present' ? 'bg-green-500 text-white'
                          : s.status === 'late'  ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        }`}>
                          {s.status === 'present' ? '✅ حاضر' : s.status === 'late' ? '⏰ متأخر' : '❌ غائب'}
                        </span>
                        <p className="text-xs text-gray-400 mt-1" translate="no">{s.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
