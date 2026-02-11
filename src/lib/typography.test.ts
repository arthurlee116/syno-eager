import { describe, expect, it } from 'vitest';
import { getDynamicFontSize, getDefinitionFontSize } from './typography';

describe('getDynamicFontSize', () => {
  it('returns undefined for non-mobile', () => {
    expect(getDynamicFontSize('hello', false)).toBeUndefined();
  });

  it('returns 4.5rem for short Latin words', () => {
    expect(getDynamicFontSize('cat', true)).toBe('4.5rem');
    expect(getDynamicFontSize('hello', true)).toBe('4.5rem');
  });

  it('scales down for long Latin words', () => {
    const size = getDynamicFontSize('internationalization', true);
    expect(size).toBeDefined();
    const num = parseFloat(size!);
    expect(num).toBeLessThan(4.5);
    expect(num).toBeGreaterThanOrEqual(1.25);
  });

  it('scales down more aggressively for CJK characters', () => {
    // CJK chars are roughly double width
    const latinSize = getDynamicFontSize('abcdefghijklmno', true);
    const cjkSize = getDynamicFontSize('同义词查询工具测试用例', true);
    // CJK should produce a smaller (or equal) font size for similar visual width
    expect(parseFloat(cjkSize!)).toBeLessThanOrEqual(parseFloat(latinSize!));
  });

  it('never goes below 1.25rem minimum', () => {
    const size = getDynamicFontSize('a'.repeat(100), true);
    expect(parseFloat(size!)).toBe(1.25);
  });
});

describe('getDefinitionFontSize', () => {
  it('returns undefined for non-mobile', () => {
    expect(getDefinitionFontSize('some definition', false)).toBeUndefined();
  });

  it('returns 1.5rem for short words', () => {
    expect(getDefinitionFontSize('a short text', true)).toBe('1.5rem');
  });

  it('scales down when a word is very long', () => {
    const size = getDefinitionFontSize('this has supercalifragilisticexpialidocious in it', true);
    expect(size).toBeDefined();
    const num = parseFloat(size!);
    expect(num).toBeLessThan(1.5);
    expect(num).toBeGreaterThanOrEqual(1);
  });

  it('never goes below 1rem minimum', () => {
    const size = getDefinitionFontSize('a'.repeat(200), true);
    expect(parseFloat(size!)).toBe(1);
  });

  it('handles CJK words in definitions', () => {
    const size = getDefinitionFontSize('定义测试中文字符串非常长的一个词语', true);
    expect(size).toBeDefined();
  });
});
