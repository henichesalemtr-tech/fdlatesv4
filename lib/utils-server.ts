import 'server-only'

export function generateStudentNumber(id: number): string {
  return `FD${String(id).padStart(4, '0')}`
}

export function generateTeacherNumber(id: number): string {
  return `T${String(id).padStart(4, '0')}`
}

export function getDayName(day: string): string {
  const days: Record<string, string> = {
    'saturday': 'السبت',
    'sunday': 'الأحد',
    'monday': 'الاثنين',
    'tuesday': 'الثلاثاء',
    'wednesday': 'الأربعاء',
    'thursday': 'الخميس',
    'friday': 'الجمعة',
  }
  return days[day?.toLowerCase()] ?? day
}
