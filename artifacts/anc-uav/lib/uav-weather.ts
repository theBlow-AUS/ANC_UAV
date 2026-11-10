export const WEATHER_CACHE_KEY = 'anc-uav.weather.open-meteo.v1';
export const WEATHER_CONSENT_KEY = 'anc-uav.weather.noncommercial.v1';
const metrics = {
  temperature_2m: ['°C', -100, 70],
  relative_humidity_2m: ['%', 0, 100],
  cloud_cover: ['%', 0, 100],
  visibility: ['m', 0, 200000],
  precipitation_probability: ['%', 0, 100],
  precipitation: ['mm', 0, 5000],
  wind_speed_10m: ['m/s', 0, 250],
  wind_direction_10m: ['°', 0, 360],
  wind_gusts_10m: ['m/s', 0, 250],
  wind_speed_80m: ['m/s', 0, 250],
  wind_direction_80m: ['°', 0, 360],
  wind_speed_120m: ['m/s', 0, 250],
  wind_direction_120m: ['°', 0, 360],
} as const;
export type WeatherMetric = keyof typeof metrics;
export type WeatherHour = { time: string } & Record<WeatherMetric, number | null>;
export type WeatherCache = { version: 1; latitude: number; longitude: number; retrievedAt: string; payload: unknown };
export type WeatherSnapshot = Omit<WeatherCache, 'payload'> & {
  gridLatitude: number; gridLongitude: number; hours: WeatherHour[];
};
const keys = Object.keys(metrics) as WeatherMetric[];

function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Unexpected weather data format.');
  return input as Record<string, unknown>;
}
function coordinate(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > max) throw new Error('Invalid weather coordinate.');
  return value;
}
export function roundedWeatherPoint(latitude: number, longitude: number) {
  return { latitude: Number(coordinate(latitude, 90).toFixed(3)), longitude: Number(coordinate(longitude, 180).toFixed(3)) };
}
export function weatherRequestUrl(latitude: number, longitude: number): string {
  const point = roundedWeatherPoint(latitude, longitude);
  return `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}&longitude=${point.longitude}` +
    `&hourly=${keys.join(',')}&wind_speed_unit=ms&temperature_unit=celsius&precipitation_unit=mm&timezone=GMT&forecast_days=2`;
}
function utcTime(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Invalid forecast time.');
  const date = new Date(`${value}:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value) throw new Error('Invalid forecast calendar time.');
  return date.toISOString();
}
export function parseWeatherCache(input: unknown): WeatherSnapshot {
  const cache = object(input);
  if (cache.version !== 1) throw new Error('Unsupported saved weather version.');
  const latitude = coordinate(cache.latitude, 90), longitude = coordinate(cache.longitude, 180);
  if (typeof cache.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(cache.retrievedAt) ||
      !Number.isFinite(Date.parse(cache.retrievedAt))) throw new Error('Missing weather retrieval time.');
  const payload = object(cache.payload);
  if (payload.utc_offset_seconds !== 0) throw new Error('Weather timezone is not UTC.');
  const gridLatitude = coordinate(payload.latitude, 90), gridLongitude = coordinate(payload.longitude, 180);
  const hourly = object(payload.hourly), units = object(payload.hourly_units);
  if (!Array.isArray(hourly.time) || !hourly.time.length || hourly.time.length > 96) throw new Error('Invalid forecast timeline.');
  const times = hourly.time.map(utcTime);
  if (times.some((time, i) => i > 0 && time <= times[i - 1])) throw new Error('Forecast times are out of order.');
  for (const key of keys) {
    if (hourly[key] == null) continue;
    if (!Array.isArray(hourly[key]) || hourly[key].length !== times.length || units[key] !== metrics[key][0]) {
      throw new Error(`Weather ${key} has unexpected units or length.`);
    }
  }
  const hours = times.map((time, index) => {
    const values = {} as Record<WeatherMetric, number | null>;
    for (const key of keys) {
      const series = hourly[key];
      const value = Array.isArray(series) ? series[index] : null;
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < metrics[key][1] || value > metrics[key][2])) {
        throw new Error(`Invalid ${key} forecast value.`);
      }
      values[key] = value as number | null;
    }
    return { time, ...values };
  });
  return { version: 1, latitude, longitude, retrievedAt: cache.retrievedAt, gridLatitude, gridLongitude, hours };
}
export function weatherHoursNow(snapshot: WeatherSnapshot, now = Date.now()): WeatherHour[] {
  const hourStart = Math.floor(now / 3600000) * 3600000;
  return snapshot.hours.filter(hour => {
    const time = Date.parse(hour.time);
    return time >= hourStart && time < hourStart + 6 * 3600000;
  });
}
export function weatherAge(snapshot: WeatherSnapshot, now = Date.now()): string {
  const age = now - Date.parse(snapshot.retrievedAt);
  if (age < -300000) return 'Device clock / retrieval time conflict';
  if (age > 3 * 3600000) return 'Saved forecast is over 3 hours old';
  return `Retrieved ${Math.max(0, Math.floor(age / 60000))} min ago · not an observation`;
}
export function windUnits(value: number | null): string {
  return value === null ? 'Not supplied' : `${value.toFixed(1)} m/s · ${(value * 3.6).toFixed(1)} km/h · ${(value / 0.514444).toFixed(1)} kt`;
}
export async function downloadWeather(latitude: number, longitude: number, signal?: AbortSignal,
  fetcher: typeof fetch = fetch): Promise<{ cache: WeatherCache; snapshot: WeatherSnapshot }> {
  const response = await fetcher(weatherRequestUrl(latitude, longitude), { signal });
  if (!response.ok) throw new Error(response.status === 429 ? 'Weather service rate limit reached. Keep the saved forecast and try later.' : `Weather download failed (${response.status}).`);
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > 1000000) throw new Error('Weather response is too large.');
  const text = await response.text();
  if (text.length > 1000000) throw new Error('Weather response is too large.');
  let payload: unknown;
  try { payload = JSON.parse(text); } catch { throw new Error('Weather service returned unreadable data.'); }
  const cache: WeatherCache = { version: 1, ...roundedWeatherPoint(latitude, longitude), retrievedAt: new Date().toISOString(), payload };
  return { cache, snapshot: parseWeatherCache(cache) };
}
