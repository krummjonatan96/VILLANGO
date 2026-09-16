import { Injectable } from '@nestjs/common';
import { CreateLocationDto } from './create-location.dto.js';

export interface Location extends CreateLocationDto { id: number; }

@Injectable()
export class LocationRepository {
  private readonly locations: Location[] = [];
  findAll() { return this.locations; }
  create(dto: CreateLocationDto) {
    const location = { id: this.locations.length + 1, ...dto };
    this.locations.push(location);
    return location;
  }
}
