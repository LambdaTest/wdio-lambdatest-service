const axios = require('axios');
const { version, appVersion, baseUrl, baseUrlApp } = require("./constants.js");

const logger = require('./logger')(process.env.LT_API_LOG_FILE);

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
 * Updates the session using sessionId
 * @param {string} sessionId 
 * @param {any} data
 * @param {any} lambdaCredentials
 * @returns 
 */
export async function updateSessionById(sessionId, data, lambdaCredentials){
    const sessionUrl = lambdaCredentials.isApp ? `${baseUrlApp}${appVersion.latestVersion}/sessions/${sessionId}` : `${baseUrl}${version.latestVersion}/sessions/${sessionId}`;
    let config = {
        method: 'patch',
        maxBodyLength: Infinity,
        url: sessionUrl,
        headers: {
            'accept': 'application/json',
            'Authorization': `Basic ${Buffer.from(lambdaCredentials.username + ':' + lambdaCredentials.accessKey).toString('base64')}`,
            'Content-Type': 'application/json'
        },
        data: data
    };
    try {
        let response = await axios.request(config);
        logger.info(response?.config?.data + response?.data);
    } catch (error) {
        logger.error(error); 
    }
}
