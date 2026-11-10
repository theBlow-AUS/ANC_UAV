import { Accordion } from '@/components/Accordion';
import { AerodromeDistanceComparison, AircraftWeatherComparison, DistanceConverter } from '@/components/CalculationTools';
import { CoordinateCalculator } from '@/components/CoordinateCalculator';
import { Callout, Screen } from '@/components/FieldKit';
import { MetBriefingExplainer } from '@/components/MetBriefingExplainer';
import { NotamExplainer } from '@/components/NotamExplainer';

export default function ToolsScreen() {
  return <Screen title="Tools" eyebrow="On-device utilities" subtitle="Open a tool when you need it. Your entries stay when you collapse it.">
    <Callout title="Calculations and reading aids">
      These tools run locally. They do not verify source currency, operational approvals or whether a flight is safe. Briefing text is held in temporary app memory, not uploaded or saved.
    </Callout>
    <Accordion title="NOTAM · plain English" summary="One notice at a time · limited local interpretation" icon="file-text" testID="tools-notam">
      <NotamExplainer embedded />
    </Accordion>
    <Accordion title="MET briefing · plain English" summary="TAF and supplied briefing format · source scopes kept separate" icon="cloud" testID="tools-met">
      <MetBriefingExplainer embedded />
    </Accordion>
    <Accordion title="Distance converter" summary="Kilometres ↔ nautical miles" icon="repeat" testID="tools-distance">
      <DistanceConverter />
    </Accordion>
    <Accordion title="Coordinate distance & bearing" summary="Manual points or GPS origin · km, NM and true bearing" icon="compass" testID="tools-coordinates">
      <CoordinateCalculator />
    </Accordion>
    <Accordion title="Aerodrome distance comparison" summary="Unverified mockup reference · not a radio or clearance decision" icon="navigation" testID="tools-aerodrome">
      <AerodromeDistanceComparison />
    </Accordion>
    <Accordion title="Wind & temperature comparison" summary="Matrice 30T mockup figures only · not active-profile limits" icon="wind" testID="tools-weather-comparison">
      <AircraftWeatherComparison />
    </Accordion>
  </Screen>;
}
