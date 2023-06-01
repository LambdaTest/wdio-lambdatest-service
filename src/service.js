import LambdaRestClient from '@lambdatest/node-rest-client'
import logger from '@wdio/logger'

import { getParentSuiteName } from './util.js'

const log = logger('@wdio/lambdatest-service')

/** @type {import('./types.js').LTOptions & import('./types.js').SessionNameOptions} */
const DEFAULT_OPTIONS = {
  setSessionName: true,
  setSessionStatus: true
};

export default class LambdaRestService {
  _api;
  _browser;
  _capabilities;
  _config;
  _failReasons = [];
  _failures = 0;
  _failureStatuses = ['failed', 'ambiguous', 'undefined', 'unknown'];
  _fullTitle;
  _isServiceEnabled = true;
  _options = DEFAULT_OPTIONS;
  _scenariosThatRan = [];
  _specsRan = false;
  _suiteTitle;
  _testCnt = 0;
  _testTitle;
  _error;
  _ltErrorRemark;

  constructor(options = {}, capabilities = {}, config = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._capabilities = capabilities;
    this._config = config;
    this._testCnt = 0;
    this._failures = 0;
    // Cucumber specific
    const strict = Boolean(this._config?.cucumberOpts && this._config?.cucumberOpts?.strict);
    // See https://github.com/cucumber/cucumber-js/blob/master/src/runtime/index.ts#L136
    if (strict) {
      this._failureStatuses.push('pending');
    }
  }

  before(caps, specs, browser) {
    this._browser = browser;
    this._scenariosThatRan = [];
  }

  beforeSession(config, capabilities) {
    this._config = { ...this._config, ...config };
    this._capabilities = { ...this._capabilities, ...capabilities };
    const lambdaCredentials = {
      username: this._config.user,
      accessKey: this._config.key,
      isApp : false
    };

    if (this._config.product === 'appAutomation') {
      lambdaCredentials.isApp = true;
    }

    if (this._config.logFile) {
      lambdaCredentials.logFile = this._config.logFile;
    }
    if(this._config.ltErrorRemark ===true)
    {
      this._ltErrorRemark=true;
    }

    this._isServiceEnabled = lambdaCredentials.username && lambdaCredentials.accessKey;

    try {
      this._api = LambdaRestClient.AutomationClient(lambdaCredentials);
    } catch (_) {
      this._isServiceEnabled = false;
    }
  }

  async beforeScenario(world, context) {
    if (!this._suiteTitle) {
      this._suiteTitle =
        world?.gherkinDocument?.feature?.name ||
        context?.document?.feature?.name ||
        world?.pickle?.name ||
        'unknown scenario';
      await this.setSessionName(this._suiteTitle);
    }
  }

  async beforeSuite(suite) {
    this._suiteTitle = suite.title;

    if (suite.title && suite.title !== 'Jasmine__TopLevel__Suite') {
      await this.setSessionName(suite.title);
    }
  }

  async beforeTest(test) {
    if (!this._isServiceEnabled) {
      return;
    }

    if (test.title && !this._testTitle) {
      this._testTitle = test.title;
    }

    let suiteTitle = this._suiteTitle;

    if (test.fullName) {
      // For Jasmine, `suite.title` is `Jasmine__TopLevel__Suite`.
      // This tweak allows us to set the real suite name.
      const testSuiteName = test.fullName;
      if (this._suiteTitle === 'Jasmine__TopLevel__Suite') {
        suiteTitle = testSuiteName;
      } else if (this._suiteTitle) {
        suiteTitle = getParentSuiteName(this._suiteTitle, testSuiteName);
      }
    }

    await this.setSessionName(suiteTitle, test);
  }

  async beforeFeature(uri, feature) {
    this._suiteTitle = feature.name;
    await this.setSessionName(this._suiteTitle);
  }

  async beforeStep(step) {
    if (!this._suiteTitle || this._suiteTitle == 'unknown scenario') {
      this._suiteTitle =
        step.document?.feature?.name ||
        step.step?.scenario?.name ||
        'unknown scenario';
      await this.setSessionName(this._suiteTitle);
    }
  }

  afterSuite(suite) {
    if (Object.prototype.hasOwnProperty.call(suite, 'error')) {
      ++this._failures;
    }
  }

  afterTest(test, context, { error, passed }) {
    this._specsRan = true;

    // remove failure if test was retried and passed
    // (Mocha only)
    if (test._retriedTest && passed) {
      --this._failures;
      return;
    }

    // don't bump failure number if test was retried and still failed
    // (Mocha only)
    if (
      test._retriedTest &&
      !passed &&
      (
        typeof test._currentRetry === 'number' &&
        typeof test._retries === 'number' &&
        test._currentRetry < test._retries
      )
    ) {
      return;
    }

    const isJasminePendingError = typeof error === 'string' && error.includes('marked Pending');
    if (!passed && !isJasminePendingError) {
      ++this._failures;
      this._failReasons.push((error && error.message) || 'Unknown Error')
      this._error=error.message || 'Unknown Error';
    }
  }

  afterScenario(world, result) {
    const { passed } = result || {};
    this._specsRan = true;
    const status = world.result?.status.toLowerCase();
    if (status !== 'skipped') {
      this._scenariosThatRan.push(world.pickle.name || 'unknown pickle name');
    }
    if (status && this._failureStatuses.includes(status)) {
      const exception = (
        (world.result && world.result.message) ||
        (status === 'pending'
          ? `Some steps/hooks are pending for scenario "${world.pickle.name}"`
          : 'Unknown Error'
        )
      )
      ++this._failures;
      this._failReasons.push(exception)
    } else if (typeof passed !== 'undefined' && !passed) {
      ++this._failures;
    }
  }

  after(result) {
    if (!this._isServiceEnabled) {
      return;
    }

    let failures = this._failures;

    // set _failures if user has bail option set in which case afterTest and
    // afterSuite aren't executed before after hook
    if (this._config.mochaOpts && this._config.mochaOpts.bail && Boolean(result)) {
      failures = 1;
    }

    if (result === 0) {
      failures = 0;
    }

    const { preferScenarioName } = this._options;
    // For Cucumber: Checks scenarios that ran (i.e. not skipped) on the session
    // Only 1 Scenario ran and option enabled => Redefine session name to Scenario's name
    if (preferScenarioName && this._scenariosThatRan.length === 1) {
      this._fullTitle = this._scenariosThatRan.pop();
    }

    const status = 'status: ' + (result > 0 ? 'failed' : 'passed');

    if (!this._browser.isMultiremote) {
      log.info(`Update job with sessionId ${this._browser.sessionId}, ${status}`);
      return this._update(this._browser.sessionId, result);
    }

    return Promise.all(Object.keys(this._capabilities).map(browserName => {
      log.info(`Update multiremote job for browser '${browserName}' and sessionId ${this._browser[browserName].sessionId}, ${status}`);
      return this._update(this._browser[browserName].sessionId, failures, false, browserName);
    }));
  }

  async onReload(oldSessionId, newSessionId) {
    if (!this._isServiceEnabled) {
      return;
    }

    const status = 'status: ' + (this._failures > 0 ? 'failed' : 'passed');

    if (!this._browser.isMultiremote) {
      log.info(`Update (reloaded) job with sessionId ${oldSessionId}, ${status}`);
      await this._update(oldSessionId, this._failures, true);
    } else {
      const browserName = this._browser.instances.filter(browserName => this._browser[browserName].sessionId === newSessionId)[0];
      log.info(`Update (reloaded) multiremote job for browser '${browserName}' and sessionId ${oldSessionId}, ${status}`);
      await this._update(oldSessionId, this._failures, true, browserName);
    }

    this._failReasons = [];
    this._scenariosThatRan = [];
    delete this._suiteTitle;
    delete this._fullTitle;
  }

  async _update(sessionId, failures, calledOnReload = false, browserName) {
    if (!this._options.setSessionStatus) {
      return;
    }
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(5000);
    return await this.updateJob(sessionId, failures, calledOnReload, browserName);
  }

  async updateJob(sessionId, _failures, calledOnReload = false, browserName) {
    const body = this.getBody(_failures, calledOnReload, browserName);
    try {
      if(this._ltErrorRemark && this._error !== null && this._error !== undefined)
      {
      await this._setSessionRemarks(this._error);
      }
      
      await new Promise((resolve, reject) => {
        if (!this._api) {
          return reject(new Error('LambdaTest service is not enabled'));
        }
        this._api.updateSessionById(sessionId, body, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    } catch (ex) {
      console.log(ex);
    }
    this._failures = 0;
  }

  getBody(_failures, calledOnReload = false, browserName) {
    let body = {};
    if (
      !(
        (!this._browser.isMultiremote && this._capabilities.name) ||
        (this._browser.isMultiremote &&
          this._capabilities[browserName].capabilities.name)
      )
    ) {
      body.name = this._fullTitle;

      if (this._capabilities['LT:Options'] && this._capabilities['LT:Options'].name) {
        body.name = this._capabilities['LT:Options'].name;
      }

      if (browserName) {
        body.name = `${browserName}: ${body.name}`;
      }

      if (calledOnReload || this._testCnt) {
        let testCnt = ++this._testCnt;

        if (this._browser.isMultiremote) {
          testCnt = Math.ceil(testCnt / this._browser.instances.length);
        }

        body.name += ` (${testCnt})`;
      }
    }
    body.status_ind = _failures > 0 ? 'failed' : 'passed';
    return body;
  }

  async setSessionName(suiteTitle, test) {
    if (!this._options.setSessionName || !suiteTitle) {
        return;
    }

    let name = suiteTitle;
    if (this._options.sessionNameFormat) {
      name = this._options.sessionNameFormat(
          this._config,
          this._capabilities,
          suiteTitle,
          test?.title
      );
    } else if (test && !test.fullName) {
      // Mocha
      const pre = this._options.sessionNamePrependTopLevelSuiteTitle ? `${suiteTitle} - ` : '';
      const post = !this._options.sessionNameOmitTestTitle ? ` - ${test.title}` : '';
      name = `${pre}${test.parent}${post}`;
    }

    if (name !== this.__fullTitle) {
      this.__fullTitle = name;
      await this._setSessionName(name);
    }
  }

  async _setSessionRemarks(err){
    let replacedString = err.replace(/"/g, "'");
    let errorCustom =`lambda-hook: {"action": "setTestStatus","arguments": {"status":"failed","remark":"${replacedString}"}}`;
    try {
      await this._browser.execute(errorCustom);
    } catch (error) {
      console.log(error)
    } 
  }

  async _setSessionName(sessionName) {
    await this._executeCommand(`lambda-name=${sessionName}`);
  }

  async _executeCommand(cmd) {
    if (!this._browser) {
      return;
    }
    if (this._browser.isMultiremote) {
      return Promise.all(Object.keys(this._capabilities).map(async (browserName) => {
        const browser = this._browser[browserName];
        return await browser.execute(cmd);
      }));
    }
    return await this._browser.execute(cmd);
  }
}
