interface SignatureLine {
  label: string
  name: string
}

interface ScheduleSignaturesProps {
  lines: SignatureLine[]
}

/**
 * Ստորագրությունների տողերը՝ ձախում պաշտոնը, աջում՝ անունը, մեջտեղում՝
 * ստորագրության տեղը, ինչպես թղթային դասացուցակում։
 */
export const ScheduleSignatures = ({ lines }: ScheduleSignaturesProps) => {
  const visible = lines.filter((line) => line.name.trim())
  if (visible.length === 0) return null

  return (
    <footer className="mt-4 flex flex-col gap-3 px-4 text-[11px]">
      {visible.map((line) => (
        <p key={line.label} className="flex items-end gap-3">
          <span className="font-semibold whitespace-nowrap">{line.label}՝</span>
          <span className="w-40 border-b border-slate-400" aria-hidden />
          <span className="flex-1" aria-hidden />
          <span className="whitespace-nowrap">{line.name}</span>
        </p>
      ))}
    </footer>
  )
}
