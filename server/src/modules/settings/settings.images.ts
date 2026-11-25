import { badRequest } from '../../core/http/http-error.ts'
import { IMAGE_DATA_URL_PATTERN, MAX_IMAGE_DATA_URL_LENGTH } from './settings.constants.ts'

/**
 * Ստուգում է պատկերի դաշտը՝ data URL (PNG/JPEG/WEBP)։ Դատարկ տողը, null-ը և
 * բացակայող արժեքը նշանակում են «պատկեր չկա»։
 *
 * **SVG չի ընդունվում** — այն կարող է սկրիպտ պարունակել, իսկ այս պատկերները
 * ցուցադրվում են նաև հանրային էջում։
 */
export const readImageField = (value: unknown, label: string): string => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw badRequest(`${label} պետք է լինի պատկեր`)
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw badRequest(`${label} չափազանց մեծ է։ Օգտագործեք մինչև 300 ԿԲ ֆայլ`)
  }
  if (!IMAGE_DATA_URL_PATTERN.test(value)) {
    throw badRequest(`${label} պետք է լինի PNG, JPEG կամ WEBP պատկեր (SVG չի ընդունվում)`)
  }
  return value
}
