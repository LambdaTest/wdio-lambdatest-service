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
