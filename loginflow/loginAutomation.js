const puppeteer = require('puppeteer');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const ALERT_THRESHOLD = 10; // Threshold in seconds for high navigation time
const EMAIL_SETTINGS = {
    host: "smtp.gmail.com", // Replace with your SMTP server
    port: 587,
    secure: false,
    auth: {
        user: "sidharthsprofessional@gmail.com", // Replace with your email
        pass: "tqbf!hVasLptTV5" // Replace with your app password "https://accounts.google.com/v3/signin/challenge/pwd?TL=AKOx4s1FESaS5PJC6Rk7GSCKJP95ThDTodERZXs7J43HsZ0Kq2tBKfVD0Oxnzn6E&cid=2&continue=https%3A%2F%2Fmyaccount.google.com%2Fu%2F1%2Fapppasswords%3Fcontinue%3Dhttps%3A%2F%2Fmyaccount.google.com%2Fu%2F1%2Fsecurity%3Fgar%253DWzEyMF0%2526hl%253Den%2526utm_source%253DOGB%2526utm_medium%253Dact&flowName=GlifWebSignIn&followup=https%3A%2F%2Fmyaccount.google.com%2Fu%2F1%2Fapppasswords%3Fcontinue%3Dhttps%3A%2F%2Fmyaccount.google.com%2Fu%2F1%2Fsecurity%3Fgar%253DWzEyMF0%2526hl%253Den%2526utm_source%253DOGB%2526utm_medium%253Dact&ifkv=AcMMx-ewWzkfIFCJCAxm27HN-9UfFrmVX5oddijy6pTeMjtGHCFEXvY0h3nwAv11D7H1fyHoP9_Q&osid=1&rart=ANgoxcc_fOmc7fyN7HSD5Wvl8LFB0BZPji3e10lsx3XT18frhN_uGEUIyGrSdeluZfSHiQDgGztBUrXCg5UrpkkfV7TJGkJoGOMS5J00k02RuSLOTvs0pwY&rpbg=1&service=accountsettings"
    }
};
const ALERT_RECIPIENT = "sidharth.intern@gnotionpress.com"; // Replace with recipient email

(async () => {
    let flowId;
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        flowId = await createFlow();

        // Home Page Navigation
        let startTime = Date.now();
        await page.goto('https://notionpress.com', { timeout: 60000 });
        const homePageTime = (Date.now() - startTime) / 1000;
        if (homePageTime > ALERT_THRESHOLD) await sendAlert(`High navigation time: Home Page took ${homePageTime}s`);
        await saveFlowTime(flowId, 'home_page_time', homePageTime);

        // Login Page Navigation
        startTime = Date.now();
        await page.waitForSelector('a[href="https://notionpress.com/en/ind/login"]', { visible: true, timeout: 30000 });
        const loginLink = await page.$('a[href="https://notionpress.com/en/ind/login"]');
        await loginLink.evaluate(link => link.click());
        await page.waitForSelector('#email', { visible: true, timeout: 30000 });
        const loginPageTime = (Date.now() - startTime) / 1000;
        if (loginPageTime > ALERT_THRESHOLD) await sendAlert(`High navigation time: Login Page took ${loginPageTime}s`);
        await saveFlowTime(flowId, 'login_page_time', loginPageTime);

        // Dashboard Page Navigation
        startTime = Date.now();
        await page.type('#email', 'classics1@notionpress.com');
        await page.type('input#dpassword', 'notion123');
        await page.waitForSelector('input#login', { visible: true, timeout: 30000 });
        const submitButton = await page.$('input#login');
        await submitButton.evaluate(button => button.click());
        await page.waitForSelector('div h2', { visible: true, timeout: 30000 });
        const dashboardPageTime = (Date.now() - startTime) / 1000;
        if (dashboardPageTime > ALERT_THRESHOLD) await sendAlert(`High navigation time: Dashboard Page took ${dashboardPageTime}s`);
        await saveFlowTime(flowId, 'dashboard_page_time', dashboardPageTime);

        console.log(`Flow ID: ${flowId} completed.`);
        await browser.close();
    } catch (err) {
        await sendAlert(`Automation script error: ${err.message}`);
        console.error('Error:', err);
    }
})();

async function createFlow() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'admin',
        database: 'puppeteer_data'
    });
    try {
        const [results] = await connection.execute(
            'INSERT INTO navigation_flows (home_page_time, login_page_time, dashboard_page_time) VALUES (NULL, NULL, NULL)'
        );
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
        await connection.execute(`UPDATE navigation_flows SET ${column} = ? WHERE flow_id = ?`, [time, flowId]);
    } finally {
        await connection.end();
    }
}

async function sendAlert(message) {
    const transporter = nodemailer.createTransport(EMAIL_SETTINGS);
    try {
        await transporter.sendMail({
            from: EMAIL_SETTINGS.auth.user,
            to: ALERT_RECIPIENT,
            subject: "Automation Alert",
            text: message
        });
        console.log("Alert sent:", message);
    } catch (err) {
        console.error("Failed to send alert:", err);
    }
}
