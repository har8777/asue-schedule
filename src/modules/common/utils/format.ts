const dateTimeFormatter = new Intl.DateTimeFormat('hy-AM', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormatter.format(date)
}

export const ordinalLabel = (value: number): string => (value === 1 ? '1-ին' : `${value}-րդ`)

export const compareArmenian = (a: string, b: string): number => a.localeCompare(b, 'hy', { numeric: true })
