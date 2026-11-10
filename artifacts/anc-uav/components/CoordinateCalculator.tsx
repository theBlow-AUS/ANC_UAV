import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { Linking, Platform, Text } from 'react-native';
import { ActionButton, Grid, Panel, TextField } from './FieldKit';
import { useColors } from '../hooks/useColors';
import { useNavigation } from '../context/NavigationContext';
import { distanceKm, formatCoordinate, initialBearingDegrees, kmToNm, parseCoordinate } from '../lib/geo';

export function CoordinateCalculator() {
  const c = useColors();
  const { query, setQuery } = useNavigation();
  const [aLat, setALat] = useState(query.position ? formatCoordinate(query.position.latitude) : '');
  const [aLon, setALon] = useState(query.position ? formatCoordinate(query.position.longitude) : '');
  const [bLat, setBLat] = useState('');
  const [bLon, setBLon] = useState('');
  const [name, setName] = useState('');
  const [fix, setFix] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const locked = useRef(false);
  const a = parseCoordinate(aLat, aLon), b = parseCoordinate(bLat, bLon);
  const km = a && b ? distanceKm(a, b) : null;
  async function gps() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      let latitude: number, longitude: number, accuracy: number | null, timestamp: number;
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) throw new Error('This browser cannot provide a GPS position.');
        const p = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
        ({ latitude, longitude, accuracy } = p.coords); timestamp = p.timestamp;
      } else {
        const granted = permission?.granted ? permission : await requestPermission();
        if (!granted.granted) throw new Error('Location permission denied. Enter both coordinates manually, or enable location in device Settings.');
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        ({ latitude, longitude, accuracy } = p.coords); timestamp = p.timestamp;
      }
      setALat(formatCoordinate(latitude)); setALon(formatCoordinate(longitude));
      setQuery({ ...query, position: { latitude, longitude } });
      setFix(`One-time GPS fix · ${new Date(timestamp).toISOString()} · ${accuracy === null ? 'accuracy unknown' : `±${Math.round(accuracy)} m`}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not obtain a position. Manual coordinate entry is available.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <>
    <Text style={{ color: c.mutedForeground, fontSize: 13, marginBottom: 10 }}>Straight-line geodesic distance and initial true bearing. WGS84 decimal degrees; not a flight route, airspace lookup or clearance.</Text>
    <ActionButton label={busy ? 'Getting GPS…' : 'Use GPS for point A'} icon="crosshair" disabled={busy} onPress={() => void gps()} testID="tools-coordinate-gps" />
    {fix ? <Text style={{ color: c.mutedForeground, fontSize: 12, marginBottom: 8 }}>{fix}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: c.destructive, marginBottom: 8 }}>{error}</Text> : null}
    {Platform.OS !== 'web' && permission?.status === 'denied' && !permission.canAskAgain ?
      <ActionButton secondary label="Open device settings" onPress={() => { void Linking.openSettings().catch(() => setError('Open device Settings manually.')); }} /> : null}
    <Grid cols={2}>
      <TextField label="A · latitude" value={aLat} onChangeText={v => { setFix(''); setALat(v); }} keyboardType="numbers-and-punctuation" testID="tools-a-lat" />
      <TextField label="A · longitude" value={aLon} onChangeText={v => { setFix(''); setALon(v); }} keyboardType="numbers-and-punctuation" testID="tools-a-lon" />
    </Grid>
    <TextField label="Destination name (optional)" value={name} onChangeText={setName} maxLength={100} testID="tools-destination-name" />
    <Grid cols={2}>
      <TextField label="B · latitude" value={bLat} onChangeText={setBLat} keyboardType="numbers-and-punctuation" testID="tools-b-lat" />
      <TextField label="B · longitude" value={bLon} onChangeText={setBLon} keyboardType="numbers-and-punctuation" testID="tools-b-lon" />
    </Grid>
    {km !== null && a && b ? <Panel>
      <Text selectable style={{ color: c.foreground, fontSize: 28, fontWeight: '700' }}>{km.toFixed(2)} km · {kmToNm(km).toFixed(2)} NM</Text>
      <Text style={{ color: c.foreground, fontSize: 16 }}>Initial true bearing: {km < 0.001 ? 'undefined (coincident points)' : `${initialBearingDegrees(a, b).toFixed(0)}°`}{name ? ` to ${name}` : ''}</Text>
    </Panel> : aLat || aLon || bLat || bLon ? <Text style={{ color: c.destructive }}>Enter valid latitude (−90 to 90) and longitude (−180 to 180) for both points.</Text> : null}
  </>;
}
