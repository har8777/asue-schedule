export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type DayKey = (typeof DAY_KEYS)[number]

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Երկուշաբթի',
  tuesday: 'Երեքշաբթի',
  wednesday: 'Չորեքշաբթի',
  thursday: 'Հինգշաբթի',
  friday: 'Ուրբաթ',
  saturday: 'Շաբաթ',
  sunday: 'Կիրակի',
}

export const DAY_SHORT_LABELS: Record<DayKey, string> = {
  monday: 'Երկ',
  tuesday: 'Երք',
  wednesday: 'Չրք',
  thursday: 'Հնգ',
  friday: 'Ուրբ',
  saturday: 'Շբթ',
  sunday: 'Կիր',
}

export const SLOT_KEYS = ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12', '13-14', '15-16', '17-18'] as const
export type SlotKey = (typeof SLOT_KEYS)[number]

export const SLOTS_PER_DAY = 4
/** Օրվա առաջին դասաժամը կարող է լինել 1-2-ից մինչև 13-14։ */
export const ALLOWED_DAY_STARTS: SlotKey[] = SLOT_KEYS.slice(0, 7)

export const MAX_STREAMS = 6
export const MIN_STREAMS = 1
export const MAX_LESSON_PARTS = 8

export const DEFAULT_SLOT_TIMES: Record<SlotKey, { start: string; end: string }> = {
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

/** Դասի մասերի անվանումները. 1-ինը՝ «Համարիչ», 2-րդը՝ «Հայտարար»։ */
export const partLabel = (index: number): string =>
  index === 0 ? 'Համարիչ' : index === 1 ? 'Հայտարար' : `${index + 1}-րդ մաս`
