/**
 * [Jasmine only] Get the parent suite name of a test
 * @param fullTitle 
 * @param testSuiteTitle 
 * @returns 
 */
export declare function getParentSuiteName(fullTitle: string, testSuiteTitle: string): string;
/**
 * Get correct browser capabilities object in both multiremote and normal setups
 * @param browser browser object
 * @param caps browser capbilities object. In case of multiremote, the object itself should have a property named 'capabilities'
 * @param browserName browser name in case of multiremote
 */
export declare function getBrowserCapabilities(browser: Browser<'async'> | MultiRemoteBrowser<'async'>, caps?: Capabilities.RemoteCapability, browserName?: string): Capabilities.Capabilities;
/**
 * Check for LambdaTest capabilities.
 * @param cap browser capabilities
 */
export declare function isLambdatestCapability(cap?: Capabilities.Capabilities): boolean;
