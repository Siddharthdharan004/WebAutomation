const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

(async () => {
    const inputURL = process.argv[2] || 'https://notionpress.com';
    const userEmail = 'test@example.com'; // Enter your test email here
    let flowId;

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        if (!isValidURL(inputURL)) {
            throw new Error("Invalid URL provided.");
        }

        flowId = await createFlow();

        // Step 1: Home Page Navigation
        let startTime = Date.now();
        await page.goto(inputURL, { timeout: 60000 });
        const homePageTime = (Date.now() - startTime) / 1000;
        console.log(`Home Page Loaded in ${homePageTime} seconds`);
        await saveFlowTime(flowId, 'home_page_time', homePageTime);

        // Step 2: Login Page Navigation
        startTime = Date.now();
        await page.waitForSelector('a[href$="login"]', { visible: true, timeout: 30000 });
        await page.click('a[href$="login"]');
        await page.waitForSelector('#email', { visible: true, timeout: 30000 });
        const loginPageTime = (Date.now() - startTime) / 1000;
        console.log(`Login Page Loaded in ${loginPageTime} seconds`);
        await saveFlowTime(flowId, 'login_page_time', loginPageTime);

        // Step 3: Forgot Password Form
        startTime = Date.now();
        await page.waitForSelector('a.forgotPassLabel[href$="forgot"]', { visible: true, timeout: 30000 });
        await page.click('a.forgotPassLabel[href$="forgot"]');
        await page.waitForSelector('input#email', { visible: true, timeout: 30000 });
        
        // Enter email credentials and click RESET
        await page.type('input#email', userEmail);
        await page.click('input#submitforgot'); // Click on the Reset button

        const forgotPasswordFormTime = (Date.now() - startTime) / 1000;
        console.log(`Forgot Password Form Loaded and Submitted in ${forgotPasswordFormTime} seconds`);
        await saveFlowTime(flowId, 'forgot_password_form_time', forgotPasswordFormTime);

        // Step 4: Wait for Confirmation Page
        console.log("Checking for Reset Confirmation Page");
        startTime = Date.now();
        await page.waitForSelector('div.changepwd', { visible: true, timeout: 30000 }); // Adjust selector if necessary
        const resetConfirmationTime = (Date.now() - startTime) / 1000;
        console.log(`Reset Confirmation Page Loaded in ${resetConfirmationTime} seconds`);
        await saveFlowTime(flowId, 'reset_confirmation_time', resetConfirmationTime);

        console.log("Forgot Password Flow Completed Successfully.");
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
            'INSERT INTO forgot_password_flows (home_page_time, login_page_time, forgot_password_form_time, reset_confirmation_time) VALUES (NULL, NULL, NULL, NULL)'
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
