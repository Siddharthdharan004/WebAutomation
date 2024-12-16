const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

(async () => {
    const inputURL = process.argv[2] || 'https://notionpress.com/';
    let flowId;

    try {
        const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        // Set mobile emulation manually for the main page
        const mobileViewport = {
            width: 390, // iPhone 12 width
            height: 844, // iPhone 12 height
            isMobile: true,
            hasTouch: true,
        };

        const mobileUserAgent =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

        await page.setViewport(mobileViewport);
        await page.setUserAgent(mobileUserAgent);

        if (!isValidURL(inputURL)) {
            throw new Error("Invalid URL provided.");
        }

        console.log(`Navigating to URL: ${inputURL}`);
        flowId = await createFlow();

        // Step 1: Navigate to the Home Page
        let startTime = Date.now();
        await page.goto(inputURL, { timeout: 60000, waitUntil: 'networkidle2' });
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
        await page.type('#email', 'classics1@notionpress.com');
        await page.type('#dpassword', 'notion123');
        await page.click('#login');
        await page.waitForSelector('h2', { visible: true, timeout: 30000 });
        console.log("Logged in successfully");

        // Step 4: Handle Password Manager Popup Robustly
        async function handlePasswordPopup(page) {
            try {
                const popupSelector = 'button[aria-label="OK"]';
                const isPopupVisible = await page.$(popupSelector);
                if (isPopupVisible) {
                    await page.click(popupSelector);
                    console.log("Clicked OK on the password manager popup.");
                }
            } catch (error) {
                console.log("Password manager popup not found or already dismissed.");
            }
        }
        await handlePasswordPopup(page);

        // Step 5: Check Lifetime Earnings and Total Books Sold
        const lifetimeEarnings = await page.$eval('span#life_earning', el => el.textContent);
        const totalBooksSold = await page.$eval('span.totalearnings.value', el => el.textContent);
        console.log(`Lifetime Earnings: ${lifetimeEarnings}, Total Books Sold: ${totalBooksSold}`);

        // Step 6: Click 'Order Author Copies' Button and Switch to New Page
        startTime = Date.now();
        console.log("Clicking 'Order Author Copies' button...");

        const [newPage] = await Promise.all([
            new Promise(resolve => {
                browser.once('targetcreated', async target => {
                    const page = await target.page();
                    resolve(page);
                });
            }),
            page.waitForSelector('a[href*="postpub/authorcopy"]', { visible: true, timeout: 30000 }),
            page.click('a[href*="postpub/authorcopy"]')
        ]);

        if (!newPage) {
            throw new Error("Failed to open the new page for 'Order Author Copies'.");
        }

        // Set mobile emulation for the new page
        await newPage.setViewport(mobileViewport);
        await newPage.setUserAgent(mobileUserAgent);
        await newPage.bringToFront();
        console.log("Opened 'Order Author Copies' page in a new tab with mobile view.");

        // Step 7: Wait for and Click 'Order Copies Now'
        console.log("Clicking 'Order Copies Now' button...");
        await newPage.waitForSelector('button[ng-click*="redirect_authorcopy"]', { visible: true, timeout: 30000 });
        await newPage.click('button[ng-click*="redirect_authorcopy"]');
        console.log("Clicked 'Order Copies Now' button.");

        // Step 8: Wait for Navigation to Next Page
        await newPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        console.log("Navigated to the next page after clicking 'Order Copies Now'.");

        // Step 9: Confirm Success
        const nextPageSelector = 'h1';
        await newPage.waitForSelector(nextPageSelector, { visible: true, timeout: 30000 });
        console.log("Next page loaded successfully.");

        console.log("Automation completed successfully.");
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
            'INSERT INTO book_order_flows (home_page_time, login_page_time, order_author_copies_time) VALUES (NULL, NULL, NULL)'
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
