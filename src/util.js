/**
 * [Jasmine only] Get the parent suite name of a test
 * @param {string} fullTitle 
 * @param {string} testSuiteTitle 
 * @returns 
 */
export function getParentSuiteName(fullTitle, testSuiteTitle) {
    const fullTitleWords = fullTitle.split(' ');
    const testSuiteTitleWords = testSuiteTitle.split(' ');
    const shortestLength = Math.min(fullTitleWords.length, testSuiteTitleWords.length);
    let c = 0;
    let parentSuiteName = '';
    while (c < shortestLength && fullTitleWords[c] === testSuiteTitleWords[c]) {
        parentSuiteName += fullTitleWords[c++] + ' ';
    }
    return parentSuiteName.trim();
}

/**
 * Get correct browser capabilities object in both multiremote and normal setups
 * @param browser browser object
 * @param caps browser capbilities object. In case of multiremote, the object itself should have a property named 'capabilities'
 * @param browserName browser name in case of multiremote
 */
export function getBrowserCapabilities(browser, caps, browserName) {
    if (!browser.isMultiremote) {
        return { ...browser.capabilities, ...caps };
    }
    const multiCaps = caps;
    const globalCap = browserName && browser[browserName] ? browser[browserName].capabilities : {};
    const cap = browserName && multiCaps[browserName] ? multiCaps[browserName].capabilities : {};
    return { ...globalCap, ...cap };
}

/**
 * Check for LambdaTest capabilities.
 * @param {any=} cap browser capabilities
 */
export function isLambdatestCapability(cap) {
    return Boolean(
        cap &&
            cap['LT:Options'] &&
            // return false if the only cap in LT:Options is wdioService,
            // as that is added by the service and not present in user passed caps
            !(
                Object.keys(cap['LT:Options']).length === 1 &&
                cap['LT:Options'].wdioService
            )
    );
}
