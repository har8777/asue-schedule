import {
  BookOpen,
  Building2,
  Database,
  DoorOpen,
  History,
  LayoutDashboard,
  Settings,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { APP_ROUTES } from '../../../app/app.routes'
import { ADMIN_ROLES, USER_ROLES, type UserRole } from '../../auth/auth.constants'

export interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
  end?: boolean
}

export interface AdminNavSection {
  title: string
  items: AdminNavItem[]
}

/** Մենյուն կառուցվում է դերերից. յուրաքանչյուր օգտատեր տեսնում է միայն իրեն հասանելիները։ */
export const ADMIN_NAVIGATION: AdminNavSection[] = [
  {
    title: 'Դասացուցակ',
    items: [
      { to: APP_ROUTES.admin.dashboard, label: 'Վահանակ', icon: LayoutDashboard, roles: ADMIN_ROLES, end: true },
      { to: APP_ROUTES.admin.conflicts, label: 'Խաչվող դասեր', icon: TriangleAlert, roles: ADMIN_ROLES },
      { to: APP_ROUTES.admin.freeRooms, label: 'Ազատ լսարաններ', icon: DoorOpen, roles: ADMIN_ROLES },
      { to: APP_ROUTES.admin.changeLog, label: 'Փոփոխություններ', icon: History, roles: ADMIN_ROLES },
      { to: APP_ROUTES.admin.catalog, label: 'Տեղեկատու', icon: BookOpen, roles: ADMIN_ROLES },
    ],
  },
  {
    title: 'Համակարգ',
    items: [
      { to: APP_ROUTES.admin.faculties, label: 'Ֆակուլտետներ', icon: Building2, roles: [USER_ROLES.SUPER_ADMIN] },
      { to: APP_ROUTES.admin.users, label: 'Օգտատերեր', icon: Users, roles: [USER_ROLES.SUPER_ADMIN] },
      { to: APP_ROUTES.admin.backup, label: 'Պահուստավորում', icon: Database, roles: [USER_ROLES.SUPER_ADMIN] },
      { to: APP_ROUTES.admin.settings, label: 'Կարգավորումներ', icon: Settings, roles: [USER_ROLES.SUPER_ADMIN] },
    ],
  },
]
