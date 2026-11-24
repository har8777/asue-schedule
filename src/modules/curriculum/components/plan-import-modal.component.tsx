import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../common/components/button.component'
import { FormField, SegmentedControl } from '../../common/components/form-controls.component'
import { Modal } from '../../common/components/modal.component'
import { getErrorMessage } from '../../common/http/http-error'
import { curriculumRequests } from '../curriculum.requests'
import { describeHours } from '../curriculum.constants'
import type { PlanImportMode, PlanImportResult } from '../curriculum.types'
import { downloadPlanTemplate, parsePlanWorkbook, type ParsedPlanFile } from '../services/plan-excel.service'

interface PlanImportModalProps {
  isOpen: boolean
  onClose: () => void
  /** Ընթացիկ ընտրված կուրսը՝ առանց «Ֆակուլտետ»/«Կուրս» սյունակների ֖այլերի համար։ */
  fallback?: { cohortId: string; label: string }
  templateDefaults: { facultyName: string; cohortNames: string[]; subjects: string[] }
  /** «ֆակուլտետ::կուրս» → կուրսի id՝ ֆայլի կուրսերը նախապես ստուգելու համար։ */
  knownCohortKeys: Map<string, string>
  onImported: () => Promise<void> | void
}

/** Նույն նորմալացումը, ինչ սերվերում՝ բացատներ և մեծատառեր նշանակություն չունեն։ */
export const cohortKey = (facultyName: string, cohortName: string): string =>
  `${facultyName.trim().replace(/\s+/g, ' ').toLocaleLowerCase('hy')}::${cohortName
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('hy')}`

/**
 * Դասընթացների ներմուծում Excel-ից։ Ֆայլը նախ կարդացվում է բրաուզերում և ցուցադրվում
 * որպես նախադիտում (քանի տող, որ կուրսերի, ինչ սխալներ), և միայն հաստատելուց հետո
 * ուղարկվում սերվեր։ Ներմուծվածը մնում է **սևագրում**։
 */
export const PlanImportModal = ({
  isOpen,
  onClose,
  fallback,
  templateDefaults,
  knownCohortKeys,
  onImported,
}: PlanImportModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedPlanFile | null>(null)
  const [mode, setMode] = useState<PlanImportMode>('merge')
  const [error, setError] = useState('')
  const [result, setResult] = useState<PlanImportResult | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const reset = () => {
    setFileName('')
    setParsed(null)
    setError('')
    setResult(null)
    setMode('merge')
    if (inputRef.current) inputRef.current.value = ''
  }

  const close = () => {
    reset()
    onClose()
  }

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setError('')
    setResult(null)
    setParsed(null)
    setIsBusy(true)
    try {
      const next = await parsePlanWorkbook(file, fallback)
      if (next.rows.length === 0 && next.problems.length === 0) {
        setError('Ֆայլում լրացված տողեր չկան։')
        return
      }
      setParsed(next)
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Ֆայլը կարդալ չհաջողվեց')
    } finally {
      setIsBusy(false)
    }
  }

  const onApply = async () => {
    if (!parsed || parsed.rows.length === 0) return
    setIsBusy(true)
    setError('')
    try {
      const next = await curriculumRequests.import(parsed.rows, mode)
      setResult(next)
      await onImported()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsBusy(false)
    }
  }

  const onTemplate = async () => {
    try {
      await downloadPlanTemplate(templateDefaults)
    } catch {
      setError('Ձևանմուշը ներբեռնել չհաջողվեց')
    }
  }

  const problems = parsed?.problems ?? []
  // Ֆայլում նշված կուրսերը բաժանվում են՝ ճանաչվածների և չգտնվածների
  const recognizedByKey = new Map<string, string>()
  const unknown: string[] = []
  if (parsed?.hasCohortColumns) {
    for (const row of parsed.rows) {
      const key = cohortKey(row.facultyName ?? '', row.cohortName ?? '')
      const label = `${row.facultyName} — ${row.cohortName}`
      if (!knownCohortKeys.has(key)) {
        if (!unknown.includes(label)) unknown.push(label)
        continue
      }
      // Նույն կուրսը ֆայլում կարող է գրված լինել լրիվ և կարճ անունով — մեկ անգամ է հաշվվում
      const id = knownCohortKeys.get(key) ?? key
      if (!recognizedByKey.has(id)) recognizedByKey.set(id, label)
    }
  } else if (parsed && fallback) {
    recognizedByKey.set(fallback.cohortId, fallback.label)
  }
  const recognized = [...recognizedByKey.values()]
  const importableCount = parsed
    ? parsed.rows.filter(
        (row) => !parsed.hasCohortColumns || knownCohortKeys.has(cohortKey(row.facultyName ?? '', row.cohortName ?? '')),
      ).length
    : 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      size="lg"
      title="Ներմուծել դասընթացները Excel-ից"
      description="Ներմուծվածը մնում է սևագրում՝ մինչև «Հաստատել» սեղմելը ոչ ոք չի տեսնում։"
      footer={
        result ? (
          <Button onClick={close}>Փակել</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={isBusy}>
              Չեղարկել
            </Button>
            <Button
              icon={<Upload className="size-4" />}
              onClick={onApply}
              isLoading={isBusy}
              disabled={!parsed || parsed.rows.length === 0}
            >
              Ներմուծել{importableCount > 0 ? ` (${importableCount})` : ''}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {!result && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" icon={<Download className="size-4" />} onClick={onTemplate}>
                Ներբեռնել ձևանմուշը
              </Button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Սյունակները՝ Ֆակուլտետ · Կուրս · Դասընթաց · Ժամաքանակ
              </span>
            </div>

            <FormField
              label="Excel ֆայլ"
              hint={
                fallback
                  ? `Եթե ֆայլում «Ֆակուլտետ» և «Կուրս» սյունակները չկան, տողերը կգրվեն «${fallback.label}»-ին։`
                  : 'Ֆայլը պետք է ունենա «Ֆակուլտետ» և «Կուրս» սյունակները։'
              }
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm hover:border-brand-500 dark:border-slate-700">
                <FileSpreadsheet className="size-5 text-emerald-600" />
                <span className="truncate">{fileName || 'Ընտրեք .xlsx ֆայլը'}</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => void onPickFile(event.target.files?.[0])}
                />
              </label>
            </FormField>

            {parsed && parsed.rows.length > 0 && (
              <FormField
                label="Ռեժիմ"
                hint={
                  mode === 'merge'
                    ? 'Նոր դասընթացները ավելանում են, եղածների ժամաքանակը թարմացվում է։'
                    : 'Կուրսի դասընթացների ցուցակը փոխարինվում է ֆայլի պարունակությամբ։'
                }
              >
                <SegmentedControl<PlanImportMode>
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'merge', label: 'Ավելացնել եղածին' },
                    { value: 'replace', label: 'Փոխարինել ցուցակը' },
                  ]}
                />
              </FormField>
            )}
          </>
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {parsed && !result && (
          <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
            <p className="font-semibold">
              Կարդացվեց {parsed.rows.length} դասընթաց
              {recognized.length > 0 && ` · ${recognized.length} կուրս`}
            </p>
            {recognized.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                {recognized.slice(0, 8).map((label) => (
                  <li key={label}>• {label}</li>
                ))}
                {recognized.length > 8 && <li>• … և ևս {recognized.length - 8}</li>}
              </ul>
            )}
            <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs text-slate-500 dark:text-slate-400">
              {parsed.rows.slice(0, 6).map((row) => (
                <li key={`${row.line}-${row.subject}`}>
                  {row.subject} — {row.hours} ժամ ({describeHours(row.hours)})
                </li>
              ))}
            </ul>
          </div>
        )}

        {unknown.length > 0 && !result && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs dark:bg-amber-950/40">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {unknown.length} կուրս չի գտնվել — այդ տողերը բաց կթողնվեն
            </p>
            <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-amber-700 dark:text-amber-200">
              {unknown.slice(0, 8).map((label) => (
                <li key={label}>• {label}</li>
              ))}
              {unknown.length > 8 && <li>• … և ևս {unknown.length - 8}</li>}
            </ul>
            <p className="mt-1 text-amber-700 dark:text-amber-200">
              Ստուգեք՝ ֆակուլտետի և կուրսի անունները ճի՞շտ են գրված, ինչպես կայքում են։
            </p>
          </div>
        )}

        {problems.length > 0 && !result && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs dark:bg-amber-950/40">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {problems.length} տող բաց կթողնվի
            </p>
            <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-amber-700 dark:text-amber-200">
              {problems.slice(0, 10).map((item) => (
                <li key={item.row}>
                  {item.row}-րդ տող՝ {item.reason}
                </li>
              ))}
              {problems.length > 10 && <li>… և ևս {problems.length - 10}</li>}
            </ul>
          </div>
        )}

        {result && (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              Ավելացվեց {result.totalAdded}, թարմացվեց {result.totalUpdated} դասընթաց
            </p>
            {result.cohorts.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {result.cohorts.map((item) => (
                  <li key={item.cohortId}>
                    <span className="font-semibold">
                      {item.facultyName} — {item.cohortName}
                    </span>
                    ՝ +{item.added} նոր, {item.updated} թարմացված
                    {item.unchanged > 0 && `, ${item.unchanged} անփոփոխ`}
                    {item.removed > 0 && `, ${item.removed} հանված`}
                  </li>
                ))}
              </ul>
            )}
            {result.skipped.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-3 text-xs dark:bg-amber-950/40">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {result.skipped.length} տող բաց թողնվեց
                </p>
                <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-amber-700 dark:text-amber-200">
                  {result.skipped.slice(0, 15).map((item) => (
                    <li key={item.row}>
                      {item.row}-րդ տող՝ {item.reason}
                    </li>
                  ))}
                  {result.skipped.length > 15 && <li>… և ևս {result.skipped.length - 15}</li>}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Դասընթացները գրվեցին սևագրում։ Տեսանելի դարձնելու համար սեղմեք «Հաստատել»։
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
