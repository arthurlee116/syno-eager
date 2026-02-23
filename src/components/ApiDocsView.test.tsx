import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ApiDocsView } from '@/components/ApiDocsView';

describe('ApiDocsView', () => {
  it('copies full markdown when clicking the copy button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<ApiDocsView />);
    fireEvent.click(screen.getByRole('button', { name: /copy as markdown/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain('# Syno-Eager API');
    expect(copiedText).toContain('GET /api/lookup?word={word}');

    expect(screen.getByRole('button', { name: /copy as markdown/i })).toHaveTextContent('Copied');
  });
});
