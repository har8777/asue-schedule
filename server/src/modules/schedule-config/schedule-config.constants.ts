export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type DayKey = (typeof DAY_KEYS)[number]

export const WEEKDAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Երկուշաբթի',
  tuesday: 'Երեքշաբթի',
  wednesday: 'Չորեքշաբթի',
  thursday: 'Հինգշաբթի',
  friday: 'Ուրբաթ',
  saturday: 'Շաբաթ',
  sunday: 'Կիրակի',
}

/** Զույգ ժամերը (դասաժամերը)։ Մեկ օրում ցուցադրվում է SLOTS_PER_DAY հատ՝ սկսած ընտրվածից։ */
export const SLOT_KEYS = ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12', '13-14', '15-16', '17-18'] as const
export type SlotKey = (typeof SLOT_KEYS)[number]

export const SLOTS_PER_DAY = 4
export const DEFAULT_DAY_SLOTS: SlotKey[] = ['1-2', '3-4', '5-6', '7-8']

export const MAX_STREAMS = 6
export const MIN_STREAMS = 1
export const MAX_LESSON_PARTS = 8

export interface SlotTime {
  start: string
  end: string
}

export const DEFAULT_SLOT_TIMES: Record<SlotKey, SlotTime> = {
  '1-2': { start: '09:30', end: '10:50' },
  '3-4': { start: '11:00', end: '12:20' },
  '5-6': { start: '12:50', end: '14:10' },
  '7-8': { start: '14:20', end: '15:40' },
  '9-10': { start: '15:50', end: '17:10' },
  '11-12': { start: '17:20', end: '18:40' },
  '13-14': { start: '18:50', end: '20:10' },
  '15-16': { start: '20:20', end: '21:40' },
  '17-18': { start: '21:50', end: '23:10' },
}

/** Վերադարձնում է օրվա 4 դասաժամը՝ սկսած նշվածից (օր.՝ 3-4 → 3-4, 5-6, 7-8, 9-10)։ */
export const buildDaySlots = (start: SlotKey): SlotKey[] => {
  const startIndex = SLOT_KEYS.indexOf(start)
  return SLOT_KEYS.slice(startIndex, startIndex + SLOTS_PER_DAY)
}
