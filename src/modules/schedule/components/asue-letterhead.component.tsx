import { useSettings } from '../../settings/settings.context'
import { ApprovalBlock } from './approval-block.component'

interface AsueLetterheadProps {
  /** Վերնագրի տակի տողը՝ ֆակուլտետ, ուսումնական տարի, կուրս և հոսք։ */
  subtitle: string
}

/**
 * Պաշտոնական դասացուցակի վերնագիրը՝ ՀՊՏՀ-ի ձևաթղթի տեսքով։ Ձախում՝ համալսարանի
 * անվանումը, աջում՝ «ՀԱՍՏԱՏՈՒՄ ԵՄ» դաշտը, կենտրոնում՝ «ԴԱՍԱՑՈՒՑԱԿ»։
 */
export const AsueLetterhead = ({ subtitle }: AsueLetterheadProps) => {
  const { settings } = useSettings()

  return (
    <header className="mb-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {settings.logo ? (
            <img src={settings.logo} alt="" aria-hidden className="h-10 object-contain" />
          ) : (
            <span className="flex items-center rounded-sm border-2 border-brand-600 px-1.5 py-0.5 text-[15px] leading-none font-black tracking-[0.12em] text-brand-600">
              ՀՊՏՀ
            </span>
          )}
          <span className="text-[8px] leading-[1.35] font-bold tracking-wide text-brand-600 uppercase">
            Հայաստանի պետական
            <br />
            տնտեսագիտական
            <br />
            համալսարան
          </span>
        </div>

        <ApprovalBlock />
      </div>

      <h2 className="mt-1 text-center text-lg font-extrabold tracking-[0.35em]">ԴԱՍԱՑՈՒՑԱԿ</h2>
      <p className="mt-0.5 text-center text-[11px] font-bold">{subtitle}</p>
    </header>
  )
}
