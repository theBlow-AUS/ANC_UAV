import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton, Badge, Body, Callout, DISPLAY, Grid, Panel, Screen, SectionHeading, Seg, TextField, Tile, Verdict } from '@/components/FieldKit';
import { PriorityRail } from '@/components/PriorityRail';
import { QUICK_REFERENCE } from '@/data/rfs-pack';
import { useColors } from '@/hooks/useColors';
import { useUi } from '@/hooks/useUi';
import { aerodromeComparison, NM, tempComparison, windComparison, type AeroType } from '@/lib/airspace';
import { setUi } from '@/lib/ui-store';

const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

export default function NavigateScreen() {
  const c = useColors();
  const ui = useUi();
  const [type, setType] = useState<AeroType>('tower');
  const [dist, setDist] = useState('');
  const [wind, setWind] = useState('');
  const [temp, setTemp] = useState('');
  const d = num(dist), w = num(wind), t = num(temp);
  const km = d === null || d < 0 ? null : ui.unit === 'km' ? d : d * NM;
  const v = km === null ? null : aerodromeComparison(type, km);
  const ref = QUICK_REFERENCE.fly.filter((s) => s.heading === 'Navigate' || s.heading === 'Weather shorthand');

  const checks = (
    <View>
      <Seg label="Nearest aerodrome is" value={type} onChange={setType} options={[['tower', 'Towered'], ['unc', 'Uncontrolled / HLS']]} />
      <Seg label="Unit" value={ui.unit} onChange={(u) => setUi({ unit: u })} options={[['km', 'km'], ['nm', 'NM']]} />
      <TextField label={`Distance to aerodrome (${ui.unit === 'km' ? 'km' : 'NM'})`} value={dist} onChangeText={setDist} keyboardType="decimal-pad" placeholder="0.0" testID="navigate-distance" />
      {d !== null && d < 0 ? <Text style={{ color: c.destructive, fontWeight: '700', marginBottom: 8 }}>Enter a non-negative distance.</Text> : null}
      {km !== null ? (
        <Grid cols={2}>
          <Tile label="Kilometres" value={km.toFixed(2)} unit="km" />
          <Tile label="Nautical miles" value={(km / NM).toFixed(2)} unit="NM" />
        </Grid>
      ) : null}
      {v ? (
        <Verdict tone={v.tone} glyph={v.glyph} title={v.title} text={v.text}>
          {v.script ? <ActionButton secondary label={v.script === 'twr' ? 'Tower script' : 'CTAF script'} icon="radio" onPress={() => router.navigate({ pathname: '/comms', params: { sc: v.script ?? 'ctaf' } })} /> : null}
        </Verdict>
      ) : null}
      <ActionButton secondary icon="map" label="Measure on offline map" onPress={() => router.navigate('/map')} />
      <SectionHeading title="Aircraft figures" detail="Matrice 30T figures from the mockup. Unverified, model-specific, not universal." />
      <Grid cols={2}>
        <TextField label="Wind m/s" value={wind} onChangeText={setWind} keyboardType="decimal-pad" placeholder="0" />
        <TextField label="Temp °C" value={temp} onChangeText={setTemp} keyboardType="numbers-and-punctuation" placeholder="0" />
      </Grid>
      {w !== null && w >= 0 ? <Verdict {...windComparison(w)} /> : null}
      {t !== null ? <Verdict {...tempComparison(t)} /> : null}
    </View>
  );

  const reference = (
    <View>
      <SectionHeading title="Reference" detail="Draft legend and shorthand, not a live airspace dataset" />
      {ref.map((sec) => (
        <Panel key={sec.heading}>
          <Text style={{ color: c.foreground, fontFamily: DISPLAY, fontWeight: '800', fontSize: ui.fs(24), textTransform: 'uppercase' }}>{sec.heading}</Text>
          {sec.entries.map(([k, val]) => (
            <Body key={k}>{`${k}: ${val}`}</Body>
          ))}
          <Badge tone="warning">SOURCE NEEDS APPROVAL</Badge>
        </Panel>
      ))}
      <ActionButton secondary icon="book-open" label="Full quick reference" onPress={() => router.push('/quick-reference')} />
    </View>
  );

  return (
    <Screen eyebrow="Unverified reference comparisons" title="Navigate">
      <PriorityRail current="navigate" />
      <Grid cols={ui.wide ? 2 : 1} gap={20}>{[checks, reference]}</Grid>
      <Callout title="Not a clearance">Results compare your number to figures on the unverified mockup card. They never say an area is clear or that a call is required. Check charts, NOTAMs and approved procedures.</Callout>
    </Screen>
  );
}
