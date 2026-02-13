function hasWideChars(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) return true;
  }
  return false;
}

function estimateWidth(word: string): number {
  if (hasWideChars(word)) return word.length * 1.2;
  return word.length * 0.55;
}

export function getDynamicFontSize(word: string, isMobile: boolean) {
  if (!isMobile) return undefined;

  const effectiveWidth = estimateWidth(word);
  if (effectiveWidth <= 8 * 0.55) return '4.5rem';

  const calculatedSize = 21 / effectiveWidth;
  const finalSize = Math.min(4.5, Math.max(1.25, calculatedSize));

  return `${finalSize.toFixed(2)}rem`;
}

export function getDefinitionFontSize(text: string, isMobile: boolean) {
  if (!isMobile) return undefined;

  const words = text.split(/\s+/);
  const maxWordWidth = Math.max(...words.map(w => estimateWidth(w)));

  if (maxWordWidth <= 12 * 0.55) return '1.5rem';

  const calculatedSize = 21 / maxWordWidth;
  const finalSize = Math.min(1.5, Math.max(1, calculatedSize));

  return `${finalSize.toFixed(2)}rem`;
}
