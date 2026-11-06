import { DoorOpen } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/auth.context'
import { EmptyState, ErrorState, PageLoader } from '../../common/components/feedback.component'
import { FormField, SelectInput } from '../../common/components/form-controls.component'
import { Card, PageHeader } from '../../common/components/page-header.component'
import { useAsyncData } from '../../common/hooks/use-async-data'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { cn } from '../../common/utils/classnames'
import { useFaculties } from '../../faculties/hooks/use-faculties'
import { DAY_KEYS, DAY_LABELS, partLabel, SLOT_KEYS, type DayKey, type SlotKey } from '../../schedule/schedule.constants'
import { pickInitialDay } from '../../schedule/schedule.utils'
import { reportsRequests } from '../reports.requests'
import type { RoomStatus } from '../reports.types'

/** Լսարանների զբաղվածության քարտեզ՝ ըստ հարկերի։ */
export const FreeRoomsPage = () => {
  useDocumentTitle('Ազատ լսարաններ')
  const { user } = useAuth()
  const faculties = useFaculties()
  const [facultyId, setFacultyId] = useState<string>(user?.facultyId ?? '')
  const [day, setDay] = useState<DayKey>(() => pickInitialDay([...DAY_KEYS.slice(0, 6)]))
  const [slot, setSlot] = useState<SlotKey | 'all'>('1-2')
  const [selectedRoom, setSelectedRoom] = useState<RoomStatus | null>(null)
  const activeFacultyId = facultyId || faculties.data?.[0]?.id || ''

  const rooms = useAsyncData(
    () => (activeFacultyId ? reportsRequests.freeRooms(activeFacultyId, day, slot) : Promise.resolve([])),
    [activeFacultyId, day, slot],
  )

  return (
    <>
      <PageHeader title="Ազատ լսարաններ" description="Կանաչը՝ ազատ, կարմիրը՝ զբաղված։ Սեղմեք լսարանի վրա՝ մանրամասների համար։" />

      <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <FormField label="Ֆակուլտետ">
          <SelectInput value={activeFacultyId} onChange={(event) => setFacultyId(event.target.value)}>
            {faculties.data?.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Օր">
          <SelectInput value={day} onChange={(event) => setDay(event.target.value as DayKey)}>
            {DAY_KEYS.map((key) => (
              <option key={key} value={key}>
                {DAY_LABELS[key]}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Դասաժամ">
          <SelectInput value={slot} onChange={(event) => setSlot(event.target.value as SlotKey | 'all')}>
            <option value="all">Ամբողջ օրը</option>
            {SLOT_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </SelectInput>
        </FormField>
      </Card>

      {rooms.isLoading && !rooms.data && <PageLoader />}
      {rooms.error && <ErrorState message={rooms.error} onRetry={rooms.reload} />}
      {rooms.data?.length === 0 && (
        <EmptyState icon={<DoorOpen className="size-10" />} title="Լսարաններ չկան" description="Ավելացրեք լսարաններ «Տեղեկատու» բաժնում։" />
      )}

      <div className="flex flex-col gap-4">
        {rooms.data?.map((floor) => {
          const freeCount = floor.rooms.filter((room) => room.isFree).length
          return (
            <Card key={floor.floor} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">{floor.floor}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {freeCount} / {floor.rooms.length} ազատ
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
                {floor.rooms.map((room) => (
                  <button
                    key={room.name}
                    type="button"
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 py-2 font-mono text-xs font-bold transition-transform active:scale-95',
                      room.isFree
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
                    )}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {selectedRoom && (
        <Card className="fixed inset-x-3 bottom-3 z-30 p-4 shadow-2xl sm:right-6 sm:left-auto sm:w-96">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Լսարան {selectedRoom.name}</h3>
            <button type="button" onClick={() => setSelectedRoom(null)} className="cursor-pointer text-sm text-slate-400 hover:text-slate-700">
              Փակել
            </button>
          </div>
          {selectedRoom.isFree ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">Ազատ է ընտրված ժամին։</p>
          ) : (
            <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto text-xs">
              {selectedRoom.occupiedBy.map((placement, index) => (
                <li key={index} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                  <span className="font-mono font-bold">{placement.slot}</span> • {placement.subject}
                  {placement.partsCount > 1 && ` (${partLabel(placement.partIndex)})`}
                  <div className="text-slate-500">
                    {placement.facultyName} • {placement.cohortName} • {placement.streamName}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  )
}
