import { ImagePlus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from './button.component'
import { FormField } from './form-controls.component'

/** Ընդունվում են միայն ռաստերային ձևաչափերը. SVG-ն կարող է սկրիպտ պարունակել։ */
const ACCEPTED = 'image/png,image/jpeg,image/webp'
const MAX_WIDTH = 600
const MAX_DATA_URL_LENGTH = 420_000

/**
 * Սպիտակ ֆոնի հանման շեմերը։ Սկանավորված կնիքն ու ստորագրությունը գրեթե միշտ
 * սպիտակ թղթի վրա են, և այդ ֆոնը ծածկում է փաստաթղթի տակի գրվածքը։
 * `OPAQUE`-ից բաց պիքսելները դառնում են լրիվ թափանցիկ, `SOFT`–`OPAQUE`
 * միջակայքը՝ մասամբ, որ եզրերը ատամնավոր չստացվեն։
 */
const WHITE_OPAQUE = 246
const WHITE_SOFT = 222

interface ImageUploadFieldProps {
  label: string
  hint?: string
  /** Ընթացիկ պատկերը՝ data URL, կամ դատարկ տող։ */
  value: string
  onChange: (value: string) => void
  /** Նախադիտման ֆոնը՝ կնիքն ու ստորագրությունը սովորաբար թափանցիկ են։ */
  previewClassName?: string
  disabled?: boolean
}

/**
 * Պատկերի վերբեռնում՝ ստորագրության, կնիքի և լոգոյի համար։
 *
 * Ֆայլը բրաուզերում փոքրացվում է մինչև 600px լայնություն և վերածվում PNG-ի,
 * որպեսզի թափանցիկությունը պահպանվի և չափը տեղավորվի սահմանի մեջ։
 */
export const ImageUploadField = ({
  label,
  hint,
  value,
  onChange,
  previewClassName,
  disabled = false,
}: ImageUploadFieldProps) => {
  const inputId = useId()
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (!ACCEPTED.split(',').includes(file.type)) {
      setError('Թույլատրվում են միայն PNG, JPEG և WEBP ֆայլերը')
      return
    }
    setIsBusy(true)
    try {
      onChange(await toDataUrl(file))
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Պատկերը կարդալ չհաջողվեց')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <FormField label={label} hint={error || hint} error={error || undefined}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[repeating-conic-gradient(#f1f5f9_0_25%,transparent_0_50%)] bg-[length:12px_12px] dark:border-slate-700 ${previewClassName ?? ''}`}
        >
          {value ? (
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-slate-400">չկա</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId}>
            <span
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 ${
                disabled || isBusy ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <ImagePlus className="size-4" />
              {isBusy ? 'Բեռնվում է…' : value ? 'Փոխարինել' : 'Վերբեռնել'}
            </span>
          </label>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            disabled={disabled || isBusy}
            onChange={(event) => {
              void onPick(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          {value && (
            <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => onChange('')} disabled={disabled}>
              Հանել
            </Button>
          )}
        </div>
      </div>
    </FormField>
  )
}

/** Փոքրացնում է պատկերը և վերադարձնում PNG data URL՝ թափանցիկությունը պահպանելով։ */
const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Ֆայլը կարդալ չհաջողվեց'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Ֆայլը պատկեր չէ'))
      image.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Պատկերը մշակել չհաջողվեց'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        removeWhiteBackground(context, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
          reject(new Error('Պատկերը չափազանց մեծ է։ Օգտագործեք ավելի փոքր ֆայլ'))
          return
        }
        resolve(dataUrl)
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })

/**
 * Սպիտակ ֆոնը դարձնում է թափանցիկ, որ կնիքի կամ ստորագրության տակի գրվածքը
 * երևա։ Նայում ենք պիքսելի ամենամուգ ալիքին. մոխրա-սպիտակ ֆոնի մոտ բոլոր
 * ալիքները բարձր են, իսկ կապույտ թանաքի մոտ գոնե մեկը ցածր է, ուստի գույնը
 * չի տուժում։
 */
const removeWhiteBackground = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const image = context.getImageData(0, 0, width, height)
  const pixels = image.data
  for (let index = 0; index < pixels.length; index += 4) {
    const darkest = Math.min(pixels[index], pixels[index + 1], pixels[index + 2])
    if (darkest >= WHITE_OPAQUE) {
      pixels[index + 3] = 0
    } else if (darkest > WHITE_SOFT) {
      const ratio = (darkest - WHITE_SOFT) / (WHITE_OPAQUE - WHITE_SOFT)
      pixels[index + 3] = Math.round(pixels[index + 3] * (1 - ratio))
    }
  }
  context.putImageData(image, 0, 0)
}
