import { Download, TriangleAlert, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../common/components/button.component'
import { useConfirm } from '../../common/components/confirm.context'
import { Card, PageHeader } from '../../common/components/page-header.component'
import { useToast } from '../../common/components/toast.context'
import { useDocumentTitle } from '../../common/hooks/use-document-title'
import { getErrorMessage } from '../../common/http/http-error'
import { downloadBlob } from '../../common/utils/download'
import { facultiesRequests } from '../../faculties/faculties.requests'
import { backupRequests } from '../backup.requests'

/** Պահուստային պատճեններ և ամբողջական մաքրում (միայն գլխավոր ադմինիստրատոր)։ */
export const BackupPage = () => {
  useDocumentTitle('Պահուստավորում')
  const toast = useToast()
  const confirm = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const download = async () => {
    setIsDownloading(true)
    try {
      downloadBlob(await backupRequests.download(), `asue-schedule-backup-${new Date().toISOString().slice(0, 10)}.json`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDownloading(false)
    }
  }

  const restore = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text())
      const isLegacy = typeof data === 'object' && data !== null && 'allSchedules' in data
      const isConfirmed = await confirm({
        title: isLegacy ? 'Ներմուծե՞լ հին տարբերակի տվյալները' : 'Վերականգնե՞լ պահուստից',
        isDanger: !isLegacy,
        confirmText: isLegacy ? 'Ներմուծել' : 'Վերականգնել',
        message: isLegacy
          ? 'Հին տարբերակի դասերը կավելացվեն ընթացիկ դասացուցակին։ Նույն վանդակներում առկա դասերը կփոխարինվեն։'
          : 'Ընթացիկ բոլոր ֆակուլտետները, կուրսերը, դասերը և տեղեկատուն կփոխարինվեն ֆայլի տվյալներով։ Օգտատերերը չեն փոխվի։',
      })
      if (!isConfirmed) return
      setIsRestoring(true)
      const result = await backupRequests.restore(data)
      toast.success(`Պատրաստ է. ${result.lessons} դաս, ${result.cohorts} կուրս${result.mode === 'legacy' ? ' (հին ձևաչափ)' : ''}`)
    } catch (error) {
      toast.error(error instanceof SyntaxError ? 'Ֆայլը վավեր JSON չէ' : getErrorMessage(error))
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearAll = async () => {
    const isConfirmed = await confirm({
      title: 'Ջնջե՞լ ԲՈԼՈՐ դասերը',
      isDanger: true,
      confirmText: 'Այո, ջնջել ամեն ինչ',
      message: 'Ամբողջ համալսարանի դասացուցակը կջնջվի։ Ֆակուլտետները, կուրսերը և տեղեկատուն կմնան։ Նախապես ներբեռնեք պահուստային պատճենը։',
    })
    if (!isConfirmed) return
    try {
      const result = await facultiesRequests.clearAllLessons()
      toast.success(`Ջնջվեց ${result.deleted} դաս`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <>
      <PageHeader title="Պահուստավորում" description="Պարբերաբար ներբեռնեք պահուստային պատճենը" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold">Ներբեռնել պատճենը</h2>
          <p className="text-sm text-slate-500">JSON ֆայլ՝ ֆակուլտետներ, կուրսեր, դասեր, տեղեկատու և կարգավորումներ (առանց օգտատերերի գաղտնաբառերի)։</p>
          <Button className="self-start" icon={<Download className="size-4" />} isLoading={isDownloading} onClick={download}>
            Ներբեռնել
          </Button>
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold">Վերականգնել / ներմուծել</h2>
          <p className="text-sm text-slate-500">
            Ընդունում է այս համակարգի պատճենը, ինչպես նաև <strong>հին տարբերակի «Backup JSON»</strong> ֆայլը, որպեսզի արդեն լրացված դասացուցակները տեղափոխվեն։
          </p>
          <Button variant="secondary" className="self-start" icon={<Upload className="size-4" />} isLoading={isRestoring} onClick={() => fileInputRef.current?.click()}>
            Ընտրել ֆայլը
          </Button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => event.target.files?.[0] && restore(event.target.files[0])} />
        </Card>
        <Card className="flex flex-col gap-3 border-red-200 p-5 lg:col-span-2 dark:border-red-900/60">
          <h2 className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
            <TriangleAlert className="size-5" /> Վտանգավոր գոտի
          </h2>
          <p className="text-sm text-slate-500">Ջնջում է ամբողջ համալսարանի բոլոր դասերը։ Ֆակուլտետի դասացուցակը մաքրելու համար օգտվեք «Ֆակուլտետներ» բաժնից։</p>
          <Button variant="danger" className="self-start" onClick={clearAll}>
            Ջնջել բոլոր դասերը
          </Button>
        </Card>
      </div>
    </>
  )
}
