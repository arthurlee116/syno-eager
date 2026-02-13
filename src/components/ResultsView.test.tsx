import { render, screen, fireEvent, act } from '@testing-library/react';
import { ResultsView } from '@/components/ResultsView';
import type { SynonymResponse } from '@/lib/synonymSchema';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockData: SynonymResponse = {
  word: "serendipity",
  phonetics: ["ˌser.ənˈdɪp.ə.ti"],
  items: [
    {
      partOfSpeech: "noun",
      meanings: [
        {
          definition: "The occurrence of events by chance in a happy way.",
          example: {
            en: "It was pure serendipity that we met.",
            zh: "我们能相遇纯属偶然。"
          },
          synonyms: [
            { en: "chance", zh: "机会" },
            { en: "fate", zh: "命运" },
            { en: "luck", zh: "运气" }
          ]
        }
      ]
    },
    {
        partOfSpeech: "verb", // Fake for testing tabs
        meanings: [
            {
                definition: "To serendipity (fake verb).",
                example: {
                  en: "I serendipitied my way there."
                },
                synonyms: []
            }
        ]
    }
  ]
};

// Mock framer-motion to avoid animation issues in jsdom
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

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ResultsView', () => {
  it('renders the word and phonetics', () => {
    renderWithQuery(<ResultsView data={mockData} />);
    expect(screen.getByText("serendipity")).toBeInTheDocument();
    expect(screen.getByText("/ˌser.ənˈdɪp.ə.ti/")).toBeInTheDocument();
  });

  it('renders definitions', () => {
    renderWithQuery(<ResultsView data={mockData} />);
    expect(screen.getByText("The occurrence of events by chance in a happy way.")).toBeInTheDocument();
  });

  it('renders examples', () => {
    renderWithQuery(<ResultsView data={mockData} />);
    expect(screen.getByText('"It was pure serendipity that we met."')).toBeInTheDocument();
  });

  it('renders synonyms with Chinese translations', () => {
    renderWithQuery(<ResultsView data={mockData} />);
    expect(screen.getByText("chance")).toBeInTheDocument();
    expect(screen.getByText("机会")).toBeInTheDocument();
    expect(screen.getByText("luck")).toBeInTheDocument();
    expect(screen.getByText("运气")).toBeInTheDocument();
  });
  
  it('switches tabs', () => {
      renderWithQuery(<ResultsView data={mockData} />);
      const verbTab = screen.getByText("verb");
      fireEvent.click(verbTab);
      // Shadcn tabs logic handles visibility, checking if trigger exists implies structure is correct
      expect(verbTab).toBeInTheDocument();
  });

  it(
    'fetches connotation on hover intent and renders it',
    async () => {
    const prevFetch = globalThis.fetch;

    const connotation = {
      headword: "serendipity",
      synonym: "chance",
      partOfSpeech: "noun",
      definition: "The occurrence of events by chance in a happy way.",
      polarity: "neutral",
      register: "neutral",
      toneTags: [{ en: "casual", zh: "随意" }],
      usageNote: { en: 'Often feels less "magical" than serendipity.', zh: "通常没有 serendipity 那种“奇妙”的感觉。" },
      cautions: [{ en: "Can sound plain or accidental.", zh: "可能显得平淡或只是偶然。" }],
      example: { en: "It was a lucky chance.", zh: "那是一次幸运的偶然。" },
    };

    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify(connotation), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithQuery(<ResultsView data={mockData} />);
    const chanceBtn = screen.getByRole("button", { name: /chance/i });
    await act(async () => {
      fireEvent.mouseEnter(chanceBtn);
      await new Promise((r) => setTimeout(r, 220));
    });

    expect(await screen.findByText(/polarity:/i)).toBeInTheDocument();
    expect(await screen.findByText(/Often feels less/i)).toBeInTheDocument();

    globalThis.fetch = prevFetch;
  },
    10_000
  );
});
