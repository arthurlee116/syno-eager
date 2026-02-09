import { renderHook, waitFor } from '@testing-library/react';
import { useSynonymFetch } from './useSynonymFetch';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import React from 'react';

vi.mock('axios');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockData = {
  word: 'test',
  phonetics: ['/test/'],
  items: [
    {
      partOfSpeech: 'noun',
      meanings: [
        {
          definition: 'a test',
          example: { en: 'This is a test.' },
          synonyms: [],
        },
      ],
    },
  ],
};

describe('useSynonymFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
  });

  it('fetches data from API when cache is empty', async () => {
    (axios.get as Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useSynonymFetch('test'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('uses cached data from localStorage if available', async () => {
    const cacheKey = 'syno_cache_cachedword';
    const cachedData = { ...mockData, word: 'cachedword' };
    localStorage.setItem(cacheKey, JSON.stringify(cachedData));

    const { result } = renderHook(() => useSynonymFetch('cachedword'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(cachedData);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('saves data to localStorage after successful fetch', async () => {
    (axios.get as Mock).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useSynonymFetch('test'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = localStorage.getItem('syno_cache_test');
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!)).toEqual(mockData);
  });
});
