// @ts-check
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
  failures = 0;
  failureStatuses = ['failed', 'ambiguous', 'undefined', 'unknown'];
  fullTitle;
  isServiceEnabled = true;
  options = DEFAULT_OPTIONS;
  scenariosThatRan = [];
  specsRan = false;
  suiteTitle;
  testCnt = 0;
  testTitle;

  constructor(options, capabilities, config) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this._capabilities = capabilities;
    this._config = config;
    this.testCnt = 0;
    this.failures = 0;
    // Cucumber specific
    const strict = Boolean(this._config?.cucumberOpts && this._config?.cucumberOpts?.strict);
    // See https://github.com/cucumber/cucumber-js/blob/master/src/runtime/index.ts#L136
    if (strict) {
      this.failureStatuses.push('pending');
    }
  }

  before(caps, specs, browser) {
    this._browser = browser;
    this.scenariosThatRan = [];
  }

  beforeSession(config, capabilities) {
    this._config = config;
    this._capabilities = capabilities;
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

    this.isServiceEnabled = lambdaCredentials.username && lambdaCredentials.accessKey;

    try {
      this._api = LambdaRestClient.AutomationClient(lambdaCredentials);
    } catch (_) {
      this.isServiceEnabled = false;
    }
  }

  async beforeScenario(world, context) {
    if (!this.suiteTitle) {
      this.suiteTitle =
        world?.gherkinDocument?.feature?.name ||
        context?.document?.feature?.name ||
        world?.pickle?.name ||
        'unknown scenario';
      await this.setSessionName(this.suiteTitle);
    }
  }

  async beforeSuite(suite) {
    this.suiteTitle = suite.title;

    if (suite.title && suite.title !== 'Jasmine__TopLevel__Suite') {
      await this.setSessionName(suite.title);
    }
  }

  async beforeTest(test) {
    if (!this.isServiceEnabled) {
      return;
    }

    if (test.title && !this.testTitle) {
      this.testTitle = test.title;
    }

    let suiteTitle = this.suiteTitle;

    if (test.fullName) {
      // For Jasmine, `suite.title` is `Jasmine__TopLevel__Suite`.
      // This tweak allows us to set the real suite name.
      const testSuiteName = test.fullName.slice(0, test.fullName.indexOf(test.description || '') - 1);
      if (this.suiteTitle === 'Jasmine__TopLevel__Suite') {
        suiteTitle = testSuiteName;
      } else if (this.suiteTitle) {
        suiteTitle = getParentSuiteName(this.suiteTitle, testSuiteName);
      }
    }

    await this.setSessionName(suiteTitle, test);
  }

  async beforeFeature(uri, feature) {
    this.suiteTitle = feature.name;
    await this.setSessionName(this.suiteTitle);
  }

  async beforeStep(step) {
    if (!this.suiteTitle || this.suiteTitle == 'unknown scenario') {
      this.suiteTitle =
        step.document?.feature?.name ||
        step.step?.scenario?.name ||
        'unknown scenario';
      await this.setSessionName(this.suiteTitle);
    }
  }

  afterSuite(suite) {
    if (Object.prototype.hasOwnProperty.call(suite, 'error')) {
      ++this.failures;
    }
  }

  afterTest(test, context, { error, passed }) {
    this.specsRan = true;

    // remove failure if test was retried and passed
    // (Mocha only)
    if (test._retriedTest && passed) {
      --this.failures;
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
      ++this.failures;
    }
  }

  afterScenario(world, { passed }) {
    this.specsRan = true;
    if (!passed) {
      ++this.failures;
    }
    const status = world.result?.status.toLowerCase();
    if (status !== 'skipped') {
      this.scenariosThatRan.push(world.pickle.name || 'unknown pickle name');
    }
  }

  after(result) {
    if (!this.isServiceEnabled) {
      return;
    }

    let failures = this.failures;

    // set failures if user has bail option set in which case afterTest and
    // afterSuite aren't executed before after hook
    if (this._config.mochaOpts && this._config.mochaOpts.bail && Boolean(result)) {
      failures = 1;
    }

    if (result === 0) {
      failures = 0;
    }

    const { preferScenarioName } = this.options;
    // For Cucumber: Checks scenarios that ran (i.e. not skipped) on the session
    // Only 1 Scenario ran and option enabled => Redefine session name to Scenario's name
    if (preferScenarioName && this.scenariosThatRan.length === 1) {
      this.fullTitle = this.scenariosThatRan.pop();
    }

    const status = 'status: ' + (failures > 0 ? 'failed' : 'passed');

    if (!this._browser.isMultiremote) {
      log.info(`Update job with sessionId ${this._browser.sessionId}, ${status}`);
      return this._update(this._browser.sessionId, failures);
    }

    return Promise.all(Object.keys(this._capabilities).map(browserName => {
      log.info(`Update multiremote job for browser '${browserName}' and sessionId ${this._browser[browserName].sessionId}, ${status}`);
      return this._update(this._browser[browserName].sessionId, failures, false, browserName);
    }));
  }

  async onReload(oldSessionId, newSessionId) {
    if (!this.isServiceEnabled) {
      return;
    }

    const status = 'status: ' + (this.failures > 0 ? 'failed' : 'passed');

    if (!this._browser.isMultiremote) {
      log.info(`Update (reloaded) job with sessionId ${oldSessionId}, ${status}`);
      await this._update(oldSessionId, this.failures, true);
    } else {
      const browserName = this._browser.instances.filter(browserName => this._browser[browserName].sessionId === newSessionId)[0];
      log.info(`Update (reloaded) multiremote job for browser '${browserName}' and sessionId ${oldSessionId}, ${status}`);
      await this._update(oldSessionId, this.failures, true, browserName);
    }

    this.scenariosThatRan = [];
    delete this.suiteTitle;
    delete this.fullTitle;
  }

  async _update ( sessionId, failures, calledOnReload = false, browserName ) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(5000);
    return await this.updateJob(sessionId, failures, calledOnReload, browserName);
  }

  async updateJob(sessionId, failures, calledOnReload = false, browserName) {
    const body = this.getBody(failures, calledOnReload, browserName);
    try {
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
    this.failures = 0;
  }

  getBody(failures, calledOnReload = false, browserName) {
    let body = {};
    if (
      !(
        (!this._browser.isMultiremote && this._capabilities.name) ||
        (this._browser.isMultiremote &&
          this._capabilities[browserName].capabilities.name)
      )
    ) {
      body.name = this.fullTitle;

      if (this._capabilities['LT:Options'] && this._capabilities['LT:Options'].name) {
        body.name = this._capabilities['LT:Options'].name;
      }

      if (browserName) {
        body.name = `${browserName}: ${body.name}`;
      }

      if (calledOnReload || this.testCnt) {
        let testCnt = ++this.testCnt;

        if (this._browser.isMultiremote) {
          testCnt = Math.ceil(testCnt / this._browser.instances.length);
        }

        body.name += ` (${testCnt})`;
      }
    }
    body.status_ind = failures > 0 ? 'failed' : 'passed';
    return body;
  }

  async setSessionName(suiteTitle, test) {
    if (!this.options.setSessionName || !suiteTitle) {
        return;
    }

    let name = suiteTitle;
    if (this.options.sessionNameFormat) {
      name = this.options.sessionNameFormat(
          this._config,
          this._capabilities,
          suiteTitle,
          test?.title
      );
    } else if (test && !test.fullName) {
      // Mocha
      const pre = this.options.sessionNamePrependTopLevelSuiteTitle ? `${suiteTitle} - ` : '';
      const post = !this.options.sessionNameOmitTestTitle ? ` - ${test.title}` : '';
      name = `${pre}${test.parent}${post}`;
    }

    if (name !== this._fullTitle) {
      this._fullTitle = name;
      await this._setSessionName(name);
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
