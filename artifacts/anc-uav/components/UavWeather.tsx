import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, SectionHeading } from './FieldKit';
import { useColors } from '../hooks/useColors';
import {
  downloadWeather, parseWeatherCache, roundedWeatherPoint, weatherAge, weatherHoursNow,
  windUnits, WEATHER_CACHE_KEY, WEATHER_CONSENT_KEY, type WeatherSnapshot,
} from '../lib/uav-weather';

function formatTime(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
export function UavWeather() {
  const c = useColors();
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unreadable, setUnreadable] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [permission, requestPermission] = Location.useForegroundPermissions();
  useEffect(() => {
    let mounted = true;
    Promise.all([AsyncStorage.getItem(WEATHER_CACHE_KEY), AsyncStorage.getItem(WEATHER_CONSENT_KEY)])
      .then(([raw, consent]) => {
        if (raw && raw.length > 1200000) throw new Error('Saved weather is oversized.');
        const saved = raw ? parseWeatherCache(JSON.parse(raw)) : null;
        if (mounted) { setSnapshot(saved); setAccepted(consent === 'accepted'); }
      }).catch(() => {
        if (mounted) { setUnreadable(true); setError('Saved weather could not be read. It was not overwritten; clear saved weather to reset.'); }
      }).finally(() => { if (mounted) setReady(true); });
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const appState = AppState.addEventListener('change', state => {
      if (state !== 'active') controller.current?.abort();
    });
    return () => { mounted = false; clearInterval(timer); appState.remove(); controller.current?.abort(); };
  }, []);
  async function toggleConsent() {
    if (locked.current) return;
    if (!accepted) { setAccepted(true); return; }
    locked.current = true; setBusy(true);
    try {
      await AsyncStorage.removeItem(WEATHER_CONSENT_KEY);
      setAccepted(false);
    } catch { setError('Could not remove saved consent. Try Clear saved weather.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function refresh() {
    if (!accepted || !ready || unreadable || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      await AsyncStorage.setItem(WEATHER_CONSENT_KEY, 'accepted');
      let latitude: number, longitude: number, fixAccuracy: number | null;
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) throw new Error('GPS is not available in this browser.');
        const fix = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        ({ latitude, longitude, accuracy: fixAccuracy } = fix.coords);
      } else {
        const granted = permission?.granted ? permission : await requestPermission();
        if (!granted.granted) throw new Error('Location permission denied. Enable it in device Settings to request local weather.');
        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        ({ latitude, longitude, accuracy: fixAccuracy } = fix.coords);
      }
      const point = roundedWeatherPoint(latitude, longitude);
      setAccuracy(fixAccuracy);
      const age = snapshot ? Date.now() - Date.parse(snapshot.retrievedAt) : Infinity;
      if (snapshot && snapshot.latitude === point.latitude && snapshot.longitude === point.longitude && age >= 0 && age < 30 * 60000) {
        setError('This area was retrieved less than 30 minutes ago. Showing the saved forecast to avoid unnecessary requests.');
        setNow(Date.now()); return;
      }
      if (AppState.currentState !== 'active') throw new Error('Weather requests are paused while the app is not active.');
      const abort = new AbortController(); controller.current = abort;
      const timeout = setTimeout(() => abort.abort(), 15000);
      try {
        const next = await downloadWeather(point.latitude, point.longitude, abort.signal);
        if (abort.signal.aborted) throw new Error('Weather request cancelled.');
        await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(next.cache));
        setSnapshot(next.snapshot); setNow(Date.now());
      } finally { clearTimeout(timeout); controller.current = null; }
    } catch (e) {
      setError(e instanceof Error && e.name === 'AbortError' ? 'Weather request timed out or was cancelled. Any saved forecast is unchanged.' :
        e instanceof Error ? `${e.message} Any saved forecast is unchanged.` : 'Weather is unavailable. Any saved forecast is unchanged.');
    } finally { locked.current = false; setBusy(false); }
  }
  async function clear() {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
      await AsyncStorage.removeItem(WEATHER_CONSENT_KEY);
      setSnapshot(null); setAccepted(false); setUnreadable(false); setAccuracy(null); setError('');
    } catch { setError('Could not clear weather storage. Try again.'); }
    finally { locked.current = false; setBusy(false); }
  }
  const hours = snapshot ? weatherHoursNow(snapshot, now) : [];
  const current = hours.find(hour => Date.parse(hour.time) <= now);
  const body = { color: c.foreground, fontSize: 14, lineHeight: 21 };
  const small = { color: c.mutedForeground, fontSize: 12, lineHeight: 18 };
  return <View>
    <SectionHeading title="Local UAV weather" detail="Model forecast · surface to 120 m (~394 ft)" />
    <Callout title="Forecast, not an on-site measurement">
      400 ft is about 122 m. Wind may vary with terrain, buildings and height. No flight-suitability verdict is given. Check official warnings, aviation weather, your aircraft limits and actual conditions.
    </Callout>
    <Panel>
      <Text style={small}>Free Open-Meteo service · non-commercial use only. Weather retrieval sends coordinates rounded to 0.001° (~100 m) and your IP directly to Open-Meteo. No Replit server, API key or remote interpretation. Nothing is fetched automatically.</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted, disabled: busy }} disabled={busy} testID="weather-consent"
        onPress={() => void toggleConsent()} style={{ minHeight: 48, paddingVertical: 10, flexDirection: 'row', gap: 8 }}>
        <Text style={body}>{accepted ? '☑' : '☐'} I accept non-commercial use and coordinate sharing.</Text>
      </Pressable>
      <ActionButton label={busy ? 'Getting forecast…' : 'Use GPS for weather'} icon="cloud" onPress={() => void refresh()}
        disabled={!accepted || busy || !ready || unreadable} testID="weather-refresh" />
      {Platform.OS !== 'web' && permission?.status === 'denied' && !permission.canAskAgain ?
        <ActionButton secondary label="Open device settings" onPress={() => { void Linking.openSettings().catch(() => setError('Open device Settings manually to allow location.')); }} /> : null}
      <ActionButton secondary label="Weather terms & source" icon="external-link" onPress={() => {
        void Linking.openURL('https://open-meteo.com/en/terms').catch(() => setError('Could not open weather terms.'));
      }} />
      <ActionButton secondary label="Weather data licence" icon="external-link" onPress={() => {
        void Linking.openURL('https://open-meteo.com/en/licence').catch(() => setError('Could not open the data licence.'));
      }} />
      <ActionButton secondary label="Clear saved weather" icon="trash-2" disabled={busy || !ready}
        onPress={() => void clear()} testID="weather-clear" />
      {error ? <Text accessibilityRole="alert" style={small}>{error}</Text> : null}
    </Panel>
    {snapshot ? <Panel>
      <Badge tone="warning">{weatherAge(snapshot, now)}</Badge>
      <Text style={small}>Requested area: {snapshot.latitude.toFixed(3)}, {snapshot.longitude.toFixed(3)} · last requested point, not continuous GPS.</Text>
      <Text style={small}>Model grid: {snapshot.gridLatitude.toFixed(3)}, {snapshot.gridLongitude.toFixed(3)}. Retrieved {formatTime(snapshot.retrievedAt)}; provider issue time is not supplied.</Text>
      {accuracy !== null ? <Text style={small}>Latest GPS accuracy: ±{Math.round(accuracy)} m. Forecast grid is much coarser.</Text> : null}
      {current ? <>
        <Text style={{ ...body, fontWeight: '700' }}>Forecast for {formatTime(current.time)}</Text>
        {([10, 80, 120] as const).map(height => <View key={height} style={{ gap: 2, marginVertical: 4 }}>
          <Text style={{ ...body, fontWeight: '700' }}>{height} m above ground · model wind</Text>
          <Text style={body}>{windUnits(current[`wind_speed_${height}m`])}</Text>
          <Text style={small}>{current[`wind_direction_${height}m`] === null ? 'Direction not supplied' : `From ${current[`wind_direction_${height}m`]}° true`}</Text>
        </View>)}
        <Text style={body}>10 m gust (preceding hour): {windUnits(current.wind_gusts_10m)}</Text>
        <Text style={small}>Gusts at 80 / 120 m are not supplied; no gust profile is inferred.</Text>
        <Text style={body}>Precipitation chance: {current.precipitation_probability === null ? 'Not supplied' : `${current.precipitation_probability}%`} · total: {current.precipitation === null ? 'not supplied' : `${current.precipitation} mm`} over the preceding hour ending at the displayed time.</Text>
        <Text style={body}>Temperature (2 m): {current.temperature_2m === null ? 'not supplied' : `${current.temperature_2m} °C`} · humidity: {current.relative_humidity_2m === null ? 'not supplied' : `${current.relative_humidity_2m}%`}</Text>
        <Text style={body}>Visibility: {current.visibility === null ? 'not supplied' : `${(current.visibility / 1000).toFixed(1)} km`} · cloud cover: {current.cloud_cover === null ? 'not supplied' : `${current.cloud_cover}%`}</Text>
      </> : <Text style={body}>No forecast covering the present hour is saved. Refresh when online; older data is not shown as current.</Text>}
      {hours.length ? <View>
        <Text style={{ ...body, fontWeight: '700', marginTop: 8 }}>Available next hours (UTC)</Text>
        {hours.map(hour => <Text key={hour.time} style={small}>{formatTime(hour.time)} · 120 m wind {hour.wind_speed_120m === null ? 'not supplied' : `${hour.wind_speed_120m.toFixed(1)} m/s`} · precipitation {hour.precipitation_probability === null ? 'chance unavailable' : `${hour.precipitation_probability}%`} · {hour.precipitation === null ? 'amount unavailable' : `${hour.precipitation} mm`}</Text>)}
      </View> : null}
      <Text style={small}>Precipitation includes rain, showers and snow; probability is not a guarantee of dry conditions. Missing data is never treated as zero. Source: Open-Meteo (CC BY 4.0), selected forecast models; display and unit conversions by ANC UAV. Not endorsed by the provider.</Text>
    </Panel> : <Text style={{ ...small, marginBottom: 12 }}>No forecast saved. Request one while online to keep the last successful snapshot on this device for offline reference.</Text>}
  </View>;
}
