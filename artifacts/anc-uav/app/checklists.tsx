import { Text, View } from 'react-native';
import { Badge, Callout, Panel, Screen, SectionHeading } from '../components/FieldKit';
import { useColors } from '../hooks/useColors';
import { useAppData } from '../context/AppDataContext';

export default function ChecklistsScreen() {
  const colors = useColors();
  const { activePack } = useAppData();
  const checklists = activePack.checklists;

  return (
    <Screen
      eyebrow={activePack.name}
      title="Checklists"
      subtitle="Source status is shown with every imported checklist."
      back
    >
      <Callout title="No checklist is approved by this app">
        Imported items are read-only. This first iteration does not mark a user-supplied checklist complete or turn it into an operational procedure.
      </Callout>
      <SectionHeading title={`${checklists.length} checklist${checklists.length === 1 ? '' : 's'} in the active pack`} />
      {checklists.length ? (
        checklists.map((checklist) => (
          <Panel key={checklist.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.foreground }}>{checklist.title}</Text>
              <Badge tone="warning">READ ONLY</Badge>
            </View>
            {checklist.items.map((item) => (
              <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 3 }}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: colors.foreground }}>{item.label}</Text>
                <Text style={{ fontSize: 11, lineHeight: 16, color: colors.mutedForeground }}>{item.sourceReference}</Text>
              </View>
            ))}
          </Panel>
        ))
      ) : (
        <Panel>
          <Text style={{ fontSize: 14, lineHeight: 21, color: colors.foreground }}>
            No checklist content is installed in this pack. The supplied SOP is not treated as a verified checklist; import a controlled, rights-cleared pack from the Content & Sources tab.
          </Text>
        </Panel>
      )}
    </Screen>
  );
}
