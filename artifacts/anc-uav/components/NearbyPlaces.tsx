import { Text } from 'react-native';
import { useNavigation } from '../context/NavigationContext';
import type { NavigationPlace } from '../data/navigation-pack';
import { useColors } from '../hooks/useColors';
import { kmToNm } from '../lib/geo';
import { compassDirection, insideBounds, nearbyPlaces } from '../lib/navigation';
import { ActionButton, Badge, Callout, Panel, SectionHeading } from './FieldKit';
import { SourceDetails } from './NavigationPacks';

export function NearbyPlaces({ onSelect }: { onSelect: (p: NavigationPlace) => void }) {
  const { packs, query, ready, error } = useNavigation();
  const colors = useColors();
  const position = query.position;
  const ranked = position && ready ? packs.flatMap(pack => nearbyPlaces(pack, position).map(place => ({ ...place, pack })))
    .sort((a, b) => a.kilometres - b.kilometres) : [];
  return <>
    <SectionHeading title="Nearest in installed data" detail="From origin A to each reference point · true bearings, not magnetic." />
    <Callout title="Coverage is not an all-clear">
      {(error ? 'Saved data could not be loaded. ' : '') + (packs.filter(p => p.coverage.aerodromes !== 'absent').length
        ? 'Aerodrome classifications and coverage are imported, unverified claims. Tower operating status may change by time or NOTAM.'
        : 'Aerodrome data is NOT INSTALLED. Controlled and uncontrolled aerodrome results cannot be provided.') +
        ' Localities are reference points, not aerodromes. Results are nearest within these packs only; omitted or closer places may exist.'}
    </Callout>
    {position ? packs.map(pack => <Text key={pack.id} style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>
      {pack.name}: {insideBounds(position, pack.bounds) ? 'origin inside pack bounds' : 'ORIGIN OUTSIDE COVERAGE'} · aerodromes {pack.coverage.aerodromes} · localities {pack.coverage.localities}
    </Text>) : <Callout title="Origin required">Use GPS, tap origin A, or enter its coordinates.</Callout>}
    {(['controlled', 'uncontrolled', 'aerodrome-unknown', 'locality'] as const).map(kind => {
      const nearest = ranked.filter(p => p.kind === kind).slice(0, 3);
      return <Panel key={kind}>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>{{
          controlled: 'Controlled aerodromes', uncontrolled: 'Uncontrolled aerodromes',
          'aerodrome-unknown': 'Aerodromes — control status unknown', locality: 'Localities',
        }[kind]}</Text>
        {nearest.length ? nearest.map(p => <Panel key={`${p.pack.id}-${p.id}`}>
          <Badge tone="warning">REFERENCE ONLY</Badge>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>{p.name}</Text>
          <Text style={{ color: colors.primary, fontSize: 17 }}>
            {p.kilometres.toFixed(2)} km · {kmToNm(p.kilometres).toFixed(2)} NM
          </Text>
          <Text style={{ color: colors.mutedForeground }}>From A: {p.kilometres < .001 ? 'coincident point — no defined bearing' : `${p.bearing.toFixed(0)}° true · ${compassDirection(p.bearing)}`}{'\n'}{p.statusNote}</Text>
          <SourceDetails source={p.provenance} utc={query.utc} />
          <ActionButton label="Measure to this point" secondary onPress={() => onSelect(p)} testID={`measure-place-${p.id}`} />
        </Panel>) : <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          {position && ready ? 'No records in installed data — not evidence of absence.' : 'No lookup until origin and local packs are available.'}
        </Text>}
      </Panel>;
    })}
  </>;
}
