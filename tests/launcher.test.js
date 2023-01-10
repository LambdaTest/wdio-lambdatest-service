import LambdaTestLauncher from '../src/launcher'

describe('onPrepare', () => {
    const options = { tunnel: true }
    const caps = [{}]
    const config = {
        user: process.env.LT_USERNAME,
        key: process.env.LT_ACCESS_KEY
    }

    it('should not call LambdaTest tunnel if it\'s undefined', async () => {
        const service = new LambdaTestLauncher({})
        await service.onPrepare(config, caps)
        expect(service.tunnel).toBeUndefined()
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
            await service.onPrepare({}, caps)
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
            }, [{}])
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
        }, [{}])
        service.lambdatestTunnelProcess.isRunning = () => true
        service.lambdatestTunnelProcess.stop = (fn) => fn()
        try {
            await service.onComplete()
        } catch (e) {
            expect(e).toBeUndefined()
        }
    }, 30000)
})