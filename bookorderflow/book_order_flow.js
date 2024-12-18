const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');

(async () => {
    const inputURL = process.argv[2] || 'https://notionpress.com/';
    let flowId;

    try {
        const browser = await puppeteer.launch({ headless: false, args: ["--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-setuid-sandbox",
            "--disable-software-rasterizer",
            "--enable-chrome-browser-cloud-management",
            "--disable-blink-features=AutomationControlled",
            "--disable-notifications",
            "--disable-infobars",
            "--disable-popup-blocking",
            "--suppress-message-center-popups",
            "--disable-save-password-bubble"
            ] });
        
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

        // Step 8: Wait for the Claim Popup and Click
        console.log("Attempting to click the 'Claim Popup' button...");
        const claimPopupSelector = 'a#claim_popup';

        try {
            await newPage.waitForSelector(claimPopupSelector, { visible: true, timeout: 3000 });
            await newPage.click(claimPopupSelector);
            console.log("Successfully clicked the 'Claim Popup' button.");
        } catch (error) {
            console.error("Failed to click the 'Claim Popup' button:", error);
        }

        // Step 9: Wait for the 'Continue' Button and Click
        console.log("Attempting to click the 'Continue' button...");
        const continueButtonSelector = 'a[data-dismiss="modal"]';

        try {
            await newPage.waitForSelector(continueButtonSelector, { visible: true, timeout: 3000 });
            await newPage.click(continueButtonSelector);
            console.log("Successfully clicked the 'Continue' button.");
        } catch (error) {
            console.error("Failed to click the 'Continue' button:", error);
        }

        // Step 10: Select Address Option Before Scrolling
        console.log("Selecting the desired address radio button...");
        const addressSelector = 'input#addr_150276';
        try {
            await newPage.waitForSelector(addressSelector, { visible: true, timeout: 30000 });
            await newPage.click(addressSelector);
            console.log("Successfully selected the address radio button.");
        } catch (error) {
            console.error("Failed to select the address radio button:", error);
        }

        // Step 11: Check Verification Checkbox with ScrollIntoView
        console.log("Selecting the verification checkbox...");
        const verificationCheckboxSelector = 'input#ffverify';
        try {
            await newPage.evaluate(selector => {
                const element = document.querySelector(selector);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.click();
                }
            }, verificationCheckboxSelector);
            console.log("Successfully selected the verification checkbox.");
        } catch (error) {
            console.error("Failed to select the verification checkbox:", error);
        }

        // Step 12: Scroll and Click the 'Order Now' Button
        console.log("Scrolling down to find the 'Order Now' button...");
        const orderNowSelector = 'button#ordernowbutton';
        const totalPayableSelectorBefore = 'span.totalPayable'; // Selector for value before clicking
        const totalPayableSelectorAfter = 'div.inset-0.number-flip[data-value="1555"]'; // Selector for value after clicking

        try {
            // Scroll to the bottom and wait for the 'Order Now' button
            await newPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await newPage.waitForSelector(orderNowSelector, { visible: true, timeout: 30000 });

            // Capture the value before clicking 'Order Now'
            const totalPayableBefore = await newPage.$eval(totalPayableSelectorBefore, el => el.textContent.trim());
            console.log(`Total payable amount before clicking 'Order Now': ${totalPayableBefore}`);

            // Click the 'Order Now' button
            console.log("Clicking 'Order Now' button...");
            await newPage.click(orderNowSelector);
            console.log("Successfully clicked the 'Order Now' button.");

            // Wait for the updated value to appear after clicking 'Order Now'
            console.log("Waiting for the updated value after clicking 'Order Now'...");
            await newPage.waitForSelector(totalPayableSelectorAfter, { visible: true, timeout: 30000 });

            // Capture the value after clicking 'Order Now'
            const totalPayableAfter = await newPage.$eval(totalPayableSelectorAfter, el => el.textContent.trim());
            console.log(`Total payable amount after clicking 'Order Now': ${totalPayableAfter}`);

            // Compare the values
            if (totalPayableBefore === totalPayableAfter) {
                console.log("They are the same, so the flow is a success.");
            } else {
                console.error("Error: Values before and after clicking 'Order Now' do not match.");
            }
        } catch (error) {
            console.error("Failed during the 'Order Now' button flow:", error);
        }




        await browser.close(); // Close browser after the flow
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
