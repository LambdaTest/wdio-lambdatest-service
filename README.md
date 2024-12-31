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
    product : 'appAutomation',
    services: [
        ['lambdatest', {
            tunnel: true
        }]
    ],
    // ...
};
```

### To get test error remarks on automation dashboard
To get test error remarks on automation dashboard, simply add `ltErrorRemark: true` in your `wdio.conf.js`.


### To upload app from local or url
Upload `android` or `ios` apps from local or hosted app url by adding this required configuration in your `wdio.conf.js`. To use the uploaded app for testing along in the same run set `enableCapability = true` , this will set the app url value in the capabilities.

```js
// wdio.conf.js
services: [
    [
        "lambdatest",
        {
        tunnel: true,
        app_upload: true, 
        app:{
            app_name : "xyz", //provide your desired app name
            app_path : "/path/to/your/app/file", //provide the local app location
            // or
            app_url : "https://example.test_android.apk", //provide the url where your app is horsted or stored
            custom_id : "12345", //provide your desired custom id
            enableCapability : true
        }
    }
    ]
]
```

## Options

In order to authorize to the LambdaTest service your config needs to contain a [`user`](https://webdriver.io/docs/options.html#user) and [`key`](https://webdriver.io/docs/options.html#key) option.

### tunnel
Set this to true to enable routing connections from LambdaTest cloud through your computer. You will also need to set `tunnel` to true in browser capabilities.

Type: `Boolean`<br>
Default: `false`

### lambdatestOpts
Specified optional will be passed down to LambdaTest Tunnel.

Type: `Object`<br>
Default: `{}`

Given below is an comprehensive list of all options available:

#### tunnelName
Specifies the custom LambdaTest Tunnel name to be used.

**Example:**
```json
{"tunnelName": "my_custom_tunnel"}
```

#### port
Port for LambdaTest Tunnel to activate.

**Example:**
```json
{"port": 33000}
```
#### user
LambdaTest username.

**Example:**
```json
{"user": "your_username"}
```

#### key
LambdaTest accessKey.

**Example:**
```json
{"key": "your_access_key"}
```

#### verbose
Should every proxy request be logged to stdout.

**Example:**
```json
{"verbose": true}
```

#### logFile
Location of the LambdaTest Tunnel log file.

**Example:**
```json
{"logFile": "/path/to/log/file"}
```

#### config

Path of the config file to use.
**Example:**
```json
{"config": "/path/to/config/file"}
```

#### dir
Specify the local directory that will be served by a file server on Tunnel port.

**Example:**
```json
{"dir": "/path/to/local/directory"}
```


#### proxyHost
Specifies the Tunnel proxy port hostname.

**Example:**
```json
{"proxyHost": "proxy.example.com"}
```
#### proxyUser
Specifies the Tunnel proxy port username.

**Example:**
```json
{"proxyUser": "your_proxy_username"}
```

#### proxyPass
Specifies the Tunnel proxy port password.

**Example:**
```json
{"proxyPass": "your_proxy_password"}
```

#### proxyPort
Specifies the port number where Tunnel proxy will activate.

**Example:**
```json
{"proxyPort": 8080}
```

#### egressOnly
Uses proxy settings only for outbound requests.

**Example:**
```json
{"egressOnly": true}
```


#### ingressOnly
Routes only incoming traffic via the proxy specified.

**Example:**
```json
{"ingressOnly": true}
```


#### pacfile
To use PAC (Proxy Auto-Configuration) in local testing, provide
path of a PAC file.

**Example:**
```json
{"pacfile": "/path/to/pacfile"}
```

#### loadBalanced
Activates [Load Balancing](https://www.lambdatest.com/support/docs/load-balancing-in-lambda-tunnel/) for LambdaTest Tunnel.

**Example:**
```json
{"loadBalanced": true}
```

#### mode
Specifies in which mode tunnel should run "ssh" or "ws". (default "ssh").

**Example:**
```json
{"mode": "ssh"}
```

#### sshConnType
Specify type of ssh connection (over_22, over_443, over_ws). To use –sshConnType, specify ––mode ssh flag first.

**Example:**
```json
{"sshConnType": "over_22"}
```

#### maxSSHConnections
Increase the SSH connection from Tunnel Client to Tunnel Server. Maximum allowed value is 30.

**Example:**
```json
{"maxSSHConnections": 2}
```

#### sharedTunnel
Sharing Tunnel among team members.

**Example:**
```json
{"sharedTunnel": true}
```

#### env
The environment on which the LambdaTest Tunnel will run.

**Example:**
```json
{"env": "production"}
```


#### infoAPIPort
Exposes [Tunnel Info API](https://www.lambdatest.com/support/docs/advanced-tunnel-features/#tunnelinfoapis) at the specified port.

**Example:**
```json
{"infoAPIPort": 8080}
```

#### callbackURL
Callback URL for tunnel status.

**Example:**
```json
{"callbackURL": "https://example.com/callback"}
```


#### allowHosts
Comma separated list of hosts to route via tunnel. Everything else will be routed via Internet.

**Example:**
```json
{"allowHosts": "example.com,anotherexample.com"}
```

#### bypassHosts
Comma separated list of hosts to bypass from tunnel. These will be routed via internet.

**Example:**
```json
{"bypassHosts": "example.com,anotherexample.com"}
```



#### clientCert
mTLS Client Certificate filepath.

**Example:**
```json
{"clientCert": "/path/to/client_certificate"}
```

#### clientKey
mTLS Client Key filepath.

**Example:**
```json
{"clientKey": "/path/to/client_key"}
```

#### mTLSHosts
Comma separated list of mTLS hosts.

**Example:**
```json
{"mTLSHosts": "example.com,anotherexample.com"}
```


#### dns
Comma separated list of DNS Servers.

**Example:**
```json
{"dns": "8.8.8.8,8.8.4.4"}
```


#### mitm
Enable the [MITM (Man-in-the-middle)](https://www.lambdatest.com/support/docs/advanced-tunnel-features/#mitmlocaltesting) mode for LambdaTest Tunnel.

**Example:**
```json
{"mitm": true}
```

#### ntlm
To use Microsoft NTLM (Windows NT LAN Manager) authentication for communication or transport purposes.

**Example:**
```json
{"ntlm": true}
```

#### pidfile
Path of pidfile, where process Id will be written.

**Example:**
```json
{"pidfile": "/path/to/pidfile"}
```


#### usePrivateIp
Sets remote address to an internal IP of client machine.

**Example:**
```json
{"usePrivateIp": true}
```

You can find more about these options [here](https://www.lambdatest.com/support/docs/lambda-tunnel-modifiers/).

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


### ignoreTestCountInName
Ignore the count of retries of a test in the name

Type: `Boolean`<br />
Default: `false`


### useScenarioName
To get test names as scenario names for cucumber specific tests, simply add `useScenarioName: true` in your `wdio.conf.js`.

## Steps to compile and publish
1. git clone this repository.
2. run "npm install"
3. run "npm run build"
4. Steps to Publish: run "npm login"
5. run "npm publish --access public"

----

For more information on WebdriverIO see the [homepage](https://webdriver.io).
