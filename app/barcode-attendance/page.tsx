'use client'
import BarcodeScannerPage from '@/components/barcode-display/BarcodeScannerPage'

// صفحة تحضير الباركود الأصلية: مع شاشة الخمول بعد عدم النشاط
// (المواقيت / الأحاديث / الساعة) مثلما كانت سابقاً.
export default function BarcodeAttendancePage() {
  return <BarcodeScannerPage enableIdle />
}
