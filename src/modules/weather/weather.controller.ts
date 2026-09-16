import { Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service.js';

@Controller('api/weather')
export class WeatherController {
  constructor(private readonly service: WeatherService) {}
  @Get() get(@Query('latitude') latitude: string, @Query('longitude') longitude: string) {
    return this.service.get(Number(latitude), Number(longitude));
  }
}
