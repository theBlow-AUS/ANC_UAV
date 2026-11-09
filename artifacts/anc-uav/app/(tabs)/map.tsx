import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { ActionButton, Badge, Callout, Panel, Screen, SectionHeading, TextField } from '../../components/FieldKit';
import { useColors } from '../../hooks/useColors';
import { distanceKm, formatCoordinate, initialBearingDegrees, kmToNm, nmToKm, parseCoordinate } from '../../lib/geo';

export default function MapMeasureScreen() {
  const colors = useColors();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [originLatitude, setOriginLatitude] = useState('');
  const [originLongitude, setOriginLongitude] = useState('');
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

  async function useCurrentLocation() {
    setPositionError(null);
    try {
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
      };
      setGps(next);
      setOriginLatitude(formatCoordinate(next.latitude));
      setOriginLongitude(formatCoordinate(next.longitude));
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
      title="Map & Measure"
      subtitle="GPS or coordinate-to-coordinate measurement"
    >
      <Callout title="Offline basemap not installed">
        The first iteration has no licensed aerodrome/locality dataset or offline map tiles. Map-tap selection and nearest-aerodrome lookup are unavailable until an approved pack is added. Do not treat missing data as an all-clear.
      </Callout>

      <Panel>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Feather name="map" size={21} color={colors.primary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>No map data installed</Text>
            <Text style={{ fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>
              This panel does not draw a basemap or fabricate a map pin.
            </Text>
          </View>
          <Badge tone="warning">NO DATA</Badge>
        </View>
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
            <TextField label="Latitude" value={originLatitude} onChangeText={setOriginLatitude} placeholder="-33.8688" keyboardType="decimal-pad" testID="origin-latitude" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Longitude" value={originLongitude} onChangeText={setOriginLongitude} placeholder="151.2093" keyboardType="decimal-pad" testID="origin-longitude" />
          </View>
        </View>
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Coordinates are user-entered unless a GPS fix is shown above.</Text>
      </Panel>

      <Panel>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Destination point</Text>
        <TextField label="Point name" value={destinationName} onChangeText={setDestinationName} placeholder="Aerodrome, locality, or landmark" testID="destination-name" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Latitude" value={destinationLatitude} onChangeText={setDestinationLatitude} placeholder="-34.0000" keyboardType="decimal-pad" testID="destination-latitude" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Longitude" value={destinationLongitude} onChangeText={setDestinationLongitude} placeholder="151.0000" keyboardType="decimal-pad" testID="destination-longitude" />
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
            Initial true bearing: {measurement.bearing.toFixed(0)}°{destinationName ? ` to ${destinationName}` : ''}
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

      <Callout title="Nearest aerodrome / locality">
        No verified offline reference dataset is installed. Add a licensed, current data pack before enabling automatic nearest-place results.
      </Callout>
    </Screen>
  );
}
