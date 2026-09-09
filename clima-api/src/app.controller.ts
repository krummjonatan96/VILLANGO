import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service.js';
import { CreateLocationDto } from './create-location.dto.js';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getInfo() {
    return {
      name: 'clima-api',
      endpoints: ['GET /api/locations', 'POST /api/locations', 'GET /api/weather'],
    };
  }

  @Get('locations')
  getLocations() {
    return this.appService.getLocations();
  }

  @Post('locations')
  createLocation(@Body() location: CreateLocationDto) {
    return this.appService.createLocation(location);
  }

  @Get('weather')
  getWeather(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    return this.appService.getWeather(Number(latitude), Number(longitude));
  }
}
