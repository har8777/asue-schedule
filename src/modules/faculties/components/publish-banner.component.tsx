import { EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'

interface PublishBannerProps {
  faculties: number
  cohorts: number
}

/**
 * Ցույց է տալիս, թե քանի ֆակուլտետ և կուրս դեռ սևագիր են. դրանք չեն երևում
 * ոչ ֆակուլտետների ադմինների, ոչ էլ ուսանողների մոտ։
 */
export const PublishBanner = ({ faculties, cohorts }: PublishBannerProps) => {
  if (faculties === 0 && cohorts === 0) return null
  const parts = [faculties > 0 && `${faculties} ֆակուլտետ`, cohorts > 0 && `${cohorts} կուրս`].filter(Boolean)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/40">
      <EyeOff className="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <p className="flex-1 font-semibold text-amber-900 dark:text-amber-200">
        Չհրապարակված՝ {parts.join(' և ')}։ Դրանք տեսնում եք միայն Դուք։
      </p>
      <Link to={APP_ROUTES.admin.faculties} className="font-bold text-amber-900 underline dark:text-amber-200">
        Հրապարակել
      </Link>
    </div>
  )
}
