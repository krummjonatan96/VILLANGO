import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateLocationDto } from './create-location.dto.js';
import { LocationService } from './location.service.js';

@Controller('api/locations')
export class LocationController {
  constructor(private readonly service: LocationService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() dto: CreateLocationDto) { return this.service.create(dto); }
}
