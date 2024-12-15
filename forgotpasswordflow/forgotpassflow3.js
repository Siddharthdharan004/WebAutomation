const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

(async () => {
    const inputURL = process.argv[2] || 'https://notionpress.com'; // User-provided URL or default
    let flowId;

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Validate the input URL
        if (!isValidURL(inputURL)) {
            throw new Error("Invalid URL provided.");
        }

        flowId = await createFlow();

        // Step 1: Navigate to the Home Page
        let startTime = Date.now();
        await page.goto(inputURL, { timeout: 60000 });
        const homePageTime = (Date.now() - startTime) / 1000;
        console.log(`Home Page Loaded in ${homePageTime} seconds`);
        await saveFlowTime(flowId, 'home_page_time', homePageTime);

        // Step 2: Navigate to the Login Page
        startTime = Date.now();
        await page.waitForSelector('a[href$="login"]', { visible: true, timeout: 30000 });
        const loginLink = await page.$('a[href$="login"]');
        await loginLink.evaluate(link => link.click());
        await page.waitForSelector('#email', { visible: true, timeout: 30000 });
        const loginPageTime = (Date.now() - startTime) / 1000;
        console.log(`Login Page Loaded in ${loginPageTime} seconds`);
        await saveFlowTime(flowId, 'login_page_time', loginPageTime);

        // Step 3: Navigate to Forgot Password Form
        console.log("Navigating to Forgot Password Form");
        startTime = Date.now();
        await page.waitForSelector('a.forgotPassLabel[href$="forgot"]', { visible: true, timeout: 30000 });
        const forgotPasswordLink = await page.$('a.forgotPassLabel[href$="forgot"]');
        await forgotPasswordLink.evaluate(link => link.click());

        // Wait for the form to load
        await page.waitForSelector('input#email.normaltextbox.form-control.emailid.forgot', { visible: true, timeout: 30000 });
        const forgotPasswordFormTime = (Date.now() - startTime) / 1000;
        console.log(`Forgot Password Form Loaded in ${forgotPasswordFormTime} seconds`);
        await saveFlowTime(flowId, 'forgot_password_form_time', forgotPasswordFormTime);

        console.log("Process Complete.");
        await browser.close();
    } catch (err) {
        console.error('Error:', err);
    }
})();

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function createFlow() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'admin',
        database: 'puppeteer_data'
    });

    try {
        const [results] = await connection.execute(
            'INSERT INTO forgot_password_flows (home_page_time, login_page_time, forgot_password_form_time) VALUES (NULL, NULL, NULL)'
        );
        console.log(`New flow created with ID: ${results.insertId}`);
        return results.insertId;
    } finally {
        await connection.end();
    }
}

async function saveFlowTime(flowId, column, time) {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'admin',
        database: 'puppeteer_data'
    });

    try {
        await connection.execute(
            `UPDATE forgot_password_flows SET ${column} = ? WHERE flow_id = ?`,
            [time, flowId]
        );
    } finally {
        await connection.end();
    }
}
