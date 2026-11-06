import { WEEKDAY_KEYS } from '../schedule-config/schedule-config.constants.ts'
import type { CohortSettings, CohortStream } from './cohorts.types.ts'

export const ordinalLabel = (value: number): string => (value === 1 ? '1-ին' : `${value}-րդ`)

export const createStream = (index: number): CohortStream => ({
  id: `stream-${index}`,
  name: `${ordinalLabel(index)} հոսք`,
})

export const DEFAULT_STREAMS_COUNT = 4

export const createDefaultCohortSettings = (): CohortSettings => ({
  streams: Array.from({ length: DEFAULT_STREAMS_COUNT }, (_, index) => createStream(index + 1)),
  days: [...WEEKDAY_KEYS],
  daySlotStart: {},
})

export const DEFAULT_YEAR_COHORTS = [
  '1-ին կուրս',
  '2-րդ կուրս',
  '3-րդ կուրս',
  '4-րդ կուրս',
  '5-րդ կուրս (Մագիստրատուրա)',
]
