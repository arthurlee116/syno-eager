import { test, expect } from '@playwright/test';

test('has title and initial state', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Syno-Eager/);
  
  // Expect search bar to be present
  await expect(page.getByPlaceholder('Type a word...')).toBeVisible();
});

test('shows error for empty search if enter pressed', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByPlaceholder('Type a word...');
    await searchInput.press('Enter');
    // Button should be disabled, so nothing happens.
    // We can verify button state
    await expect(page.getByRole('button', { name: /search/i })).toBeDisabled(); // Adjust name selector if needed based on icon
});

test('opens connotation hovercard and triggers on-demand request', async ({ page }) => {
  const lookupResponse = {
    word: "serendipity",
    phonetics: ["ˌser.ənˈdɪp.ə.ti"],
    items: [
      {
        partOfSpeech: "noun",
        meanings: [
          {
            definition: "The occurrence of events by chance in a happy way.",
            example: { en: "It was pure serendipity that we met.", zh: "我们能相遇纯属偶然。" },
            synonyms: [
              { en: "chance", zh: "机会" },
              { en: "luck", zh: "运气" },
            ],
          },
        ],
      },
    ],
  };

  const connotationResponse = {
    headword: "serendipity",
    synonym: "chance",
    partOfSpeech: "noun",
    definition: "The occurrence of events by chance in a happy way.",
    polarity: "neutral",
    register: "neutral",
    toneTags: [
      { en: "plain", zh: "平实" },
      { en: "accidental", zh: "偶然" },
    ],
    usageNote: {
      en: 'Good when you want to emphasize randomness, less "magical" than serendipity.',
      zh: "强调随机性时很好用，但没有 serendipity 那种“奇妙感”。",
    },
    cautions: [{ en: "May sound flat in poetic writing.", zh: "在诗性表达里可能显得平。" }],
    example: { en: "By chance, we met again.", zh: "我们又偶然遇见了。" },
  };

  await page.route("**/api/lookup?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(lookupResponse),
    });
  });

  await page.route("**/api/connotation?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(connotationResponse),
    });
  });

  await page.goto("/");

  await page.getByPlaceholder("Type a word...").fill("serendipity");
  await page.getByRole("button", { name: /search/i }).click();

  // Wait for results to render.
  await expect(page.getByRole("heading", { name: "serendipity" })).toBeVisible();

  const chanceBadge = page.getByRole("button", { name: /chance/i }).first();
  const reqPromise = page.waitForRequest((r) => r.url().includes("/api/connotation?"));
  await chanceBadge.hover();

  // Hover intent delay is 200ms.
  await reqPromise;

  await expect(page.getByText(/polarity:/i)).toBeVisible();
  await expect(page.getByText(/Good when you want to emphasize randomness/i)).toBeVisible();
});
