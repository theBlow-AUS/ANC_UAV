import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Callout, Panel, Screen, SectionHeading } from '../../components/FieldKit';
import { useColors } from '../../hooks/useColors';
import { QUICK_REFERENCE } from '../../data/rfs-pack';

type Side = 'fly' | 'communicate';

export default function QuickReferenceScreen() {
  const [side, setSide] = useState<Side>('fly');
  const isFly = side === 'fly';
  const colors = useColors();

  return (
    <Screen
      eyebrow="NSW RFS launch pack"
      title="Quick Reference"
      subtitle="Transcribed from the supplied two-sided A5 mockup"
    >
      <Callout title="Unverified mockup — not an approved operational card">
        Confirm the current controlled QRG, procedures, values, scripts, contacts, and offline distribution permission before operational use. No personal contact numbers are included in this first iteration.
      </Callout>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {([
          ['fly', 'Fly & Navigate'],
          ['communicate', 'Communicate & Administer'],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: side === key }}
            testID={`qrg-side-${key}`}
            onPress={() => setSide(key)}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              backgroundColor: side === key ? colors.primary : colors.secondary,
            }}
          >
            <Text style={{ color: side === key ? colors.primaryForeground : colors.secondaryForeground, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isFly
        ? QUICK_REFERENCE.fly.map((section) => (
            <View key={section.heading}>
              <SectionHeading title={section.heading} detail={section.subtitle} />
              <Panel>
                {section.entries.map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>{label}</Text>
                    <Text style={{ flex: 1.1, fontSize: 14, lineHeight: 19, fontWeight: '700', textAlign: 'right', color: colors.foreground }}>{value}</Text>
                  </View>
                ))}
                <Badge tone="warning">SOURCE NEEDS APPROVAL</Badge>
                <Text style={{ fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>{section.source}</Text>
                {'warning' in section ? (
                    <Text style={{ fontSize: 13, lineHeight: 19, fontWeight: '600', color: colors.destructive }}>
                    {section.warning}
                  </Text>
                ) : null}
              </Panel>
            </View>
          ))
        : QUICK_REFERENCE.communicate.map((section) => (
            <View key={section.heading}>
              <SectionHeading title={section.heading} />
              <Panel>
                <Text style={{ fontSize: 14, lineHeight: 21, color: colors.foreground }}>{section.body}</Text>
                {'trigger' in section ? (
                  <Text style={{ fontSize: 12, lineHeight: 18, color: colors.mutedForeground }}>{section.trigger}</Text>
                ) : null}
                <Badge tone="warning">VERIFY WITH CONTROLLED SOURCE</Badge>
              </Panel>
            </View>
          ))}
      <SectionHeading title="Source record" />
      <Panel>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.mutedForeground }}>
          RPAS_Quick_Reference_A5_MOCKUP · two pages · revision and approval not confirmed. The source labels itself “Uncontrolled when printed.”
        </Text>
      </Panel>
    </Screen>
  );
}
