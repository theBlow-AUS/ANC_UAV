export type ReferenceProvider = 'airservices' | 'naips' | 'weathercams';

// Release-owned policy, never populated from an imported file or account setting.
// No executed provider/agency agreement or licensed interface was supplied.
export const PROVIDER_ACCESS = [
  {
    id: 'airservices',
    label: 'Airservices AIP',
    url: 'https://www.airservicesaustralia.com/aip/aip.asp',
    reviewedAt: '2026-11-09',
    reason: 'Published AIP terms allow personal non-commercial screen viewing, excluding internal business use. Storage, adaptation and redistribution need prior written permission. No agreement covering this app and its operators has been supplied.',
    required: 'Written AIS licence covering on-device storage, updates, intended agencies/operators and any redistribution; approved delivery interface and content review.',
  },
  {
    id: 'naips',
    label: 'NAIPS briefings',
    url: 'https://www.airservicesaustralia.com/naips/Account/LogOn',
    reviewedAt: '2026-11-09',
    reason: 'NAIPS expressly prohibits automated access/downloads and reproduction or redistribution without prior written authorization. Individual account ownership is insufficient. Website sign-in must not be scripted.',
    required: 'Written automation and use consent for every intended operator; subscribed SOAP interface documentation and approved device authorization. No shared agency password.',
  },
  {
    id: 'weathercams',
    label: 'Weather cameras',
    url: 'https://weathercams.airservicesaustralia.com/',
    reviewedAt: '2026-11-09',
    reason: 'Public camera viewing does not establish permission to automate acquisition or store/reuse images in a multi-operator app. No applicable reuse licence, camera-owner agreement or supported download interface has been established.',
    required: 'Provider and camera-owner permission covering automated retrieval, image retention, attribution and intended agencies; supported interface and reliable capture timestamps.',
  },
] as const;

export function providerAccess(provider: ReferenceProvider) {
  const entry = PROVIDER_ACCESS.find((item) => item.id === provider);
  if (!entry) throw new Error('Unsupported reference provider.');
  return entry;
}

/** Fail closed before credential reads or network calls. No user override. */
export function assertProviderDownloadAllowed(provider: ReferenceProvider): never {
  throw new Error(`${providerAccess(provider).label}: direct downloads are blocked. ${providerAccess(provider).required}`);
}
