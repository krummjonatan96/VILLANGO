import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { scrypt as rawScrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import {
  ChangeDriverAvailabilityDto,
  ChangeDriverUserStatusDto,
  CreateDriverUserDto,
  UpdateDriverUserDto,
} from './driver-user.dto.js';
import { DriverUserRepository } from './driver-user.repository.js';

const scrypt = promisify(rawScrypt);

@Injectable()
export class DriverUserService {
  constructor(private readonly repository: DriverUserRepository) {}

  findAll() {
    return this.repository.findAll();
  }

  findById(id: number) {
    return this.repository.findById(id);
  }

  async create(dto: CreateDriverUserDto) {
    await this.ensureUniqueBusinessKeys(dto);
    return this.repository.rawCreate({
      ...dto,
      estado: dto.estado ?? 'pendiente',
      estado_disponibilidad: dto.estado_disponibilidad ?? 'offline',
      password: await this.hash(dto.password),
    });
  }

  async update(id: number, dto: UpdateDriverUserDto) {
    await this.repository.findById(id);
    await this.ensureUniqueBusinessKeys(dto, id);
    const data = { ...dto };
    if (dto.password) {
      data.password = await this.hash(dto.password);
    }
    return this.repository.update(id, data);
  }

  remove(id: number) {
    return this.repository.remove(id);
  }

  changeStatus(id: number, dto: ChangeDriverUserStatusDto) {
    return this.repository.updateStatus(id, dto.estado);
  }

  async changeAvailability(id: number, dto: ChangeDriverAvailabilityDto) {
    const driver = await this.repository.findById(id);
    if (driver.estado !== 'activo') {
      throw new BadRequestException('Solo un chofer activo puede cambiar disponibilidad.');
    }
    return this.repository.updateAvailability(id, dto.estado_disponibilidad);
  }

  private async ensureUniqueBusinessKeys(dto: Partial<CreateDriverUserDto>, currentId?: number) {
    if (dto.celular) {
      await this.ensureUnique('celular', dto.celular, currentId, () => this.repository.findByCellphone(dto.celular!));
    }
    if (dto.numero_carnet) {
      await this.ensureUnique('numero_carnet', dto.numero_carnet, currentId, () => this.repository.findByCarnet(dto.numero_carnet!));
    }
    if (dto.licencia_conducir) {
      await this.ensureUnique('licencia_conducir', dto.licencia_conducir, currentId, () => this.repository.findByLicense(dto.licencia_conducir!));
    }
  }

  private async ensureUnique(
    field: string,
    value: string,
    currentId: number | undefined,
    finder: () => Promise<Array<Record<string, unknown>>>,
  ) {
    const rows = await finder();
    const owner = rows[0];
    if (owner && Number(owner.id) !== currentId) {
      throw new ConflictException(`El ${field} ${value} ya esta registrado.`);
    }
  }

  private async hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64) as Buffer;
    return `scrypt$${salt}$${key.toString('hex')}`;
  }
}
