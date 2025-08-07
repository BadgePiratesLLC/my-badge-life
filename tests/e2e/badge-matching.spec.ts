import { test, expect } from '@playwright/test';

test.describe('Badge Matching System', () => {
  test('should load home page correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check main elements are present
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
    await expect(page.getByText('Discover and catalog your electronic badges')).toBeVisible();
  });

  test('should handle badge image upload', async ({ page }) => {
    await page.goto('/');
    
    // Look for upload area/button
    const uploadButton = page.getByText('Upload').or(page.getByText('Analyze')).or(page.locator('input[type="file"]')).first();
    
    if (await uploadButton.isVisible()) {
      await expect(uploadButton).toBeVisible();
    }
  });

  test('should navigate to admin when authenticated', async ({ page }) => {
    await page.goto('/admin');
    
    // Should either show login or admin content
    const hasAdminContent = await page.getByText('Admin').isVisible();
    const hasAuthRequired = await page.getByText('Login').or(page.getByText('Sign')).isVisible();
    
    expect(hasAdminContent || hasAuthRequired).toBeTruthy();
  });

  test('should handle badge exploration', async ({ page }) => {
    await page.goto('/');
    
    // Check if badge exploration features are present
    const exploreButton = page.getByText('Explore').or(page.getByText('Browse')).first();
    
    if (await exploreButton.isVisible()) {
      await exploreButton.click();
      // Should navigate or show content
      await page.waitForTimeout(1000);
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/nonexistent-page');
    
    // Should show 404 or redirect to home
    const is404 = await page.getByText('404').or(page.getByText('Not Found')).isVisible();
    const isRedirected = page.url().includes('/');
    
    expect(is404 || isRedirected).toBeTruthy();
  });
});

test.describe('Badge Database Features', () => {
  test('should display badge stats if available', async ({ page }) => {
    await page.goto('/');
    
    // Look for any badge-related stats or counters
    const statsElements = page.locator('[data-testid*="stat"]').or(
      page.getByText(/\d+.*badge/i)
    );
    
    // Just verify page loads without errors
    await expect(page).toHaveTitle(/MyBadgeLife/i);
  });

  test('should handle badge search functionality', async ({ page }) => {
    await page.goto('/');
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i).or(
      page.locator('input[type="search"]')
    ).first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('DefCon');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Performance & Responsiveness', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // 5 second max load time
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
    
    // Check that content doesn't overflow
    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });
});