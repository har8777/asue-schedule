export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadText = (content: string, fileName: string, mimeType: string): void =>
  downloadBlob(new Blob([content], { type: mimeType }), fileName)

/** Ֆայլի անվան մեջ թույլատրված նիշեր (հայերենը պահպանվում է)։ */
export const toFileName = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_')
