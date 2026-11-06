import { badRequest, tooManyRequests, unauthorized } from '../../core/http/http-error.ts'
import type { JwtService } from '../../core/security/jwt.ts'
import { passwordHasher } from '../../core/security/password-hasher.ts'
import { RateLimiter } from '../../core/security/rate-limiter.ts'
import { nowIso } from '../../core/utils/id.ts'
import type { UsersRepository } from '../users/users.repository.ts'
import type { UsersService } from '../users/users.service.ts'
import type { UserRecord } from '../users/users.types.ts'
import { AUTH_CONSTANTS } from './auth.constants.ts'
import type { AuthUser, LoginResult, TokenPayload } from './auth.types.ts'

const toAuthUser = (user: UserRecord): AuthUser => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  role: user.role,
  facultyId: user.facultyId,
})

export class AuthService {
  private readonly users: UsersRepository
  private readonly usersService: UsersService
  private readonly jwt: JwtService
  private readonly limiter = new RateLimiter(AUTH_CONSTANTS.LOGIN_ATTEMPTS_LIMIT, AUTH_CONSTANTS.LOGIN_WINDOW_MS)

  constructor(users: UsersRepository, usersService: UsersService, jwt: JwtService) {
    this.users = users
    this.usersService = usersService
    this.jwt = jwt
  }

  async login(username: string, password: string, ip: string): Promise<LoginResult> {
    const limiterKey = `${ip}:${username.toLowerCase()}`
    if (!this.limiter.consume(limiterKey)) {
      throw tooManyRequests('Չափազանց շատ անհաջող փորձեր։ Փորձեք մի քանի րոպե անց։')
    }

    const user = this.users.findByUsername(username)
    const isValid = user ? await passwordHasher.verify(password, user.passwordHash) : false
    if (!user || !isValid || !user.isActive) {
      throw unauthorized('Սխալ մուտքանուն կամ գաղտնաբառ')
    }

    this.limiter.reset(limiterKey)
    const { token, expiresAt } = this.jwt.sign<TokenPayload>({ sub: user.id, role: user.role })
    return { token, expiresAt, user: toAuthUser(user) }
  }

  /** Token-ից վերականգնում է օգտատիրոջը՝ բազայից թարմ տվյալներով (դերի փոփոխությունը կիրառվում է անմիջապես)։ */
  resolveUser(token: string): AuthUser | null {
    const payload = this.jwt.verify<TokenPayload>(token)
    if (!payload) return null
    const user = this.users.findById(payload.sub)
    if (!user || !user.isActive) return null
    return toAuthUser(user)
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = this.users.findById(userId)
    if (!user) throw unauthorized()
    if (!(await passwordHasher.verify(currentPassword, user.passwordHash))) {
      throw badRequest('Ընթացիկ գաղտնաբառը սխալ է')
    }
    this.usersService.assertPassword(newPassword)
    this.users.update({ ...user, passwordHash: await passwordHasher.hash(newPassword), updatedAt: nowIso() })
  }
}
