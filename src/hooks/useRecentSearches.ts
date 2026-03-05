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
      } catch {
        // Silently ignore to avoid polluting production logs
      }
    }
  }, []);

  /**
   * Performance Optimization:
   * Wrapped in useCallback to ensure reference stability.
   * This prevents infinite loops or unnecessary re-renders when this function
   * is used in dependency arrays of useEffects (e.g., in App.tsx).
   */
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

  /**
   * Performance Optimization:
   * Wrapped in useCallback for reference stability, preventing unnecessary re-renders
   * in child components that might receive this as a prop.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addSearch, clearHistory };
}
