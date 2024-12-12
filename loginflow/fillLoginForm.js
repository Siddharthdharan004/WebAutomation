async function fillLoginForm(page, email, password) {
    const startTime = Date.now();

    await page.type('#email', email); // Use provided email
    await page.type('#dpassword', password); // Use provided password

    await page.waitForSelector('input#login', { visible: true, timeout: 30000 });
    const submitButton = await page.$('input#login');
    await submitButton.evaluate(button => button.click());

    await page.waitForSelector('div h2', { visible: true, timeout: 30000 }); // Wait for dashboard to load
    const dashboardPageTime = (Date.now() - startTime) / 1000;

    console.log(`Dashboard Page Loaded in ${dashboardPageTime} seconds`);
    return dashboardPageTime;
}
module.exports = { fillLoginForm };