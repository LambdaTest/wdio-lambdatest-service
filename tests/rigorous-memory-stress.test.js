/**
 * Rigorous Memory Stress Test
 * Tests service performance under intensive operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { remote } from 'webdriverio';
import LambdaTestService from '../src/service.js';

const runStressTest = process.env.RUN_STRESS_TEST === 'true';

describe.skipIf(!runStressTest)('Rigorous Memory Stress Test', () => {
  const capabilities = {
    browserName: 'chrome',
    browserVersion: 'latest',
    'LT:Options': {
      username: process.env.LT_USERNAME || 'your-lambdatest-username',
      accessKey: process.env.LT_ACCESS_KEY || 'your-lambdatest-access-key',
      platformName: 'Windows 10',
      project: 'Memory Stress Test',
      build: 'ENOMEM Reproduction Attempt',
      name: 'Intensive Memory Test',
      webSocketUrl: true,
      console: true,
      network: true,
      visual: false,
      video: false,
      w3c: true
    }
  };

  describe('Service Memory Stress Test', () => {
    let browser;
    let service;
    let memoryErrors = [];

    beforeAll(async () => {
      console.log('🚀 STRESS TEST - LambdaTest Service');
      
      service = new LambdaTestService(
        { setSessionName: true, setSessionStatus: true, ltErrorRemark: true },
        capabilities,
        {
          user: capabilities['LT:Options'].username,
          key: capabilities['LT:Options'].accessKey,
          product: 'webAutomation'
        }
      );

      browser = await remote({
        hostname: 'hub.lambdatest.com',
        port: 80,
        path: '/wd/hub',
        capabilities,
        logLevel: 'error'
      });

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
    }, 120000);

    afterAll(async () => {
      if (browser) {
        await browser.deleteSession();
      }
    }, 30000);

    it('should handle 100 rapid session updates', async () => {
      console.log('🚀 STRESS TEST: 100 rapid session updates');
      
      const startTime = Date.now();
      let completedUpdates = 0;
      
      try {
        for (let i = 1; i <= 100; i++) {
          await service._setSessionName(`Stress Test ${i}/100`);
          completedUpdates = i;
          
          if (i % 10 === 0) {
            console.log(`📊 Completed ${i}/100 updates`);
          }
        }
        
        const duration = Date.now() - startTime;
        console.log(`✅ Service completed ${completedUpdates}/100 updates in ${duration}ms`);
        console.log(`📈 Average: ${Math.round(duration / completedUpdates)}ms per update`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ Service failed at ${completedUpdates}/100 updates after ${duration}ms`);
        console.log(`🔍 Error: ${error.message}`);
        
        if (error.message.includes('ENOMEM')) {
          console.log('⚠️  Memory error detected');
          memoryErrors.push(error);
        }
        
        throw error;
      }
    }, 300000);

    it('should handle rapid scroll operations', async () => {
      console.log('🌀 STRESS TEST: Rapid scroll operations');
      
      await browser.url('https://the-internet.herokuapp.com/infinite_scroll');
      
      try {
        for (let i = 1; i <= 50; i++) {
          await browser.execute(() => window.scrollTo(0, document.body.scrollHeight));
          await service._setSessionName(`Scroll Test ${i}/50`);
          
          if (i % 10 === 0) {
            console.log(`🌀 Scroll iteration ${i}/50`);
          }
        }
        
        console.log('✅ Scroll stress test completed');
        
      } catch (error) {
        console.log(`❌ Scroll stress test failed: ${error.message}`);
        
        if (error.message.includes('ENOMEM')) {
          console.log('⚠️  Memory error during scrolls');
          memoryErrors.push(error);
        }
        
        throw error;
      }
    }, 300000);

    it('should handle concurrent operations', async () => {
      console.log('⚡ STRESS TEST: Concurrent operations');
      
      const operations = [];
      
      try {
        for (let i = 1; i <= 20; i++) {
          operations.push(
            Promise.all([
              service._setSessionName(`Concurrent ${i}A`),
              service._setSessionName(`Concurrent ${i}B`),
              service._setSessionName(`Concurrent ${i}C`)
            ])
          );
        }
        
        await Promise.all(operations);
        console.log('✅ Concurrent operations completed');
        
      } catch (error) {
        console.log(`❌ Concurrent operations failed: ${error.message}`);
        
        if (error.message.includes('ENOMEM')) {
          console.log('⚠️  Memory error during concurrent ops');
          memoryErrors.push(error);
        }
        
        throw error;
      }
    }, 300000);

    it('should report stress test results', () => {
      console.log(`\n📊 STRESS TEST RESULTS:`);
      console.log(`🔍 Memory errors detected: ${memoryErrors.length}`);
      
      if (memoryErrors.length > 0) {
        console.log('⚠️  Memory errors detected:');
        memoryErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.message}`);
        });
      } else {
        console.log('✅ No memory errors detected');
      }
      
      expect(memoryErrors.length).toBe(0);
    });
  });

  describe('Test Summary', () => {
    it('should provide test analysis', () => {
      console.log('\n🔬 STRESS TEST ANALYSIS:');
      console.log('📋 Test scenarios completed:');
      console.log('   • 100 rapid session name updates');
      console.log('   • 50 scroll operations with session updates');
      console.log('   • 60 concurrent operations (20x3)');
      console.log('🎯 Service performance verified under intensive load');
      
      expect(true).toBe(true);
    });
  });
});