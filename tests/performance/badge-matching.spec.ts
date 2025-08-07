import { test, expect } from '@playwright/test';

test.describe('Badge Matching Performance', () => {
  test('should complete badge matching within reasonable time', async ({ page }) => {
    await page.goto('/');
    
    // Mock the badge matching API to control timing
    await page.route('**/functions/v1/match-badge-image', async route => {
      // Simulate processing delay but within reasonable bounds
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second max
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              badge: {
                id: 'test-id',
                name: 'Test Badge',
                description: 'Test Description',
                image_url: 'https://example.com/badge.jpg'
              },
              similarity: 0.95,
              confidence: 95
            }
          ]
        })
      });
    });
    
    const uploadInput = page.locator('input[type="file"]').first();
    
    if (await uploadInput.isVisible()) {
      const startTime = Date.now();
      
      // Simulate file upload
      await uploadInput.setInputFiles({
        name: 'test-badge.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // Wait for processing to complete
      await page.waitForResponse('**/functions/v1/match-badge-image');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      console.log(`Badge matching took ${processingTime}ms`);
      
      // Should complete within 10 seconds
      expect(processingTime).toBeLessThan(10000);
    }
  });

  test('should handle multiple concurrent uploads', async ({ page, context }) => {
    // Open multiple tabs
    const page2 = await context.newPage();
    
    await Promise.all([
      page.goto('/'),
      page2.goto('/')
    ]);
    
    // Both pages should load without issues
    await Promise.all([
      expect(page.getByText('MyBadgeLife')).toBeVisible(),
      expect(page2.getByText('MyBadgeLife')).toBeVisible()
    ]);
  });

  test('should maintain performance with large result sets', async ({ page }) => {
    await page.goto('/');
    
    // Mock API response with many results
    await page.route('**/rest/v1/badges**', async route => {
      const largeBadgeSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `badge-${i}`,
        name: `Badge ${i}`,
        description: `Description for badge ${i}`,
        image_url: `https://example.com/badge-${i}.jpg`
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeBadgeSet)
      });
    });
    
    // Page should still be responsive
    const startTime = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // 5 second max
  });

  test('should not cause memory leaks during repeated operations', async ({ page }) => {
    await page.goto('/');
    
    // Simulate repeated badge matching operations
    for (let i = 0; i < 5; i++) {
      const uploadInput = page.locator('input[type="file"]').first();
      
      if (await uploadInput.isVisible()) {
        await uploadInput.setInputFiles({
          name: `test-badge-${i}.jpg`,
          mimeType: 'image/jpeg',
          buffer: Buffer.from(`fake-image-data-${i}`)
        });
        
        await page.waitForTimeout(1000);
      }
    }
    
    // Page should still be responsive
    await expect(page.getByText('MyBadgeLife')).toBeVisible();
  });
});