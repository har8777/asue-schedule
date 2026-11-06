import { CalendarPlus, DoorOpen, Search, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { catalogRequests } from '../../catalog/catalog.requests'
import { Button } from '../../common/components/button.component'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { TextInput } from '../../common/components/form-controls.component'
import { PageHeader } from '../../common/components/page-header.component'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { DAY_LABELS, partLabel, type DayKey } from '../../schedule/schedule.constants'
import { downloadIcsCalendar } from '../../schedule/services/ics-export.service'
import { useSettings } from '../../settings/settings.context'
import { reportsRequests } from '../reports.requests'
import type { LessonPlacement } from '../reports.types'

/** Դասախոսի անհատական շաբաթական դասացուցակը՝ բոլոր ֆակուլտետներից։ */
export const LecturerSchedulePage = () => {
  useDocumentTitle('Դասախոսի դասացուցակ')
  const { settings } = useSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedName = searchParams.get('name') ?? ''
  const [draft, setDraft] = useState(selectedName)
  const lecturers = useAsyncData(() => catalogRequests.getAllLecturers(), [])
  const schedule = useAsyncData(
    () => (selectedName ? reportsRequests.lecturerSchedule(selectedName) : Promise.resolve([] as LessonPlacement[])),
    [selectedName],
  )

  const byDay = useMemo(() => {
    const groups = new Map<DayKey, LessonPlacement[]>()
    for (const placement of schedule.data ?? []) groups.set(placement.day, [...(groups.get(placement.day) ?? []), placement])
    return [...groups.entries()]
  }, [schedule.data])

  const submit = (name: string) => {
    const trimmed = name.trim()
    setDraft(trimmed)
    setSearchParams(trimmed ? { name: trimmed } : {})
  }

  const exportIcs = () =>
    downloadIcsCalendar(
      (schedule.data ?? []).map((placement, index) => ({
        uid: `lecturer-${index}-${placement.cohortId}-${placement.day}-${placement.slot}-${placement.partIndex}`,
        day: placement.day,
        slot: placement.slot,
        partIndex: placement.partIndex,
        partsCount: placement.partsCount,
        summary: placement.subject,
        description: `${placement.facultyName} | ${placement.cohortName}, ${placement.streamName}`,
        location: placement.rooms.length ? `Լսարան ${placement.rooms.join(', ')}` : '',
      })),
      settings,
      selectedName,
    )

  return (
    <>
      <PageHeader title="Դասախոսի դասացուցակ" description="Ընտրեք դասախոսին՝ տեսնելու նրա բոլոր դասերը համալսարանում" />

      <form
        className="mb-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          submit(draft)
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" />
          <TextInput
            list="all-lecturers"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (lecturers.data?.includes(event.target.value)) submit(event.target.value)
            }}
            placeholder="Դասախոսի անուն-ազգանուն"
            className="pl-9"
            aria-label="Դասախոս"
          />
          <datalist id="all-lecturers">
            {lecturers.data?.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <Button type="submit">Ցույց տալ</Button>
      </form>

      {!selectedName && (
        <EmptyState icon={<UserRound className="size-10" />} title="Ընտրեք դասախոսին" description="Սկսեք գրել անունը, և կհայտնվեն առաջարկներ։" />
      )}
      {selectedName && schedule.isLoading && <PageLoader />}
      {schedule.error && <ErrorState message={schedule.error} onRetry={schedule.reload} />}
      {selectedName && !schedule.isLoading && schedule.data?.length === 0 && (
        <EmptyState title="Դասեր չեն գտնվել" description={`«${selectedName}»-ի համար այս կիսամյակում դասեր նշանակված չեն։`} />
      )}

      {byDay.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{selectedName}</h2>
            <Button variant="secondary" size="sm" icon={<CalendarPlus className="size-4" />} onClick={exportIcs}>
              Ավելացնել օրացույցում
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {byDay.map(([day, placements]) => (
              <section key={day} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 text-sm font-bold text-brand-700 dark:text-brand-100">{DAY_LABELS[day]}</h3>
                <ul className="flex flex-col gap-2">
                  {placements.map((placement, index) => (
                    <li key={index} className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                      <div className="w-14 shrink-0 text-center">
                        <div className="font-mono text-sm font-bold">{placement.slot}</div>
                        <div className="text-[10px] text-slate-400">{settings.slotTimes[placement.slot]?.start}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {placement.subject}
                          {placement.partsCount > 1 && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">{partLabel(placement.partIndex)}</span>
                          )}
                        </p>
                        <Link to={APP_ROUTES.schedule(placement.cohortId)} className="text-xs text-slate-500 hover:text-brand-600 hover:underline">
                          {placement.facultyName} • {placement.cohortName} • {placement.streamName}
                        </Link>
                        {placement.rooms.length > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-100">
                            <DoorOpen className="size-3" /> {placement.rooms.join(', ')}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}
