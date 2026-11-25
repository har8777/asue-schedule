/**
 * Ստորագրությունների, կնիքի և լոգոյի պատկերները պահվում են որպես data URL։
 *
 * **SVG-ն դիտմամբ արգելված է** — SVG ֆայլը կարող է պարունակել սկրիպտ, իսկ այս
 * պատկերները ցուցադրվում են նաև հանրային էջում։ Թույլատրվում են միայն
 * ռաստերային ձևաչափերը։
 */
export const ALLOWED_IMAGE_TYPES = ['png', 'jpeg', 'webp'] as const

export const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/

/** Մեկ պատկերի առավելագույն չափը՝ base64 տողի երկարությամբ (~300 ԿԲ բուն ֆայլ)։ */
export const MAX_IMAGE_DATA_URL_LENGTH = 420_000
