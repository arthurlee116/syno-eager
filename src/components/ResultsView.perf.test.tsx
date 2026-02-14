import { render } from '@testing-library/react';
import { ResultsView } from '@/components/ResultsView';
import type { SynonymResponse } from '@/lib/synonymSchema';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, afterEach } from 'vitest';
import * as useConnotationFetchModule from '@/hooks/useConnotationFetch';

// Spy on useConnotationFetch
const useConnotationFetchSpy = vi.spyOn(useConnotationFetchModule, 'useConnotationFetch');

// Use vi.hoisted to ensure the variable is available in the mock factory
const { mockValues } = vi.hoisted(() => ({ mockValues: { isMobile: false } }));

vi.mock('@/hooks/useMobile', () => ({
  useMobile: () => mockValues.isMobile
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockData: SynonymResponse = {
  word: "test",
  phonetics: [],
  items: [
    {
      partOfSpeech: "noun",
      meanings: [
        {
          definition: "A definition.",
          example: { en: "An example." },
          synonyms: [
            { en: "syn1", zh: "zh1" },
            { en: "syn2", zh: "zh2" }
          ]
        }
      ]
    }
  ]
};

describe('ResultsView Performance', () => {
  afterEach(() => {
    useConnotationFetchSpy.mockClear();
    mockValues.isMobile = false;
  });

  it('ConnotationHovercard should not re-render when parent re-renders if props are stable', () => {
    const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
          },
        },
      });

    const { rerender } = render(<QueryClientProvider client={queryClient}><ResultsView data={mockData} /></QueryClientProvider>);

    // Initial render
    // 2 synonyms -> useConnotationFetch called 2 times
    expect(useConnotationFetchSpy).toHaveBeenCalledTimes(2);

    useConnotationFetchSpy.mockClear();

    // Change mobile state and rerender
    mockValues.isMobile = true;

    // Rerender with SAME query client to ensure context doesn't change
    rerender(<QueryClientProvider client={queryClient}><ResultsView data={mockData} /></QueryClientProvider>);

    // With optimization applied, we expect 0.
    expect(useConnotationFetchSpy).toHaveBeenCalledTimes(0);
  });
});
