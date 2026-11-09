import type {
  AgencyContentPack,
  PackChecklist,
  PackDocument,
  PackRule,
} from './types';

type PackManifest = {
  schemaVersion: number;
  packId: string;
  name: string;
  issuer: string;
  jurisdiction: { country: string; region: string; area?: string };
  version: string;
  sourceNote: string;
  rightsSummary: string;
  documents: Array<{
    id: string;
    title: string;
    source: string;
    version: string;
    category: 'quick-reference' | 'manual' | 'policy';
    sections: Array<{ heading: string; body: string }>;
  }>;
  rules: Array<{
    id: string;
    title: string;
    sourceDocumentId: string;
    sourceReference: string;
    statement: string;
  }>;
  checklists: Array<{
    id: string;
    title: string;
    sourceDocumentId: string;
    items: Array<{ id: string; label: string; sourceReference: string }>;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, label: string, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${label} must be text between 1 and ${max} characters.`);
  }
  if (/<\s*script|javascript:/i.test(value)) {
    throw new Error(`${label} contains unsupported active content.`);
  }
  return value.trim();
}

function list<T>(value: unknown, label: string, max: number): T[] {
  if (!Array.isArray(value) || value.length > max) {
    throw new Error(`${label} must be a list of at most ${max} entries.`);
  }
  return value as T[];
}

export function parseAgencyPack(
  value: unknown,
  sourceFileUri?: string,
): AgencyContentPack {
  if (!isRecord(value)) throw new Error('The selected file is not a content-pack object.');
  if (value.schemaVersion !== 1) {
    throw new Error('Unsupported content-pack schema. This app accepts schema version 1.');
  }
  if (JSON.stringify(value).length > 2_000_000) {
    throw new Error('The content pack is larger than the 2 MB import limit.');
  }

  const jurisdiction = value.jurisdiction;
  if (!isRecord(jurisdiction)) {
    throw new Error('Add a jurisdiction object with country and region.');
  }

  const rawDocuments = list<Record<string, unknown>>(value.documents, 'documents', 100);
  const documents: PackDocument[] = rawDocuments.map((doc, index) => {
    if (!isRecord(doc)) throw new Error(`Document ${index + 1} is not an object.`);
    if (!['quick-reference', 'manual', 'policy'].includes(String(doc.category))) {
      throw new Error(`Document ${index + 1} has an unsupported category.`);
    }
    const sections = list<Record<string, unknown>>(doc.sections, 'document sections', 100);
    return {
      id: text(doc.id, `Document ${index + 1} id`, 100),
      title: text(doc.title, `Document ${index + 1} title`),
      source: text(doc.source, `Document ${index + 1} source`),
      version: text(doc.version, `Document ${index + 1} version`),
      category: doc.category as PackDocument['category'],
      sections: sections.map((section, sectionIndex) => {
        if (!isRecord(section)) {
          throw new Error(`Section ${sectionIndex + 1} in document ${index + 1} is invalid.`);
        }
        return {
          heading: text(section.heading, 'Section heading', 300),
          body: text(section.body, 'Section text', 100_000),
        };
      }),
    };
  });

  const documentIds = new Set(documents.map((doc) => doc.id));
  const rules: PackRule[] = list<Record<string, unknown>>(value.rules, 'rules', 300).map(
    (rule, index) => {
      if (!isRecord(rule)) throw new Error(`Rule ${index + 1} is invalid.`);
      const sourceDocumentId = text(rule.sourceDocumentId, 'Rule source document id', 100);
      if (!documentIds.has(sourceDocumentId)) {
        throw new Error(`Rule ${index + 1} refers to a document that is not in this pack.`);
      }
      return {
        id: text(rule.id, `Rule ${index + 1} id`, 100),
        title: text(rule.title, `Rule ${index + 1} title`),
        sourceDocumentId,
        sourceReference: text(rule.sourceReference, 'Rule source reference', 500),
        statement: text(rule.statement, 'Rule statement', 10_000),
      };
    },
  );

  const checklists: PackChecklist[] = list<Record<string, unknown>>(
    value.checklists,
    'checklists',
    100,
  ).map((checklist, index) => {
    if (!isRecord(checklist)) throw new Error(`Checklist ${index + 1} is invalid.`);
    const sourceDocumentId = text(checklist.sourceDocumentId, 'Checklist source document id', 100);
    if (!documentIds.has(sourceDocumentId)) {
      throw new Error(`Checklist ${index + 1} refers to a document that is not in this pack.`);
    }
    const items = list<Record<string, unknown>>(checklist.items, 'checklist items', 200);
    return {
      id: text(checklist.id, `Checklist ${index + 1} id`, 100),
      title: text(checklist.title, `Checklist ${index + 1} title`),
      sourceDocumentId,
      items: items.map((item, itemIndex) => {
        if (!isRecord(item)) throw new Error(`Checklist item ${itemIndex + 1} is invalid.`);
        return {
          id: text(item.id, 'Checklist item id', 100),
          label: text(item.label, 'Checklist item label', 1000),
          sourceReference: text(item.sourceReference, 'Checklist item source', 500),
        };
      }),
    };
  });

  const packId = text(value.packId, 'packId', 100);
  return {
    id: `${packId}-${Date.now().toString(36)}`,
    packId,
    name: text(value.name, 'name', 200),
    issuer: text(value.issuer, 'issuer', 300),
    jurisdiction: {
      country: text(jurisdiction.country, 'Jurisdiction country', 100),
      region: text(jurisdiction.region, 'Jurisdiction region', 150),
      ...(typeof jurisdiction.area === 'string'
        ? { area: text(jurisdiction.area, 'Jurisdiction area', 200) }
        : {}),
    },
    version: text(value.version, 'version', 100),
    sourceNote: text(value.sourceNote, 'sourceNote', 2000),
    rightsSummary: text(value.rightsSummary, 'rightsSummary', 2000),
    contentState: 'user-imported-unverified',
    installedAt: new Date().toISOString(),
    isBuiltIn: false,
    ...(sourceFileUri ? { sourceFileUri } : {}),
    documents,
    rules,
    checklists,
  };
}
