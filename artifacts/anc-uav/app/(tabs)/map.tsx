import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading, TextField } from '@/components/FieldKit';
import { useColors } from '@/hooks/useColors';
import { distanceKm, formatCoordinate, initialBearingDegrees, kmToNm, nmToKm, parseCoordinate } from '@/lib/geo';
import { useNavigation } from '@/context/NavigationContext';
import { OfflineMap } from '@/components/OfflineMap';
import { NavigationPacks } from '@/components/NavigationPacks';
import { NearbyPlaces } from '@/components/NearbyPlaces';
import { FrequencyLookup } from '@/components/FrequencyLookup';
import type { Coordinate } from '@/lib/geo';
import { insideBounds } from '@/lib/navigation';

export default function MapMeasureScreen() {
  const colors = useColors();
  const { active, query, setQuery } = useNavigation();
  const [tapTarget, setTapTarget] = useState<'origin' | 'destination'>('origin');
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number | null; capturedAt: string } | null>(null);
  const [originLatitude, setOriginLatitude] = useState(query.position ? formatCoordinate(query.position.latitude) : '');
  const [originLongitude, setOriginLongitude] = useState(query.position ? formatCoordinate(query.position.longitude) : '');
  const [destinationName, setDestinationName] = useState('');
  const [destinationLatitude, setDestinationLatitude] = useState('');
  const [destinationLongitude, setDestinationLongitude] = useState('');
  const [positionError, setPositionError] = useState<string | null>(null);
  const [conversionValue, setConversionValue] = useState('');
  const [conversionUnit, setConversionUnit] = useState<'km' | 'nm'>('km');

  const origin = useMemo(
    () => parseCoordinate(originLatitude, originLongitude),
    [originLatitude, originLongitude],
  );
  const destination = useMemo(
    () => parseCoordinate(destinationLatitude, destinationLongitude),
    [destinationLatitude, destinationLongitude],
  );
  const measurement =
    origin && destination
      ? {
          kilometres: distanceKm(origin, destination),
          bearing: initialBearingDegrees(origin, destination),
        }
      : null;

  function chooseOrigin(p: Coordinate) {
    const latitude = formatCoordinate(p.latitude), longitude = formatCoordinate(p.longitude);
    setGps(null);
    setOriginLatitude(latitude); setOriginLongitude(longitude);
    setQuery({ ...query, position: parseCoordinate(latitude, longitude) });
  }
  function chooseDestination(p: Coordinate, name = 'Map-selected point') {
    setDestinationLatitude(formatCoordinate(p.latitude)); setDestinationLongitude(formatCoordinate(p.longitude));
    setDestinationName(name);
  }
  function editOrigin(latitude: string, longitude: string) {
    setGps(null); setOriginLatitude(latitude); setOriginLongitude(longitude);
    setQuery({ ...query, position: parseCoordinate(latitude, longitude) });
  }

  async function useCurrentLocation() {
    setPositionError(null);
    try {
      if (Platform.OS === 'web') {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        });
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() };
        chooseOrigin(next); setGps(next);
        return;
      }
      const currentPermission = permission?.granted ? permission : await requestPermission();
      if (!currentPermission.granted) {
        setPositionError(
          currentPermission.canAskAgain
            ? 'Location permission was not granted. You can still enter coordinates manually.'
            : 'Location permission is blocked. Open device settings to enable it, or enter coordinates manually.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp).toISOString(),
      };
      chooseOrigin(next);
      setGps(next);
    } catch {
      setPositionError('The device could not provide a position. Enter coordinates manually.');
    }
  }

  async function openSettings() {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Settings unavailable', 'Open device settings and allow location while using the app.');
    }
  }

  const numericConversion = Number(conversionValue);
  const converted =
    conversionValue.trim() && Number.isFinite(numericConversion) && numericConversion >= 0
      ? conversionUnit === 'km'
        ? `${kmToNm(numericConversion).toFixed(3)} NM`
        : `${nmToKm(numericConversion).toFixed(3)} km`
      : 'Enter a non-negative number';

  return (
    <Screen
      eyebrow="Offline position tools"
      title="Map"
      subtitle="Local maps · GPS · tap-to-measure"
    >
      <Callout title="Reference map — not an aviation chart">
        The bundled public-domain Australia overview is deliberately coarse. Zooming does not add detail. A partial openAIP area-frequency reference is bundled, but it is uncertified and not for primary navigation or flight planning. No authoritative chart or CTAF applicability coverage is bundled; absent data never means clear. All maps and calculations stay on this device.
      </Callout>

      <Panel>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{active.name}</Text>
        <Badge tone="warning">{active.land.length ? 'OFFLINE REFERENCE MAP' : 'COORDINATE GRID — BASEMAP MISSING'}</Badge>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ActionButton label="Tap sets A" secondary={tapTarget !== 'origin'} onPress={() => setTapTarget('origin')} testID="tap-origin-mode" />
          <ActionButton label="Tap sets B" secondary={tapTarget !== 'destination'} onPress={() => setTapTarget('destination')} testID="tap-destination-mode" />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Next tap sets {tapTarget === 'origin' ? 'origin A' : 'destination B'}. Select both points to measure, or use GPS for A.</Text>
        <OfflineMap key={`${active.id}-${active.provenance.retrievedAt}`} pack={active} origin={origin} destination={destination}
          onSelect={p => {
            if (tapTarget === 'origin') { chooseOrigin(p); setTapTarget('destination'); }
            else chooseDestination(p);
          }} />
        {origin && !insideBounds(origin, active.bounds) ? <Text style={{ color: colors.destructive }}>Origin A is outside the displayed pack. Coordinate measurement still works; map coverage is unavailable there.</Text> : null}
        {destination && !insideBounds(destination, active.bounds) ? <Text style={{ color: colors.destructive }}>Destination B is outside the displayed map’s coverage.</Text> : null}
      </Panel>

      <SectionHeading title="Measurement origin" detail="Use device GPS or enter a WGS84 coordinate." />
      <Panel>
        {gps ? (
          <View style={{ gap: 3, marginBottom: 5 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>
              GPS fix: {formatCoordinate(gps.latitude)}, {formatCoordinate(gps.longitude)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {gps.accuracy === null ? 'Accuracy not reported' : `Reported accuracy ±${Math.round(gps.accuracy)} m`}
              {' · '}{gps.capturedAt} · one-time fix, not live tracking
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginBottom: 5 }}>
            No GPS position captured in this session.
          </Text>
        )}
        <ActionButton label="Use current location" icon="crosshair" onPress={useCurrentLocation} />
        {positionError ? (
          <View style={{ gap: 9 }}>
            <Text style={{ fontSize: 12, lineHeight: 18, color: colors.accentForeground }}>{positionError}</Text>
            {permission?.status === 'denied' && !permission.canAskAgain ? (
              <ActionButton label="Open device settings" onPress={openSettings} secondary />
            ) : null}
          </View>
        ) : null}
      </Panel>

      <Panel>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Origin coordinates</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Latitude" value={originLatitude} onChangeText={v => editOrigin(v, originLongitude)} placeholder="-33.8688" keyboardType="numbers-and-punctuation" testID="origin-latitude" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Longitude" value={originLongitude} onChangeText={v => editOrigin(originLatitude, v)} placeholder="151.2093" keyboardType="numbers-and-punctuation" testID="origin-longitude" />
          </View>
        </View>
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Coordinates are manually entered or map-selected unless the GPS fix is shown above. Editing clears its GPS label.</Text>
      </Panel>

      <Panel>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Destination point</Text>
        <TextField label="Point name" value={destinationName} onChangeText={setDestinationName} placeholder="Aerodrome, locality, or landmark" testID="destination-name" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Latitude" value={destinationLatitude} onChangeText={setDestinationLatitude} placeholder="-34.0000" keyboardType="numbers-and-punctuation" testID="destination-latitude" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Longitude" value={destinationLongitude} onChangeText={setDestinationLongitude} placeholder="151.0000" keyboardType="numbers-and-punctuation" testID="destination-longitude" />
          </View>
        </View>
      </Panel>

      {measurement ? (
        <Panel>
          <Badge tone="good">COORDINATE CALCULATION</Badge>
            <Text style={{ fontSize: 27, fontWeight: '700', color: colors.foreground }}>
            {measurement.kilometres.toFixed(2)} km
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.primary }}>
            {kmToNm(measurement.kilometres).toFixed(2)} NM
          </Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
            Initial true bearing: {measurement.kilometres < 0.001 ? 'undefined (coincident points)' : `${measurement.bearing.toFixed(0)}°`}{destinationName ? ` to ${destinationName}` : ''}
          </Text>
          <Text style={{ fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>
            This is a straight-line geodesic calculation between the displayed coordinates. It does not establish airspace or radio-frequency applicability.
          </Text>
        </Panel>
      ) : null}

      {originLatitude || originLongitude || destinationLatitude || destinationLongitude ? (
        !origin || !destination ? (
            <Text style={{ fontSize: 12, color: colors.destructive }}>
            Enter valid latitude (−90 to 90) and longitude (−180 to 180) for both points.
          </Text>
        ) : null
      ) : null}

      <SectionHeading title="Distance converter" detail="1 nautical mile = 1.852 kilometres." />
      <Panel>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label={conversionUnit === 'km' ? 'Kilometres' : 'Nautical miles'} value={conversionValue} onChangeText={setConversionValue} keyboardType="decimal-pad" placeholder="0.0" testID="unit-converter-input" />
          </View>
          <View style={{ justifyContent: 'flex-end', paddingBottom: 12 }}>
            <ActionButton
              label={conversionUnit === 'km' ? 'Convert to NM' : 'Convert to km'}
              onPress={() => setConversionUnit((current) => (current === 'km' ? 'nm' : 'km'))}
              secondary
            />
          </View>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary }}>{converted}</Text>
      </Panel>

      <NearbyPlaces onSelect={p => chooseDestination(p.position, p.name)} />
      <FrequencyLookup />
      <NavigationPacks />
    </Screen>
  );
}
