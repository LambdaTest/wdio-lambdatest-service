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

/**
 * Updates a build by id
 * @param {string} buildId
 * @param {('passed'|'failed')} status
 * @param {any} lambdaCredentials
 */
export async function updateBuildById(buildId, lambdaCredentials, status){
    if (!buildId) return;
    const buildsUrl = lambdaCredentials.isApp
        ? `${baseUrlApp}${appVersion.latestVersion}/builds/${buildId}`
        : `${baseUrl}${version.latestVersion}/builds/${buildId}`;
    const body = { status };
    try {
        let config = {
            method: 'patch',
            maxBodyLength: Infinity,
            url: buildsUrl,
            headers: {
                'accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(lambdaCredentials.username + ':' + lambdaCredentials.accessKey).toString('base64')}`,
                'Content-Type': 'application/json'
            },
            data: body
        };
        let response = await axios.request(config);
        logger.info(response?.data);
    } catch (error) {
        logger.error(error);
    }
}

/**
 * Get a session by id
 * @param {string} sessionId
 * @param {any} lambdaCredentials
 */
export async function getSessionById(sessionId, lambdaCredentials){
    if (!sessionId) return undefined;
    const sessionUrl = lambdaCredentials?.isApp
        ? `${baseUrlApp}${appVersion.latestVersion}/sessions/${sessionId}`
        : `${baseUrl}${version.latestVersion}/sessions/${sessionId}`;
    try {
        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: sessionUrl,
            headers: {
                'accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(lambdaCredentials.username + ':' + lambdaCredentials.accessKey).toString('base64')}`
            }
        };
        const response = await axios.request(config);
        return response?.data;
    } catch (error) {
        logger.error(error);
        return undefined;
    }
}

/**
 * Update a build status based on a session id and exitCode
 * @param {string} sessionId
 * @param {any} lambdaCredentials
 * @param {number} exitCode 0 => passed, >0 => failed
 */
export async function updateBuildStatusForSession(sessionId, lambdaCredentials, exitCode) {
    try {
        const session = await getSessionById(sessionId, lambdaCredentials);
        const buildId = session?.data?.build_id;
        if (!buildId) {
            logger.error('Could not determine build_id from session');
            return;
        }
        const status = exitCode === 0 ? 'passed' : 'failed';
        await updateBuildById(buildId, lambdaCredentials, status);
    } catch (error) {
        logger.error(error);
    }
}