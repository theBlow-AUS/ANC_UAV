import type { AgencyContentPack } from './types';

export const RFS_PACK_ID = 'au-nsw-rfs-rpas';

export const RFS_PACK: AgencyContentPack = {
  id: RFS_PACK_ID,
  packId: RFS_PACK_ID,
  name: 'Default RPAS/UAV',
  issuer: 'NSW Rural Fire Service',
  jurisdiction: { country: 'Australia', region: 'New South Wales' },
  version: 'Reference draft 0.1',
  sourceNote:
    'Based on the user-supplied RPAS Quick Reference mockup. Confirm controlled versions and operational approval before use.',
  rightsSummary:
    'Initial pack only. Offline distribution and use still require content-owner approval.',
  contentState: 'review-required',
  installedAt: 'Bundled reference',
  isBuiltIn: true,
  documents: [
    {
      id: 'rfs-qrg',
      title: 'RPAS Operator Quick Reference',
      source: 'User-supplied A5 mockup, two sides',
      version: 'Mockup; revision not confirmed',
      category: 'quick-reference',
      sections: [],
    },
    {
      id: 'rfs-sop',
      title: 'RFS SOPs Uncrewed Aerial Vehicles',
      source: 'User-supplied January 2025 PDF',
      version: 'Filename v1.2.2; internal footer discrepancy',
      category: 'manual',
      sections: [],
    },
  ],
  rules: [],
  checklists: [],
};

export const QUICK_REFERENCE = {
  fly: [
    {
      heading: 'Aviate',
      subtitle: 'Fly the aircraft first',
      entries: [
        ['Maximum altitude', '120 m AGL'],
        ['Minimum distance from people', '30 m'],
        ['From a towered aerodrome', '5.5 km — radio call shown in Communicate'],
        ['From an uncontrolled aerodrome / HLS', '3 NM — radio call shown in Communicate'],
      ],
      source: 'Candidate values transcribed from the supplied QRG mockup.',
    },
    {
      heading: 'Airborne separation',
      subtitle: 'Maintain separation from crewed aircraft',
      entries: [
        ['Vertical', '500 ft'],
        ['Horizontal', '1,500 m'],
      ],
      source: 'Candidate values transcribed from the supplied QRG mockup.',
      warning:
        'The mockup says to descend to the lowest safe altitude or land if horizontal separation is lost. Confirm the controlled procedure before relying on this wording.',
    },
    {
      heading: 'Aircraft VLOS limits',
      subtitle: 'The supplied card lists these model-specific distances',
      entries: [
        ['DJI Mavic Mini', '500 m from home point'],
        ['DJI Matrice 30T', '1,000 m from home point'],
      ],
      source: 'Candidate values transcribed from the supplied QRG mockup.',
    },
    {
      heading: 'Navigate',
      subtitle: 'Map legend in the supplied card',
      entries: [
        ['Class C / Class D', 'Controlled airspace — clearance requirement noted'],
        ['Restricted area', 'Check NOTAMs'],
        ['Danger area', 'Flight permitted, high alert — confirm current rules'],
      ],
      source: 'This is a draft legend, not a live or complete airspace dataset.',
    },
    {
      heading: 'Weather shorthand',
      subtitle: 'Terms appearing on the supplied card',
      entries: [
        ['CAVOK / VMC', 'Ceiling and visibility OK / visual meteorological conditions'],
        ['Cloud cover', 'FEW 1–2 oktas · SCT 3–4 · BKN 5–7 · OVC 8'],
        ['Hazards', 'TS thunderstorm · RA rain · SH showers · FG fog'],
      ],
      source: 'Reference shorthand only. Use current approved weather products.',
    },
  ],
  communicate: [
    {
      heading: 'Before any radio call',
      body:
        'The supplied mockup says to use the callsign “Uncrewed RPA” and report the aircraft’s location, not the operator’s physical location. Verify the approved local script before use.',
    },
    {
      heading: 'CTAF / blind broadcast',
      body:
        '[Location] Traffic, Uncrewed RPA, operating [distance/bearing] from [aerodrome/landmark], surface to 400 feet. Operations continuing for the next [duration], [location].',
      trigger:
        'The mockup associates this with within 3 NM of an uncontrolled aerodrome / HLS and says 15 minutes prior and at intervals. These conditions and timing need approval.',
    },
    {
      heading: 'Tower / ATC request',
      body:
        '[Tower name], Uncrewed RPA [your name/ID], request clearance to operate at [location], surface to 400 feet, for [duration].',
      trigger:
        'The mockup associates this with within 5.5 km of a towered aerodrome. Confirm current procedure.',
    },
    {
      heading: 'Traffic avoidance',
      body:
        '[Aircraft callsign], Uncrewed RPA, I have you on sight. I am descending to surface / holding at [altitude] at [location] to remain clear.',
      trigger: 'Draft text from the mockup; use only after the operational owner confirms it.',
    },
    {
      heading: 'End of operations',
      body:
        '[Location] Traffic / Tower, Uncrewed RPA has landed and operations are complete, [location].',
      trigger: 'Draft text from the mockup; verify the intended radio service and local procedure.',
    },
    {
      heading: 'Loss of tower communications',
      body: 'The supplied mockup says: land immediately and contact the tower by mobile phone.',
      trigger: 'Critical procedure text; confirm against the current controlled SOP before use.',
    },
  ],
} as const;

export const NSW_FCTAF_REFERENCE = {
  frequencyMHz: '132.55',
  label: 'NSW statewide default FCTAF reference',
  source: 'NSW RFS Fire CTAF Allocation OPG, published 5 November 2026',
  scope:
    'NSW emergency-response aerial firefighting / intelligence context, where no incident frequency has been provided. Not a universal frequency and not routine administration.',
  status: 'Confirm current procedure and incident assignment before use.',
};
