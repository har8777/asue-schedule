import { useCallback, useState } from 'react'
import type { LessonKey, LessonPart } from '../schedule.types'

/** Command pattern. յուրաքանչյուր փոփոխություն պահվում է որպես «նախկին → նոր» զույգ։ */
export interface ScheduleCommand {
  key: LessonKey
  before: LessonPart[] | null
  after: LessonPart[] | null
}

type ApplyChange = (key: LessonKey, parts: LessonPart[] | null) => Promise<void>

const HISTORY_LIMIT = 30

/**
 * Հետարկել / Կրկնել (Ctrl+Z / Ctrl+Y)։ Ի տարբերություն հին տարբերակի, որը պահում էր
 * ամբողջ բազայի պատճենը, այստեղ պահվում է միայն փոխված վանդակը, և փոփոխությունը
 * կիրառվում է սերվերում։
 */
export const useScheduleHistory = (applyChange: ApplyChange) => {
  const [past, setPast] = useState<ScheduleCommand[]>([])
  const [future, setFuture] = useState<ScheduleCommand[]>([])
  const [isBusy, setIsBusy] = useState(false)

  const record = useCallback((command: ScheduleCommand) => {
    setPast((current) => [...current.slice(-(HISTORY_LIMIT - 1)), command])
    setFuture([])
  }, [])

  const undo = useCallback(async () => {
    const command = past.at(-1)
    if (!command || isBusy) return
    setIsBusy(true)
    try {
      await applyChange(command.key, command.before)
      setPast((current) => current.slice(0, -1))
      setFuture((current) => [command, ...current])
    } finally {
      setIsBusy(false)
    }
  }, [past, isBusy, applyChange])

  const redo = useCallback(async () => {
    const command = future[0]
    if (!command || isBusy) return
    setIsBusy(true)
    try {
      await applyChange(command.key, command.after)
      setFuture((current) => current.slice(1))
      setPast((current) => [...current, command])
    } finally {
      setIsBusy(false)
    }
  }, [future, isBusy, applyChange])

  const clear = useCallback(() => {
    setPast([])
    setFuture([])
  }, [])

  return { record, undo, redo, clear, isBusy, canUndo: past.length > 0, canRedo: future.length > 0 }
}
