const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const { navigateToURL } = require('./navigateToURL');
const { clickLoginButton } = require('./clickLoginButton');
const { fillLoginForm } = require('./fillLoginForm');

(async () => {
    const inputURL = process.argv[2] || 'https://notionpress.com';
    const userEmail = process.argv[3] || 'defaultemail@example.com';
    const userPassword = process.argv[4] || 'defaultpassword';
    const customSelector = process.argv[5]; // User-provided selector for login button

    const selectors = [
        'a[href*="login"]', 'a[href*="auth"]', 'a[href*="signin"]',
        'button:contains("Login")', 'a:contains("Sign In")',
        '.login-button', '[id*="login"]'
    ];

    let flowId;
    let browser;
    let connection;

    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'admin',
            database: 'puppeteer_data'
        });

        flowId = await createFlow(connection);

        // Step 1: Navigate to Home Page
        const homePageTime = await navigateToURL(page, inputURL);
        await saveFlowTime(connection, flowId, 'home_page_time', homePageTime);

        // Step 2: Click Login Button
        const loginPageTime = await clickLoginButton(page, selectors, customSelector);
        await saveFlowTime(connection, flowId, 'login_page_time', loginPageTime);

        // Step 3: Fill Login Form
        const dashboardPageTime = await fillLoginForm(page, userEmail, userPassword);
        await saveFlowTime(connection, flowId, 'dashboard_page_time', dashboardPageTime);

        console.log(`Flow ID: ${flowId} completed.`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (browser) {
            await browser.close(); // Ensure browser is properly closed
        }
        if (connection) {
            await connection.end(); // Close the database connection
        }
    }
})();

async function createFlow(connection) {
    const [results] = await connection.execute(
        'INSERT INTO navigation_flows (home_page_time, login_page_time, dashboard_page_time) VALUES (NULL, NULL, NULL)'
    );
    console.log(`New flow created with ID: ${results.insertId}`);
    return results.insertId;
}

async function saveFlowTime(connection, flowId, column, time) {
    await connection.execute(
        `UPDATE navigation_flows SET ${column} = ? WHERE flow_id = ?`,
        [time, flowId]
    );
}
