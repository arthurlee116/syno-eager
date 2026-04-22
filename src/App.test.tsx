import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import type { SynonymResponse } from '@/lib/synonymSchema';

const storage = createStorageMock();

vi.mock('@/hooks/usePlainTextCopy', () => ({
  usePlainTextCopy: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const Mock = ({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
    delete props.animate;
    delete props.exit;
    delete props.initial;
    delete props.layout;
    delete props.layoutId;
    delete props.transition;
    delete props.variants;

    return <div {...props}>{children}</div>;
  };

  return {
    motion: new Proxy(
      {},
      {
        get: () => Mock,
      },
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/components/ResultsView', () => ({
  ResultsView: ({ data }: { data: SynonymResponse }) => <div>Showing {data.word}</div>,
}));

const mockUseSynonymFetch = vi.fn();

vi.mock('@/hooks/useSynonymFetch', () => ({
  useSynonymFetch: (word: string | null) => mockUseSynonymFetch(word),
}));

const responseMap: Record<string, SynonymResponse> = {
  serendipity: {
    word: 'serendipity',
    items: [
      {
        partOfSpeech: 'noun',
        meanings: [{ definition: 'Happy accident', synonyms: [{ en: 'chance' }, { en: 'luck' }] }],
      },
    ],
  },
  luminous: {
    word: 'luminous',
    items: [
      {
        partOfSpeech: 'adjective',
        meanings: [{ definition: 'Giving off light', synonyms: [{ en: 'bright' }] }],
      },
    ],
  },
};

describe('App history sidebar', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    storage.clear();
    mockUseSynonymFetch.mockImplementation((word: string | null) => ({
      data: word ? responseMap[word] ?? null : null,
      isLoading: false,
      error: null,
    }));
  });

  afterEach(() => {
    mockUseSynonymFetch.mockReset();
  });

  it('opens the sidebar, navigates through history, and manages entries', async () => {
    localStorage.setItem(
      'syno_recent_searches',
      JSON.stringify([
        {
          word: 'serendipity',
          queriedAt: '2026-03-07T12:00:00.000Z',
          summary: '1 part of speech · 2 synonyms',
          result: responseMap.serendipity,
        },
        {
          word: 'luminous',
          queriedAt: '2026-03-07T11:00:00.000Z',
          summary: '1 part of speech · 1 synonym',
          result: responseMap.luminous,
        },
      ]),
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /history/i }));

    expect(screen.getByRole('dialog', { name: /all discoveries/i })).toBeInTheDocument();
    expect(screen.getByText('serendipity')).toBeInTheDocument();
    expect(screen.getByText('luminous')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove luminous from history/i }));
    expect(screen.queryByText('luminous')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('serendipity').closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByText('Showing serendipity')).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog', { name: /all discoveries/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

    expect(screen.getByText(/history will appear here/i)).toBeInTheDocument();
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
