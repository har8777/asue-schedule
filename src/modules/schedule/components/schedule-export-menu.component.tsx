import { CalendarPlus, ChevronDown, FileDown, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../common/components/button.component'
import { useToast } from '../../common/components/toast.context'
import { useSettings } from '../../settings/settings.context'
import type { CohortSchedule } from '../schedule.types'
import { downloadIcsCalendar, type CalendarLesson } from '../services/ics-export.service'
import { exportElementToPdf } from '../services/pdf-export.service'
import { SCHEDULE_EXPORT_ELEMENT_ID } from './schedule-board.component'

const menuItemClass =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800'

/** Արտահանում՝ PDF, տպում և օրացույց (.ics) ըստ հոսքի։ */
export const ScheduleExportMenu = ({ schedule }: { schedule: CohortSchedule }) => {
  const { settings } = useSettings()
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { faculty, cohort, lessons } = schedule
  const title = `${faculty.name} — ${cohort.name}`

  useEffect(() => {
    if (!isOpen) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [isOpen])

  const exportPdf = async () => {
    setIsOpen(false)
    setIsExporting(true)
    try {
      await exportElementToPdf(SCHEDULE_EXPORT_ELEMENT_ID, title)
    } catch {
      toast.error('PDF ֆայլը ստեղծել չհաջողվեց։ Փորձեք «Տպել» → «Պահպանել որպես PDF»։')
    } finally {
      setIsExporting(false)
    }
  }

  const exportIcs = (streamId: string, streamName: string) => {
    setIsOpen(false)
    const events: CalendarLesson[] = lessons
      .filter((lesson) => lesson.streamId === streamId)
      .flatMap((lesson) =>
        lesson.parts.map((part, partIndex) => ({
          uid: `${lesson.id}-${partIndex}`,
          day: lesson.day,
          slot: lesson.slot,
          partIndex,
          partsCount: lesson.parts.length,
          summary: part.subject,
          description: `Դասախոս՝ ${part.lecturers.join(', ') || '—'} | ${cohort.name}, ${streamName}`,
          location: part.rooms.length ? `Լսարան ${part.rooms.join(', ')}` : '',
        })),
      )
    if (events.length === 0) {
      toast.info('Այս հոսքում դեռ դասեր չկան')
      return
    }
    downloadIcsCalendar(events, settings, `${cohort.name} ${streamName}`)
    toast.success('Օրացույցի ֆայլը ներբեռնվեց։ Բացեք այն՝ դասերը Ձեր օրացույց ավելացնելու համար։')
  }

  return (
    <div ref={menuRef} className="print-hidden relative">
      <Button variant="secondary" isLoading={isExporting} icon={<FileDown className="size-4" />} onClick={() => setIsOpen((open) => !open)}>
        Արտահանել
        <ChevronDown className="size-4" />
      </Button>
      {isOpen && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <button type="button" className={menuItemClass} onClick={exportPdf}>
            <FileDown className="size-4 text-red-500" /> Ներբեռնել PDF
          </button>
          <button
            type="button"
            className={menuItemClass}
            onClick={() => {
              setIsOpen(false)
              window.print()
            }}
          >
            <Printer className="size-4 text-slate-500" /> Տպել
          </button>
          <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase">Ավելացնել օրացույցում (.ics)</p>
          {cohort.settings.streams.map((stream) => (
            <button key={stream.id} type="button" className={menuItemClass} onClick={() => exportIcs(stream.id, stream.name)}>
              <CalendarPlus className="size-4 text-brand-600" /> {stream.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
