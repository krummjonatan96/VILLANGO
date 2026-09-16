import { Injectable } from '@nestjs/common';
import { CreateLocationDto } from './create-location.dto.js';
import { LocationRepository } from './location.repository.js';

@Injectable()
export class LocationService {
  constructor(private readonly repository: LocationRepository) {}
  findAll() { return this.repository.findAll(); }
  create(dto: CreateLocationDto) { return this.repository.create(dto); }
}
