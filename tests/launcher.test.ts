import path from 'path'
import { describe, expect, it, vi } from 'vitest'
import LambdaTestLauncher from '../src/launcher.js'

process.env.LT_USERNAME = process.env.LT_USERNAME ?? 'foo'
process.env.LT_ACCESS_KEY = process.env.LT_ACCESS_KEY ?? 'bar'

vi.mock('@wdio/logger', () => import(path.join(process.cwd(), '__mocks__', '@wdio/logger')))

describe('onPrepare', () => {
    const options = { tunnel: true }
    const caps = [{}]
    const config = {
        user: process.env.LT_USERNAME,
        key: process.env.LT_ACCESS_KEY
    } as any

    it('should not call LambdaTest tunnel if it\'s undefined', async () => {
        const service = new LambdaTestLauncher({})
        await service.onPrepare(config, caps)
        expect(service.options.tunnel).toBeUndefined()
        expect(service.lambdatestTunnelProcess).toBeUndefined()
    })

    it('should not call LambdaTest tunnel if it\'s false', async () => {
        const service = new LambdaTestLauncher({
            tunnel: false
        })
        await service.onPrepare(config, caps)
        expect(service.lambdatestTunnelProcess).toBeUndefined()
    })

    it('should reject if tunnel.start throws an error', async () => {
        const service = new LambdaTestLauncher(options)
        try {
            await service.onPrepare({} as any, caps)
        } catch (e) {
            expect(e).toEqual({ message: 'user and key is required' })
        }
    }, 30000)

    it('should add the tunnel property to a single capability', async () => {
        const service = new LambdaTestLauncher(options)
        const capabilities = {}
        try {
            await service.onPrepare(config, capabilities)
        } catch (e) {
            expect(capabilities).toEqual({ tunnel: true })
        }
        expect(capabilities).toMatchObject({ tunnel: true })
    }, 40000)
})

describe('onComplete', () => {
    it('should throw error if tunnel is not running', async () => {
        const service = new LambdaTestLauncher({ tunnel: true })
        try {
            await service.onPrepare({
                user: process.env.LT_USERNAME,
                key: process.env.LT_ACCESS_KEY
            } as any, [{}])
            await service.onComplete()
        } catch (e) {
            expect(e).toEqual(new Error('LambdaTest tunnel is not running'))
        }
    }, 30000)
    it('should properly resolve if everything works', async () => {
        const service = new LambdaTestLauncher({ tunnel: true })
        await service.onPrepare({
            user: process.env.LT_USERNAME,
            key: process.env.LT_ACCESS_KEY
        } as any, [{}])
        if (!service.lambdatestTunnelProcess) {
            throw new Error('lambdatestTunnelProcess is undefined')
        }
        expect(service.lambdatestTunnelProcess).toBeDefined()
        expect(service.lambdatestTunnelProcess.isRunning()).toBe(true)
        try {
            await service.onComplete()
        } catch (e) {
            expect(e).toBe(true)
        }
    }, 30000)
})