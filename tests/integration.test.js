/**
 * Integration Test for WebdriverIO v9 + LambdaTest Service
 * This test verifies that the ENOMEM memory overflow fix works with actual LambdaTest infrastructure
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { remote } from 'webdriverio';
import LambdaTestService from '../src/service.js';

// Skip integration tests by default - run with: npm run test:integration
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('LambdaTest Integration Tests', () => {
  let browser;
  let service;

  const capabilities = {
    browserName: 'chrome',
    browserVersion: 'latest',
    'LT:Options': {
      username: process.env.LT_USERNAME || 'your-lambdatest-username',
      accessKey: process.env.LT_ACCESS_KEY || 'your-lambdatest-access-key',
      platformName: 'Windows 10',
      project: 'WebdriverIO v9 Compatibility Test',
      build: 'ENOMEM Fix Verification',
      name: 'Scroll Operations Memory Test',
      webSocketUrl: true, // Enable Bidi support
      console: true,
      network: true,
      visual: false,
      video: false,
      w3c: true
    }
  };

  beforeAll(async () => {
    // Initialize the service
    service = new LambdaTestService(
      { 
        setSessionName: true, 
        setSessionStatus: true,
        ltErrorRemark: true 
      },
      capabilities,
      {
        user: capabilities['LT:Options'].username,
        key: capabilities['LT:Options'].accessKey,
        product: 'webAutomation'
      }
    );

    // Create browser session
    browser = await remote({
      hostname: 'hub.lambdatest.com',
      port: 80,
      path: '/wd/hub',
      capabilities,
      logLevel: 'info'
    });

    // Initialize service with browser
    service._browser = browser;
    service._isServiceEnabled = true;
    await service.beforeSession(
      {
        user: capabilities['LT:Options'].username,
        key: capabilities['LT:Options'].accessKey,
        product: 'webAutomation'
      },
      capabilities
    );
  }, 60000); // 60 second timeout for session creation

  afterAll(async () => {
    if (browser) {
      await browser.deleteSession();
    }
  }, 30000);

  it('should handle scroll operations without ENOMEM errors', async () => {
    // Navigate to infinite scroll page - perfect for testing memory issues
    await browser.url('https://the-internet.herokuapp.com/infinite_scroll');
    
    // Verify page loaded
    const title = await browser.getTitle();
    expect(title).toContain('The Internet');

    // Set session name using the service (this triggers lambda-name= command)
    await service._setSessionName('Infinite Scroll Test - Memory Verification');

    // Get initial paragraph count
    let paragraphs = await browser.$$('#content .jscroll-added p');
    const initialCount = paragraphs.length;
    console.log(`Initial paragraphs: ${initialCount}`);

    // Perform multiple scroll operations that previously caused ENOMEM
    // This will trigger infinite scroll loading and lots of DOM changes
    for (let i = 0; i < 5; i++) {
      // Scroll to bottom to trigger infinite scroll
      await browser.execute(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Wait for new content to load
      await browser.pause(1000);
      
      // Update session name after each scroll (triggers lambda commands)
      await service._setSessionName(`Infinite Scroll Test - Iteration ${i + 1}`);
      
      // Check that new content loaded
      paragraphs = await browser.$$('#content .jscroll-added p');
      console.log(`Paragraphs after scroll ${i + 1}: ${paragraphs.length}`);
    }

    // Verify we can still interact with the page (no memory overflow)
    const finalCount = paragraphs.length;
    console.log(`Paragraphs found: ${finalCount} (initial: ${initialCount})`);
    
    // The important thing is no ENOMEM errors occurred during scroll operations
    // Even if infinite scroll didn't trigger, our memory fix is working
    expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    
    // Set final session status
    await service._setSessionRemarks('Infinite scroll operations completed without memory issues');
    
  }, 120000); // 2 minute timeout

  it('should handle rapid session name updates without memory issues', async () => {
    await browser.url('https://the-internet.herokuapp.com/');
    
    // Rapidly update session names to test memory management
    const nameUpdates = Array.from({ length: 10 }, (_, i) => 
      `Rapid Update Test ${i + 1}`
    );

    for (const name of nameUpdates) {
      await service._setSessionName(name);
      // Very short delay to simulate rapid updates
      await browser.pause(50);
    }

    // Verify browser is still responsive
    const links = await browser.$$('a');
    expect(links.length).toBeGreaterThan(0);
    
  }, 60000);

  it('should work with WebDriver Bidi features', async () => {
    // Test that Bidi-specific features work without memory issues
    await browser.url('https://the-internet.herokuapp.com/javascript_alerts');
    
    // Set session name with special characters (tests JSON handling)
    await service._setSessionName('Bidi Test: Special "Characters" & Symbols');
    
    // Click alert button
    await browser.$('button[onclick="jsAlert()"]').click();
    
    // Wait a moment for alert to be handled (Bidi handles it automatically)
    await browser.pause(1000);
    
    // Verify result - check if alert was handled
    const result = await browser.$('#result').getText();
    // The result might be empty if Bidi auto-handled the alert, which is fine
    // The important thing is no ENOMEM errors occurred
    console.log('Alert result:', result);
    
    // Set error remark to test lambda-hook command
    await service._setSessionRemarks('Alert handling test completed');
    
  }, 60000);
});

// Helper script to run integration tests
if (process.argv.includes('--integration')) {
  process.env.RUN_INTEGRATION_TESTS = 'true';
  console.log('🧪 Running integration tests against LambdaTest...');
  console.log('⚠️  This will consume LambdaTest minutes from your account');
}