import { useCallback, useState } from 'react';

const STORAGE_KEY = 'syno_recent_searches';
const MAX_HISTORY = 10;

export function useRecentSearches() {
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    return [];
  });

  const addSearch = useCallback((word: string) => {
    const lowerWord = word.toLowerCase().trim();
    if (!lowerWord) return;

    setHistory((prev) => {
      const filtered = prev.filter((w) => w !== lowerWord);
      const newHistory = [lowerWord, ...filtered].slice(0, MAX_HISTORY);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      }
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { history, addSearch, clearHistory };
}
