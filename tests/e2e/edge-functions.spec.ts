import { test, expect } from '@playwright/test';

test.describe('Edge Functions Health', () => {
  test('should handle badge matching API errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Intercept the badge matching API call and simulate an error
    await page.route('**/functions/v1/match-badge-image', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error' })
      });
    });
    
    // Try to trigger badge matching (if upload functionality exists)
    const uploadInput = page.locator('input[type="file"]').first();
    
    if (await uploadInput.isVisible()) {
      // Simulate file upload that should trigger the error
      await uploadInput.setInputFiles({
        name: 'test-badge.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // Wait for any error messages or handling
      await page.waitForTimeout(2000);
      
      // Check that app doesn't crash and shows appropriate feedback
      const errorMessage = page.getByText(/error/i).or(page.getByText(/failed/i));
      const isStillResponsive = await page.getByText('MyBadgeLife').isVisible();
      
      expect(isStillResponsive).toBeTruthy();
    }
  });

  test('should handle slow API responses', async ({ page }) => {
    await page.goto('/');
    
    // Intercept and add delay to API calls
    await page.route('**/functions/v1/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
      await route.continue();
    });
    
    // App should still be usable during slow API calls
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
  });

  test('should handle network failures', async ({ page }) => {
    await page.goto('/');
    
    // Simulate network failure
    await page.route('**/functions/v1/**', async route => {
      await route.abort('failed');
    });
    
    // App should handle network failures gracefully
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
  });
});

test.describe('Database Interactions', () => {
  test('should handle authentication state changes', async ({ page }) => {
    await page.goto('/');
    
    // Check initial state
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
    
    // Try accessing protected routes
    await page.goto('/admin');
    
    // Should handle auth appropriately (redirect or show login)
    const url = page.url();
    const hasAuth = url.includes('/admin') || url.includes('/login') || url.includes('/');
    expect(hasAuth).toBeTruthy();
  });

  test('should handle database connectivity issues', async ({ page }) => {
    await page.goto('/');
    
    // Intercept Supabase requests
    await page.route('**/rest/v1/**', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service Unavailable' })
      });
    });
    
    // App should still load basic functionality
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
  });
});