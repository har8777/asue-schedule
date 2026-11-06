import { useEffect } from 'react'

const APP_TITLE = 'Ակադեմիական դասացուցակ'

export const useDocumentTitle = (title?: string | null): void => {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE
  }, [title])
}
