import { useSettings } from '../../settings/settings.context'

/**
 * «ՀԱՍՏԱՏՈՒՄ ԵՄ» դաշտը՝ ճիշտ ինչպես պաշտոնական նմուշում.
 *
 *            ՀԱՍՏԱՏՈՒՄ ԵՄ
 *   ՊՐՈՌԵԿՏՈՐ՝  [ստորագրություն]  Լ. Դանիելյան
 *            «28» օգոստոսի 2026թ.
 *
 * Կնիքը դրվում է աջ կողմում՝ անվան աջ մասի վրայով, ինչպես թղթային տարբերակում.
 * մեծ է, բայց անունը երևում է նրա օղակների միջից (ֆոնը թափանցիկ է)։
 * Ստորագրությունն ու կնիքը երևում են միայն «Ցուցադրել ստորագրությունները»
 * նշումը միացնելուց հետո։
 */
export const ApprovalBlock = () => {
  const { settings } = useSettings()
  if (!settings.approverTitle && !settings.approverName) return null

  const isStamped = settings.showSignatures
  const signature = isStamped ? settings.approverSignature : ''
  const seal = isStamped ? settings.seal : ''

  return (
    <div className="relative mr-32 min-w-[250px] text-[10px] leading-relaxed">
      <p className="text-center font-bold">ՀԱՍՏԱՏՈՒՄ ԵՄ</p>

      <p className="mt-0.5 flex items-end justify-between gap-2">
        <span className="font-semibold whitespace-nowrap">{settings.approverTitle}՝</span>
        <span className="relative flex-1 border-b border-slate-400">
          {signature && (
            <img
              src={signature}
              alt=""
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-1/2 h-9 -translate-x-1/2 object-contain"
            />
          )}
        </span>
        <span className="whitespace-nowrap">{settings.approverName}</span>
      </p>

      <p className="mt-1 text-center">{settings.approvalDate || '«___» «_______» 20___թ.'}</p>

      {seal && (
        <img
          src={seal}
          alt=""
          aria-hidden
          className="pointer-events-none absolute top-0 -right-24 h-32 w-32 object-contain opacity-90"
        />
      )}
    </div>
  )
}
