import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

import { performance, PerformanceObserver } from 'perf_hooks'
import logger from '@wdio/logger'
import LambdaTestTunnelLauncher from '@lambdatest/node-tunnel'
import { TUNNEL_START_FAILED, TUNNEL_STOP_FAILED, TUNNEL_STOP_TIMEOUT } from './constants.js'
import { updateBuildStatusForSession } from './util.js'
const log = logger('@wdio/lambdatest-service')
const colors = require('colors');

/**
 * LambdaTest launcher service for WebdriverIO that handles tunnel management and app uploads
 * @class LambdaTestLauncher
 */

export default class LambdaTestLauncher {
  lambdatestTunnelProcess;
  options;

  /**
   * Creates an instance of LambdaTestLauncher
   * @param {Object} options - Configuration options for the launcher
   * @param {boolean} [options.tunnel] - Whether to start LambdaTest tunnel
   * @param {boolean} [options.app_upload] - Whether to upload app before test execution
   * @param {Object} [options.app] - App configuration for upload
   * @param {string} [options.app.app_name] - Name of the app to upload
   * @param {string} [options.app.app_path] - Local path to the app file
   * @param {string} [options.app.app_url] - URL to the app file
   * @param {string} [options.app.custom_id] - Custom identifier for the app
   * @param {boolean} [options.app.enableCapability] - Whether to set app URL in capabilities
   * @param {Object} [options.lambdatestOpts] - Additional LambdaTest tunnel options
   */
  constructor(options) {
    this.options = options;
  }

  /**
   * Configures WebDriver capabilities with LambdaTest specific options
   * @param {Object|Array<Object>} capabilities - WebDriver capabilities object or array
   * @param {string} key - The capability key to set
   * @param {any} value - The value to set for the capability key
   * @private
   */
  configureCapabilities(capabilities, key, value) {
    const updateCapability = (capability) => {
      if (capability["lt:options"]) {
        capability["LT:Options"] = { ...capability["lt:options"] };
        delete capability["lt:options"];
      }
      if (capability["LT:Options"] === undefined) {
        capability[key] = value;
      } else {
        capability["LT:Options"][key] = value;
      }
    };

    if (Array.isArray(capabilities)) {
      capabilities.forEach(updateCapability);
    } else if (typeof capabilities === "object") {
      updateCapability(capabilities);
    }
  }

  /**
   * Prepares the test environment by uploading apps and starting tunnels
   * Called before test execution begins
   * @param {Object} config - WebdriverIO configuration object
   * @param {string} config.user - LambdaTest username
   * @param {string} config.key - LambdaTest access key
   * @param {Object|Array<Object>} capabilities - WebDriver capabilities
   * @returns {Promise<void>} Promise that resolves when preparation is complete
   * @throws {Error} When app upload fails or tunnel startup fails
   */
  // modify config and launch tunnel
  async onPrepare(config, capabilities) {
    if (this.options.app_upload) {
      try {
        const appName = this.options.app?.app_name;
        if (!appName) throw new Error(colors.yellow("App name is missing.\n"));

        const appPath = this.options.app?.app_path ?? null;
        const appUrl = this.options.app?.app_url ?? null;
        const customId = this.options.app?.custom_id ?? null;

        let data = new FormData();
        data.append("name", appName);

        data.append(
          appPath !== null ? "appFile" : "url",
          appPath !== null ? fs.createReadStream(appPath) : appUrl
        );

        if (customId !== null) data.append("custom_id", customId);

        let headerEnv = `Basic ${Buffer.from(
          config.user + ":" + config.key
        ).toString("base64")}`;
        let body = {
          method: "post",
          maxBodyLength: Infinity,
          url: "https://manual-api.lambdatest.com/app/upload/realDevice",
          headers: {
            Authorization: headerEnv,
            ...data.getHeaders(),
          },
          data: data,
        };

    async onComplete(exitCode, config) {
        try {
            const updateBuildStatus = this.options?.updateBuildStatusOnRetry === true;
            if (updateBuildStatus && exitCode === 0 && config?.product === 'appAutomation' && config?.sessionId) {
                const lambdaCredentials = {
                    username: config.user,
                    accessKey: config.key,
                    isApp: config?.product === 'appAutomation' ? true : false
                };
                await updateBuildStatusForSession(config.sessionId, lambdaCredentials, exitCode)
            }
        }catch(error){
            console.error(error.message);
        }

        if (
          (appPath && appPath.includes(".apk")) ||
          (appUrl && appUrl.includes(".apk"))
        ) {
          await checkPatchUrl(appId, headerEnv);
        }
      } catch (error) {
        console.error(error.message);
      }
    }

    if (!this.options.tunnel) {
      return;
    }

    const tunnelArguments = {
      user: config.user,
      key: config.key,
      ...this.options.lambdatestOpts,
    };

    this.lambdatestTunnelProcess = new LambdaTestTunnelLauncher();

    this.configureCapabilities(capabilities, "tunnel", true);
    // measure LT boot time
    const obs = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      log.info(
        `LambdaTest Tunnel successfully started after ${entry.duration}ms`
      );
    });
    obs.observe({ entryTypes: ["measure"], buffered: false });

    let timer;
    performance.mark("ltTunnelStart");
    return Promise.race([
      /** @type {Promise<void>} */ (
        new Promise((resolve, reject) => {
          this.lambdatestTunnelProcess.start(tunnelArguments, (err) => {
            if (err) {
              obs.disconnect();
              return reject(err);
            }
            /* istanbul ignore next */
            this.lambdatestTunnelProcess.getTunnelName((tunnelName) => {
              this.configureCapabilities(
                capabilities,
                "tunnelName",
                tunnelName
              );

              obs.disconnect();
              resolve();
            });
          });
        })
      ),
      new Promise((_resolve, reject) => {
        /* istanbul ignore next */
        timer = setTimeout(() => {
          obs.disconnect();
          reject(new Error(TUNNEL_START_FAILED));
        }, TUNNEL_STOP_TIMEOUT);
      }),
    ]).then(
      /* istanbul ignore next */
      (result) => {
        clearTimeout(timer);
        performance.mark("ltTunnelEnd");
        performance.measure("bootTime", "ltTunnelStart", "ltTunnelEnd");
        obs.disconnect();
        return Promise.resolve(result);
      },
      (err) => {
        clearTimeout(timer);
        obs.disconnect();
        return Promise.reject(err);
      }
    );
  }

  /**
   * Cleans up resources after test execution completes
   * Stops the LambdaTest tunnel if it was started
   * @returns {Promise<void>} Promise that resolves when cleanup is complete
   * @throws {Error} When tunnel fails to stop within timeout period
   */
  onComplete() {
    if (
      !this.lambdatestTunnelProcess ||
      typeof this.lambdatestTunnelProcess.isRunning !== "function" ||
      !this.lambdatestTunnelProcess.isRunning()
    ) {
      return;
    }

    let timer;
    return Promise.race([
      new Promise((resolve, reject) => {
        this.lambdatestTunnelProcess.stop((err) => {
          if (err) return reject(err);
          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        /* istanbul ignore next */
        timer = setTimeout(
          () => reject(new Error(TUNNEL_STOP_FAILED)),
          TUNNEL_STOP_TIMEOUT
        );
      }),
    ]).then(
      () => {
        clearTimeout(timer);
        return Promise.resolve();
      },
      /* istanbul ignore next */
      (err) => {
        clearTimeout(timer);
        return Promise.reject(err);
      }
    );
  }
}

/**
 * Checks if an uploaded APK app has been processed and patched by LambdaTest
 * Polls the API until the app is ready for use
 * @param {string} appId - The ID of the uploaded app
 * @param {string} headerEnv - Authorization header for API requests
 * @returns {Promise<void>} Promise that resolves when app is fully processed
 * @private
 */
async function checkPatchUrl(appId, headerEnv) {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://manual-api.lambdatest.com/app/${appId}/url?reinstall=true`,
    headers: {
      Authorization: headerEnv,
    },
  };
  let isLoaded = false;
  while (!isLoaded) {
    try {
      const response = await axios.request(config);
      const patchedUrl = response.data.patched_url;

      if (patchedUrl !== null) {
        isLoaded = true;
        break;
      }

      console.log("Waiting for app to be loaded...");
    } catch (error) {
      console.error("Error occurred:", error.message);
    }

    // Wait for 15 seconds before making the next request
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
}
