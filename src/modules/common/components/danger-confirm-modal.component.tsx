import { AlertTriangle } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from './button.component'
import { Modal } from './modal.component'
import { FormField, TextInput } from './form-controls.component'

interface DangerConfirmModalProps {
  isOpen: boolean
  title: string
  message: ReactNode
  /** Բառը, որը պետք է ձեռքով գրվի՝ պատահական սեղմումը բացառելու համար։ */
  phrase?: string
  confirmText?: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

/**
 * Հաստատման պատուհան անվերադարձ խմբային գործողությունների համար։
 *
 * Սովորական «Հաստատել»-ից տարբերվում է նրանով, որ կոճակը ակտիվանում է միայն
 * բառը ձեռքով գրելուց հետո։ Մեկ տարր ջնջելու համար սա ավելորդ է — այնտեղ
 * բավական է սովորական confirm-ը։
 */
export const DangerConfirmModal = ({
  isOpen,
  title,
  message,
  phrase = 'ՋՆՋԵԼ',
  confirmText = 'Ջնջել',
  onConfirm,
  onClose,
}: DangerConfirmModalProps) => {
  const [typed, setTyped] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (isOpen) setTyped('')
  }, [isOpen])

  const isMatch = typed.trim().toLocaleUpperCase('hy') === phrase

  const onSubmit = async () => {
    if (!isMatch || isBusy) return
    setIsBusy(true)
    try {
      await onConfirm()
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isBusy ? () => {} : onClose}
      size="md"
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            Չեղարկել
          </Button>
          <Button variant="danger" onClick={onSubmit} disabled={!isMatch} isLoading={isBusy}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-800 dark:bg-red-950/40 dark:text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </p>
        <FormField label={`Հաստատելու համար գրեք «${phrase}»`}>
          <TextInput
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void onSubmit()}
            placeholder={phrase}
            autoFocus
            aria-label={`Գրեք ${phrase}`}
          />
        </FormField>
      </div>
    </Modal>
  )
}
