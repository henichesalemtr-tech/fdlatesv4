import { db } from '@/db'
import { activityLogs } from '@/db/schemas/schema'

interface LogActivityParams {
  userId: number | null
  userFullName: string | null
  userRole: string
  action: string   // create | update | delete | login | attendance | notification
  entity?: string  // student | teacher | group | attendance | notification | user
  entityId?: number | null
  description: string
  metadata?: Record<string, unknown>
}

/**
 * Log an activity to the activity_logs table.
 * Call this from API routes after successful operations.
 * Errors are silently swallowed to never break the main operation.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: params.userId,
      userFullName: params.userFullName,
      userRole: params.userRole,
      action: params.action,
      entity: params.entity ?? null,
      entityId: params.entityId ?? null,
      description: params.description,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    })
  } catch {
    // Silent — logging must never break main functionality
  }
}
