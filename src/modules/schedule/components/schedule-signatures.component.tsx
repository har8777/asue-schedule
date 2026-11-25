import { Fragment } from 'react'

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
 *     Ակադեմիական կազմի սպասարկման բաժնի պետ՝  [ստորագրություն]  Ժ. Ստեփանյան
 *     Կառավարման ֆակուլտետի դեկան՝             [ստորագրություն]  Մ. Մովսիսյան
 *
 * Կարևոր՝ ամբողջ բլոկը կանգնում է թղթի **մեջտեղում** և **չի ձգվում** ձախ ու աջ
 * եզրերին։ Երեք սյունակը (պաշտոն · ստորագրության տեղ · անուն/ազգանուն)
 * հավասարեցված են իրար տակ, ինչպես թղթային տարբերակում։
 */
export const ScheduleSignatures = ({ lines, showSignatures = false }: ScheduleSignaturesProps) => {
  const visible = lines.filter((line) => line.name.trim() || line.label.trim())
  if (visible.length === 0) return null

  return (
    <footer className="mt-6 flex justify-center px-4 text-[11px]">
      <div className="grid grid-cols-[auto_auto_auto] items-end gap-x-6 gap-y-8">
        {visible.map((line) => (
          <Fragment key={line.label}>
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
            <span className="whitespace-nowrap">{line.name}</span>
          </Fragment>
        ))}
      </div>
    </footer>
  )
}
