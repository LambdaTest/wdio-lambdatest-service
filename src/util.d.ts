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

/**
 * Updates a build by id
 * @param {string} buildId
 * @param {('passed'|'failed')} status
 * @param {any} lambdaCredentials
 * @returns 
 */
export declare function updateBuildById(buildId: string, lambdaCredentials: any, status: string): Promise<void>;

/**
 * Get a session by id
 * @param {string} sessionId
 * @param {any} lambdaCredentials
 * @returns 
 */
export declare function getSessionById(sessionId: string, lambdaCredentials: any): Promise<any>;

/**
 * Update a build status based on a session id and exitCode
 * @param {string} sessionId
 * @param {any} lambdaCredentials { username, accessKey, isApp? }
 * @param {number} exitCode 0 => passed, >0 => failed
 * @returns 
 */
export declare function updateBuildStatusForSession(sessionId: string, lambdaCredentials: any, exitCode: number): Promise<void>;