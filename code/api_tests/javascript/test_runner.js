#!/usr/bin/env node
/**
 * Simple REST API Tests for Personal Finance API
 * 
 * This script demonstrates how to test REST APIs using Node.js
 * Run with: node test_runner.js
 * 
 * Make sure your PHP API server is running on http://localhost:8080
 */

// Simple HTTP client using Node.js built-in modules
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Configuration
const API_BASE_URL = 'http://localhost:8080';
const RESULTS_FILE = path.join(__dirname, 'test_results.txt');
let apiToken = '';
const COLORS = {
    RESET: '\x1b[0m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null, rawData = false, token = apiToken) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers
        };

        let requestBody = null;
        if (data !== null) {
            requestBody = rawData ? String(data) : JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(requestBody);
        }

        const client = urlObj.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({
                        status: res.statusCode,
                        data: parsedData,
                        headers: res.headers,
                        ok: res.statusCode >= 200 && res.statusCode < 300
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: responseData,
                        headers: res.headers,
                        ok: false,
                        error: 'Invalid JSON response'
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject({
                status: 0,
                error: error.message,
                ok: false
            });
        });

        if (requestBody !== null) {
            req.write(requestBody);
        }

        req.end();
    });
}

// Helper function to print colored output
function printResult(testName, success, message, data = null) {
    const color = success ? COLORS.GREEN : COLORS.RED;
    const symbol = success ? '✅' : '❌';
    
    console.log(`${color}${symbol} ${testName}: ${message}${COLORS.RESET}`);
    
    if (data && process.argv.includes('--verbose')) {
        console.log(`${COLORS.CYAN}   Data: ${JSON.stringify(data, null, 2)}${COLORS.RESET}`);
    }
}

// Test functions
async function testServerConnection() {
    console.log(`${COLORS.BLUE}Testing server connection...${COLORS.RESET}`);
    
    try {
        const result = await makeRequest(API_BASE_URL);
        
        if (result.ok) {
            printResult('Server Connection', true, 'Server is responding correctly!', result.data);
            return true;
        } else {
            printResult('Server Connection', false, `Server returned status ${result.status}`, result.data);
            return false;
        }
    } catch (error) {
        printResult('Server Connection', false, `Connection failed: ${error.error}`, error);
        return false;
    }
}

async function testUnauthenticatedAccess() {
    console.log(`${COLORS.BLUE}Testing GET /budgets/current without a token...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/current`);
        if (result.status === 401 && result.data && result.data.error) {
            printResult('Unauthorized Access', true, 'Correctly returned 401', result.data);
            return true;
        }
        printResult('Unauthorized Access', false, `Expected 401, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Unauthorized Access', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testLogin() {
    console.log(`${COLORS.BLUE}Testing POST /login...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/login`, 'POST', {
            username: 'john',
            password: 'Secret123'
        });
        if (result.status === 200 && typeof result.data.token === 'string' && result.data.token.length > 0) {
            apiToken = result.data.token;
            printResult('Login', true, 'Received a non-empty bearer token', result.data);
            return true;
        }
        printResult('Login', false, `Expected a bearer token, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Login', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testLoginFailure() {
    console.log(`${COLORS.BLUE}Testing POST /login with incorrect credentials...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/login`, 'POST', {
            username: 'john',
            password: 'incorrect'
        });
        if (result.status === 401 && result.data && typeof result.data.error === 'string') {
            printResult('Login Failure', true, 'Correctly returned 401 with an error', result.data);
            return true;
        }
        printResult('Login Failure', false, `Expected 401 with an error, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Login Failure', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testGetCurrentBudget() {
    console.log(`${COLORS.BLUE}Testing GET /budgets/current...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/current`);
        const budget = result.data;
        if (result.status === 200 && budget && typeof budget.month === 'string' &&
            /^\d{4}-(0[1-9]|1[0-2])$/.test(budget.month) &&
            typeof budget.budget === 'number') {
            printResult('Get Current Budget', true, 'Received current budget', result.data);
            return true;
        }
        printResult('Get Current Budget', false, 'Expected a valid month and numeric budget', result.data);
        return false;
    } catch (error) {
        printResult('Get Current Budget', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testGetCurrentBudgetUnauthorized() {
    console.log(`${COLORS.BLUE}Testing GET /budgets/current with an invalid token...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/current`, 'GET', null, false, 'invalid-token');
        if (result.status === 401 && result.data && typeof result.data.error === 'string') {
            printResult('Get Current Budget Unauthorized', true, 'Correctly returned 401 with an error', result.data);
            return true;
        }
        printResult('Get Current Budget Unauthorized', false,
            `Expected 401 with an error, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Get Current Budget Unauthorized', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testPutCurrentBudget() {
    console.log(`${COLORS.BLUE}Testing PUT /budgets/current...${COLORS.RESET}`);

    const budget = {
        month: '2026-11',
        budget: 3000
    };

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/current`, 'PUT', budget);
        if (result.status === 200 && result.data &&
            result.data.month === budget.month &&
            result.data.budget === budget.budget) {
            printResult('Put Current Budget', true, 'Saved the November 2026 budget', result.data);
            return true;
        }
        printResult('Put Current Budget', false, 'Expected the saved month and budget', result.data);
        return false;
    } catch (error) {
        printResult('Put Current Budget', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testPutCurrentBudgetFailures() {
    console.log(`${COLORS.BLUE}Testing PUT /budgets/current failures...${COLORS.RESET}`);

    try {
        const unauthorized = await makeRequest(`${API_BASE_URL}/budgets/current`, 'PUT', {
            month: '2026-11',
            items: []
        }, false, '');
        const missingMonth = await makeRequest(`${API_BASE_URL}/budgets/current`, 'PUT', { items: [] });
        const unauthorizedIsValid = unauthorized.status === 401 &&
            unauthorized.data && typeof unauthorized.data.error === 'string';
        const missingMonthIsValid = missingMonth.status === 400 &&
            missingMonth.data && typeof missingMonth.data.error === 'string';

        if (unauthorizedIsValid && missingMonthIsValid) {
            printResult('Put Current Budget Failures', true, 'Correctly rejected missing token and month');
            return true;
        }
        printResult('Put Current Budget Failures', false,
            `Expected 401 and 400, got ${unauthorized.status} and ${missingMonth.status}`,
            { unauthorized: unauthorized.data, missingMonth: missingMonth.data });
        return false;
    } catch (error) {
        printResult('Put Current Budget Failures', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testGetRecurringItems() {
    console.log(`${COLORS.BLUE}Testing GET /budgets/recurring-items...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/recurring-items`);
        if (result.status === 200 && result.data && Array.isArray(result.data.items)) {
            printResult('Get Recurring Items', true, 'Received recurring items', result.data);
            return true;
        }
        printResult('Get Recurring Items', false, 'Expected 200 with an items array', result.data);
        return false;
    } catch (error) {
        printResult('Get Recurring Items', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testGetRecurringItemsUnauthorized() {
    console.log(`${COLORS.BLUE}Testing GET /budgets/recurring-items with an invalid token...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/recurring-items`, 'GET', null, false, 'invalid-token');
        if (result.status === 401 && result.data && typeof result.data.error === 'string') {
            printResult('Get Recurring Items Unauthorized', true, 'Correctly returned 401', result.data);
            return true;
        }
        printResult('Get Recurring Items Unauthorized', false, `Expected 401, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Get Recurring Items Unauthorized', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testCreateRecurringItem() {
    console.log(`${COLORS.BLUE}Testing POST /budgets/recurring-items...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/recurring-items`, 'POST', {
            name: `Test recurring item ${Date.now()}`,
            amount: 25
        });
        if (result.status === 201 && result.data && Number.isInteger(result.data.id) && result.data.id > 0) {
            printResult('Create Recurring Item', true, `Created item ${result.data.id}`, result.data);
            return result.data.id;
        }
        printResult('Create Recurring Item', false, 'Expected 201 with the created item ID', result.data);
        return false;
    } catch (error) {
        printResult('Create Recurring Item', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testCreateRecurringItemFailures() {
    console.log(`${COLORS.BLUE}Testing POST /budgets/recurring-items failures...${COLORS.RESET}`);

    try {
        const unauthorized = await makeRequest(`${API_BASE_URL}/budgets/recurring-items`, 'POST', {
            name: 'Test item',
            amount: 25
        }, false, '');
        const negativeAmount = await makeRequest(`${API_BASE_URL}/budgets/recurring-items`, 'POST', {
            name: 'Test item',
            amount: -1
        });
        const unauthorizedIsValid = unauthorized.status === 401 &&
            unauthorized.data && typeof unauthorized.data.error === 'string';
        const negativeAmountIsValid = negativeAmount.status === 400 &&
            negativeAmount.data && typeof negativeAmount.data.error === 'string';

        if (unauthorizedIsValid && negativeAmountIsValid) {
            printResult('Create Recurring Item Failures', true, 'Correctly rejected missing token and negative amount');
            return true;
        }
        printResult('Create Recurring Item Failures', false,
            `Expected 401 and 400, got ${unauthorized.status} and ${negativeAmount.status}`,
            { unauthorized: unauthorized.data, negativeAmount: negativeAmount.data });
        return false;
    } catch (error) {
        printResult('Create Recurring Item Failures', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testDeleteRecurringItem(itemId) {
    console.log(`${COLORS.BLUE}Testing DELETE /budgets/recurring-items/${itemId}...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/recurring-items/${itemId}`, 'DELETE');
        if (result.status !== 204) {
            printResult('Delete Recurring Item', false, `Expected 204, got ${result.status}`, result.data);
            return false;
        }

        const verifyResult = await makeRequest(`${API_BASE_URL}/budgets/recurring-items`);
        const isExcluded = verifyResult.status === 200 && verifyResult.data &&
            Array.isArray(verifyResult.data.items) &&
            !verifyResult.data.items.some(item => item.id === itemId);
        if (isExcluded) {
            printResult('Delete Recurring Item', true, 'Deleted item is no longer listed');
            return true;
        }
        printResult('Delete Recurring Item', false, 'Deleted item still appears in recurring items', verifyResult.data);
        return false;
    } catch (error) {
        printResult('Delete Recurring Item', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testDeleteRecurringItemFailures() {
    console.log(`${COLORS.BLUE}Testing DELETE /budgets/recurring-items failures...${COLORS.RESET}`);

    try {
        const unauthorized = await makeRequest(`${API_BASE_URL}/budgets/recurring-items/1`, 'DELETE', null, false, '');
        const itemsResult = await makeRequest(`${API_BASE_URL}/budgets/recurring-items`);
        if (itemsResult.status !== 200 || !itemsResult.data || !Array.isArray(itemsResult.data.items)) {
            printResult('Delete Recurring Item Failures', false, 'Could not find an unused item ID', itemsResult.data);
            return false;
        }
        const unknownId = itemsResult.data.items.reduce((maxId, item) =>
            Number.isInteger(item.id) ? Math.max(maxId, item.id) : maxId, 0) + 1;
        const unknownItem = await makeRequest(`${API_BASE_URL}/budgets/recurring-items/${unknownId}`, 'DELETE');
        const unauthorizedIsValid = unauthorized.status === 401 &&
            unauthorized.data && typeof unauthorized.data.error === 'string';
        const unknownIdIsValid = unknownItem.status === 404 &&
            unknownItem.data && typeof unknownItem.data.error === 'string';

        if (unauthorizedIsValid && unknownIdIsValid) {
            printResult('Delete Recurring Item Failures', true, 'Correctly rejected missing token and unknown ID');
            return true;
        }
        printResult('Delete Recurring Item Failures', false,
            `Expected 401 and 404, got ${unauthorized.status} and ${unknownItem.status}`,
            { unauthorized: unauthorized.data, unknownItem: unknownItem.data });
        return false;
    } catch (error) {
        printResult('Delete Recurring Item Failures', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testGetTransactions() {
    console.log(`${COLORS.BLUE}Testing GET /transactions...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/transactions`);
        if (result.status === 200 && result.data && Array.isArray(result.data.transactions)) {
            printResult('Get Transactions', true, 'Received transactions', result.data);
            return true;
        }
        printResult('Get Transactions', false, 'Expected 200 with a transactions array', result.data);
        return false;
    } catch (error) {
        printResult('Get Transactions', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testGetTransactionsUnauthorized() {
    console.log(`${COLORS.BLUE}Testing GET /transactions with an invalid token...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/transactions`, 'GET', null, false, 'invalid-token');
        if (result.status === 401 && result.data && typeof result.data.error === 'string') {
            printResult('Get Transactions Unauthorized', true, 'Correctly returned 401', result.data);
            return true;
        }
        printResult('Get Transactions Unauthorized', false, `Expected 401, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Get Transactions Unauthorized', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testCreateTransaction() {
    console.log(`${COLORS.BLUE}Testing POST /transactions...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/transactions`, 'POST', {
            month: '2026-11',
            name: `Test transaction ${Date.now()}`,
            amount: 25
        });
        if (result.status === 201 && result.data && Number.isInteger(result.data.id) && result.data.id > 0) {
            printResult('Create Transaction', true, `Created transaction ${result.data.id}`, result.data);
            return result.data.id;
        }
        printResult('Create Transaction', false, 'Expected 201 with the created transaction ID', result.data);
        return false;
    } catch (error) {
        printResult('Create Transaction', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testCreateTransactionFailures() {
    console.log(`${COLORS.BLUE}Testing POST /transactions failures...${COLORS.RESET}`);

    try {
        const unauthorized = await makeRequest(`${API_BASE_URL}/transactions`, 'POST', {
            month: '2026-11',
            name: 'Test transaction',
            amount: 25
        }, false, '');
        const negativeAmount = await makeRequest(`${API_BASE_URL}/transactions`, 'POST', {
            month: '2026-11',
            name: 'Test transaction',
            amount: -1
        });
        const unauthorizedIsValid = unauthorized.status === 401 &&
            unauthorized.data && typeof unauthorized.data.error === 'string';
        const negativeAmountIsValid = negativeAmount.status === 400 &&
            negativeAmount.data && typeof negativeAmount.data.error === 'string';

        if (unauthorizedIsValid && negativeAmountIsValid) {
            printResult('Create Transaction Failures', true, 'Correctly rejected missing token and negative amount');
            return true;
        }
        printResult('Create Transaction Failures', false,
            `Expected 401 and 400, got ${unauthorized.status} and ${negativeAmount.status}`,
            { unauthorized: unauthorized.data, negativeAmount: negativeAmount.data });
        return false;
    } catch (error) {
        printResult('Create Transaction Failures', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testDeleteTransaction(transactionId) {
    console.log(`${COLORS.BLUE}Testing DELETE /transactions/${transactionId}...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/transactions/${transactionId}`, 'DELETE');
        if (result.status === 204) {
            printResult('Delete Transaction', true, 'Deleted transaction');
            return true;
        }
        printResult('Delete Transaction', false, `Expected 204, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Delete Transaction', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testDeleteTransactionFailures() {
    console.log(`${COLORS.BLUE}Testing DELETE /transactions failures...${COLORS.RESET}`);

    try {
        const unauthorized = await makeRequest(`${API_BASE_URL}/transactions/1`, 'DELETE', null, false, '');
        const transactionsResult = await makeRequest(`${API_BASE_URL}/transactions`);
        if (transactionsResult.status !== 200 || !transactionsResult.data ||
            !Array.isArray(transactionsResult.data.transactions)) {
            printResult('Delete Transaction Failures', false, 'Could not find an unused transaction ID', transactionsResult.data);
            return false;
        }
        const unknownId = transactionsResult.data.transactions.reduce((maxId, transaction) =>
            Number.isInteger(transaction.id) ? Math.max(maxId, transaction.id) : maxId, 0) + 1;
        const unknownTransaction = await makeRequest(`${API_BASE_URL}/transactions/${unknownId}`, 'DELETE');
        const unauthorizedIsValid = unauthorized.status === 401 &&
            unauthorized.data && typeof unauthorized.data.error === 'string';
        const unknownIdIsValid = unknownTransaction.status === 404 &&
            unknownTransaction.data && typeof unknownTransaction.data.error === 'string';

        if (unauthorizedIsValid && unknownIdIsValid) {
            printResult('Delete Transaction Failures', true, 'Correctly rejected missing token and unknown ID');
            return true;
        }
        printResult('Delete Transaction Failures', false,
            `Expected 401 and 404, got ${unauthorized.status} and ${unknownTransaction.status}`,
            { unauthorized: unauthorized.data, unknownTransaction: unknownTransaction.data });
        return false;
    } catch (error) {
        printResult('Delete Transaction Failures', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testMonthlySpendingReport() {
    const month = '2026-11';
    console.log(`${COLORS.BLUE}Testing GET /reports/monthly-spending...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/reports/monthly-spending?month=${month}`);
        if (result.status === 200 && result.data && result.data.month === month &&
            typeof result.data.budgeted === 'number' && typeof result.data.transactions_total === 'number') {
            printResult('Monthly Spending Report', true, 'Received numeric budgeted and transaction totals', result.data);
            return true;
        }
        printResult('Monthly Spending Report', false,
            'Expected month and numeric budgeted and transaction totals', result.data);
        return false;
    } catch (error) {
        printResult('Monthly Spending Report', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testMonthlySpendingReportFailures() {
    console.log(`${COLORS.BLUE}Testing monthly spending report failures...${COLORS.RESET}`);

    try {
        const unauthorized = await makeRequest(
            `${API_BASE_URL}/reports/monthly-spending?month=2026-11`, 'GET', null, false, 'invalid-token');
        const malformedMonth = await makeRequest(
            `${API_BASE_URL}/reports/monthly-spending?month=invalid`);
        const unauthorizedIsValid = unauthorized.status === 401 &&
            unauthorized.data && typeof unauthorized.data.error === 'string';
        const malformedMonthIsValid = malformedMonth.status === 400 &&
            malformedMonth.data && typeof malformedMonth.data.error === 'string';

        if (unauthorizedIsValid && malformedMonthIsValid) {
            printResult('Monthly Spending Report Failures', true, 'Correctly rejected invalid token and month');
            return true;
        }
        printResult('Monthly Spending Report Failures', false,
            `Expected 401 and 400, got ${unauthorized.status} and ${malformedMonth.status}`,
            { unauthorized: unauthorized.data, malformedMonth: malformedMonth.data });
        return false;
    } catch (error) {
        printResult('Monthly Spending Report Failures', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

// --- Failure-case tests ---

async function testUnknownResource() {
    console.log(`${COLORS.BLUE}Testing GET /teachers (unknown resource)...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/teachers`);
        if (result.status === 404) {
            printResult('Unknown Resource', true, 'Correctly returned 404', result.data);
            return true;
        }
        printResult('Unknown Resource', false, `Expected 404, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Unknown Resource', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testInvalidId() {
    console.log(`${COLORS.BLUE}Testing GET /budgets/recurring-items/abc (invalid id)...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/budgets/recurring-items/abc`);
        if (result.status === 400) {
            printResult('Invalid ID', true, 'Correctly returned 400', result.data);
            return true;
        }
        printResult('Invalid ID', false, `Expected 400, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Invalid ID', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testMissingFields() {
    console.log(`${COLORS.BLUE}Testing POST /transactions with {} (missing fields)...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/transactions`, 'POST', {});
        if (isExpectedError(result, 400)) {
            printResult('Missing Fields', true, 'Correctly returned 400', result.data);
            return true;
        }
        printResult('Missing Fields', false, `Expected 400, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Missing Fields', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

function isExpectedError(result, status) {
    return result.status === status &&
        result.data &&
        typeof result.data.error === 'string' &&
        result.data.error.length > 0;
}

async function testBadRequestBody(testName, method, path, data, rawData = false) {
    console.log(`${COLORS.BLUE}Testing ${testName}...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}${path}`, method, data, rawData);
        if (isExpectedError(result, 400)) {
            printResult(testName, true, 'Got 400 with an error response', result.data);
            return true;
        }
        printResult(testName, false,
            `Expected 400 with success:false and an error message, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult(testName, false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testMalformedJson() {
    return testBadRequestBody('Malformed JSON', 'POST', '/transactions', '{bad json', true);
}

async function testArrayBody() {
    return testBadRequestBody('Array Body', 'POST', '/transactions', [1, 2]);
}

async function testInvalidFieldValues() {
    return testBadRequestBody('Invalid Field Values', 'POST', '/transactions',
        { month: 'invalid', name: ' ', amount: -1 });
}

async function testIncompletePut() {
    return testBadRequestBody('Incomplete PUT', 'PUT', '/budgets/current', { budget: 3000 });
}

async function testMethodNotAllowedItem() {
    console.log(`${COLORS.BLUE}Testing POST /transactions/1 (method not allowed)...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/transactions/1`, 'POST', {});
        const allow = result.headers && result.headers['allow'];
        if (result.status === 405 && allow === 'DELETE') {
            printResult('Method Not Allowed (item)', true,
                `Got 405 with Allow: ${result.headers['allow']}`, result.data);
            return true;
        }
        printResult('Method Not Allowed (item)', false,
            `Expected 405 + Allow header, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Method Not Allowed (item)', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

async function testMethodNotAllowedCollection() {
    console.log(`${COLORS.BLUE}Testing PUT /transactions (method not allowed)...${COLORS.RESET}`);

    try {
        const result = await makeRequest(`${API_BASE_URL}/transactions`, 'PUT', {});
        const allow = result.headers && result.headers['allow'];
        if (result.status === 405 && allow === 'GET, POST') {
            printResult('Method Not Allowed (collection)', true,
                `Got 405 with Allow: ${result.headers['allow']}`, result.data);
            return true;
        }
        printResult('Method Not Allowed (collection)', false,
            `Expected 405 + Allow header, got ${result.status}`, result.data);
        return false;
    } catch (error) {
        printResult('Method Not Allowed (collection)', false, `Request failed: ${error.error}`, error);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log(`${COLORS.MAGENTA}🚀 Starting REST API Tests for Personal Finance API${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}API Base URL: ${API_BASE_URL}${COLORS.RESET}`);
    console.log('');
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test 1: Server connection
    totalTests++;
    if (await testServerConnection()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testUnauthenticatedAccess()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testLogin()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testLoginFailure()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testGetCurrentBudget()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testGetCurrentBudgetUnauthorized()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testPutCurrentBudget()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testPutCurrentBudgetFailures()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testGetRecurringItems()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testGetRecurringItemsUnauthorized()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    const createdRecurringItemId = await testCreateRecurringItem();
    if (createdRecurringItemId) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testCreateRecurringItemFailures()) {
        passedTests++;
    }
    console.log('');

    if (createdRecurringItemId) {
        totalTests++;
        if (await testDeleteRecurringItem(createdRecurringItemId)) {
            passedTests++;
        }
        console.log('');
    }

    totalTests++;
    if (await testDeleteRecurringItemFailures()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testGetTransactions()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testGetTransactionsUnauthorized()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    const createdTransactionId = await testCreateTransaction();
    if (createdTransactionId) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testCreateTransactionFailures()) {
        passedTests++;
    }
    console.log('');

    if (createdTransactionId) {
        totalTests++;
        if (await testDeleteTransaction(createdTransactionId)) {
            passedTests++;
        }
        console.log('');
    }

    totalTests++;
    if (await testDeleteTransactionFailures()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testMonthlySpendingReport()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testMonthlySpendingReportFailures()) {
        passedTests++;
    }
    console.log('');
    
    // Failure cases for routing, input, and method validation
    totalTests++;
    if (await testUnknownResource()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testInvalidId()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testMissingFields()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testMalformedJson()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testArrayBody()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testInvalidFieldValues()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testIncompletePut()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testMethodNotAllowedItem()) {
        passedTests++;
    }
    console.log('');

    totalTests++;
    if (await testMethodNotAllowedCollection()) {
        passedTests++;
    }
    console.log('');
    
    // Summary
    console.log(`${COLORS.MAGENTA}📊 Test Summary${COLORS.RESET}`);
    console.log(`${COLORS.CYAN}Total Tests: ${totalTests}${COLORS.RESET}`);
    console.log(`${COLORS.GREEN}Passed: ${passedTests}${COLORS.RESET}`);
    console.log(`${COLORS.RED}Failed: ${totalTests - passedTests}${COLORS.RESET}`);
    
    if (passedTests === totalTests) {
        console.log(`${COLORS.GREEN}🎉 All tests passed!${COLORS.RESET}`);
    } else {
        console.log(`${COLORS.YELLOW}⚠️  Some tests failed. Check the output above.${COLORS.RESET}`);
        process.exitCode = 1;
    }
}

// Command line interface
if (require.main === module) {
    const output = [];
    const originalLog = console.log;
    const originalError = console.error;
    const captureOutput = (write) => (...args) => {
        output.push(util.format(...args).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, ''));
        write.apply(console, args);
    };

    console.log = captureOutput(originalLog);
    console.error = captureOutput(originalError);

    console.log(`${COLORS.CYAN}Simple REST API Testing Tool${COLORS.RESET}`);
    console.log(`${COLORS.YELLOW}Usage: node test_runner.js [--verbose]${COLORS.RESET}`);
    console.log(`Test results will be saved to ${RESULTS_FILE}`);
    console.log('');
    
    runAllTests().catch(error => {
        console.error(`${COLORS.RED}Fatal error: ${error.message}${COLORS.RESET}`);
        process.exitCode = 1;
    }).then(() => {
        try {
            fs.writeFileSync(RESULTS_FILE, `${output.join('\n')}\n`, 'utf8');
        } catch (error) {
            originalError(`Failed to write test results to ${RESULTS_FILE}: ${error.message}`);
            process.exitCode = 1;
        }
    });
}

module.exports = {
    makeRequest,
    testServerConnection,
    testUnauthenticatedAccess,
    testLogin,
    testLoginFailure,
    testGetCurrentBudget,
    testGetCurrentBudgetUnauthorized,
    testPutCurrentBudget,
    testPutCurrentBudgetFailures,
    testGetRecurringItems,
    testGetRecurringItemsUnauthorized,
    testCreateRecurringItem,
    testCreateRecurringItemFailures,
    testDeleteRecurringItem,
    testDeleteRecurringItemFailures,
    testGetTransactions,
    testGetTransactionsUnauthorized,
    testCreateTransaction,
    testCreateTransactionFailures,
    testDeleteTransaction,
    testDeleteTransactionFailures,
    testMonthlySpendingReport,
    testMonthlySpendingReportFailures,
    testUnknownResource,
    testInvalidId,
    testMissingFields,
    testMalformedJson,
    testArrayBody,
    testInvalidFieldValues,
    testIncompletePut,
    testMethodNotAllowedItem,
    testMethodNotAllowedCollection
};
