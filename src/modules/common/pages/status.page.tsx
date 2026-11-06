import { ShieldCheck, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../app/app.routes'
import { EmptyState } from '../components/feedback.component'
import { useDocumentTitle } from '../hooks/use-document-title'

const homeLink = (
  <Link to={APP_ROUTES.home} className="text-sm font-semibold text-brand-600 hover:underline">
    Վերադառնալ գլխավոր էջ
  </Link>
)

export const NotFoundPage = () => {
  useDocumentTitle('Էջը չի գտնվել')
  return (
    <div className="mx-auto w-full max-w-lg py-16">
      <EmptyState
        icon={<Search className="size-10" />}
        title="Էջը չի գտնվել"
        description="Հնարավոր է հղումը սխալ է կամ էջը հեռացվել է։"
        action={homeLink}
      />
    </div>
  )
}

export const ForbiddenPage = () => {
  useDocumentTitle('Մուտքն արգելված է')
  return (
    <div className="mx-auto w-full max-w-lg py-16">
      <EmptyState
        icon={<ShieldCheck className="size-10" />}
        title="Մուտքն արգելված է"
        description="Այս էջը հասանելի չէ Ձեր դերի համար։"
        action={homeLink}
      />
    </div>
  )
}
