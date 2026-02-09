import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('base', 'extra')).toBe('base extra');
  });

  it('handles conditional classes correctly', () => {
    expect(cn('base', true && 'is-true', false && 'is-false')).toBe('base is-true');
  });

  it('handles object-based classes', () => {
    expect(cn('base', { 'is-active': true, 'is-disabled': false })).toBe('base is-active');
  });

  it('handles array-based classes', () => {
    expect(cn(['base', 'extra'])).toBe('base extra');
  });

  it('merges tailwind classes correctly (tailwind-merge)', () => {
    // tailwind-merge should resolve conflicts, e.g., p-4 and p-2
    // It should pick the last one.
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
  });

  it('handles edge cases like undefined, null, and empty strings', () => {
    expect(cn('base', undefined, null, '', 'extra')).toBe('base extra');
  });

  it('handles nested arrays and objects', () => {
    expect(cn('base', ['a', { b: true, c: false }, ['d', 'e']])).toBe('base a b d e');
  });
});
