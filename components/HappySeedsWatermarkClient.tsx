'use client'

import dynamic from 'next/dynamic'

const HappySeedsWatermark = dynamic(
  () => import('./HappySeedsWatermark').then((module) => module.HappySeedsWatermark),
  { ssr: false },
)

export default function HappySeedsWatermarkClient() {
  return <HappySeedsWatermark />
}
