import { TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Button } from './button.component'
import { Modal } from './modal.component'

export interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  isDanger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/** Promise-ի վրա հիմնված հաստատման պատուհան՝ window.confirm()-ի փոխարեն։ */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<(value: boolean) => void>(() => {})

  const confirm = useCallback<ConfirmFn>(
    (nextOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
        setOptions(nextOptions)
      }),
    [],
  )

  const close = (result: boolean) => {
    resolverRef.current(result)
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={options !== null}
        onClose={() => close(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            {options?.isDanger && <TriangleAlert className="size-5 text-red-500" />}
            {options?.title}
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              {options?.cancelText ?? 'Չեղարկել'}
            </Button>
            <Button variant={options?.isDanger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {options?.confirmText ?? 'Հաստատել'}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{options?.message}</div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = (): ConfirmFn => {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm-ը պետք է օգտագործվի ConfirmProvider-ի ներսում')
  return context
}
