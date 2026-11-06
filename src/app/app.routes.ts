/** Հավելվածի բոլոր ճանապարհները մեկ տեղում (կոդում հարդկոդ ճանապարհներ չլինելու համար)։ */
export const APP_ROUTES = {
  home: '/',
  schedule: (cohortId: string) => `/schedule/${cohortId}`,
  lecturers: '/lecturers',
  login: '/login',
  forbidden: '/403',
  admin: {
    dashboard: '/admin',
    editor: (cohortId: string) => `/admin/schedule/${cohortId}`,
    conflicts: '/admin/conflicts',
    freeRooms: '/admin/free-rooms',
    changeLog: '/admin/change-log',
    catalog: '/admin/catalog',
    faculties: '/admin/faculties',
    users: '/admin/users',
    backup: '/admin/backup',
    settings: '/admin/settings',
  },
} as const
