import { badRequest, conflict, notFound } from '../../core/http/http-error.ts'
import { passwordHasher } from '../../core/security/password-hasher.ts'
import { createId, nowIso } from '../../core/utils/id.ts'
import { AUTH_CONSTANTS, USER_ROLES } from '../auth/auth.constants.ts'
import type { FacultiesRepository } from '../faculties/faculties.repository.ts'
import type { UsersRepository } from './users.repository.ts'
import type { CreateUserDto, PublicUser, UpdateUserDto, UserRecord } from './users.types.ts'

export const toPublicUser = ({ passwordHash: _hash, ...user }: UserRecord): PublicUser => user

export class UsersService {
  private readonly users: UsersRepository
  private readonly faculties: FacultiesRepository

  constructor(users: UsersRepository, faculties: FacultiesRepository) {
    this.users = users
    this.faculties = faculties
  }

  list(): PublicUser[] {
    return this.users.findAll().map(toPublicUser)
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    if (this.users.findByUsername(dto.username)) {
      throw conflict(`«${dto.username}» մուտքանունով օգտատեր արդեն գոյություն ունի`)
    }
    this.assertPassword(dto.password)
    const facultyId = this.resolveFaculty(dto.role, dto.facultyId)
    const now = nowIso()
    const user: UserRecord = {
      id: createId(),
      username: dto.username,
      displayName: dto.displayName,
      passwordHash: await passwordHasher.hash(dto.password),
      role: dto.role,
      facultyId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    this.users.insert(user)
    return toPublicUser(user)
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string): Promise<PublicUser> {
    const user = this.users.findById(id)
    if (!user) throw notFound('Օգտատերը չի գտնվել')

    const role = dto.role ?? user.role
    const isActive = dto.isActive ?? user.isActive
    const losesSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN && (role !== USER_ROLES.SUPER_ADMIN || !isActive)
    if (losesSuperAdmin && this.users.countActiveSuperAdmins() <= 1) {
      throw badRequest('Համակարգում պետք է մնա առնվազն մեկ ակտիվ գլխավոր ադմինիստրատոր')
    }
    if (id === actingUserId && !isActive) throw badRequest('Չեք կարող ապաակտիվացնել Ձեր սեփական հաշիվը')

    if (dto.password !== undefined) this.assertPassword(dto.password)
    const updated: UserRecord = {
      ...user,
      displayName: dto.displayName ?? user.displayName,
      role,
      isActive,
      facultyId: this.resolveFaculty(role, dto.facultyId === undefined ? user.facultyId : dto.facultyId),
      passwordHash: dto.password ? await passwordHasher.hash(dto.password) : user.passwordHash,
      updatedAt: nowIso(),
    }
    this.users.update(updated)
    return toPublicUser(updated)
  }

  remove(id: string, actingUserId: string): void {
    const user = this.users.findById(id)
    if (!user) throw notFound('Օգտատերը չի գտնվել')
    if (id === actingUserId) throw badRequest('Չեք կարող ջնջել Ձեր սեփական հաշիվը')
    if (user.role === USER_ROLES.SUPER_ADMIN && this.users.countActiveSuperAdmins() <= 1) {
      throw badRequest('Համակարգում պետք է մնա առնվազն մեկ գլխավոր ադմինիստրատոր')
    }
    this.users.delete(id)
  }

  assertPassword(password: string): void {
    if (password.length < AUTH_CONSTANTS.MIN_PASSWORD_LENGTH) {
      throw badRequest(`Գաղտնաբառը պետք է ունենա առնվազն ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} նիշ`)
    }
  }

  /** Ադմինը միշտ կապված է մեկ ֆակուլտետի, գլխավոր ադմինը՝ ոչ մեկին։ */
  private resolveFaculty(role: UserRecord['role'], facultyId: string | null): string | null {
    if (role === USER_ROLES.SUPER_ADMIN) return null
    if (!facultyId) throw badRequest('Ադմինիստրատորի համար պետք է ընտրել ֆակուլտետ')
    if (!this.faculties.findById(facultyId)) throw badRequest('Ընտրված ֆակուլտետը գոյություն չունի')
    return facultyId
  }
}
