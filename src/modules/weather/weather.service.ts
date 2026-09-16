import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WeatherService {
  constructor(private readonly httpService: HttpService) {}

  async get(latitude: number, longitude: number) {
    const response = await firstValueFrom(
      this.httpService.get('https://api.open-meteo.com/v1/forecast', {
        params: { latitude, longitude, current: 'temperature_2m,relative_humidity_2m,wind_speed_10m' },
      }),
    );
    return response.data;
  }
}
