'use client'

import dynamic from 'next/dynamic'

const Toaster = dynamic(
  () => import('sonner').then((module) => module.Toaster),
  { ssr: false },
)

export default function ToasterClient() {
  return <Toaster position="top-center" richColors />
}
