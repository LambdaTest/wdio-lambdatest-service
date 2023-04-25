WebdriverIO LambdaTest Service
========================

[![WDIO health check](https://github.com/LambdaTest/wdio-lambdatest-service/actions/workflows/healthcheck.yml/badge.svg?branch=master)](https://github.com/LambdaTest/wdio-lambdatest-service/actions/workflows/healthcheck.yml)

> A WebdriverIO service that manages tunnel and job metadata for LambdaTest users.

## Installation

```bash
npm i wdio-lambdatest-service --save-dev
```

Instructions on how to install `WebdriverIO` can be found [here.](https://webdriver.io/docs/gettingstarted.html)


## Configuration

WebdriverIO has LambdaTest support out of the box. You should simply set `user` and `key` in your `wdio.conf.js` file. To enable the feature for app automation, set `product: 'appAutomation'` in your `wdio.conf.js` file. This service plugin provides supports for [LambdaTest Tunnel](https://www.lambdatest.com/support/docs/troubleshooting-lambda-tunnel/). Set `tunnel: true` also to activate this feature.

```js
// wdio.conf.js
exports.config = {
    // ...
    user: process.env.LT_USERNAME,
    key: process.env.LT_ACCESS_KEY,
    logFile : './logDir/api.log',
    services: [
        ['lambdatest', {
            tunnel: true
        }]
    ],
    // ...
};
```

## Options

In order to authorize to the LambdaTest service your config needs to contain a [`user`](https://webdriver.io/docs/options.html#user) and [`key`](https://webdriver.io/docs/options.html#key) option.

### tunnel
Set this to true to enable routing connections from LambdaTest cloud through your computer. You will also need to set `tunnel` to true in browser capabilities.

Type: `Boolean`<br>
Default: `false`

### lambdatestOpts
Specified optional will be passed down to LambdaTest Tunnel. See [this list](https://www.lambdatest.com/support/docs/lambda-tunnel-modifiers/) for details.

Type: `Object`<br>
Default: `{}`

### preferScenarioName
Cucumber only. Set the session name to the Scenario name if only a single Scenario ran.
Useful when running in parallel with [wdio-cucumber-parallel-execution](https://github.com/SimitTomar/wdio-cucumber-parallel-execution).

Type: `Boolean`<br />
Default: `false`

### sessionNameFormat
Customize the session name format.

Type: `Function`<br />
Default (Cucumber/Jasmine): `(config, capabilities, suiteTitle) => suiteTitle`<br />
Default (Mocha): `(config, capabilities, suiteTitle, testTitle) => suiteTitle + ' - ' + testTitle`

### sessionNameOmitTestTitle
Mocha only. Do not append the test title to the session name.

Type: `Boolean`<br />
Default: `false`

### sessionNamePrependTopLevelSuiteTitle
Mocha only. Prepend the top level suite title to the session name.

Type: `Boolean`<br />
Default: `false`

### setSessionName
Automatically set the session name.

Type: `Boolean`<br />
Default: `true`

### setSessionStatus
Automatically set the session status (passed/failed).

Type: `Boolean`<br />
Default: `true`


## Steps to compile and publish
1. git clone this repository.
2. run "npm install"
3. run "npm run build"
4. Steps to Publish: run "npm login"
5. run "npm publish --access public"

----

For more information on WebdriverIO see the [homepage](https://webdriver.io).
WebdriverIO LambdaTest Service
========================

[![WDIO health check](https://github.com/LambdaTest/wdio-lambdatest-service/actions/workflows/healthcheck.yml/badge.svg?branch=master)](https://github.com/LambdaTest/wdio-lambdatest-service/actions/workflows/healthcheck.yml)

> A WebdriverIO service that manages tunnel and job metadata for LambdaTest users.

## Installation

```bash
npm i wdio-lambdatest-service --save-dev
```

Instructions on how to install `WebdriverIO` can be found [here.](https://webdriver.io/docs/gettingstarted.html)


## Configuration

WebdriverIO has LambdaTest support out of the box. You should simply set `user` and `key` in your `wdio.conf.js` file. To enable the feature for app automation, set `product: 'appAutomation'` in your `wdio.conf.js` file. This service plugin provides supports for [LambdaTest Tunnel](https://www.lambdatest.com/support/docs/troubleshooting-lambda-tunnel/). Set `tunnel: true` also to activate this feature.

```js
// wdio.conf.js
exports.config = {
    // ...
    user: process.env.LT_USERNAME,
    key: process.env.LT_ACCESS_KEY,
    logFile : './logDir/api.log',
    services: [
        ['lambdatest', {
            tunnel: true
        }]
    ],
    // ...
};
```

## Options

In order to authorize to the LambdaTest service your config needs to contain a [`user`](https://webdriver.io/docs/options.html#user) and [`key`](https://webdriver.io/docs/options.html#key) option.

### tunnel
Set this to true to enable routing connections from LambdaTest cloud through your computer. You will also need to set `tunnel` to true in browser capabilities.

Type: `Boolean`<br>
Default: `false`

### lambdatestOpts
Specified optional will be passed down to LambdaTest Tunnel. See [this list](https://www.lambdatest.com/support/docs/lambda-tunnel-modifiers/) for details.

Type: `Object`<br>
Default: `{}`

### preferScenarioName
Cucumber only. Set the session name to the Scenario name if only a single Scenario ran.
Useful when running in parallel with [wdio-cucumber-parallel-execution](https://github.com/SimitTomar/wdio-cucumber-parallel-execution).

Type: `Boolean`<br />
Default: `false`

### sessionNameFormat
Customize the session name format.

Type: `Function`<br />
Default (Cucumber/Jasmine): `(config, capabilities, suiteTitle) => suiteTitle`<br />
Default (Mocha): `(config, capabilities, suiteTitle, testTitle) => suiteTitle + ' - ' + testTitle`

### sessionNameOmitTestTitle
Mocha only. Do not append the test title to the session name.

Type: `Boolean`<br />
Default: `false`

### sessionNamePrependTopLevelSuiteTitle
Mocha only. Prepend the top level suite title to the session name.

Type: `Boolean`<br />
Default: `false`

### setSessionName
Automatically set the session name.

Type: `Boolean`<br />
Default: `true`

### setSessionStatus
Automatically set the session status (passed/failed).

Type: `Boolean`<br />
Default: `true`


## Steps to compile and publish
1. git clone this repository.
2. run "npm install"
3. run "npm run build"
4. Steps to Publish: run "npm login"
5. run "npm publish --access public"

----

For more information on WebdriverIO see the [homepage](https://webdriver.io).
