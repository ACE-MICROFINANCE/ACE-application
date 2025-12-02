import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { WeatherService, WeatherResponse } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  getWeather(
    @Query('lat') latStr?: string,
    @Query('lon') lonStr?: string,
  ): Promise<WeatherResponse> {
    if (!latStr?.trim() || !lonStr?.trim()) {
      throw new BadRequestException('lat and lon are required');
    }

    const lat = Number(latStr);
    const lon = Number(lonStr);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new BadRequestException('lat and lon must be numbers');
    }

    return this.weatherService.getWeather(lat, lon);
  }
}
