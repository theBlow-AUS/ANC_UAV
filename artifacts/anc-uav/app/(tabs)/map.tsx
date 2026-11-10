import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading } from '@/components/FieldKit';
import { Accordion } from '@/components/Accordion';
import { useColors } from '@/hooks/useColors';
import { distanceKm, formatCoordinate, initialBearingDegrees, kmToNm, parseCoordinate } from '@/lib/geo';
import { useNavigation } from '@/context/NavigationContext';
import { OfflineMap } from '@/components/OfflineMap';
import { NavigationPacks } from '@/components/NavigationPacks';
import { NearbyPlaces } from '@/components/NearbyPlaces';
import { FrequencyLookup } from '@/components/FrequencyLookup';
import { OfflineTileManager } from '@/components/OfflineTileManager';
import type { Coordinate } from '@/lib/geo';
import { insideBounds } from '@/lib/navigation';
import type { TileBounds, TileLayerId } from '@/lib/map-tiles';

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
  const [mapLayer, setMapLayer] = useState<TileLayerId>('openfreemap');
  const [satelliteDate, setSatelliteDate] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [visibleBounds, setVisibleBounds] = useState<TileBounds | null>(null);
  const [focusBounds, setFocusBounds] = useState<TileBounds | null>(null);

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

  return (
    <Screen
      eyebrow="Offline position tools"
      title="Map"
      subtitle="Local maps · GPS · tap-to-measure"
    >
        <Callout title="Reference map — not an aviation chart">
        OpenStreetMap, topographic and satellite layers contact their named public map hosts directly when online; downloads are saved locally. No map requests go through Replit. Preset region boundaries are approximate rectangles. The bundled airspace/frequency reference is separate, partial and not for primary navigation or flight planning. Missing data never means clear.
      </Callout>

      <Panel>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{active.name}</Text>
        <Badge tone="warning">{mapLayer === 'openfreemap' ? 'OPENSTREETMAP · REFERENCE' : mapLayer === 'topographic' ? 'TOPOGRAPHIC · REFERENCE' : 'SATELLITE · DATED REFERENCE'}</Badge>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ActionButton label="Tap sets A" secondary={tapTarget !== 'origin'} onPress={() => setTapTarget('origin')} testID="tap-origin-mode" />
          <ActionButton label="Tap sets B" secondary={tapTarget !== 'destination'} onPress={() => setTapTarget('destination')} testID="tap-destination-mode" />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Next tap sets {tapTarget === 'origin' ? 'origin A' : 'destination B'}. Select both points to measure, or use GPS for A.</Text>
        <OfflineMap key={`${active.id}-${active.provenance.retrievedAt}`} pack={active} origin={origin} destination={destination}
          layer={mapLayer} satelliteDate={satelliteDate} onBoundsChange={setVisibleBounds} focusBounds={focusBounds}
          onSelect={p => {
            if (tapTarget === 'origin') { chooseOrigin(p); setTapTarget('destination'); }
            else chooseDestination(p);
          }} />
        {origin && !insideBounds(origin, active.bounds) ? <Text style={{ color: colors.destructive }}>Origin A is outside the displayed pack. Coordinate measurement still works; map coverage is unavailable there.</Text> : null}
        {destination && !insideBounds(destination, active.bounds) ? <Text style={{ color: colors.destructive }}>Destination B is outside the displayed map’s coverage.</Text> : null}
      </Panel>

      <Accordion title="Offline maps & layers" summary="Select a layer, download an area or manage saved regions" icon="download" testID="map-offline-layers">
      <OfflineTileManager
        layer={mapLayer} onLayerChange={setMapLayer}
        satelliteDate={satelliteDate} onSatelliteDateChange={setSatelliteDate}
        currentBounds={visibleBounds} initialBounds={active.bounds}
        onFocusBounds={setFocusBounds}
      />
      </Accordion>

      <SectionHeading title="Measurement origin" detail="Use device GPS or tap the map for point A." />
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
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Selected points · WGS84</Text>
        <Text selectable style={{ color: colors.foreground }}>A: {origin ? `${originLatitude}, ${originLongitude}` : 'Not selected'}</Text>
        <Text selectable style={{ color: colors.foreground }}>B: {destination ? `${destinationLatitude}, ${destinationLongitude}${destinationName ? ` · ${destinationName}` : ''}` : 'Not selected'}</Text>
        <ActionButton secondary icon="tool" label="Manual coordinates & converters" onPress={() => router.navigate('/tools')} />
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
            Select the missing point on the map, or use GPS for point A.
          </Text>
        ) : null
      ) : null}

      <Accordion title="Nearby aerodromes & localities" summary="Offline reference lookup · no complete coverage claimed" icon="map-pin">
      <NearbyPlaces onSelect={p => chooseDestination(p.position, p.name)} />
      </Accordion>
      <Accordion title="Frequency applicability lookup" summary="Installed source records · not a clearance" icon="radio">
      <FrequencyLookup />
      </Accordion>
      <Accordion title="Reference packs & sources" summary="Coverage, source details and local pack management" icon="layers">
      <NavigationPacks />
      </Accordion>
    </Screen>
  );
}
