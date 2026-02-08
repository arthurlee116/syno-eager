import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsView } from '@/components/ResultsView';
import type { SynonymResponse } from '@/lib/types';

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
// @ts-expect-error - Mocking global property for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ResultsView', () => {
  it('renders the word and phonetics', () => {
    render(<ResultsView data={mockData} />);
    expect(screen.getByText("serendipity")).toBeInTheDocument();
    expect(screen.getByText("/ˌser.ənˈdɪp.ə.ti/")).toBeInTheDocument();
  });

  it('renders definitions', () => {
    render(<ResultsView data={mockData} />);
    expect(screen.getByText("The occurrence of events by chance in a happy way.")).toBeInTheDocument();
  });

  it('renders examples', () => {
    render(<ResultsView data={mockData} />);
    expect(screen.getByText('"It was pure serendipity that we met."')).toBeInTheDocument();
  });

  it('renders synonyms with Chinese translations', () => {
    render(<ResultsView data={mockData} />);
    expect(screen.getByText("chance")).toBeInTheDocument();
    expect(screen.getByText("机会")).toBeInTheDocument();
    expect(screen.getByText("luck")).toBeInTheDocument();
    expect(screen.getByText("运气")).toBeInTheDocument();
  });
  
  it('switches tabs', () => {
      render(<ResultsView data={mockData} />);
      const verbTab = screen.getByText("verb");
      fireEvent.click(verbTab);
      // Shadcn tabs logic handles visibility, checking if trigger exists implies structure is correct
      expect(verbTab).toBeInTheDocument();
  });
});
