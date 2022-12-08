import { LTOptions, SessionNameOptions } from './types';

export default class LambdaRestService {
    _api: any;
    _browser: any;
    _capabilities: any;
    _config: any;
    _failReasons: string[];
    _failures: number;
    _failureStatuses: string[];
    _fullTitle: string;
    _isServiceEnabled: boolean;
    _options: LTOptions;
    _scenariosThatRan: string[];
    _suiteTitle: string;
    _testCnt: number;
    _testTitle: string;
    constructor(options: LTOptions & SessionNameOptions, _caps: any, _config: any);
    beforeSession(config: any): void;
    before(caps: any, specs: string[], browser: any): Promise<void>;
    /**
     * Set the default job name at the suite level to make sure we account
     * for the cases where there is a long running `before` function for a
     * suite or one that can fail.
     * Don't do this for Jasmine because `suite.title` is `Jasmine__TopLevel__Suite`
     * and `suite.fullTitle` is `undefined`, so no alternative to use for the job name.
     */
    beforeSuite(suite: any): Promise<void>;
    beforeTest(test: any): Promise<void>;
    /**
     * For CucumberJS
     */
    beforeFeature(uri: unknown, feature: {
        name: string;
    }): Promise<void>;
    /**
     * Runs before a Cucumber Scenario.
     * @param world world object containing information on pickle and test step
     */
    beforeScenario(world: any): Promise<void>;
    /**
     * For CucumberJS
     */
    beforeStep(step: any): Promise<void>;
    afterTest(test: any, context: any, results: any): void;
    afterSuite(suite: any): void;
    after(result: number): Promise<void>;
    /**
     * For CucumberJS
     */
    afterScenario(world: any): void;
    onReload(oldSessionId: string, newSessionId: string): Promise<void>;
    update(status: string, failures: number): Promise<void>;
    _update(sessionId: string, failures: number, calledOnReload?: boolean, browserName?: string): Promise<void>;
    updateJob(sessionId: string, failures: number, calledOnReload?: boolean, browserName?: string): Promise<void>;
    getBody(failures: number, calledOnReload?: boolean, browserName?: string): { name: string; status_ind: string; }
    setSessionName(suiteTitle: string, test: any): Promise<void>;
    _setSessionName(sessionName: string): Promise<void>;
    _multiRemoteAction(action: (browserSessionId: string, browserName?: string) => Promise<void>): Promise<any>;
}
