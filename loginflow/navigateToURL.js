async function navigateToURL(page, url) {
    if (!isValidURL(url)) {
        throw new Error("Invalid URL provided.");
    }
    const startTime = Date.now();
    await page.goto(url, { timeout: 60000 });
    const loadTime = (Date.now() - startTime) / 1000;
    console.log(`Home Page Loaded in ${loadTime} seconds`);
    return loadTime;
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = { navigateToURL };
