import LambdaTestService from '../src'
const browser = {
    config: {},
    execute: jest.fn(),
    chromeA: { sessionId: 'sessionChromeA' },
    chromeB: { sessionId: 'sessionChromeB' },
    chromeC: { sessionId: 'sessionChromeC' },
    instances: ['chromeA', 'chromeB', 'chromeC']
}
test('beforeSuite', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    expect(service.suiteTitle).toBeUndefined()
    service.beforeSuite({ title: 'foobar' })
    expect(service.suiteTitle).toBe('foobar')
})

test('beforeSession should set to unknown creds if no lambdatest user and key are found', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({}, {})
    expect(service.isServiceEnabled).toBe(false)
})

test('afterSuite', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({}, {})

    expect(service.failures).toBe(0)

    service.afterSuite({})
    expect(service.failures).toBe(0)
})

test('beforeTest', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY }, {})
    service.beforeTest({
        fullName: 'foobar',
        parent: 'Jasmine__TopLevel__Suite'
    })
    expect(service.suiteTitle).toBeUndefined()
})

test('beforeTest', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY }, {})
    service.suiteTitle = 'Jasmine__TopLevel__Suite'
    service.beforeTest({
        fullName: 'foobar',
        parent: 'Jasmine__TopLevel__Suite'
    })
    expect(service.suiteTitle).toBeDefined()
})

test('beforeTest', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY }, {})
    service.isServiceEnabled = false
    service.beforeTest({
        fullName: 'foobar',
        parent: 'Jasmine__TopLevel__Suite'
    })
    expect(service.suiteTitle).toBeUndefined()
})

test('afterTest', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({}, {})

    expect(service.failures).toBe(0)

    service.afterTest({}, {}, { passed: true })
    expect(service.failures).toBe(0)

    service.afterTest({}, {}, { passed: false })
    expect(service.failures).toBe(1)
})

test('after', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY }, {})
    service.failures = 5
    service._update = jest.fn()

    service._browser.isMultiremote = false
    service._browser.sessionId = 'foobar'
    service.after()

    expect(service._update).toBeCalledWith('foobar', 5)
})

test('after', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY }, {})
    service._config = { ...service._config, mochaOpts: { bail: 1 } }
    service.failures = 5
    service._update = jest.fn()

    service._browser.isMultiremote = false
    service._browser.sessionId = 'foobar'
    service._browser.config = { mochaOpts: { bail: 1 } }
    service.after(1)

    expect(service._update).toBeCalledWith('foobar', 1)
})

test('afterScenario', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({}, {})

    expect(service.failures).toBe(0)
})

test('after with bail set', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY }, {})
    service._config = { ...service._config, mochaOpts: { bail: 1 } }
    service.failures = 5
    service._update = jest.fn()

    service._browser.isMultiremote = false
    service._browser.sessionId = 'foobar'
    service._browser.config = { mochaOpts: { bail: 1 } }
    service.after(1)

    expect(service._update).toBeCalledWith('foobar', 1)
})

test('after in multiremote', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession(
        { user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY },
        { chromeA: {}, chromeB: {}, chromeC: {} }
    )
    service.failures = 5
    service._update = jest.fn()

    service._browser.isMultiremote = true
    service._browser.sessionId = 'foobar'
    service.after()

    expect(service._update).toBeCalledWith(
        'sessionChromeA',
        5,
        false,
        'chromeA'
    )
    expect(service._update).toBeCalledWith(
        'sessionChromeB',
        5,
        false,
        'chromeB'
    )
    expect(service._update).toBeCalledWith(
        'sessionChromeC',
        5,
        false,
        'chromeC'
    )
})

test('onReload', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession({ user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY }, {})
    service.failures = 5
    service._update = jest.fn()

    service._browser.isMultiremote = false
    service._browser.sessionId = 'foobar'
    service.onReload('oldbar', 'newbar')

    expect(service._update).toBeCalledWith('oldbar', 5, true)
})

test('after in multiremote', () => {
    const service = new LambdaTestService({}, {}, {})
    service._browser = browser
    service.beforeSession(
        { user: process.env.LT_USERNAME, key: process.env.LT_ACCESS_KEY },
        { chromeA: {}, chromeB: {}, chromeC: {} }
    )
    service.failures = 5
    service._update = jest.fn()

    service._browser.isMultiremote = true
    service._browser.sessionId = 'foobar'
    service._browser.chromeB.sessionId = 'newSessionChromeB'
    service.onReload('sessionChromeB', 'newSessionChromeB')

    expect(service._update).toBeCalledWith(
        'sessionChromeB',
        5,
        true,
        'chromeB'
    )
})