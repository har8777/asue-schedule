import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../modules/auth/auth.context'
import { ConfirmProvider } from '../modules/common/components/confirm.context'
import { ToastProvider } from '../modules/common/components/toast.context'
import { ThemeProvider } from '../modules/common/theme/theme.context'
import { SettingsProvider } from '../modules/settings/settings.context'
import { appRouter } from './app.router'

/** Հավելվածի արմատը. Provider-ների հերթականությունը կարևոր է (auth-ը պետք է լինի router-ից առաջ)։ */
export const App = () => (
  <ThemeProvider>
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <SettingsProvider>
            <RouterProvider router={appRouter} />
          </SettingsProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  </ThemeProvider>
)
