import { performance, PerformanceObserver } from 'perf_hooks'
import logger from '@wdio/logger'
import LambdaTestTunnelLauncher from '@lambdatest/node-tunnel'
import { TUNNEL_START_FAILED, TUNNEL_STOP_FAILED, TUNNEL_STOP_TIMEOUT } from './constants.js'

const log = logger('@wdio/lambdatest-service')

export default class LambdaTestLauncher {
    lambdatestTunnelProcess
    options

    constructor(options) {
        this.options = options
    }

    // modify config and launch tunnel
    onPrepare(config, capabilities) {
        if (!this.options.tunnel) {
            return
        }

        const tunnelArguments = {
            user: config.user,
            key: config.key,
            ...this.options.lambdatestOpts
        }

        this.lambdatestTunnelProcess = new LambdaTestTunnelLauncher()

        if (Array.isArray(capabilities)) {
            capabilities.forEach(capability => {
                if(capability['LT:Options']===undefined)
                    capability.tunnel = true
                else
                    capability['LT:Options'].tunnel = true
            })
        } else if (typeof capabilities === 'object') {
            if(capabilities['LT:Options']===undefined)
                capabilities.tunnel = true
            else
                capabilities['LT:Options'].tunnel = true
        }
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
                        if (Array.isArray(capabilities)) {
                            capabilities.forEach(capability => {
                                if(capability['LT:Options']===undefined)
                                    capability.tunnelName = tunnelName
                                else
                                    capability['LT:Options'].tunnelName = tunnelName
                            })
                        } else if (typeof capabilities === 'object') {
                            if(capabilities['LT:Options']===undefined)
                                capabilities.tunnelName = tunnelName
                            else
                                capabilities['LT:Options'].tunnelName = tunnelName
                        }
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