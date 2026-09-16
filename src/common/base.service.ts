import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository.js';

@Injectable()
export abstract class BaseService {
  protected constructor(protected readonly repository: BaseRepository) {}

  findAll() { return this.repository.findAll(); }
  findById(id: number) { return this.repository.findById(id); }
  create(dto: object) { return this.repository.create(dto as Record<string, unknown>); }
  update(id: number, dto: object) { return this.repository.update(id, dto as Record<string, unknown>); }
  remove(id: number) { return this.repository.remove(id); }
}
