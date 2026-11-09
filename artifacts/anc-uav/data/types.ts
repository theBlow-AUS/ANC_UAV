export type ContentState =
  | 'review-required'
  | 'user-imported-unverified';

// Navigation packs have a separate versioned, runtime-validated contract.
export type { NavigationPack, NavigationPlace, NavigationFrequency } from './navigation-pack';

export type PackDocument = {
  id: string;
  title: string;
  source: string;
  version: string;
  category: 'quick-reference' | 'manual' | 'policy';
  sections: Array<{ heading: string; body: string }>;
};

export type PackRule = {
  id: string;
  title: string;
  sourceDocumentId: string;
  sourceReference: string;
  statement: string;
};

export type PackChecklist = {
  id: string;
  title: string;
  sourceDocumentId: string;
  items: Array<{ id: string; label: string; sourceReference: string }>;
};

export type AgencyContentPack = {
  id: string;
  packId: string;
  name: string;
  issuer: string;
  jurisdiction: { country: string; region: string; area?: string };
  version: string;
  sourceNote: string;
  rightsSummary: string;
  contentState: ContentState;
  installedAt: string;
  isBuiltIn: boolean;
  sourceFileUri?: string;
  documents: PackDocument[];
  rules: PackRule[];
  checklists: PackChecklist[];
};

export type LocalDocument = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  issuer: string;
  jurisdiction: string;
  localUri: string;
  importedAt: string;
  contentState: 'user-imported-unverified';
  textContent?: string;
};

export type IncidentFrequency = {
  id: string;
  packId: string;
  incident: string;
  sector: string;
  frequencyMHz: string;
  assignedBy: string;
  validity: string;
  enteredAt: string;
};

export type VaultProvider = 'naips' | 'airservices' | 'casa';

export type AppData = {
  packs: AgencyContentPack[];
  activePackId: string;
  localDocuments: LocalDocument[];
  incidentFrequencies: IncidentFrequency[];
  savedVaultProviders: VaultProvider[];
};
