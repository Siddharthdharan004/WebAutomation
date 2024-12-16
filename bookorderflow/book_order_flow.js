const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Set to true for headless mode
  const page = await browser.newPage();

  // Step 1: Navigate to the website "notionpress.com"
  await page.goto('https://notionpress.com');

  // Step 2: Click the login button to move to the login page
  await page.waitForSelector('a[href="/login"]'); // Adjust selector if necessary
  await page.click('a[href="/login"]');

  // Wait for login page and confirm welcome text
  await page.waitForSelector('h1'); // Assuming there is an H1 tag with welcome text
  const welcomeText = await page.$eval('h1', el => el.textContent);
  console.log(`Welcome text: ${welcomeText}`);

  // Step 3: Enter credentials and click login button
  await page.type('#email', 'your_mail@notionpress.com'); // Replace with actual email input field selector
  await page.type('#password', 'your_password'); // Replace with actual password input field selector
  await page.click('#login-button'); // Replace with actual login button selector

  // Step 4: Handle popup
  try {
    await page.waitForSelector('.popup-class-selector', { timeout: 5000 }); // Replace with actual popup selector
    console.log('Popup detected!');
    await page.click('.popup-ok-button-selector'); // Replace with the popup OK button selector
    console.log('Popup handled.');
  } catch (e) {
    console.log('No popup detected.');
  }

  // Step 5: Check for books sold amount and total earnings
  await page.waitForSelector('#menu1 > div.row > div.col-lg-6.col-md-6.col-12.m-0 > div.col-lg-12.col-md-12.col-12.m-0.row.sales_insight > div:nth-child(2) > div.earning_info > span'); // Replace with actual selector for total books sold
  const booksSold = await page.$eval('#menu1 > div.row > div.col-lg-6.col-md-6.col-12.m-0 > div.col-lg-12.col-md-12.col-12.m-0.row.sales_insight > div:nth-child(2) > div.earning_info > span', el => el.textContent);

  await page.waitForSelector('#menu1 > div.row > div.col-lg-6.col-md-6.col-12.m-0 > div.col-lg-12.col-md-12.col-12.m-0.row.sales_insight > div:nth-child(1) > div.earning_info > label'); // Replace with actual selector for total earnings
  const totalEarnings = await page.$eval('#menu1 > div.row > div.col-lg-6.col-md-6.col-12.m-0 > div.col-lg-12.col-md-12.col-12.m-0.row.sales_insight > div:nth-child(1) > div.earning_info > label', el => el.textContent);

  console.log(`Books Sold: ${booksSold}`);
  console.log(`Total Earnings: ${totalEarnings}`);

  await browser.close();
})();
