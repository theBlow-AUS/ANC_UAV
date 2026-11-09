import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNavigation } from '../context/NavigationContext';
import { useColors } from '../hooks/useColors';
import { insideBounds, lookupFrequencies, parseQueryUtc } from '../lib/navigation';
import { ActionButton, Badge, Callout, Panel, SectionHeading, TextField } from './FieldKit';
import { SourceDetails } from './NavigationPacks';
import { Pager } from './CommunityFrequencies';
import { communityPage } from '../lib/community-aviation';

export function FrequencyLookup() {
  const colors = useColors();
  const { packs, query, setQuery, ready, error, liveTime, setLiveTime, altitudeInput, setAltitudeInput } = useNavigation();
  const [expanded, setExpanded] = useState(false);
  const [pages, setPages] = useState<Record<string, number>>({});
  const rows = useMemo(() => ready ? lookupFrequencies(packs, query) : [], [ready, packs, query]);
  const candidates = rows.filter(r => r.state !== 'outside');
  const outside = rows.filter(r => r.state === 'outside');
  const outsidePage = communityPage(outside, pages.outside ?? 0);
  const anyData = packs.some(p => p.coverage.frequencies !== 'absent');
  const labelStyle = { color: colors.mutedForeground, fontSize: 12, lineHeight: 18 };
  return <>
    <SectionHeading title="Imported applicability lookup" detail="All installed records are evaluated; nearest aerodrome alone does not determine applicable frequencies." />
    <Callout title={anyData ? 'Imported aviation data — verify independently' : 'No spatial applicability data imported'}>
      {(error ? 'Stored packs could not be loaded. ' : '') + (anyData
        ? 'Results match imported geometry, altitude and UTC rules only, not operational clearance. Completeness, temporary changes and NOTAMs are not verified.'
        : 'Community airport references are bundled separately in Comms, but no imported airspace, broadcast-area or CTAF applicability geometry is available. This section cannot confirm which frequency applies at a position, altitude or time. No results does NOT mean clear airspace or no frequency requirement.') +
        ' Incident FCTAF is never inferred from GPS or these packs.'}
    </Callout>
    <Panel>
      <Text style={labelStyle}>Lookup origin A: {query.position ? `${query.position.latitude.toFixed(5)}, ${query.position.longitude.toFixed(5)}` : 'NOT SET — candidates cannot be geographically confirmed'}</Text>
      <ActionButton label="Set origin in Map & Measure" secondary onPress={() => router.navigate('/map')} />
      <TextField label={query.altitudeReference === 'FL' ? 'Flight level (not feet)' : `Altitude in feet ${query.altitudeReference}`}
        value={altitudeInput}
        onChangeText={value => {
          setAltitudeInput(value);
          const n = Number(value);
          setQuery({ ...query, altitude: value.trim() && Number.isFinite(n) && n >= -2000 && n <= 100000 ? n : null });
        }} placeholder="Unknown" keyboardType="numbers-and-punctuation" testID="lookup-altitude" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {(['AMSL', 'AGL', 'FL'] as const).map(reference => <ActionButton key={reference} label={reference}
          secondary={query.altitudeReference !== reference} onPress={() => { setAltitudeInput(''); setQuery({ ...query, altitudeReference: reference, altitude: null }); }}
          testID={`lookup-datum-${reference}`} />)}
      </View>
      <Text style={labelStyle}>No GPS altitude, terrain, QNH or flight-level conversion is assumed. Datum changes clear altitude.</Text>
      {altitudeInput.trim() && query.altitude === null ? <Text style={{ color: colors.destructive }}>Invalid altitude — treated as unknown, not zero.</Text> : null}
      <Text style={labelStyle}>Evaluated UTC: {query.utc} · {liveTime ? 'device clock, refreshed every 15 s' : 'operator-planned time'}</Text>
      <ActionButton label={liveTime ? 'Use planned UTC' : 'Use live device UTC'} secondary onPress={() => {
        setQuery({ ...query, utc: new Date().toISOString() }); setLiveTime(!liveTime);
      }} />
      {!liveTime ? <TextField label="Planned UTC ISO 8601" value={query.utc} autoCapitalize="none"
        onChangeText={utc => setQuery({ ...query, utc })} placeholder="2026-11-09T12:00:00Z" testID="lookup-utc" /> : null}
      {!liveTime && !Number.isFinite(parseQueryUtc(query.utc)) ? <Text style={{ color: colors.destructive }}>
        Include a full ISO date and explicit UTC Z or offset. Time is unknown until valid.
      </Text> : null}
    </Panel>
    {packs.map(pack => <Panel key={pack.id}>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{pack.name}</Text>
      <Badge tone="warning">{`FREQUENCIES: ${pack.coverage.frequencies.toUpperCase()} · UNVERIFIED`}</Badge>
      <Text style={labelStyle}>{pack.coverage.notes}</Text>
      {query.position && !insideBounds(query.position, pack.bounds) ? <Text style={{ color: colors.destructive }}>Origin outside this pack’s declared coverage.</Text> : null}
    </Panel>)}
    {(['CTAF', 'other'] as const).map(group => {
      const records = candidates.filter(r => group === 'CTAF' ? r.frequency.service === 'CTAF' : r.frequency.service !== 'CTAF');
      const pg = communityPage(records, pages[group] ?? 0);
      return <View key={group}>
        <SectionHeading title={group === 'CTAF' ? 'Aerodrome CTAFs' : 'Airspace / broadcast / ATS'} detail={`${records.length} matching or possible records · no frequency deduplication`} />
        {!records.length ? <Callout title="No candidate records">
          {anyData ? 'No matching or possible records in these packs. Data may be incomplete, expired or outside coverage; do not treat this as no radio requirement.' : 'No spatial applicability pack imported. Use the community airport reference in Comms for discovery only.'}
        </Callout> : null}
        <Pager label="Candidates" page={pg.page} pages={pg.pages} total={pg.total} onPage={p => setPages({ ...pages, [group]: p })} />
        {pg.items.map(({ frequency: f, pack, state, reasons }) => <Panel key={`${pack.id}-${f.id}`}>
          <Badge tone="warning">{state === 'matches' ? 'MATCHES IMPORTED RULES — UNVERIFIED' : 'POSSIBLE — CHECK CONDITIONS'}</Badge>
          <Text style={{ color: colors.primary, fontSize: 23, fontWeight: '700' }}>{f.frequencyMHz} MHz · {f.service}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>{f.label}</Text>
          <Text style={labelStyle}>{pack.name}{f.aerodromeId ? ` · ${pack.places.find(p => p.id === f.aerodromeId)?.name}` : ''}</Text>
          <Text style={labelStyle}>
            Geographic rule: {f.applicability.area.kind === 'circle'
              ? `${f.applicability.area.radiusKm} km from ${f.applicability.area.centre.latitude}, ${f.applicability.area.centre.longitude}`
              : `${f.applicability.area.ring.length}-vertex published polygon`}
            {'\n'}Altitude: {f.applicability.altitude.lower}–{f.applicability.altitude.upper} {f.applicability.altitude.reference === 'FL' ? 'FL' : `ft ${f.applicability.altitude.reference}`}
            {'\n'}UTC: {f.applicability.activeUtc.length ? f.applicability.activeUtc.map(t => `${t.from} → ${t.to}`).join('; ') : 'H24 within source validity'}
          </Text>
          {reasons.length ? <Text style={{ ...labelStyle, color: colors.destructive }}>{reasons.join('\n')}</Text> : null}
          <SourceDetails source={f.provenance} utc={query.utc} />
        </Panel>)}
      </View>;
    })}
    {outside.length ? <Panel>
      <ActionButton label={`${expanded ? 'Hide' : 'Show'} ${outside.length} excluded records`} secondary onPress={() => setExpanded(!expanded)} />
      {expanded ? <Pager label="Excluded" page={outsidePage.page} pages={outsidePage.pages} total={outsidePage.total} onPage={p => setPages({ ...pages, outside: p })} /> : null}
      {expanded ? outsidePage.items.map(r => <Text key={`${r.pack.id}-${r.frequency.id}`} style={labelStyle}>
        {r.frequency.label} · {r.frequency.service} {r.frequency.frequencyMHz} MHz · {r.pack.name}: {r.reasons.join('; ')}
      </Text>) : null}
    </Panel> : null}
  </>;
}
