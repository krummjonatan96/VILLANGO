import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateLocationDto } from './create-location.dto.js';

interface Location extends CreateLocationDto {
  id: number;
}

@Injectable()
export class AppService {
  private readonly locations: Location[] = [];

  constructor(private readonly httpService: HttpService) {}

  getLocations() {
    return this.locations;
  }

  createLocation(location: CreateLocationDto) {
    const createdLocation = { id: this.locations.length + 1, ...location };
    this.locations.push(createdLocation);
    return createdLocation;
  }

  async getWeather(latitude: number, longitude: number) {
    const response = await firstValueFrom(
      this.httpService.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
        },
      }),
    );

    return response.data;
  }
}
