import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ApiDocsView } from '@/components/ApiDocsView';

describe('ApiDocsView', () => {
  it('renders markdown content with styled code blocks', () => {
    render(<ApiDocsView />);
    expect(screen.getByText('Syno-Eager API')).toBeInTheDocument();
    expect(screen.getAllByText('BASH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('https://synoyes.vercel.app').length).toBeGreaterThan(0);
  });

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
    expect(copiedText).toContain('https://synoyes.vercel.app/api/lookup?word=bright');

    expect(screen.getByRole('button', { name: /copy as markdown/i })).toHaveTextContent('Copied');
  });
});
