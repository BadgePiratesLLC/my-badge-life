import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage should look consistent', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of full page
    await expect(page).toHaveScreenshot('homepage-full.png', { 
      fullPage: true,
      threshold: 0.2 // Allow 20% difference for minor changes
    });
  });

  test('admin page should look consistent', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('admin-page.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('mobile homepage should look consistent', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('dark mode should render correctly', async ({ page }) => {
    await page.goto('/');
    
    // Toggle dark mode if available
    const darkModeToggle = page.locator('[data-testid="theme-toggle"]').or(
      page.getByRole('button', { name: /dark|theme/i })
    );
    
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      await page.waitForTimeout(500); // Wait for theme transition
      
      await expect(page).toHaveScreenshot('homepage-dark.png', {
        fullPage: true,
        threshold: 0.2
      });
    }
  });

  test('form components should render consistently', async ({ page }) => {
    await page.goto('/');
    
    // Look for any forms or modals
    const uploadArea = page.locator('[data-testid*="upload"]').or(
      page.getByText('Upload').locator('..').first()
    );
    
    if (await uploadArea.isVisible()) {
      await expect(uploadArea).toHaveScreenshot('upload-component.png', {
        threshold: 0.2
      });
    }
  });
});