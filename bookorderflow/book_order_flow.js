const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

(async () => {
    const inputURL = process.argv[2] || 'your_URL';
    let flowId;

    try {
        const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        // Set mobile emulation manually
        await page.setViewport({
            width: 390, // iPhone 12 width
            height: 844, // iPhone 12 height
            isMobile: true,
            hasTouch: true,
        });

        // Set a custom user agent for mobile
        await page.setUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        );

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

        // Step 3: Click Login
        startTime = Date.now();
        await page.waitForSelector('a[href$="login"]', { visible: true, timeout: 30000 });
        await page.click('a[href$="login"]');
        await page.waitForSelector('#email', { visible: true, timeout: 30000 });
        const loginPageTime = (Date.now() - startTime) / 1000;
        console.log(`Login Page Loaded in ${loginPageTime} seconds`);
        await saveFlowTime(flowId, 'login_page_time', loginPageTime);

        // Step 4: Enter Credentials and Login
        await page.type('#email', 'yourmail@notionpress.com');
        await page.type('#dpassword', 'your_password');
        await page.click('#login');
        await page.waitForSelector('h2', { visible: true, timeout: 30000 });
        console.log("Logged in successfully");

        

        await page.waitForSelector('a h3', { visible: true, timeout: 30000 });
        await page.click('a h3');
        await page.waitForSelector('.popup-class-or-element', { timeout: 5000 }).catch(() => {
            console.log("Popup not found within the timeout.");
          });
        
          // Auto-click the OK button
          try {
            await page.click('body[ng-app="notionpress"][ng-controller="notionpress_controller"]'); // Replace with the actual class or selector
            console.log("Clicked OK on the password manager popup.");
          } catch (error) {
            console.log("Failed to click the OK button: ", error);
          }
         
        // Step 5: Check Lifetime Earnings and Total Books Sold
        const lifetimeEarnings = await page.$eval('span#life_earning', el => el.textContent);
        const totalBooksSold = await page.$eval('span.totalearnings.value', el => el.textContent);
        console.log(`Lifetime Earnings: ${lifetimeEarnings}, Total Books Sold: ${totalBooksSold}`);
        await page.waitForSelector('p', { visible: true, timeout: 30000 })
        console.log(`order book page Loaded in ${orderbookpage} seconds`);
        console.log('order book page loaded')
        
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
