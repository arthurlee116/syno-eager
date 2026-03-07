import { render, fireEvent, act } from '@testing-library/react';
import React, { useState } from 'react';
import { expect, test, vi, describe, beforeEach } from 'vitest';

const mockData = {
  word: "test",
  phonetics: [],
  items: [{
      partOfSpeech: "noun",
      meanings: [{ definition: "A test", synonyms: [], example: "" }]
  }]
};

let renderCount = 0;
vi.mock('@/components/ui/tabs', async (importOriginal) => {
    const mod = await importOriginal();
    return {
        ...mod,
        Tabs: (props) => {
            renderCount++;
            return <mod.Tabs {...props} />;
        }
    }
})

import { ResultsView } from './ResultsView';

const ParentWrapper = () => {
    const [, setCount] = useState(0);
    return (
        <div>
            <button onClick={() => setCount(c => c + 1)}>Update State</button>
            <ResultsView data={mockData} />
        </div>
    );
};

describe('ResultsView Performance', () => {
    beforeEach(() => {
        renderCount = 0;
    });

    test('re-renders when parent state changes', async () => {
        const { getByText } = render(<ParentWrapper />);
        expect(renderCount).toBe(1);

        await act(async () => {
            fireEvent.click(getByText('Update State'));
        });

        expect(renderCount).toBe(1); // Will fail until memoized
    });
});
