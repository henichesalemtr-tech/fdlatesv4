'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

const MobileLayout = dynamic(() => import('./MobileLayout'), { ssr: false })

type MobileLayoutClientProps = ComponentProps<typeof MobileLayout>

export default function MobileLayoutClient(props: MobileLayoutClientProps) {
  return <MobileLayout {...props} />
}
