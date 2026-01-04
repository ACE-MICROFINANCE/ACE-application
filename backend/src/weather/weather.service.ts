import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type WeatherResponse = {
  location: string;
  current: {
    temp: number;
    description: string;
    min: number;
    max: number;
    icon: string;
  };
  daily: {
    date: string;
    min: number;
    max: number;
    icon: string;
  }[];
};

@Injectable()
export class WeatherService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('WEATHER_API_KEY') ?? '';
    this.baseUrl =
      this.configService.get<string>('WEATHER_API_BASE_URL') ?? '';
  }

  async getWeather(lat: number, lon: number): Promise<WeatherResponse> {
    const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${lat},${lon}&days=7&aqi=no&alerts=no&lang=vi`;

    try {
      const { data } = await firstValueFrom(this.httpService.get(url));
      const forecastDays = Array.isArray(data?.forecast?.forecastday)
        ? data.forecast.forecastday
        : [];
      const today = forecastDays[0];

      return {
        location: data?.location?.name ?? 'Unknown location',
        current: {
          temp: Math.round(data?.current?.temp_c ?? 0),
          description: data?.current?.condition?.text ?? '',
          min: Math.round(today?.day?.mintemp_c ?? 0),
          max: Math.round(today?.day?.maxtemp_c ?? 0),
          icon: data?.current?.condition?.icon ?? '',
        },
        daily: forecastDays.slice(0, 6).map((d: any) => ({
          date: d.date,
          min: Math.round(d.day?.mintemp_c ?? 0),
          max: Math.round(d.day?.maxtemp_c ?? 0),
          icon: d.day?.condition?.icon ?? '',
        })),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Không lấy được dữ liệu thời tiết',
      );
    }
  }
}
