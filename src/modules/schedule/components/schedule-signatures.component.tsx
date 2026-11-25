interface SignatureLine {
  label: string
  name: string
  /** Ստորագրության պատկերը՝ data URL։ Դատարկի դեպքում մնում է միայն գիծը։ */
  signature?: string
}

interface ScheduleSignaturesProps {
  lines: SignatureLine[]
  /** Ցուցադրե՞լ ստորագրությունների պատկերները։ */
  showSignatures?: boolean
}

/**
 * Ստորագրությունների տողերը՝ ինչպես պաշտոնական նմուշում.
 *
 *   Ուսումնական բաժնի պետ՝   [ստորագրություն]        Ա. Պետրոսյան
 *
 * Ձախում՝ պաշտոնը, մեջտեղում՝ ստորագրության տեղը, աջում՝ անունը։
 */
export const ScheduleSignatures = ({ lines, showSignatures = false }: ScheduleSignaturesProps) => {
  const visible = lines.filter((line) => line.name.trim() || line.label.trim())
  if (visible.length === 0) return null

  return (
    <footer className="mt-4 flex flex-col gap-4 px-4 text-[11px]">
      {visible.map((line) => (
        <p key={line.label} className="flex items-end gap-3">
          <span className="font-semibold whitespace-nowrap">{line.label}՝</span>
          <span className="relative w-44 border-b border-slate-400">
            {showSignatures && line.signature && (
              <img
                src={line.signature}
                alt=""
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-1/2 h-10 -translate-x-1/2 object-contain"
              />
            )}
          </span>
          <span className="flex-1" aria-hidden />
          <span className="whitespace-nowrap">{line.name}</span>
        </p>
      ))}
    </footer>
  )
}
