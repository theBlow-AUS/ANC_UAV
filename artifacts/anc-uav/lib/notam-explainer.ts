export type NotamExplanationItem = {
  label: string;
  value: string;
  explanation?: string;
  interpreted: boolean;
};

export type NotamExplanation = {
  original: string;
  items: NotamExplanationItem[];
  warnings: string[];
  expansions: string[];
};

const MAX_NOTAM_LENGTH = 12_000;
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const glossary: Record<string, string> = {
  'NOT AVBL': 'not available',
  'DUE TO': 'due to',
  AD: 'aerodrome',
  AVBL: 'available',
  BTN: 'between',
  CLSD: 'closed',
  CTN: 'caution',
  DLY: 'daily',
  OBST: 'obstacle',
  PERM: 'permanent',
  RWY: 'runway',
  TEMPO: 'temporarily',
  THR: 'threshold',
  TIL: 'until',
  TWY: 'taxiway',
  'U/S': 'unserviceable',
  WIP: 'works in progress',
};
const glossaryPattern = new RegExp(
  `\\b(${Object.keys(glossary).sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})\\b`,
  'g',
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dateTimeDescription(value: string, allowEstimated: boolean): string | null {
  const match = value.match(allowEstimated ? /^(\d{10})\s*(EST)?$/i : /^(\d{10})$/i);
  if (!match) return null;
  const digits = match[1];
  const yy = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  const hour = Number(digits.slice(6, 8));
  const minute = Number(digits.slice(8, 10));
  const daysPerMonth = [31, yy % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysPerMonth[month - 1] || hour > 23 || minute > 59) return null;
  const estimated = match[2] ? ' (estimated)' : '';
  return `${day} ${months[month - 1]}, year “${digits.slice(0, 2)}” · ${digits.slice(6, 8)}:${digits.slice(8, 10)} UTC${estimated}`;
}

function altitudeDescription(value: string): string | null {
  const upper = value.toUpperCase();
  if (upper === 'SFC') return 'Surface level.';
  if (upper === 'GND') return 'Ground level.';
  if (upper === 'UNL') return 'Unlimited upper level.';
  const flightLevel = upper.match(/^FL(\d{2,3})$/);
  if (flightLevel) return `Flight level ${Number(flightLevel[1])}; the corresponding altitude in feet is not calculated.`;
  const feet = upper.match(/^(\d{1,5})\s*FT\s*(AGL|AMSL)$/);
  if (feet) return `${Number(feet[1]).toLocaleString()} feet ${feet[2] === 'AGL' ? 'above ground level' : 'above mean sea level'}.`;
  return null;
}

function expandDescription(value: string, expansions: Set<string>): string {
  return value.replace(glossaryPattern, term => {
    const expansion = glossary[term];
    expansions.add(`${term} = ${expansion}`);
    return `${term} (${expansion})`;
  });
}

/**
 * Conservative, deterministic interpretation of explicitly labelled NOTAM fields.
 * Input is only held by the caller; this module has no storage or network dependencies.
 */
export function explainNotam(input: string): NotamExplanation {
  const original = input;
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Enter or paste NOTAM text first.');
  if (input.length > MAX_NOTAM_LENGTH) throw new Error(`NOTAM text is limited to ${MAX_NOTAM_LENGTH.toLocaleString()} characters.`);

  const parsingText = trimmed.startsWith('(') && trimmed.endsWith(')')
    ? trimmed.slice(1, -1).trim() : trimmed;
  const lines = parsingText.replace(/\r\n?/g, '\n').split('\n');
  if (lines.filter(line => /^\s*\(?[A-Z]\d{1,4}\/\d{2}\s+NOTAM[NRC]\b/i.test(line)).length > 1) {
    throw new Error('Paste one NOTAM at a time. Multiple notices are not combined or compared.');
  }
  const header = lines[0]?.trim() ?? '';
  const headerMatch = header.match(/^([A-Z]\d{1,4}\/\d{2})\s+NOTAM([NRC])(?:\s+([A-Z]\d{1,4}\/\d{2}))?$/i);
  const fields = new Map<string, string[]>();
  const warnings: string[] = [];
  const expansions = new Set<string>();
  let currentField: string | null = null;
  const unparsed: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const fieldMatch = line.match(/^([A-GQ])\)\s*(.*)$/i);
    if (fieldMatch) {
      currentField = fieldMatch[1].toUpperCase();
      fields.set(currentField, [...(fields.get(currentField) ?? []), fieldMatch[2].trim()]);
      continue;
    }
    if (/^[A-Z]\)\s*/i.test(line)) {
      currentField = null;
      unparsed.push(line);
      warnings.push(`Section “${line.slice(0, 2)}” is outside the supported Q) and A–G fields and was not interpreted.`);
      continue;
    }
    if (currentField) {
      const existing = fields.get(currentField) ?? [];
      existing[existing.length - 1] = `${existing.at(-1) ?? ''}${existing.at(-1) ? '\n' : ''}${line}`;
      fields.set(currentField, existing);
    } else if (line !== header || !headerMatch) {
      unparsed.push(line);
    }
  }

  const items: NotamExplanationItem[] = [];
  if (headerMatch) {
    const action = { N: 'New NOTAM', R: 'Replacement NOTAM', C: 'Cancellation NOTAM' }[headerMatch[2].toUpperCase()];
    items.push({ label: 'Reference and status', value: header, explanation: action, interpreted: true });
    if (headerMatch[3]) items.push({ label: 'Replaces / cancels reference', value: headerMatch[3], interpreted: false, explanation: 'Reference retained as written; linked NOTAM is not looked up.' });
  } else {
    warnings.push('No standard NOTAM reference/type line was recognized; the original text is retained.');
  }

  for (const [field, label] of [
    ['Q', 'Q-line (coded qualifiers)'],
    ['A', 'Location identifier'],
  ] as const) {
    const value = fields.get(field)?.join('\n');
    if (value) {
      const explanation = field === 'Q'
        ? 'Coded qualifiers and coordinates are shown unchanged; they are not decoded or used to determine applicability.'
        : 'Identifier shown as supplied; no location name or position is looked up.';
      items.push({ label, value, explanation, interpreted: false });
    }
  }

  const start = fields.get('B')?.join(' ').trim();
  if (start) {
    const description = dateTimeDescription(start, false);
    items.push({
      label: 'Start time (B)',
      value: start,
      explanation: description ? `${description}. The two-digit year is preserved; its century is not inferred.` : 'Time format not recognized or invalid; value is shown unchanged.',
      interpreted: !!description,
    });
    if (!description) warnings.push('The B) start-time value was not interpreted.');
  }

  const end = fields.get('C')?.join(' ').trim();
  if (end) {
    if (/^PERM$/i.test(end)) {
      items.push({ label: 'End time (C)', value: end, explanation: 'Marked PERM (permanent) in the source.', interpreted: true });
    } else {
      const description = dateTimeDescription(end, true);
      items.push({
        label: 'End time (C)',
        value: end,
        explanation: description ? `${description}. The two-digit year is preserved; its century is not inferred.` : 'Time format not recognized or invalid; value is shown unchanged.',
        interpreted: !!description,
      });
      if (!description) warnings.push('The C) end-time value was not interpreted.');
    }
  }

  const schedule = fields.get('D')?.join('\n').trim();
  if (schedule) items.push({
    label: 'Schedule (D)',
    value: schedule,
    explanation: 'Schedule shown verbatim; its timezone and recurrence are not interpreted.',
    interpreted: false,
  });

  const affected = fields.get('E')?.join('\n').trim();
  if (affected) {
    const expanded = expandDescription(affected, expansions);
    items.push({
      label: 'Affected activity / condition (E)',
      value: affected,
      explanation: expanded === affected ? 'Text shown unchanged; no glossary terms were confidently recognized.' : expanded,
      interpreted: expanded !== affected,
    });
  }

  for (const [field, label] of [['F', 'Lower limit (F)'], ['G', 'Upper limit (G)']] as const) {
    const value = fields.get(field)?.join('\n').trim();
    if (!value) continue;
    const description = field === 'F' && /^UNL$/i.test(value) ? null : altitudeDescription(value);
    items.push({
      label,
      value,
      explanation: description ?? 'Limit format not recognized; value and units are shown unchanged.',
      interpreted: !!description,
    });
    if (!description) warnings.push(`${field}) altitude-limit value was not interpreted.`);
  }

  for (const field of ['A', 'B', 'C', 'E']) {
    if (!fields.get(field)?.join('').trim()) warnings.push(`Section ${field}) is absent or empty; no value was inferred.`);
  }
  if (!fields.has('Q')) warnings.push('No Q) line was found; coded qualifiers are unavailable.');
  if (unparsed.length) warnings.push(`${unparsed.length} other line${unparsed.length === 1 ? '' : 's'} could not be assigned to a supported section; review the original.`);
  if (!items.length) warnings.push('No supported NOTAM fields could be interpreted.');
  if (expansions.size) warnings.push('Glossary expansions are limited and do not resolve context; the original wording is authoritative.');

  return { original, items, warnings, expansions: [...expansions] };
}
