import { useAsyncData } from '../../common/hooks/use-async-data'
import { facultiesRequests } from '../faculties.requests'

export const useFaculties = () => useAsyncData(() => facultiesRequests.list(), [])

export const useFaculty = (facultyId: string | undefined) =>
  useAsyncData(() => (facultyId ? facultiesRequests.get(facultyId) : Promise.resolve(null)), [facultyId])
