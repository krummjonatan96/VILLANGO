import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { RegisterDto, LoginDto } from './auth.dto.js';
import { AuthRepository } from './auth.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { DriverUserRepository } from '../driver-users/driver-user.repository.js';

const scrypt = promisify(rawScrypt);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly drivers: DriverUserRepository,
    private readonly repository: AuthRepository,
  ) {}

  async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64) as Buffer;
    return `scrypt$${salt}$${key.toString('hex')}`;
  }

  private async verify(password: string, encoded: string) {
    const [, salt, hash] = encoded.split('$');
    if (!salt || !hash) return false;
    const key = await scrypt(password, salt, 64) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    return expected.length === key.length && timingSafeEqual(expected, key);
  }

  private publicUser(user: Record<string, unknown>) {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  async register(dto: RegisterDto) {
    try {
      const result = await this.users.createAuthenticatedUser({ ...dto, password: await this.hashPassword(dto.password) });
      return this.issue(result.insertId);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('El celular ya está registrado.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const rows = await this.drivers.findByUsernameOrCellphone(dto.usuario);
    const user = rows[0];
    if (!user || !(await this.verify(dto.password, String(user.password ?? '')))) {
      throw new UnauthorizedException('Celular o contraseña incorrectos.');
    }
    if (user.estado !== 'activo') throw new UnauthorizedException('Usuario inactivo o bloqueado.');
    return this.issueDriver(user);
  }

  private async issue(userId: number) {
    const user = (await this.users.findAuthenticatedById(userId))[0];
    const token = randomBytes(32).toString('hex');
    await this.repository.createToken(userId, createHash('sha256').update(token).digest('hex'));
    return { success: true, message: 'Autenticación correcta', data: { token, user: this.publicUser(user) } };
  }

  private async issueDriver(driver: Record<string, unknown>) {
    const token = randomBytes(32).toString('hex');
    await this.repository.createDriverToken(Number(driver.id), createHash('sha256').update(token).digest('hex'));
    return { token, user: this.publicUser({ ...driver, rol: this.driverRole(driver) }) };
  }

  private driverRole(driver: Record<string, unknown>) {
    return String(driver.rol ?? 'CONDUCTOR').toUpperCase() === 'ADMINISTRADOR'
      ? 'ADMINISTRADOR'
      : 'CONDUCTOR';
  }

  async requireConductor(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido.');
    const tokenHash = createHash('sha256').update(authorization.slice(7)).digest('hex');
    const driver = await this.repository.findDriverSession(tokenHash);
    if (!driver || driver.estado !== 'activo') throw new UnauthorizedException('Token invalido o expirado.');
    if (this.driverRole(driver) !== 'CONDUCTOR') throw new UnauthorizedException('Solo los conductores pueden realizar esta accion.');
    await this.repository.touchDriverToken(Number(driver.token_id));
    return driver;
  }

  async requireAdministrator(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido.');
    const tokenHash = createHash('sha256').update(authorization.slice(7)).digest('hex');
    const driver = await this.repository.findDriverSession(tokenHash);
    if (!driver || driver.estado !== 'activo') throw new UnauthorizedException('Token invalido o expirado.');
    if (this.driverRole(driver) !== 'ADMINISTRADOR') {
      throw new UnauthorizedException('Solo los administradores pueden realizar esta accion.');
    }
    await this.repository.touchDriverToken(Number(driver.token_id));
    return driver;
  }

  async me(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido.');
    const tokenHash = createHash('sha256').update(authorization.slice(7)).digest('hex');
    const driverSession = await this.repository.findDriverSession(tokenHash);
    if (driverSession?.estado === 'activo') {
      await this.repository.touchDriverToken(Number(driverSession.token_id));
      return {
        success: true,
        message: 'Conductor autenticado',
        data: this.publicUser({ ...driverSession, rol: this.driverRole(driverSession) }),
      };
    }
    const session = await this.repository.findSession(tokenHash);
    if (!session || session.estado !== 'activo') throw new UnauthorizedException('Token inválido o expirado.');
    await this.repository.touchToken(Number(session.token_id));
    return { success: true, message: 'Usuario autenticado', data: this.publicUser(session) };
  }

  async logout(authorization?: string) {
    if (authorization?.startsWith('Bearer ')) {
      const tokenHash = createHash('sha256').update(authorization.slice(7)).digest('hex');
      await this.repository.deleteToken(tokenHash);
      await this.repository.deleteDriverToken(tokenHash);
    }
    return { success: true, message: 'Sesión cerrada', data: null };
  }
}
