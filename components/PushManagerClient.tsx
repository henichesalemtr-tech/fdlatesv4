'use client'
import dynamic from 'next/dynamic'

const PushNotificationManager = dynamic(() => import('./PushNotificationManager'), { ssr: false })

export default function PushManagerClient() {
  return <PushNotificationManager />
}
