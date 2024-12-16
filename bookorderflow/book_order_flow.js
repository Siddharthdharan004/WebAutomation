const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

(async () => {
    const inputURL = process.argv[2] || 'https://notionpress.com';
    let flowId;

    try {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

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

        // Step 2: Click Login
        startTime = Date.now();
        await page.waitForSelector('a[href$="login"]', { visible: true, timeout: 30000 });
        await page.click('a[href$="login"]');
        await page.waitForSelector('#email', { visible: true, timeout: 30000 });
        const loginPageTime = (Date.now() - startTime) / 1000;
        console.log(`Login Page Loaded in ${loginPageTime} seconds`);
        await saveFlowTime(flowId, 'login_page_time', loginPageTime);

        // Step 3: Enter Credentials and Login
        await page.type('#email', 'yourmail@gmail.com');
        await page.type('#dpassword', 'yourpassword');
        await page.click('#login');
        await page.waitForSelector('h2', { visible: true, timeout: 30000 });
        console.log("Logged in successfully");

        // Step 4: Check Lifetime Earnings and Total Books Sold
        const lifetimeEarnings = await page.$eval('#life_earning , .value , h3', el => el.textContent);
        const totalBooksSold = await page.$eval('h3 , .value', el => el.textContent);
        console.log(`Lifetime Earnings: ${lifetimeEarnings}, Total Books Sold: ${totalBooksSold}`);

        // Step 5: Click Order Author Copies
        await page.click('a h3');
        await page.waitForSelector('.ng-scope', { visible: true, timeout: 30000 });

        // Step 6: Select a Book
        await page.select('button , h1'); 
        console.log("Book selected");

        // Step 7: Check Shipping Address
        const shippingAddress = await page.$eval('.shipping-address', el => el.textContent);
        console.log(`Shipping Address: ${shippingAddress}`);

        // Step 8: Check Verification
        const verificationStatus = await page.$eval('.verification-status', el => el.textContent);
        console.log(`Verification Status: ${verificationStatus}`);

        // Step 9: Click Order Now
        await page.click('button#order-now');

        // Step 10: Ensure Contact Details Form is Shown
        await page.waitForSelector('.contact-details-form', { visible: true, timeout: 30000 });
        console.log("Contact details form displayed");

        console.log("Book order flow completed successfully.");
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
            'INSERT INTO book_order_flows (home_page_time, login_page_time) VALUES (NULL, NULL)'
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
            `UPDATE book_order_flows SET ${column} = ? WHERE flow_id = ?`,
            [time, flowId]
        );
    } finally {
        await connection.end();
    }
}
