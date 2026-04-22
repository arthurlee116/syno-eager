import { useCallback, useEffect, useState } from 'react';
import type { SynonymResponse } from '@/lib/synonymSchema';
import {
  buildRecentSearchEntry,
  isRecentSearchEntry,
  normalizeRecentSearchWord,
  type RecentSearchEntry,
} from '@/lib/recentSearches';

const STORAGE_KEY = 'syno_recent_searches';

function parseStoredHistory(stored: string | null): RecentSearchEntry[] {
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);

    if (Array.isArray(parsed) && parsed.every(isRecentSearchEntry)) {
      return parsed;
    }

    if (Array.isArray(parsed) && parsed.every((entry): entry is string => typeof entry === 'string')) {
      const now = new Date().toISOString();
      return parsed
        .map((word) => word.trim())
        .filter(Boolean)
        .map((word) => ({
          word,
          queriedAt: now,
          summary: '',
          result: {
            word,
            items: [],
          },
        }));
    }
  } catch {
    // corrupted data, fall through to default
  }

  return [];
}

export function useRecentSearches() {
  const [history, setHistory] = useState<RecentSearchEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    return parseStoredHistory(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (history.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addSearchFromResult = useCallback((data: SynonymResponse) => {
    const nextEntry = buildRecentSearchEntry(data);
    const normalizedWord = normalizeRecentSearchWord(nextEntry.word);
    if (!normalizedWord) return;

    setHistory((prev) => [
      nextEntry,
      ...prev.filter((entry) => normalizeRecentSearchWord(entry.word) !== normalizedWord),
    ]);
  }, []);

  const removeSearch = useCallback((word: string) => {
    const normalizedWord = normalizeRecentSearchWord(word);
    setHistory((prev) => prev.filter((entry) => normalizeRecentSearchWord(entry.word) !== normalizedWord));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addSearchFromResult, removeSearch, clearHistory };
}
