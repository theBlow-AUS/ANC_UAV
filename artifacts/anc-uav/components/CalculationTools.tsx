import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { ActionButton, Callout, Grid, Panel, Seg, TextField, Verdict } from './FieldKit';
import { useColors } from '../hooks/useColors';
import { useUi } from '../hooks/useUi';
import { setUi } from '../lib/ui-store';
import { aerodromeComparison, NM, tempComparison, windComparison, type AeroType } from '../lib/airspace';
import { kmToNm, nmToKm } from '../lib/geo';

const number = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

export function DistanceConverter() {
  const c = useColors();
  const [input, setInput] = useState('');
  const [unit, setUnit] = useState<'km' | 'nm'>('km');
  const value = number(input);
  const converted = value === null ? null : unit === 'km' ? kmToNm(value) : nmToKm(value);
  const valid = value !== null && value >= 0 && converted !== null && Number.isFinite(converted);
  return <>
    <Seg label="Input unit" options={[['km', 'Kilometres'], ['nm', 'Nautical miles']]} value={unit} onChange={setUnit} />
    <TextField label={unit === 'km' ? 'Kilometres' : 'Nautical miles'} value={input} onChangeText={setInput}
      keyboardType="decimal-pad" placeholder="0.0" maxLength={24} testID="unit-converter-input" />
    <Text accessibilityLiveRegion="polite" selectable style={{ color: c.foreground, fontSize: 28, fontWeight: '700', marginBottom: 8 }}>
      {valid ? `${converted.toFixed(3)} ${unit === 'km' ? 'NM' : 'km'}` : input.trim() ? 'Enter a finite, non-negative distance.' : 'Enter a distance to convert.'}
    </Text>
    <Text style={{ color: c.mutedForeground, fontSize: 13 }}>1 nautical mile = 1.852 kilometres. Changing the input unit reinterprets the entered value.</Text>
  </>;
}

export function AerodromeDistanceComparison() {
  const c = useColors();
  const ui = useUi();
  const [type, setType] = useState<AeroType>('tower');
  const unit = ui.unit;
  const [input, setInput] = useState('');
  const value = number(input);
  const km = value !== null && value >= 0 ? value * (unit === 'km' ? 1 : NM) : null;
  const result = km !== null && Number.isFinite(km) ? aerodromeComparison(type, km) : null;
  return <>
    <Callout title="Unverified mockup comparison">
      These are reference figures from the supplied mockup, not regulatory rules, current airspace data or a determination that a radio call is required.
    </Callout>
    <Seg label="Nearest aerodrome is" value={type} onChange={setType} options={[['tower', 'Towered'], ['unc', 'Uncontrolled / HLS']]} />
    <Seg label="Input unit" value={unit} onChange={v => setUi({ unit: v })} options={[['km', 'km'], ['nm', 'NM']]} />
    <TextField label={`Distance to aerodrome (${unit})`} value={input} onChangeText={setInput} keyboardType="decimal-pad"
      placeholder="0.0" maxLength={24} testID="navigate-distance" />
    {result ? <Verdict tone={result.tone} glyph={result.glyph} title={result.title} text={result.text}>
      <Text style={{ color: c.foreground, fontWeight: '700', marginVertical: 4 }}>{km!.toFixed(2)} km · {kmToNm(km!).toFixed(2)} NM</Text>
      {result.script ? <ActionButton secondary label={result.script === 'twr' ? 'Tower script' : 'CTAF script'} icon="radio"
        onPress={() => router.navigate({ pathname: '/comms', params: { sc: result.script! } })} /> : null}
    </Verdict> : input.trim() ? <Text style={{ color: c.destructive }}>Enter a finite, non-negative distance.</Text> : null}
    <ActionButton secondary icon="map" label="Measure on map" onPress={() => router.navigate('/map')} />
  </>;
}

export function AircraftWeatherComparison() {
  const c = useColors();
  const [wind, setWind] = useState('');
  const [temperature, setTemperature] = useState('');
  const w = number(wind), t = number(temperature);
  const validWind = w !== null && w >= 0 && Number.isFinite(w * 3.6);
  return <>
    <Callout title="Model-specific, unverified figures">
      Matrice 30T mockup values only. These do not use your active operating profile, verify manufacturer limits, or provide a go/no-go decision.
    </Callout>
    <Grid cols={2}>
      <TextField label="Wind (m/s)" value={wind} onChangeText={setWind} keyboardType="decimal-pad" maxLength={24} placeholder="0" testID="tools-wind" />
      <TextField label="Temperature (°C)" value={temperature} onChangeText={setTemperature} keyboardType="numbers-and-punctuation" maxLength={24} placeholder="0" testID="tools-temperature" />
    </Grid>
    {validWind ? <Verdict {...windComparison(w)} /> : wind.trim() ? <Text style={{ color: c.destructive }}>Enter a finite, non-negative wind speed.</Text> : null}
    {t !== null ? <Verdict {...tempComparison(t)} /> : temperature.trim() ? <Text style={{ color: c.destructive }}>Enter a finite temperature.</Text> : null}
    <Panel><Text style={{ color: c.mutedForeground, fontSize: 13 }}>For actual operations, use the approved aircraft/battery documentation, current weather and your operator's procedures.</Text></Panel>
  </>;
}
