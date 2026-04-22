import { SynonymResponseSchema, type SynonymResponse } from '@/lib/synonymSchema';

export interface RecentSearchEntry {
  word: string;
  queriedAt: string;
  summary: string;
  result: SynonymResponse;
}

export function normalizeRecentSearchWord(word: string) {
  return word.trim().toLowerCase();
}

export function isRecentSearchEntry(value: unknown): value is RecentSearchEntry {
  if (!value || typeof value !== 'object') return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.word === 'string' &&
    typeof entry.queriedAt === 'string' &&
    typeof entry.summary === 'string' &&
    SynonymResponseSchema.safeParse(entry.result).success
  );
}

export function buildRecentSearchEntry(data: SynonymResponse): RecentSearchEntry {
  const partCount = data.items.length;
  const synonymCount = data.items.reduce(
    (total, item) => total + item.meanings.reduce((meaningTotal, meaning) => meaningTotal + meaning.synonyms.length, 0),
    0,
  );

  const summary = `${pluralize(partCount, 'part of speech')} \u00b7 ${pluralize(synonymCount, 'synonym')}`;

  return {
    word: data.word.trim(),
    queriedAt: new Date().toISOString(),
    summary,
    result: data,
  };
}

export function formatRecentSearchTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
