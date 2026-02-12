// CJK characters occupy roughly double the width of Latin characters.
const CJK_RANGE = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F]/;

function estimateWordWidth(word: string): number {
    let width = 0;
    for (const ch of word) {
        width += CJK_RANGE.test(ch) ? 1.0 : 0.55;
    }
    return width;
}

/**
 * Calculates a dynamic font size based on word length to prevent overflow on mobile.
 * Optimized for a ~375px viewport (approx 21rem/340px usable width).
 */
export function getDynamicFontSize(word: string, isMobile: boolean) {
    if (!isMobile) return undefined;

    const effectiveWidth = estimateWordWidth(word);
    // text-7xl is 4.5rem. Use this for short words.
    if (effectiveWidth <= 8 * 0.55) return '4.5rem';

    // We want: effectiveWidth * fontSize <= 21rem (the usable width on a 375px device)
    const calculatedSize = 21 / effectiveWidth;

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
    // Find the widest single word in the definition.
    const words = text.split(/\s+/);
    const maxWordWidth = Math.max(...words.map(w => estimateWordWidth(w)));

    if (maxWordWidth <= 12 * 0.55) return '1.5rem';

    const calculatedSize = 21 / maxWordWidth;

    // Cap at 1.5rem max and 1rem minimum.
    const finalSize = Math.min(1.5, Math.max(1, calculatedSize));

    return `${finalSize.toFixed(2)}rem`;
}
