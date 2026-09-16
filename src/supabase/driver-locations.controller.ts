import { Body, Controller, Get, Post, Query, Sse } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DriverLocationsService, type DriverMapLocation } from './driver-locations.service.js';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto.js';

@Controller('api/mapa/conductores')
export class DriverLocationsController {
  constructor(private readonly locations: DriverLocationsService) {}

  /** GET /api/mapa/conductores?maxAgeMinutes=10 */
  @Get()
  findCurrent(@Query('maxAgeMinutes') requestedMaxAge?: string): Promise<DriverMapLocation[]> {
    return this.locations.findCurrent(this.maxAge(requestedMaxAge));
  }

  /** POST /api/mapa/conductores/ubicacion: actualiza la posición que verá el mapa. */
  @Post('ubicacion')
  saveLocation(@Body() body: UpdateDriverLocationDto): Promise<DriverMapLocation> {
    return this.locations.saveDriverLocation(body);
  }

  /** GET /api/mapa/conductores/stream?maxAgeMinutes=10 (Server-Sent Events). */
  @Sse('stream')
  stream(@Query('maxAgeMinutes') requestedMaxAge?: string): Observable<MessageEvent> {
    return this.locations.stream(this.maxAge(requestedMaxAge));
  }

  private maxAge(value?: string): number {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return 10;
    return Math.max(1, Math.min(Math.floor(minutes), 60));
  }
}
