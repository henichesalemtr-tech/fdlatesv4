'use client'
import BarcodeScannerPage from '@/components/barcode-display/BarcodeScannerPage'

// نسخة ثانية من صفحة تحضير الباركود: بدون شاشة الخمول (تبقى واجهة المسح ظاهرة دائماً)
// ولا تظهر في لوحة التحكم — تفتح مباشرة على /barcode-attendance2.
export default function BarcodeAttendancePage2() {
  return <BarcodeScannerPage enableIdle={false} />
}
