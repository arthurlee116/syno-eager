import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'syno_recent_searches';
const MAX_HISTORY = 10;

export function useRecentSearches() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const addSearch = useCallback((word: string) => {
    const lowerWord = word.toLowerCase().trim();
    if (!lowerWord) return;

    setHistory((prev) => {
      const filtered = prev.filter((w) => w !== lowerWord);
      const newHistory = [lowerWord, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addSearch, clearHistory };
}
