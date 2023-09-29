import path from 'path'

import { describe, expect, it, test, vi } from 'vitest'
import LambdaTestService from '../src/service.js'

process.env.LT_USERNAME = process.env.LT_USERNAME ?? 'foo'
process.env.LT_ACCESS_KEY = process.env.LT_ACCESS_KEY ?? 'bar'


vi.mock('@wdio/logger', () => import(path.join(process.cwd(), '__mocks__', '@wdio/logger')))

const browser = {
    config: {},
    execute: vi.fn(),
    chromeA: { sessionId: 'sessionChromeA' },
    chromeB: { sessionId: 'sessionChromeB' },
    chromeC: { sessionId: 'sessionChromeC' },
    instances: ['chromeA', 'chromeB', 'chromeC']
} as any

test('beforeSession should set to unknown creds if no lambdatest user and key are found', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({} as any, {})
    expect(service['_isServiceEnabled']).toBe(undefined)
})

test('beforeSuite', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    expect(service['_suiteTitle']).toBeUndefined()
    service.beforeSuite({ title: 'foobar' } as any)
    expect(service['_suiteTitle']).toBe('foobar')
})

test('afterSuite', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({} as any, {})

    expect(service['_failures']).toBe(0)

    service.afterSuite({} as any)
    expect(service['_failures']).toBe(0)
})

test('beforeTest', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
    service.beforeTest({
        fullName: 'foobar',
        parent: 'Jasmine__TopLevel__Suite'
    } as any)
    expect(service['_suiteTitle']).toBeUndefined()
})

test('beforeTest when service is enabled', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
    service['_suiteTitle'] = 'Jasmine__TopLevel__Suite'
    service.beforeTest({
        fullName: 'foobar',
        parent: 'Jasmine__TopLevel__Suite'
    } as any)
    expect(service['_suiteTitle']).toBeDefined()
})

test('beforeTest when service is disabled', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
    service['_isServiceEnabled'] = false
    service.beforeTest({
        fullName: 'foobar',
        parent: 'Jasmine__TopLevel__Suite'
    } as any)
    expect(service['_suiteTitle']).toBeUndefined()
})

test('afterTest', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({} as any, {})

    expect(service['_failures']).toBe(0)

    service.afterTest({} as any, {}, { passed: true } as any)
    expect(service['_failures']).toBe(0)

    service.afterTest({} as any, {}, { passed: false } as any)
    expect(service['_failures']).toBe(1)
})

test('afterScenario', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({} as any, {})

    expect(service['_failures']).toBe(0)
})

test('after', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
    service['_failures'] = 5
    const updateSpy = vi.spyOn(service, '_update')

    service['_browser'].isMultiremote = false
    service['_browser'].sessionId = 'foobar'
    service.after(5)
    expect(updateSpy).toBeCalledWith({
        sessionId: 'foobar',
        failures: 5
    });
})

test('after with mochaOpt bail set to 1', () => {
    const service = new LambdaTestService({}, {}, { mochaOpts: { bail: 1 } } as any)
    service['_browser'] = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
    service['_config'] = { ...service['_config'], mochaOpts: { bail: 1 } }
    service['_failures'] = 5
    const updateSpy = vi.spyOn(service, '_update')

    service['_browser'].isMultiremote = false
    service['_browser'].sessionId = 'foobar'
    service['_browser'].config = { mochaOpts: { bail: 1 } }
    service.after(1)

    expect(updateSpy).toBeCalledWith({
        'sessionId': 'foobar',
         'failures': 1
        })
})

test('after in multiremote', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession(
        { user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any,
        { chromeA: {}, chromeB: {}, chromeC: {} } as any
    )
    service['_failures'] = 5
    const updateSpy = vi.spyOn(service, '_update')

    service['_browser'].isMultiremote = true
    service['_browser'].sessionId = 'foobar'
    service.after(5)

    expect(updateSpy).toBeCalledWith({
            'browserName': 'chromeA',
            'failures': 5,
            'calledOnReload': false,
            'sessionId': 'sessionChromeA',
            })
    expect(updateSpy).toBeCalledWith({
            'browserName': 'chromeB',
            'failures': 5,
            'calledOnReload': false,
            'sessionId': 'sessionChromeB',
            })
    expect(updateSpy).toBeCalledWith({
            'browserName': 'chromeC',
            'failures': 5,
            'calledOnReload': false,
            'sessionId': 'sessionChromeC',
            })
})

test('after in multiremote', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession(
        { user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any,
        { chromeA: {}, chromeB: {}, chromeC: {} } as any
    )
    service['_failures'] = 5
    const updateSpy = vi.spyOn(service, '_update')

    service['_browser'].isMultiremote = true
    service['_browser'].sessionId = 'foobar'
    service['_browser'].chromeB.sessionId = 'newSessionChromeB'
    service.onReload('sessionChromeB', 'newSessionChromeB')

    expect(updateSpy).toBeCalledWith({
            'browserName': 'chromeB',
            'calledOnReload': true,
            'failures': 5,
            'sessionId': 'sessionChromeB',
             })
})

test('onReload', () => {
    const service = new LambdaTestService({}, [] as any, {} as any)
    service['_browser'] = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
    service['_failures'] = 5
    const updateSpy = vi.spyOn(service, '_update')

    service['_browser'].isMultiremote = false
    service['_browser'].sessionId = 'foobar'
    service.onReload('oldbar', 'newbar')

    expect(updateSpy).toBeCalledWith({
            'calledOnReload': true,
            'fullTitle': undefined,
            'sessionId': 'oldbar',
            'status': 'failed',
        })
})

describe('beforeSuite', () => {
    it('should send request to set the session name as suite name for Mocha tests', async () => {
        const service = new LambdaTestService({}, [] as any, {} as any)
        const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
        await service.before(service['_config'], [], browser)
        expect(service['_suiteTitle']).toBeUndefined()
        expect(service['_fullTitle']).toBeUndefined()
        await service.beforeSuite({ title: 'foobar' } as any)
        expect(service['_suiteTitle']).toBe('foobar')
        expect(setSessionNameSpy).toBeCalledWith('foobar')
    })

    it('should not send request to set the session name as suite name for Jasmine tests', async () => {
        const service = new LambdaTestService({}, [] as any, {} as any)
        const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
        await service.before(service['_config'], [], browser)
        service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
        expect(service['_suiteTitle']).toBeUndefined()
        expect(service['_fullTitle']).toBeUndefined()
        await service.beforeSuite({ title: 'Jasmine__TopLevel__Suite' } as any)
        expect(service['_suiteTitle']).toBe('Jasmine__TopLevel__Suite')
        expect(service['_fullTitle']).toBeUndefined()
        expect(setSessionNameSpy).not.toBeCalled()
    })

    it('should not send request to set the session name if option setSessionName is false', async () => {
        const service = new LambdaTestService(
            { setSessionName: false } as any,
            [] as any,
            { user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any
        )
        const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
        service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
        await service.beforeSuite({ title: 'Project Title' } as any)
        expect(setSessionNameSpy).not.toBeCalled()
    })
})

describe('beforeTest', () => {
    it('should not send request to set the session name if option setSessionName is false', async () => {
        const service = new LambdaTestService({ setSessionName: false }, [] as any, {} as any)
        const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
        service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
        await service.beforeSuite({ title: 'Project Title' } as any)
        await service.beforeTest({ title: 'Test Title', parent: 'Suite Title' } as any)
        expect(setSessionNameSpy).not.toBeCalled()
    })

    describe('sessionNamePrependTopLevelSuiteTitle is true', () => {
        it('should set title for Mocha tests using concatenation of top level suite name, innermost suite name, and test title', async () => {
            const service = new LambdaTestService({ sessionNamePrependTopLevelSuiteTitle: true }, [] as any, {} as any)
            const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
            await service.before(service['_config'], [], browser)
            service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
            await service.beforeSuite({ title: 'Project Title' } as any)
            await service.beforeTest({ title: 'Test Title', parent: 'Suite Title' } as any)
            expect(setSessionNameSpy).toBeCalledTimes(2)
            expect(setSessionNameSpy).toBeCalledWith('Project Title')
            expect(setSessionNameSpy).toBeCalledWith('Project Title - Suite Title - Test Title')
        })
    })

    describe('sessionNameOmitTestTitle is true', () => {
        it('should not set title for Mocha tests', async () => {
            const service = new LambdaTestService({ sessionNameOmitTestTitle: true }, [] as any, {} as any)
            const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
            await service.before(service['_config'], [], browser)
            service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
            await service.beforeSuite({ title: 'Suite Title' } as any)
            await service.beforeTest({ title: 'bar', parent: 'Suite Title' } as any)
            await service.afterTest({ title: 'bar', parent: 'Suite Title' } as any, undefined, { passed: true } as any)
            expect(setSessionNameSpy).toBeCalledTimes(1)
            expect(setSessionNameSpy).toBeCalledWith('Suite Title')
        })
    })

    describe('sessionNamePrependTopLevelSuiteTitle is true, sessionNameOmitTestTitle is true', () => {
        it('should set title for Mocha tests using concatenation of top level suite name and innermost suite name', async () => {
            const service = new LambdaTestService({ sessionNamePrependTopLevelSuiteTitle: true, sessionNameOmitTestTitle: true }, [] as any, {} as any)
            const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
            await service.before(service['_config'], [], browser)
            service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
            await service.beforeSuite({ title: 'Project Title' } as any)
            await service.beforeTest({ title: 'Test Title', parent: 'Suite Title' } as any)
            expect(setSessionNameSpy).toBeCalledTimes(2)
            expect(setSessionNameSpy).toBeCalledWith('Project Title')
            expect(setSessionNameSpy).toBeCalledWith('Project Title - Suite Title')
        })
    })

    describe('sessionNameFormat is defined', () => {
        it('should set title via sessionNameFormat method', async () => {
            const service = new LambdaTestService({
                sessionNameFormat: (config: any, caps: any, suiteTitle, testTitle) => {
                    if (testTitle) {
                        return `${config.region} - ${(caps).browserName} - ${suiteTitle} - ${testTitle}`
                    }
                    return `${config.region} - ${(caps).browserName} - ${suiteTitle}`
                }
            }, {
                browserName: 'foobar'
            }, {
                user: 'foo',
                key: 'bar',
                region: 'eu',
                capabilities: {} as any
            })
            const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
            await service.before(service['_config'], [], browser)
            service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
            service['_browser'] = browser
            service['_suiteTitle'] = 'Suite Title'
            await service.beforeSuite({ title: 'Suite Title' } as any)
            await service.beforeTest({ title: 'Test Title', parent: 'Suite Title' } as any)
            expect(setSessionNameSpy).toBeCalledTimes(2)
            expect(setSessionNameSpy).toBeCalledWith('eu - foobar - Suite Title')
            expect(setSessionNameSpy).toBeCalledWith('eu - foobar - Suite Title - Test Title')
        })
    })

    describe('Jasmine only', () => {
        it('should set suite name of first test as title', async () => {
            const service = new LambdaTestService({}, [] as any, {} as any)
            const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
            await service.before(service['_config'], [], browser)
            service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
            await service.beforeSuite({ title: 'Jasmine__TopLevel__Suite' } as any)
            await service.beforeTest({ fullName: 'foo bar baz', description: 'baz' } as any)
            service.afterTest({ fullName: 'foo bar baz', description: 'baz' } as any, undefined, { passed: true } as any)
            expect(setSessionNameSpy).toBeCalledWith('foo bar baz')
        })

        it('should set parent suite name as title', async () => {
            const service = new LambdaTestService({}, [] as any, {} as any)
            const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
            await service.before(service['_config'], [], browser)
            service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
            await service.beforeSuite({ title: 'Jasmine__TopLevel__Suite' } as any)
            await service.beforeTest({ fullName: 'foo bar baz', description: 'baz' } as any)
            await service.beforeTest({ fullName: 'foo xyz', description: 'xyz' } as any)
            service.afterTest({ fullName: 'foo bar baz', description: 'baz' } as any, undefined, { passed: true } as any)
            service.afterTest({ fullName: 'foo xyz', description: 'xyz' } as any, undefined, { passed: true } as any)
            expect(setSessionNameSpy).toBeCalledWith('foo xyz')
        })
    })
})

describe('afterTest', () => {
    it('should increment failures on fails', () => {
        const service = new LambdaTestService({}, [] as any, {} as any)
        const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
        service.before(service['_config'], [], browser)
        service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
        service['_fullTitle'] = ''
        service.beforeSuite({ title: 'foo' } as any)
        service.beforeTest({ title: 'foo', parent: 'bar' } as any)
        service.afterTest(
            { title: 'foo', parent: 'bar' } as any,
            undefined,
            { error: { message: 'cool reason' }, result: 1, duration: 5, passed: false } as any)
        expect(service['_failures']).toBe(1)
        expect(service['_failReasons']).toHaveLength(1)
        expect(service['_failReasons']).toContain('cool reason')

        service.beforeTest({ title: 'foo2', parent: 'bar2' } as any)
        service.afterTest(
            { title: 'foo2', parent: 'bar2' } as any,
            undefined,
            { error: { message: 'not so cool reason' }, result: 1, duration: 7, passed: false } as any)

        expect(service['_failures']).toBe(2)
        expect(service['_failReasons']).toHaveLength(2)
        expect(service['_failReasons']).toContain('cool reason')
        expect(service['_failReasons']).toContain('not so cool reason')

        service.beforeTest({ title: 'foo3', parent: 'bar3' } as any)
        service.afterTest(
            { title: 'foo3', parent: 'bar3' } as any,
            undefined,
            { error: undefined, result: 1, duration: 7, passed: false } as any)

        expect(setSessionNameSpy).toBeCalledTimes(4)
        expect(setSessionNameSpy).toBeCalledWith('foo')
        expect(setSessionNameSpy).toBeCalledWith('bar - foo')
        expect(setSessionNameSpy).toBeCalledWith('bar2 - foo2')
        expect(setSessionNameSpy).toBeCalledWith('bar3 - foo3')

        expect(service['_failures']).toBe(3)
        expect(service['_failReasons']).toHaveLength(3)
        expect(service['_failReasons']).toContain('cool reason')
        expect(service['_failReasons']).toContain('not so cool reason')
        expect(service['_failReasons']).toContain('Unknown Error')
    })

    it('should not increment failure reasons on passes', () => {
        const service = new LambdaTestService({}, [] as any, {} as any)
        const setSessionNameSpy = vi.spyOn(service, '_setSessionName')
        service.before(service['_config'], [], browser)
        service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})
        service.beforeSuite({ title: 'foo' } as any)
        service.beforeTest({ title: 'foo', parent: 'bar' } as any)
        service.afterTest(
            { title: 'foo', parent: 'bar' } as any,
            undefined,
            { error: { message: 'cool reason' }, result: 1, duration: 5, passed: true } as any)
        expect(service['_failReasons']).toEqual([])

        service.beforeTest({ title: 'foo2', parent: 'bar2' } as any)
        service.afterTest(
            { title: 'foo2', parent: 'bar2' } as any,
            undefined,
            { error: { message: 'not so cool reason' }, result: 1, duration: 5, passed: true } as any)

        expect(setSessionNameSpy).toBeCalledTimes(3)
        expect(setSessionNameSpy).toBeCalledWith('foo')
        expect(setSessionNameSpy).toBeCalledWith('bar - foo')
        expect(setSessionNameSpy).toBeCalledWith('bar2 - foo2')

        expect(service['_failures']).toBe(0)
        expect(service['_failReasons']).toEqual([])
    })
})

describe('afterScenario', () => {
    it('should increment failure reasons on non-passing statuses (strict mode off)', () => {
        const service = new LambdaTestService({}, [] as any, { cucumberOpts: { strict: false } } as any)
        service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})

        expect(service['_failReasons']).toEqual([])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'SKIPPED' } } as any, {} as any)
        expect(service['_failReasons']).toEqual([])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'FAILED', message: 'I am Error, most likely' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'SKIPPED' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'FAILED', message: 'I too am Error' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely', 'I too am Error'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'UNDEFINED', message: 'Step XYZ is undefined' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely', 'I too am Error', 'Step XYZ is undefined'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'AMBIGUOUS', message: 'Step XYZ2 is ambiguous' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(
            ['I am Error, most likely',
                'I too am Error',
                'Step XYZ is undefined',
                'Step XYZ2 is ambiguous'])

        service.afterScenario({ pickle: { name: 'Can do something' }, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'PENDING' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(
            ['I am Error, most likely',
                'I too am Error',
                'Step XYZ is undefined',
                'Step XYZ2 is ambiguous'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'SKIPPED' } } as any, {} as any)
        expect(service['_failReasons']).toEqual([
            'I am Error, most likely',
            'I too am Error',
            'Step XYZ is undefined',
            'Step XYZ2 is ambiguous'])
    })

    it('should increment failure reasons on non-passing statuses (strict mode on)', () => {
        const service = new LambdaTestService({}, [] as any, { cucumberOpts: { strict: true }, capabilities: {} })
        service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY } as any, {})

        expect(service['_failReasons']).toEqual([])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'SKIPPED' } } as any, {} as any)
        expect(service['_failReasons']).toEqual([])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, message: 'I am Error, most likely', status: 'FAILED' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'SKIPPED' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'FAILED', message: 'I too am Error' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely', 'I too am Error'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'UNDEFINED', message: 'Step XYZ is undefined' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(['I am Error, most likely', 'I too am Error', 'Step XYZ is undefined'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'AMBIGUOUS', message: 'Step XYZ2 is ambiguous' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(
            ['I am Error, most likely',
                'I too am Error',
                'Step XYZ is undefined',
                'Step XYZ2 is ambiguous'])

        service.afterScenario({ pickle: { name: 'Can do something' }, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'PENDING' } } as any, {} as any)
        expect(service['_failReasons']).toEqual(
            ['I am Error, most likely',
                'I too am Error',
                'Step XYZ is undefined',
                'Step XYZ2 is ambiguous',
                'Some steps/hooks are pending for scenario "Can do something"'])

        service.afterScenario({ pickle: {}, result: { duration: { seconds: 0, nanos: 1000000 }, willBeRetried: false, status: 'SKIPPED' } } as any, {} as any)
        expect(service['_failReasons']).toEqual([
            'I am Error, most likely',
            'I too am Error',
            'Step XYZ is undefined',
            'Step XYZ2 is ambiguous',
            'Some steps/hooks are pending for scenario "Can do something"'])
    })
})
