import { toFileName } from '../../common/utils/download'

const PAGE_WIDTH_MM = 297
const MARGIN_MM = 4
const MIN_CAPTURE_WIDTH = 1100

/**
 * Աղյուսակը վերածում է PDF-ի։ Ժամանակավորապես ցուցադրում է ամբողջ լայնությամբ
 * (առանց հորիզոնական scroll-ի), նկարում է և վերականգնում նախկին ոճերը։
 * Գրադարանները բեռնվում են միայն անհրաժեշտության դեպքում (lazy import)։
 */
export const exportElementToPdf = async (elementId: string, fileName: string): Promise<void> => {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Աղյուսակը չի գտնվել')

  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
  const scrollContainers = Array.from(element.querySelectorAll<HTMLElement>('.print-table-wrapper'))
  const printOnly = Array.from(element.querySelectorAll<HTMLElement>('.print-only'))
  const table = element.querySelector('table')
  const originalStyle = element.getAttribute('style') ?? ''
  const isDark = document.documentElement.classList.contains('dark')

  try {
    if (isDark) document.documentElement.classList.remove('dark')
    const width = Math.max(table?.scrollWidth ?? 0, MIN_CAPTURE_WIDTH)
    element.style.display = 'block'
    element.style.width = `${width + 32}px`
    element.style.padding = '16px'
    scrollContainers.forEach((container) => (container.style.overflow = 'visible'))
    printOnly.forEach((node) => (node.style.display = 'block'))
    await new Promise((resolve) => setTimeout(resolve, 100))

    const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
    const image = new Image()
    image.src = dataUrl
    await image.decode()

    const contentWidth = PAGE_WIDTH_MM - MARGIN_MM * 2
    const contentHeight = (contentWidth * image.height) / image.width
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [PAGE_WIDTH_MM, Math.max(contentHeight + MARGIN_MM * 2, 210)],
    })
    pdf.addImage(dataUrl, 'PNG', MARGIN_MM, MARGIN_MM, contentWidth, contentHeight)
    pdf.save(`${toFileName(fileName)}.pdf`)
  } finally {
    element.setAttribute('style', originalStyle)
    scrollContainers.forEach((container) => (container.style.overflow = ''))
    printOnly.forEach((node) => (node.style.display = ''))
    if (isDark) document.documentElement.classList.add('dark')
  }
}
