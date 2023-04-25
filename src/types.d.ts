export interface SessionNameOptions {
    /**
     * Cucumber only. Set the session name to the Scenario name if only a single Scenario ran.
     * Useful when running in parallel with [wdio-cucumber-parallel-execution](https://github.com/SimitTomar/wdio-cucumber-parallel-execution).
     * @default false
     */
    preferScenarioName?: boolean;
    /**
     * Customize the session name format.
     * @default undefined
     */
    sessionNameFormat?: (
        config: Object,
        capabilities: Object | Object[],
        suiteTitle: string,
        testTitle?: string
    ) => string;
    /**
     * Mocha only. Do not append the test title to the session name.
     * @default false
     */
    sessionNameOmitTestTitle?: boolean;
    /**
     * Mocha only. Prepend the top level suite title to the session name.
     * @default false
     */
    sessionNamePrependTopLevelSuiteTitle?: boolean;
    /**
     * Automatically set the session name.
     * @default true
     */
    setSessionName?: boolean;
    /**
     * Automatically set the session status (passed/failed).
     * @default true
     */
    setSessionStatus?: boolean;
}

export interface LTOptions {
    username?: string;
    accessKey?: string;
    geoLocation?: string;
    /** record screenshots */
    visual?: boolean;
    video?: boolean;
    platformName?: string;
    resolution?: string;
    headless?: boolean;
    /** Selenium CDP */
    seCdp?: boolean;
    network?: boolean;
    timezone?: string;
    build?: string;
    /** project name */
    project?: string;
    buildTags?: string[];
    smartUiProject?: string;
    /** test name */
    name?: string;
    /** test tags */
    tags?: string[];
    /** for local testing */
    tunnel?: boolean;
    console?: 'false' | 'true' | 'info' | 'warn' | 'error';
    networkThrottling?: string;
    selenium_version?: string;
    driver_version?: string;
    w3c?: boolean;
    plugin?: string;
}
