import LambdaRestClient from '@lambdatest/node-rest-client'
import logger from '@wdio/logger'

const log = logger('@wdio/lambdatest-service')

export default class LambdaRestService {
  constructor() {
    this.testCnt = 0;
    this.failures = 0;
  }

  beforeSession(config, capabilities) {
    this.config = config;
    this.capabilities = capabilities;
    const lambdaCredentials = {
      username: this.config.user,
      accessKey: this.config.key,
      isApp : false
    };

    if (this.config.product === 'appAutomation') lambdaCredentials.isApp =true

    if (this.config.logFile) {
      lambdaCredentials.logFile = this.config.logFile;
    }

    this.isServiceEnabled = lambdaCredentials.username && lambdaCredentials.accessKey;

    try {
      this.api = LambdaRestClient.AutomationClient(lambdaCredentials);
    } catch (_) {
      this.isServiceEnabled = false;
    }
  }

  beforeScenario(world) {
    if (!!!this.suiteTitle){
      this.suiteTitle = world.pickle.name || 'unknown scenario'
    }
  }

  beforeSuite(suite) {
    this.suiteTitle = suite.title;
  }

  beforeTest(test) {
    if (!this.isServiceEnabled) {
      return;
    }
    if (test.title && !!!this.testTitle){
      this.testTitle = test.title
    }
    
    if (this.suiteTitle === 'Jasmine__TopLevel__Suite') {
      this.suiteTitle = test.fullName;
    }
  }

  afterSuite(suite) {
    if (Object.prototype.hasOwnProperty.call(suite, 'error')) {
      ++this.failures;
    }
  }

  afterTest(test, context, {
    error,
    result,
    duration,
    passed,
    retries
  }) {
    console.log(error, result, duration, retries)
    if (!passed) {
      ++this.failures;
    }
  }

  afterScenario(world, { passed, error, duration }) {
    console.log(error, duration)
    if (!passed) {
      ++this.failures;
    }
  }

  after(result) {
    if (!this.isServiceEnabled) {
      return;
    }

    let failures = this.failures;

    if (global.browser.config.mochaOpts && global.browser.config.mochaOpts.bail && Boolean(result)) {
      failures = 1;
    }
    console.log("=========result=========", result, result === 0)
    if (result === 0) {
      failures = 0;
    }
    const status = 'status: ' + (failures > 0 ? 'failed' : 'passed');

    if (!global.browser.isMultiremote) {
      log.info(`Update job with sessionId ${global.browser.sessionId}, ${status}`);
      return this._update(global.browser.sessionId, failures);
    }

    return Promise.all(Object.keys(this.capabilities).map(browserName => {
      log.info(`Update multiremote job for browser '${browserName}' and sessionId ${global.browser[browserName].sessionId}, ${status}`);
      return this._update(global.browser[browserName].sessionId, failures, false, browserName);
    }));
  }

  onReload(oldSessionId, newSessionId) {
    if (!this.isServiceEnabled) {
      return;
    }

    const status = 'status: ' + (this.failures > 0 ? 'failed' : 'passed');

    if (!global.browser.isMultiremote) {
      log.info(`Update (reloaded) job with sessionId ${oldSessionId}, ${status}`);
      return this._update(oldSessionId, this.failures, true);
    }

    const browserName = global.browser.instances.filter(browserName => global.browser[browserName].sessionId === newSessionId)[0];
    log.info(`Update (reloaded) multiremote job for browser '${browserName}' and sessionId ${oldSessionId}, ${status}`);
    return this._update(oldSessionId, this.failures, true, browserName);
  }

  async _update ( sessionId, failures, calledOnReload = false, browserName ) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    
    await sleep(5000)
    return await this.updateJob(sessionId, failures, calledOnReload, browserName);
  }

  async updateJob(sessionId, failures, calledOnReload = false, browserName) {
    const body = this.getBody(failures, calledOnReload, browserName);
    try{
    await new Promise((resolve, reject) => {
      this.api.updateSessionById(sessionId, body, (err, result) => {
        if (err) {
          return reject(err);
        }

        return resolve(result);
      });
    });
  }
  catch(ex){
    console.log(ex);
  }
    this.failures = 0;
  }

  getBody(failures, calledOnReload = false, browserName) {
    let body = {};
    if (!(!global.browser.isMultiremote && this.capabilities.name || global.browser.isMultiremote && this.capabilities[browserName].capabilities.name)) {
      let testName = this.suiteTitle
      if (this.testTitle){
        testName = testName + ' - ' + this.testTitle;
      }
      body.name = testName
      
      if (this.capabilities['LT:Options'] && this.capabilities['LT:Options'].name){
        body.name = this.capabilities['LT:Options'].name
      }
      
      if (browserName) {
        body.name = `${browserName}: ${body.name}`;
      }

      if (calledOnReload || this.testCnt) {
        let testCnt = ++this.testCnt;

        if (global.browser.isMultiremote) {
          testCnt = Math.ceil(testCnt / global.browser.instances.length);
        }

        body.name += ` (${testCnt})`;
      }
    }

    body.status_ind = failures > 0 ? 'failed' : 'passed';
    return body;
  }

}
