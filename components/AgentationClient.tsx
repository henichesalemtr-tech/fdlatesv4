'use client'

import dynamic from 'next/dynamic'

const AgentationGuard = dynamic(
  () => import('./AgentationGuard').then((module) => module.AgentationGuard),
  { ssr: false },
)

export default function AgentationClient() {
  return <AgentationGuard />
}
