/**
 * Ֆակուլտետին կցված բաժին՝ օր.՝ «Հեռակա ուսուցում» կամ «Երեկոյան մագիստրատուրա»։
 * Ցուցադրվում է մայր ֆակուլտետի ներսում՝ առանձին խմբով։
 */
export interface FacultyDivision {
  id: string
  facultyId: string
  name: string
  /**
   * Սեփական մասնաշենքը։ Դատարկ նշանակում է, որ բաժինը օգտագործում է մայր
   * ֆակուլտետի լսարանները (խաչվող դասերը ստուգվում են միասին)։
   */
  building: string
  sortOrder: number
  isPublished: boolean
  createdAt: string
}

export interface DivisionInput {
  name: string
  /** Դատարկ՝ մայր ֆակուլտետի լսարանները, լրացված՝ սեփական մասնաշենք։ */
  building: string
}
