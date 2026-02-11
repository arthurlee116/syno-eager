import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebMCPTools } from './WebMCPTools';

function setModelContext(value: unknown) {
  Object.defineProperty(navigator, 'modelContext', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('WebMCPTools', () => {
  it('does not throw when navigator.modelContext is unavailable', () => {
    setModelContext(undefined);
    expect(() => render(<WebMCPTools />)).not.toThrow();
  });

  it('registers lookup tools when navigator.modelContext.registerTool exists', async () => {
    const registerTool = vi.fn(() => ({ unregister: vi.fn() }));
    setModelContext({ registerTool });

    render(<WebMCPTools />);

    // useEffect runs after render; wait a tick
    await Promise.resolve();

    const calls = registerTool.mock.calls as unknown as Array<[unknown]>;
    const names = calls.map((c) => (c[0] as any)?.name);
    expect(names).toContain('lookup_synonyms');
    expect(names).toContain('lookup_connotation');
  });
});
