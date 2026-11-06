import { BookOpen, DoorOpen, LoaderCircle, Search, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { useAuth } from '../../auth/auth.context'
import { CATALOG_TYPE_SINGULAR } from '../../catalog/catalog.types'
import { DAY_LABELS, partLabel } from '../../schedule/schedule.constants'
import { reportsRequests } from '../reports.requests'
import type { SearchResults } from '../reports.types'

const CATALOG_ICONS = { subject: BookOpen, lecturer: UserRound, room: DoorOpen }
const DEBOUNCE_MS = 250

/** Ամբողջ համալսարանով արագ որոնում (Ctrl+K)։ */
export const SearchPalette = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate()
  const { canEditFaculty } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(null)
      return
    }
    let isCancelled = false
    setIsLoading(true)
    const timer = setTimeout(() => {
      reportsRequests
        .search(trimmed)
        .then((data) => !isCancelled && setResults(data))
        .catch(() => undefined)
        .finally(() => !isCancelled && setIsLoading(false))
    }, DEBOUNCE_MS)
    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [query])

  if (!isOpen) return null

  const openCohort = (cohortId: string, facultyId: string) => {
    onClose()
    navigate(canEditFaculty(facultyId) ? APP_ROUTES.admin.editor(cohortId) : APP_ROUTES.schedule(cohortId))
  }

  const isEmpty = results && results.lessons.length === 0 && results.catalog.length === 0

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[10vh]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="animate-sheet-in relative flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          {isLoading ? <LoaderCircle className="size-5 animate-spin text-slate-400" /> : <Search className="size-5 text-slate-400" />}
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Առարկա, դասախոս, լսարան կամ կուրս..."
            className="h-14 flex-1 bg-transparent text-base outline-none"
            aria-label="Որոնում"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 font-mono text-[10px] text-slate-400 sm:block dark:border-slate-700">ESC</kbd>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
          {!results && <p className="px-3 py-8 text-center text-sm text-slate-400">Մուտքագրեք առնվազն 2 նիշ</p>}
          {isEmpty && <p className="px-3 py-8 text-center text-sm text-slate-400">Ոչինչ չի գտնվել</p>}

          {results && results.lessons.length > 0 && (
            <section className="mb-2">
              <p className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase">Դասեր</p>
              {results.lessons.map((lesson, index) => (
                <button
                  key={`${lesson.cohortId}-${lesson.day}-${lesson.slot}-${lesson.streamId}-${lesson.partIndex}-${index}`}
                  type="button"
                  onClick={() => openCohort(lesson.cohortId, lesson.facultyId)}
                  className="flex w-full cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="text-sm font-semibold">
                    {lesson.subject}
                    {lesson.partsCount > 1 && <span className="ml-1.5 text-xs text-amber-600">({partLabel(lesson.partIndex)})</span>}
                  </span>
                  <span className="text-xs text-slate-500">
                    {DAY_LABELS[lesson.day]} {lesson.slot} • {lesson.facultyName} • {lesson.cohortName} • {lesson.streamName}
                    {lesson.lecturers.length > 0 && ` • ${lesson.lecturers.join(', ')}`}
                    {lesson.rooms.length > 0 && ` • ${lesson.rooms.join(', ')}`}
                  </span>
                </button>
              ))}
            </section>
          )}

          {results && results.catalog.length > 0 && (
            <section>
              <p className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase">Տեղեկատու</p>
              {results.catalog.map((item, index) => {
                const Icon = CATALOG_ICONS[item.type]
                return (
                  <div key={`${item.type}-${item.name}-${item.facultyId}-${index}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
                    <Icon className="size-4 text-slate-400" />
                    <span className="flex-1 font-medium">{item.name}</span>
                    <span className="text-xs text-slate-400">
                      {CATALOG_TYPE_SINGULAR[item.type]} • {item.facultyName.replace(/ ֆակուլտետ$/, '')}
                    </span>
                  </div>
                )
              })}
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
