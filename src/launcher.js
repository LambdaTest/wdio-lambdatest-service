import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

import { performance, PerformanceObserver } from 'perf_hooks'
import logger from '@wdio/logger'
import LambdaTestTunnelLauncher from '@lambdatest/node-tunnel'
import { TUNNEL_START_FAILED, TUNNEL_STOP_FAILED, TUNNEL_STOP_TIMEOUT } from './constants.js'
const log = logger('@wdio/lambdatest-service')
const colors = require('colors');
export default class LambdaTestLauncher {
    lambdatestTunnelProcess
    options

    constructor(options) {
        this.options = options
    }

    configureCapabilities(capabilities, key, value) {
        if (Array.isArray(capabilities)) {
            capabilities.forEach(capability => {
                if (capability['lt:options']) {
                    capability['LT:Options'] = { ...capability['lt:options'] };
                    delete capability['lt:options'];
                }
                if (capability['LT:Options'] === undefined) capability[key] = value;
                else capability['LT:Options'][key] = value;
            });
        } else if (typeof capabilities === 'object') {
            if (capabilities['lt:options']) {
                capabilities['LT:Options'] = { ...capabilities['lt:options'] };
                delete capabilities['lt:options'];
            }
            if (capabilities['LT:Options'] === undefined) capabilities[key] = value;
            else capabilities['LT:Options'][key] = value;
        }
    }

    // modify config and launch tunnel
    async onPrepare(config, capabilities) {

        if (this.options.app_upload) {
            try {
              const appName = this.options.app?.app_name;
              if (!appName) throw new Error(colors.yellow('App name is missing.\n'));
              
              const appPath = this.options.app?.app_path ?? null;
              const appUrl = this.options.app?.app_url ?? null;
              const customId = this.options.app?.custom_id ?? null;
            
              let data = new FormData();
              data.append('name', appName);
            
              data.append(appPath !== null ? 'appFile' : 'url', appPath !== null ? fs.createReadStream(appPath) : appUrl);
            
              if (customId !== null) data.append('custom_id', customId);
            
              let headerEnv = `Basic ${Buffer.from(config.user + ':' + config.key).toString('base64')}`;
              let body = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://manual-api.lambdatest.com/app/upload/realDevice',
                headers: {
                  'Authorization': headerEnv,
                  ...data.getHeaders()
                },
                data: data
              };

              const response = await axios.request(body);
              console.log(colors.green(JSON.stringify(response.data)));
            
              const envAppUrl = response.data.app_url;
              if(this.options.app.enableCapability) {
                this.configureCapabilities(capabilities, 'app', envAppUrl);
            }
            const appId = response.data.app_id;
            if((appPath && appPath.includes('.apk')) || (appUrl && appUrl.includes('.apk')))
            {
                await checkPatchUrl(appId, headerEnv);
            }

        } catch (error) {
            console.error(error.message);
            }
        }

        if (!this.options.tunnel) {
            return
        }

        const tunnelArguments = {
            user: config.user,
            key: config.key,
            ...this.options.lambdatestOpts
        }

        this.lambdatestTunnelProcess = new LambdaTestTunnelLauncher()

        this.configureCapabilities(capabilities, 'tunnel', true);
        // measure LT boot time
        const obs = new PerformanceObserver(list => {
            const entry = list.getEntries()[0]
            log.info(
                `LambdaTest Tunnel successfully started after ${entry.duration}ms`
            )
        })
        obs.observe({ entryTypes: ['measure'], buffered: false })

        let timer
        performance.mark('ltTunnelStart')
        return Promise.race([
            /** @type {Promise<void>} */(new Promise((resolve, reject) => {
                this.lambdatestTunnelProcess.start(tunnelArguments, err => {
                    if (err) {
                        obs.disconnect()
                        return reject(err)
                    }
                    /* istanbul ignore next */
                    this.lambdatestTunnelProcess.getTunnelName(tunnelName => {

                        this.configureCapabilities(capabilities, 'tunnelName', tunnelName);
                        
                        obs.disconnect()
                        resolve()
                    })
                })
            })),
            new Promise((resolve, reject) => {
                /* istanbul ignore next */
                timer = setTimeout(() => {
                    obs.disconnect()
                    reject(new Error(TUNNEL_START_FAILED))
                }, TUNNEL_STOP_TIMEOUT)
            })
        ]).then(
            /* istanbul ignore next */
            (result) => {
                clearTimeout(timer)
                performance.mark('ltTunnelEnd')
                performance.measure('bootTime', 'ltTunnelStart', 'ltTunnelEnd')
                obs.disconnect()
                return Promise.resolve(result)
            },
            (err) => {
                clearTimeout(timer)
                obs.disconnect()
                return Promise.reject(err)
            }
        )
    }

    onComplete() {
        if (
            !this.lambdatestTunnelProcess ||
            typeof this.lambdatestTunnelProcess.isRunning !== 'function' ||
            !this.lambdatestTunnelProcess.isRunning()
        ) {
            return
        }

        let timer
        return Promise.race([
            new Promise((resolve, reject) => {
                this.lambdatestTunnelProcess.stop(err => {
                    if (err) return reject(err)
                    resolve()
                })
            }),
            new Promise((resolve, reject) => {
                /* istanbul ignore next */
                timer = setTimeout(() => reject( new Error(TUNNEL_STOP_FAILED)), TUNNEL_STOP_TIMEOUT)
            })
        ]).then(
            () => {
                clearTimeout(timer)
                return Promise.resolve()
            },
            /* istanbul ignore next */
            (err) => {
                clearTimeout(timer)
                return Promise.reject(err)
            }
        )
    }

}

async function checkPatchUrl(appId, headerEnv) {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://manual-api.lambdatest.com/app/${appId}/url?reinstall=true`,
        headers: { 
          'Authorization': headerEnv
        }
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

        console.log('Waiting for app to be loaded...');
        } catch (error) {
        console.error('Error occurred:', error.message);
        }

        // Wait for 15 seconds before making the next request
        await new Promise(resolve => setTimeout(resolve, 15000));
    }
}