/**
 * [Jasmine only] Get the parent suite name of a test
 * @param fullTitle 
 * @param testSuiteTitle 
 * @returns 
 */
export declare function getParentSuiteName(fullTitle: string, testSuiteTitle: string): string;

/**
 * Updates the session using sessionId
 * @param {string} sessionId 
 * @param {any} data
 * @param {any} lambdaCredentials
 * @returns 
 */
export declare function updateSessionById(sessionId: string, data: any, lambdaCredentials: any, callback: any): Promise<void>;