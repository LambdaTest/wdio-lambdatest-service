import logger from "@wdio/logger";

import { getParentSuiteName, updateSessionById } from "./util.js";
import { appSessionURL, webSessionURL } from "./constants.js";

const log = logger("@wdio/lambdatest-service");

/** @type {import('./types.js').LTOptions & import('./types.js').SessionNameOptions} */
const DEFAULT_OPTIONS = {
  setSessionName: true,
  setSessionStatus: true,
  ignoreTestCountInName: false,
};

/**
 * LambdaTest service for WebdriverIO that manages test session metadata and status updates
 * Handles test lifecycle events and updates LambdaTest dashboard with test results
 * @class LambdaRestService
 */
export default class LambdaRestService {
  _api;
  _browser;
  _capabilities;
  _config;
  _failReasons = [];
  _failures = 0;
  _retryFailures = 0;
  _failureStatuses = ["failed", "ambiguous", "undefined", "unknown"];
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
  _useScenarioName;
  _lambdaCredentials;
  _currentTestTitle;
  //keep track of last reloaded session within a larger test-suite
  _lastReloadedSession;

  /**
   * @public
   * @param {Object} [options={}] - Service configuration options
   * @param {boolean} [options.setSessionName=true] - Whether to automatically set session names
   * @param {boolean} [options.setSessionStatus=true] - Whether to automatically set session status
   * @param {boolean} [options.ignoreTestCountInName=false] - Whether to ignore test count in session names
   * @param {boolean} [options.preferScenarioName=false] - Whether to prefer scenario names for Cucumber tests
   * @param {Function} [options.sessionNameFormat] - Custom session name formatting function
   * @param {boolean} [options.sessionNameOmitTestTitle=false] - Whether to omit test title from session name (Mocha only)
   * @param {boolean} [options.sessionNamePrependTopLevelSuiteTitle=false] - Whether to prepend top level suite title (Mocha only)
   * @param {Object} [capabilities={}] - WebDriver capabilities object
   * @param {Object} [config={}] - WebdriverIO configuration object
   * @param {string} [config.user] - LambdaTest username
   * @param {string} [config.key] - LambdaTest access key
   * @param {string} [config.product] - LambdaTest product type ('appAutomation' for mobile apps)
   * @param {string} [config.logFile] - Path to log file
   * @param {boolean} [config.ltErrorRemark] - Whether to send error remarks to LambdaTest
   * @param {boolean} [config.useScenarioName] - Whether to use scenario names for Cucumber tests
   */
  constructor(options = {}, capabilities = {}, config = {}) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
    this._capabilities = capabilities;
    this._config = config;
    this._testCnt = 0;
    this._failures = 0;
    // Cucumber specific
    const strict = Boolean(
      this._config?.cucumberOpts && this._config?.cucumberOpts?.strict
    );
    // See https://github.com/cucumber/cucumber-js/blob/master/src/runtime/index.ts#L136
    if (strict) {
      this._failureStatuses.push("pending");
    }
  }

  /**
   * Hook called before test execution begins
   * @public
   * @param {Object} caps - WebDriver capabilities
   * @param {string[]} specs - Array of test spec file paths
   * @param {Object} browser - WebDriver browser instance
   */
  before(caps, specs, browser) {
    this._browser = browser;
    this._scenariosThatRan = [];
  }

  /**
   * Hook called before a new WebDriver session is created
   * @public
   * @param {Object} config - WebdriverIO configuration object
   * @param {Object} capabilities - WebDriver capabilities for the session
   */
  beforeSession(config, capabilities) {
    this._config = { ...this._config, ...config };
    this._capabilities = { ...this._capabilities, ...capabilities };
    const lambdaCredentials = {
      username: this._config.user,
      accessKey: this._config.key,
      isApp: false,
    };

    if (this._config.product === "appAutomation") {
      lambdaCredentials.isApp = true;
    }

    if (this._config.logFile) {
      lambdaCredentials.logFile = this._config.logFile;
    }
    if (this._config.ltErrorRemark === true) {
      this._ltErrorRemark = true;
    }
    // Cucumber specific option to set test name from scenario
    if (this._config.useScenarioName === true) {
      this._useScenarioName = true;
    }

    this._isServiceEnabled =
      lambdaCredentials.username && lambdaCredentials.accessKey;
    this._lambdaCredentials = lambdaCredentials;
  }

  /**
   * Hook called before each Cucumber scenario executes
   * @public
   * @param {Object} world - Cucumber world object containing scenario information
   * @param {Object} context - Additional context information
   * @returns {Promise<void>} Promise that resolves when session name is set
   */
  async beforeScenario(world, context) {
    if (this._useScenarioName) {
      this._testTitle = world?.pickle?.name || "unknown scenario";
    } else if (!this._suiteTitle) {
      this._suiteTitle =
        world?.gherkinDocument?.feature?.name ||
        context?.document?.feature?.name ||
        world?.pickle?.name ||
        "unknown scenario";
    }
    await this.setSessionName(this._testTitle || this._suiteTitle);
  }

  /**
   * Hook called before each test suite executes
   * @public
   * @param {Object} suite - Test suite object
   * @param {string} suite.title - Title of the test suite
   * @returns {Promise<void>} Promise that resolves when session name is set
   */
  async beforeSuite(suite) {
    this._suiteTitle = suite.title;

    if (suite.title && suite.title !== "Jasmine__TopLevel__Suite") {
      await this.setSessionName(suite.title);
    }
  }

  /**
   * Hook called before each test executes
   * @public
   * @param {Object} test - Test object containing test information
   * @param {string} [test.title] - Title of the test
   * @param {string} [test.fullName] - Full name of the test (Jasmine)
   * @param {string} [test.parent] - Parent suite name
   * @returns {Promise<void>} Promise that resolves when session name is set
   */
  async beforeTest(test) {
    if (!this._isServiceEnabled) {
      return;
    }

    if (test && test?.parent !== undefined) {
      this._currentTestTitle = test?.parent;
      this._currentTestTitle = `${this._currentTestTitle} - ${test?.title}`;
    } else if (test && test?.fullName !== undefined) {
      this._currentTestTitle = test?.fullName;
    }

    if (test.title && !this._testTitle) {
      this._testTitle = test.title;
    }

    let suiteTitle = this._suiteTitle;

    if (test.fullName) {
      // For Jasmine, `suite.title` is `Jasmine__TopLevel__Suite`.
      // This tweak allows us to set the real suite name.
      const testSuiteName = test.fullName;
      if (this._suiteTitle === "Jasmine__TopLevel__Suite") {
        suiteTitle = testSuiteName;
      } else if (this._suiteTitle) {
        suiteTitle = getParentSuiteName(this._suiteTitle, testSuiteName);
      }
    }

    await this.setSessionName(suiteTitle, test);
  }

  /**
   * Hook called before each Cucumber feature executes
   * @public
   * @param {string} uri - URI of the feature file
   * @param {Object} feature - Cucumber feature object
   * @param {string} feature.name - Name of the feature
   * @returns {Promise<void>} Promise that resolves when session name is set
   */
  async beforeFeature(uri, feature) {
    this._suiteTitle = feature.name;
    await this.setSessionName(this._suiteTitle);
  }

  /**
   * Hook called before each Cucumber step executes
   * @public
   * @param {Object} step - Cucumber step object
   * @returns {Promise<void>} Promise that resolves when session name is set
   */
  async beforeStep(step) {
    if (!this._suiteTitle || this._suiteTitle == "unknown scenario") {
      this._suiteTitle =
        step.document?.feature?.name ||
        step.step?.scenario?.name ||
        "unknown scenario";
      await this.setSessionName(this._suiteTitle);
    }
  }

  /**
   * Hook called after each test suite completes
   * @public
   * @param {Object} suite - Test suite object
   */
  afterSuite(suite) {
    if (Object.prototype.hasOwnProperty.call(suite, "error")) {
      ++this._failures;
    }
  }

  /**
   * Hook called after each test completes
   * @public
   * @param {Object} test - Test object
   * @param {Object} context - Test context
   * @param {Object} result - Test result object
   * @param {Error} [result.error] - Error object if test failed
   * @param {boolean} result.passed - Whether the test passed
   */
  afterTest(test, context, { error, passed }) {
    this._specsRan = true;
    // remove failure if test was retried and passed
    // (Mocha only)
    if (test._retriedTest && passed) {
      --this._failures;
      this._retryFailures = 0;
      return;
    }

    // don't bump failure number if test was retried and still failed
    // (Mocha only)
    if (
      test._retriedTest &&
      !passed &&
      typeof test._currentRetry === "number" &&
      typeof test._retries === "number" &&
      test._currentRetry < test._retries
    ) {
      ++this._retryFailures;
      return;
    }

    const isJasminePendingError =
      typeof error === "string" && error.includes("marked Pending");
    if (!passed && !isJasminePendingError) {
      ++this._failures;
      ++this._retryFailures;
      this._failReasons.push((error && error.message) || "Unknown Error");
      this._error = error?.message || "Unknown Error";
      if (
        this._ltErrorRemark &&
        this._error !== null &&
        this._error !== undefined
      ) {
        this._setSessionRemarks(this._error);
      }
    }
  }

  /**
   * Hook called after each Cucumber scenario completes
   * @public
   * @param {Object} world - Cucumber world object
   * @param {Object} result - Scenario result object
   * @param {boolean} [result.passed] - Whether the scenario passed
   */
  afterScenario(world, result) {
    const { passed } = result || {};
    this._specsRan = true;
    const status = world.result?.status.toLowerCase();
    if (status !== "skipped") {
      this._scenariosThatRan.push(world.pickle.name || "unknown pickle name");
    }
    if (status && this._failureStatuses.includes(status)) {
      const exception =
        (world.result && world.result.message) ||
        (status === "pending"
          ? `Some steps/hooks are pending for scenario "${world.pickle.name}"`
          : "Unknown Error");
      ++this._failures;
      this._failReasons.push(exception);
    } else if (typeof passed !== "undefined" && !passed) {
      ++this._failures;
    }
  }

  /**
   * Hook called after all tests complete
   * @public
   * @param {number} result - Exit code (0 for success, >0 for failures)
   * @returns {Promise<void>|Promise<void[]>} Promise that resolves when session updates complete
   */
  after(result) {
    if (!this._isServiceEnabled) {
      return;
    }

    let failures = this._failures;

    // set _failures if user has bail option set in which case afterTest and
    // afterSuite aren't executed before after hook
    if (
      this._config.mochaOpts &&
      this._config.mochaOpts.bail &&
      Boolean(result)
    ) {
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

    const status = "status: " + (result > 0 ? "failed" : "passed");

    if (!this._browser.isMultiremote) {
      log.info(
        `Update job with sessionId ${this._browser.sessionId}, ${status}`
      );

      // Print session URL for single remote browser
      if (process.env.LOG_SESSION_URL === "true") {
        const sessionURL = this.getSessionURL(
          this._browser.sessionId,
          this._config.product
        );
        log.info(`Session URL: ${sessionURL}`);
      }

      // Use the failure value for result in case of reloaded sessions
      if (this._lastReloadedSession == this._browser.sessionId) {
        return this._update({
          sessionId: this._browser.sessionId,
          failures: failures,
        });
      }

      return this._update({
        sessionId: this._browser.sessionId,
        failures: result,
      });
    }

    return Promise.all(
      Object.keys(this._capabilities).map((browserName) => {
        log.info(
          `Update multiremote job for browser '${browserName}' and sessionId ${this._browser[browserName].sessionId}, ${status}`
        );

        // Print session URL for each remote browser
        if (process.env.LOG_SESSION_URL === "true") {
          const sessionURL = this.getSessionURL(
            this._browser[browserName].sessionId,
            this._config.product
          );
          log.info(`Session URL for ${browserName}: ${sessionURL}`);
        }

        return this._update({
          sessionId: this._browser[browserName].sessionId,
          failures: failures,
          calledOnReload: false,
          browserName: browserName,
        });
      })
    );
  }

  /**
   * Hook called when WebDriver session is reloaded
   * @public
   * @param {string} oldSessionId - ID of the session being replaced
   * @param {string} newSessionId - ID of the new session
   * @returns {Promise<void>} Promise that resolves when session update completes
   */
  async onReload(oldSessionId, newSessionId) {
    this._lastReloadedSession = newSessionId;
    if (!this._isServiceEnabled) {
      return;
    }

    const status =
      this._failures > 0 || this._retryFailures > 0 ? "failed" : "passed";

    if (!this._browser.isMultiremote) {
      log.info(
        `Update (reloaded) job with sessionId ${oldSessionId}, ${status}`
      );

      // Print session URL for single remote browser
      if (process.env.LOG_SESSION_URL === "true") {
        const sessionURL = this.getSessionURL(
          this._browser.sessionId,
          this._config.product
        );
        log.info(`Session URL: ${sessionURL}`);
      }

      await this._update({
        sessionId: oldSessionId,
        fullTitle: this._fullTitle,
        status: status,
        calledOnReload: true,
      });
    } else {
      const browserName = this._browser.instances.filter(
        (browserName) => this._browser[browserName].sessionId === newSessionId
      )[0];
      log.info(
        `Update (reloaded) multiremote job for browser '${browserName}' and sessionId ${oldSessionId}, ${status}`
      );

      // Print session URL for each remote browser
      if (process.env.LOG_SESSION_URL === "true") {
        const sessionURL = this.getSessionURL(
          this._browser[browserName].sessionId,
          this._config.product
        );
        log.info(`Session URL for ${browserName}: ${sessionURL}`);
      }

      await this._update({
        sessionId: oldSessionId,
        failures: this._failures,
        calledOnReload: true,
        browserName: browserName,
      });
    }

    this._failReasons = [];
    this._scenariosThatRan = [];
    delete this._fullTitle;
  }

  async _update({
    sessionId,
    fullTitle,
    status,
    failures,
    calledOnReload = false,
    browserName,
  }) {
    if (!this._options.setSessionStatus) {
      return;
    }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(5000);
    if (calledOnReload) {
      return await this.updateJob({
        sessionId,
        fullTitle,
        status,
        calledOnReload,
        browserName,
      });
    }
    return await this.updateJob({
      sessionId,
      _failures: failures,
      calledOnReload,
      browserName,
    });
  }

  /**
   * Updates job metadata on LambdaTest platform
   * @public
   * @param {Object} params - Job update parameters
   * @param {string} params.sessionId - Session ID to update
   * @param {string} [params.fullTitle] - Full title for the session
   * @param {string} [params.status] - Session status (passed/failed)
   * @param {number} [params._failures] - Number of failures
   * @param {boolean} [params.calledOnReload=false] - Whether called during session reload
   * @param {string} [params.browserName] - Browser name for multiremote sessions
   * @returns {Promise<void>} Promise that resolves when job update completes
   */
  async updateJob({
    sessionId,
    fullTitle,
    status,
    _failures,
    calledOnReload = false,
    browserName,
  }) {
    let body;
    if (calledOnReload) {
      body = this.getBody({ fullTitle, status, calledOnReload, browserName });
    } else {
      body = this.getBody({ _failures, calledOnReload, browserName });
    }
    try {
      await updateSessionById(sessionId, body, this._lambdaCredentials);
    } catch (ex) {
      console.log(ex);
    }
    this._failures = 0;
    this._retryFailures = 0;
  }

  /**
   * Generates the request body for session updates
   * @public
   * @param {Object} params - Parameters for body generation
   * @param {string} [params.fullTitle] - Full title for the session
   * @param {string} [params.status] - Session status (passed/failed)
   * @param {number} [params._failures] - Number of failures
   * @param {boolean} [params.calledOnReload=false] - Whether called during session reload
   * @param {string} [params.browserName] - Browser name for multiremote sessions
   * @returns {Object} Request body object for session update
   */
  getBody({
    fullTitle,
    status,
    _failures,
    calledOnReload = false,
    browserName,
  }) {
    let body = {};
    if (
      !(
        (!this._browser.isMultiremote && this._capabilities.name) ||
        (this._browser.isMultiremote &&
          this._capabilities[browserName].capabilities.name)
      )
    ) {
      body.name = this._fullTitle;
      if (calledOnReload) {
        body.name = fullTitle;
      }

      if (
        this._capabilities["LT:Options"] &&
        this._capabilities["LT:Options"].name
      ) {
        body.name = this._capabilities["LT:Options"].name;
      }

      if (browserName) {
        body.name = `${browserName}: ${body.name}`;
      }

      if (calledOnReload || this._testCnt) {
        let testCnt = ++this._testCnt;

        if (this._browser.isMultiremote) {
          testCnt = Math.ceil(testCnt / this._browser.instances.length);
        }
        if (!calledOnReload && !this._options.ignoreTestCountInName) {
          body.name += ` (${testCnt})`;
        }
      }
    }
    body.status_ind = _failures > 0 ? "failed" : "passed";
    if (calledOnReload) {
      body.status_ind = status;
    }
    return body;
  }

  /**
   * Sets the session name for the current test session
   * @public
   * @param {string} suiteTitle - Title of the test suite
   * @param {Object} [test] - Test object with additional naming information
   * @param {string} [test.title] - Title of the individual test
   * @param {string} [test.parent] - Parent suite name
   * @param {string} [test.fullName] - Full test name (Jasmine)
   * @returns {Promise<void>} Promise that resolves when session name is set
   */
  async setSessionName(suiteTitle, test) {
    if (!this._options.setSessionName || !suiteTitle) {
      return;
    }
    let name =
      this._useScenarioName && this._testTitle ? this._testTitle : suiteTitle;
    if (this._options.sessionNameFormat) {
      name = this._options.sessionNameFormat(
        this._config,
        this._capabilities,
        suiteTitle,
        test?.title
      );
    } else if (test && !test.fullName) {
      // Mocha
      const pre = this._options.sessionNamePrependTopLevelSuiteTitle
        ? `${suiteTitle} - `
        : "";
      const post = !this._options.sessionNameOmitTestTitle
        ? ` - ${test.title}`
        : "";
      name = `${pre}${test.parent}${post}`;
    }

    if (name !== this._fullTitle) {
      this._fullTitle = name;
      await this._setSessionName(name);
    }
  }

  async _setSessionRemarks(err) {
    try {
      const hookObject = {
        action: "setTestStatus",
        arguments: {
          status: "failed",
          remark: err,
        },
      };

      const errorCustom = `lambda-hook: ${JSON.stringify(hookObject)}`;
      await this._browser.executeScript(errorCustom.toString(), []);
    } catch (error) {
      console.log("Error setting session remarks:", error);
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
      return Promise.all(
        Object.keys(this._capabilities).map(async (browserName) => {
          const browser = this._browser[browserName];
          return await browser.executeScript(cmd.toString(), []);
        })
      );
    }
    return await this._browser.executeScript(cmd.toString(), []);
  }

  /**
   * Generates the session URL for accessing test results on LambdaTest dashboard
   * @param {string} sessionId - Session ID to generate URL for
   * @param {string} [product] - Product type ('appAutomation' for mobile apps, default for web)
   * @returns {string} Complete URL to access the test session on LambdaTest dashboard
   */
  getSessionURL(sessionId, product) {
    if (product === "appAutomation") {
      return `${appSessionURL}=${sessionId}`;
    }
    return `${webSessionURL}=${sessionId}`;
  }
}
