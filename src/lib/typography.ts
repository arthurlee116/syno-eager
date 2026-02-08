/**
 * Calculates a dynamic font size based on word length to prevent overflow on mobile.
 * Optimized for a ~375px viewport (approx 21rem/340px usable width).
 */
export function getDynamicFontSize(word: string, isMobile: boolean) {
    if (!isMobile) return undefined;

    const length = word.length;
    // text-7xl is 4.5rem. We use this for short words.
    if (length <= 8) return '4.5rem';

    // For longer words, we want to ensure word_width < viewport_width.
    // Assuming average character width is 0.55 * fontSize.
    // We want: length * fontSize * 0.55 <= 21rem (the usable width on a 375px device)
    // fontSize <= 21 / (length * 0.55) = 38 / length
    const calculatedSize = 38 / length;

    // Cap at 4.5rem max and 1.25rem minimum (to keep it a "header")
    const finalSize = Math.min(4.5, Math.max(1.25, calculatedSize));

    return `${finalSize.toFixed(2)}rem`;
}

/**
 * Similar scaling for definitions to ensure long technical words don't break layout.
 */
export function getDefinitionFontSize(text: string, isMobile: boolean) {
    if (!isMobile) return undefined;

    // text-2xl is 1.5rem. Usable width is ~21rem.
    // We check for the longest word in the definition.
    const words = text.split(/\s+/);
    const longestWordLength = Math.max(...words.map(w => w.length));

    if (longestWordLength <= 12) return '1.5rem';

    // fontSize <= 21 / (longestWordLength * 0.55) = 38 / longestWordLength
    const calculatedSize = 38 / longestWordLength;

    // Cap at 1.5rem max and 1rem minimum.
    const finalSize = Math.min(1.5, Math.max(1, calculatedSize));

    return `${finalSize.toFixed(2)}rem`;
}
