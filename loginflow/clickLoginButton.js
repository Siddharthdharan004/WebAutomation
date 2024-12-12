async function clickLoginButton(page, selectors, customSelector) {
    let loginFound = false;

    // If a custom selector is provided, try it first
    if (customSelector) {
        try {
            console.log(`Using user-provided selector: ${customSelector}`);
            await page.waitForSelector(customSelector, { visible: true, timeout: 5000 });
            const loginElement = await page.$(customSelector);
            await loginElement.evaluate(el => el.click());
            loginFound = true;
        } catch (err) {
            console.error(`Error: User-provided selector "${customSelector}" not found or failed.`);
            throw new Error("Login button or link not found using the user-provided selector.");
        }
    } else {
        // Try default selectors if no custom selector is provided
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { visible: true, timeout: 5000 });
                loginFound = true;
                console.log(`Found login using selector: ${selector}`);
                const loginElement = await page.$(selector);
                await loginElement.evaluate(el => el.click());
                break;
            } catch (err) {
                console.log(`Selector ${selector} not found. Trying next...`);
            }
        }

        if (!loginFound) {
            throw new Error("Login button or link not found on the page.");
        }
    }

    // Wait for login page to load
    const startTime = Date.now();
    await page.waitForSelector('#email', { visible: true, timeout: 30000 });
    const loginPageTime = (Date.now() - startTime) / 1000;

    console.log(`Login Page Loaded in ${loginPageTime} seconds`);
    return loginPageTime;
}

module.exports = { clickLoginButton };
