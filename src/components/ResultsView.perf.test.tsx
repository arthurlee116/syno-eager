import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { ResultsView } from './ResultsView';
import type { SynonymResponse } from '@/lib/types';

const mockData: SynonymResponse = {
  word: 'test',
  phonetics: ['tɛst'],
  items: [
    {
      partOfSpeech: 'noun',
      meanings: [
        {
          definition: 'A procedure intended to establish the quality, performance, or reliability of something.',
          synonyms: ['trial', 'experiment'],
        }
      ]
    }
  ]
};

// We will track how many times TabsList (a child of ResultsView) renders
// to verify ResultsView memoization.
let tabsListRenderCount = 0;

vi.mock('@/components/ui/tabs', async () => {
  const actual = await vi.importActual('@/components/ui/tabs');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TabsList: (props: any) => {
      tabsListRenderCount++;
      return <actual.TabsList {...props} />;
    }
  };
});

describe('ResultsView Performance', () => {
  it('does not re-render when parent state changes but data prop remains identical', () => {

    function TestWrapper() {
      const [count, setCount] = useState(0);

      return (
        <div>
          <button data-testid="increment-btn" onClick={() => setCount(c => c + 1)}>Increment</button>
          <span data-testid="count">{count}</span>
          <ResultsView data={mockData} />
        </div>
      );
    }

    render(<TestWrapper />);
    expect(tabsListRenderCount).toBe(1); // Rendered once initially

    // Trigger re-render of parent
    fireEvent.click(screen.getByTestId('increment-btn'));

    // Parent should re-render
    expect(screen.getByTestId('count').textContent).toBe('1');

    // ResultsView should NOT re-render (tabsListRenderCount should still be 1)
    expect(tabsListRenderCount).toBe(1);

    // Cleanup
    vi.restoreAllMocks();
  });
});
