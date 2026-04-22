import { renderHook, act } from '@testing-library/react';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import type { SynonymResponse } from '@/lib/synonymSchema';

const STORAGE_KEY = 'syno_recent_searches';
const storage = createStorageMock();

const createResponse = (word: string): SynonymResponse => ({
  word,
  items: [
    {
      partOfSpeech: 'noun',
      meanings: [
        {
          definition: `${word} definition`,
          synonyms: [{ en: `${word}-one` }, { en: `${word}-two` }],
        },
      ],
    },
  ],
});

describe('useRecentSearches', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    storage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to empty history for corrupt data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');

    const { result } = renderHook(() => useRecentSearches());

    expect(result.current.history).toEqual([]);
  });

  it('hydrates legacy string history entries', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['Alpha', 'Beta']));

    const { result } = renderHook(() => useRecentSearches());

    expect(result.current.history).toEqual([
      {
        word: 'Alpha',
        queriedAt: '2026-03-07T12:00:00.000Z',
        summary: '',
        result: {
          word: 'Alpha',
          items: [],
        },
      },
      {
        word: 'Beta',
        queriedAt: '2026-03-07T12:00:00.000Z',
        summary: '',
        result: {
          word: 'Beta',
          items: [],
        },
      },
    ]);
  });

  it('adds enriched history entries and persists them', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearchFromResult(createResponse('serendipity'));
    });

    expect(result.current.history).toEqual([
      {
        word: 'serendipity',
        queriedAt: '2026-03-07T12:00:00.000Z',
        summary: '1 part of speech · 2 synonyms',
        result: createResponse('serendipity'),
      },
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(result.current.history);
  });

  it('deduplicates repeated words and moves them to the top', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearchFromResult(createResponse('serendipity'));
    });

    vi.setSystemTime(new Date('2026-03-07T12:10:00.000Z'));

    act(() => {
      result.current.addSearchFromResult(createResponse('ephemeral'));
      result.current.addSearchFromResult(createResponse('Serendipity'));
    });

    expect(result.current.history.map((entry) => entry.word)).toEqual(['Serendipity', 'ephemeral']);
    expect(result.current.history[0]?.queriedAt).toBe('2026-03-07T12:10:00.000Z');
    expect(result.current.history[0]?.result.word).toBe('Serendipity');
  });

  it('keeps all history entries instead of truncating', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      for (let index = 0; index < 12; index += 1) {
        result.current.addSearchFromResult(createResponse(`word-${index}`));
      }
    });

    expect(result.current.history).toHaveLength(12);
  });

  it('supports removing a single entry and clearing all history', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.addSearchFromResult(createResponse('alpha'));
      result.current.addSearchFromResult(createResponse('beta'));
    });

    act(() => {
      result.current.removeSearch('alpha');
    });

    expect(result.current.history.map((entry) => entry.word)).toEqual(['beta']);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

function createStorageMock(): Storage {
  let store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store = new Map<string, string>();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}
