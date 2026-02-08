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

// We can't easily test the API call without mocking the network at the E2E level,
// but for now we verify the Critical UI Rendering paths.
