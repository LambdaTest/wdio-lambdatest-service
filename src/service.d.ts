import type { Services, Capabilities, Options, Frameworks } from '@wdio/types';
import type { Browser, MultiRemoteBrowser } from 'webdriverio';
import type { LTOptions, SessionNameOptions } from './types.js';

export default class LambdaRestService implements Services.ServiceInstance {
    private _api?;
    private _browser?;
    private _capabilities;
    private _config;
    private _failReasons;
    private _failures;
    private _failureStatuses;
    private _fullTitle?;
    private _isServiceEnabled;
    private _options;
    private _scenariosThatRan;
    private _specsRan;
    private _suiteTitle?;
    private _testCnt;
    private _testTitle?;
    private  _currrentTestTitle;

    constructor(options: LTOptions & SessionNameOptions, capabilities: Capabilities.RemoteCapability, config: Options.Testrunner);
    before(caps: Capabilities.RemoteCapability, specs: string[], browser: Browser<'async'> | MultiRemoteBrowser<'async'>): Promise<void>;
    beforeSession(config: Options.Testrunner, capabilities: Capabilities.RemoteCapability): void;
    /**
     * Runs before a Cucumber Scenario.
     * @param world world object containing information on pickle and test step
     */
    beforeScenario(world: Frameworks.World): Promise<void>;
    /**
     * Set the default job name at the suite level to make sure we account
     * for the cases where there is a long running `before` function for a
     * suite or one that can fail.
     * Don't do this for Jasmine because `suite.title` is `Jasmine__TopLevel__Suite`
     * and `suite.fullTitle` is `undefined`, so no alternative to use for the job name.
     */
    beforeSuite(suite: Frameworks.Suite): Promise<void>;
    beforeTest(test: Frameworks.Test): Promise<void>;
    /**
     * For CucumberJS
     */
    beforeFeature(uri: string, feature: {
        name: string;
    }): Promise<void>;
    /**
     * For CucumberJS
     */
    beforeStep(step: any): Promise<void>;
    afterSuite(suite: Frameworks.Suite): void;
    afterTest(test: Frameworks.Test, context: unknown, results: Frameworks.TestResult): void;
    /**
     * For CucumberJS
     */
    afterScenario(world: Frameworks.World, result: Frameworks.TestResult): void;
    after(result: number): Promise<void>;
    onReload(oldSessionId: string, newSessionId: string): Promise<void>;
    _update(sessionId: string, fullTitle: string, status: string, failures: number, calledOnReload?: boolean, browserName?: string): Promise<void>;
    updateJob(sessionId: string, fullTitle: string, status: string, failures: number, calledOnReload?: boolean, browserName?: string): Promise<void>;
    getBody(fullTitle: string, status: string, failures: number, calledOnReload?: boolean, browserName?: string): { name: string; status_ind: string; }
    setSessionName(suiteTitle: string, test: Frameworks.Test): Promise<void>;
    _setSessionName(sessionName: string): Promise<void>;
    _executeCommand(cmd: string): Promise<void>;
    getSessionURL(sessionId: string, product: string): string;
}
