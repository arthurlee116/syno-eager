import { describe, it, expect } from 'vitest';
import { getDynamicFontSize, getDefinitionFontSize } from './typography';

describe('typography', () => {
  describe('getDynamicFontSize', () => {
    it('returns max size for short words', () => {
      expect(getDynamicFontSize('short')).toBe('4.5rem');
      expect(getDynamicFontSize('12345678')).toBe('4.5rem');
    });

    it('scales down for long words', () => {
      // 38 / 10 = 3.8
      expect(getDynamicFontSize('1234567890')).toBe('3.80rem');
      // 38 / 19 = 2.0
      expect(getDynamicFontSize('1234567890123456789')).toBe('2.00rem');
    });

    it('caps at minimum size', () => {
      // 38 / 100 = 0.38 -> min 1.25
      const longWord = 'a'.repeat(100);
      expect(getDynamicFontSize(longWord)).toBe('1.25rem');
    });
  });

  describe('getDefinitionFontSize', () => {
    it('returns max size for short definitions (short words)', () => {
      expect(getDefinitionFontSize('This is a short definition')).toBe('1.5rem');
    });

    it('scales based on the longest word', () => {
      // longest word length 19 -> 38 / 19 = 2.0 -> clamped to max 1.5
      // Wait, max is 1.5. So if calculated is 2.0, it returns 1.5.
      // Let's try a word that forces it below 1.5.
      // 38 / x < 1.5 => x > 38/1.5 = 25.33
      const longWord = 'a'.repeat(30); // 30 chars
      // 38 / 30 = 1.266...
      expect(getDefinitionFontSize(`This has a ${longWord} inside`)).toBe('1.27rem');
    });

    it('caps at minimum size', () => {
      // 38 / 50 = 0.76 -> min 1.0
      const superLong = 'a'.repeat(50);
      expect(getDefinitionFontSize(superLong)).toBe('1.00rem');
    });
  });
});
