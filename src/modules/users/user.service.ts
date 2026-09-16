import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './user.dto.js';
import { UserRepository } from './user.repository.js';

@Injectable()
export class UserService {
  constructor(private readonly repository: UserRepository) {}

  create(dto: CreateUserDto) { return this.repository.create(dto); }
  findAll() { return this.repository.findAll(); }

  async findById(id: number) {
    try { return await this.repository.findById(id); }
    catch { throw new NotFoundException(`No existe el usuario con id ${id}`); }
  }

  async update(id: number, dto: UpdateUserDto) {
    if (Object.keys(dto).length === 0) throw new ConflictException('Debes enviar al menos un campo para actualizar.');
    try { return await this.repository.update(id, dto); }
    catch { throw new NotFoundException(`No existe el usuario con id ${id}`); }
  }
}
