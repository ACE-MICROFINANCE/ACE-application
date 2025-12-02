'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/share/ui/Card';

type WeatherData = {
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

function fixIcon(icon: string) {
  if (!icon) return '';
  return icon.startsWith('//') ? `https:${icon}` : icon;
}

export const WeatherCard = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (lat: number, lon: number) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/weather?lat=${lat}&lon=${lon}`,
        );

        if (!res.ok) {
          if (!cancelled) {
            setError('Không thể tải dữ liệu thời tiết');
            setLoading(false);
          }
          return;
        }

        const data = (await res.json()) as WeatherData;
        if (!cancelled) {
          setWeather(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Không thể tải dữ liệu thời tiết');
          setLoading(false);
        }
      }
    };

    const fallbackLat = 21.38602;
    const fallbackLon = 103.02301;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(
            position.coords.latitude,
            position.coords.longitude,
          );
        },
        () => {
          fetchWeather(fallbackLat, fallbackLon);
        },
      );
    } else {
      fetchWeather(fallbackLat, fallbackLon);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="rounded-2xl bg-white shadow p-4">
      {loading && (
        <div className="text-sm text-slate-500">Đang tải thời tiết...</div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-500">{error}</div>
      )}

      {!loading && weather && (
        <div>
          <div className="flex items-center gap-4">
            <img
              src={fixIcon(weather.current.icon)}
              alt={weather.current.description}
              className="h-14 w-14"
            />

            <div className="flex-1">
              <div className="text-3xl font-semibold">
                {weather.current.temp}°C
              </div>
              <div className="text-sm text-slate-600">
                {weather.current.description}
              </div>
              <div className="text-xs text-slate-500">
                H {weather.current.max}° · L {weather.current.min}°
              </div>
            </div>

            <div className="text-sm text-slate-500 text-right">
              {weather.location}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-6 gap-2 text-center">
            {weather.daily.slice(0, 6).map((day, index) => {
              const date = new Date(day.date);
              const label =
                index === 0
                  ? 'Today'
                  : date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      day: 'numeric',
                    });

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center text-xs text-slate-600"
                >
                  <div>{label}</div>
                  <img
                    src={fixIcon(day.icon)}
                    alt=""
                    className="h-8 w-8 my-1"
                  />
                  <div>{day.max}°</div>
                  <div className="text-[11px] text-slate-400">
                    {day.min}°
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
