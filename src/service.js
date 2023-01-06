// @ts-check
import LambdaRestClient from '@lambdatest/node-rest-client'
import logger from '@wdio/logger'
import { getBrowserCapabilities, getParentSuiteName, isLambdatestCapability } from './util';

const log = logger('@wdio/lambdatest-service');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** @type {import('./types').LTOptions & import('./types').SessionNameOptions} */
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
  _isServiceEnabled = false;
  _options = DEFAULT_OPTIONS;
  _scenariosThatRan = [];
  _suiteTitle;
  _testCnt = 0
  _testTitle;

  /**
   * @param {import('./types').LTOptions & import('./types').SessionNameOptions} options
   * @param capabilities
   * @param config
   */
  constructor(options = {}, capabilities, config) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._capabilities = capabilities;
    this._config = config;

    // Cucumber specific
    const strict = Boolean(this._config?.cucumberOpts && this._config?.cucumberOpts?.strict);
    // See https://github.com/cucumber/cucumber-js/blob/master/src/runtime/index.ts#L136
    if (strict) {
      this._failureStatuses.push('pending');
    }
  }

  beforeSession(config, capabilities) {
    this._config = config;
    this._capabilities = capabilities;

    this._isServiceEnabled = this._config.user && this._config.key;

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

    try {
      this._api = LambdaRestClient.AutomationClient(lambdaCredentials);
    } catch (_) {
      this._isServiceEnabled = false;
    }
  }

  before(capabilities, specs, browser) {
    this._browser = browser ? browser : global.browser;
    this._scenariosThatRan = [];
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
    if (test.title && !this._testTitle){
      this._testTitle = test.title;
    }

    let suiteTitle = this._suiteTitle;
    if (test.fullName) {
      // For Jasmine, `suite.title` is `Jasmine__TopLevel__Suite`.
      // This tweak allows us to set the real suite name.
      const testSuiteName = test.fullName.slice(0, test.fullName.indexOf(test.description || '') - 1);
      if (this._suiteTitle === 'Jasmine__TopLevel__Suite') {
          suiteTitle = testSuiteName;
      } else if (this._suiteTitle) {
          suiteTitle = getParentSuiteName(this._suiteTitle, testSuiteName);
      }
    }

    await this.setSessionName(suiteTitle, test)
    // await this._setAnnotation(`Test: ${test.fullName ?? test.title}`)
  }

  /** Runs before a Cucumber Feature */
  async beforeFeature(uri, feature) {
    this._suiteTitle = feature.name;
    await this.setSessionName(feature.name);
    // await this._setAnnotation(`Feature: ${feature.name}`);
  }

  /** Runs before a Cucumber Scenario */
  async beforeScenario(world, context) {
    const scenarioName = world.pickle.name || 'unknown scenario';
    if (!this._suiteTitle) {
      this._suiteTitle =
        world.gherkinDocument?.feature?.name ||
        context.document?.feature?.name ||
        scenarioName;
      await this.setSessionName(this._suiteTitle);
    }
    // await this._setAnnotation(`Scenario: ${scenarioName}`);
  }

  async beforeStep(step) {
    if (!this._suiteTitle || this._suiteTitle == 'unknown scenario') {
      this._suiteTitle =
        step.document?.feature?.name ||
        step.step?.scenario?.name ||
        'unknown scenario';
      await this.setSessionName(this._suiteTitle);
    }
    // await this._setAnnotation(`Step: ${step.keyword}${step.text}`)
  }

  afterSuite(suite) {
    if (Object.prototype.hasOwnProperty.call(suite, 'error')) {
      ++this._failures;
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
      ++this._failures;
      this._failReasons.push((error && error.message) || 'Unknown Error');
    }
  }

  afterScenario(world, { passed, error, duration }) {
    console.log(error, duration)
    if (!passed) {
      ++this._failures;
    }
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
        );
        this._failReasons.push(exception);
    }
  }

  async after(result) {
    if (!this._isServiceEnabled) {
      return;
    }

    let failures = this._failures;
    if (this._browser.config.mochaOpts && this._browser.config.mochaOpts.bail && result) {
      failures = 1;
    }
    if (result === 0) {
      failures = 0;
    }

    const { preferScenarioName } = this._options;
    // For Cucumber: Checks scenarios that ran (i.e. not skipped) on the session
    // Only 1 Scenario ran and option enabled => Redefine session name to Scenario's name
    if (preferScenarioName && this._scenariosThatRan.length === 1){
      this._fullTitle = this._scenariosThatRan.pop();
    }

    const status = 'status: ' + (failures > 0 ? 'failed' : 'passed');
    this.update(status, failures);
  }

  async onReload(oldSessionId, newSessionId) {
    if (!this._isServiceEnabled) {
      return Promise.resolve();
    }

    const status = 'status: ' + (this._failures > 0 ? 'failed' : 'passed');

    if (!this._browser.isMultiremote) {
      log.info(`Update (reloaded) job with sessionId ${oldSessionId}, ${status}`);
      await this._update(oldSessionId, this._failures, true);
    }

    const browserName = this._browser.instances.filter(browserName => this._browser[browserName].sessionId === newSessionId)[0];
    log.info(`Update (reloaded) multiremote job for browser '${browserName}' and sessionId ${oldSessionId}, ${status}`);
    await this._update(oldSessionId, this._failures, true, browserName);

    this._scenariosThatRan = [];
    this._failReasons = [];
    delete this._suiteTitle;
    delete this._fullTitle;
  }

  async update(status, failures) {
    return this._multiRemoteAction((sessionId, browserName) => {
      const message = browserName
        ? `Update multiremote job for browser '${browserName}' and sessionId ${sessionId}, ${status}`
        : `Update job with sessionId ${sessionId}, ${status}`;
      log.info(message);
      return this._update(sessionId, failures, false, browserName);
    });
  }

  async _update(sessionId, failures, calledOnReload = false, browserName) {
    await sleep(5000)
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
    this._failures = 0;
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
    body.status_ind = failures > 0 ? 'failed' : 'passed';
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
      const multiRemoteBrowser = this._browser;
      return Promise.all(Object.keys(this._capabilities).map(async (browserName) => {
        const browser = multiRemoteBrowser[browserName];
        return await browser.execute(cmd);
      }))
    }
    return await this._browser.execute(cmd);
  }

  async _multiRemoteAction(action) {
    if (!this._browser) {
      return Promise.resolve();
    }
    if (!this._browser.isMultiremote) {
      return action(this._browser.sessionId);
    }
    return Promise.all(this._browser.instances
      .filter((browserName) => {
        const cap = getBrowserCapabilities(this._browser, this._capabilities, browserName);
        return isLambdatestCapability(cap);
      })
      .map((browserName) => action(this._browser[browserName].sessionId, browserName))
    );
  }
}
