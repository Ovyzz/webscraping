const csv = require('csv-parser');
const fs = require('fs');
const puppeteer = require("puppeteer");
const csvData = [];

fs.createReadStream('sample-websites.csv')
    .pipe(csv())
    .on('data', (row) => {
        addCsvData(row.domain);
    })
    .on('end', () => {
        (async () => {
            const t3 = performance.now();
            for (let i = 0; i < csvData.length; ++i) {
                try {
                    const url = csvData[i];
                    const browser = await puppeteer.launch();
                    const page = await browser.newPage();
                    await page.goto('https://www.' + url, {
                        waitUntil: 'domcontentloaded',
                        ignoreHTTPSErrors: true
                    });
                    const htmlPage = await page.content();
                    await browser.close();
                    const email = findEmail(htmlPage);
                    const title = findTitle(htmlPage);
                    const links = findContactPage(htmlPage, url);
                    const phone = findPhoneNumber(htmlPage);
                    let emails;
                    let phones;
                    if (links.length !== 0) {
                        const newBrowser = await puppeteer.launch();
                        const newPage = await newBrowser.newPage();
                        await newPage.goto(links, {
                            waitUntil: 'domcontentloaded',
                            ignoreHTTPSErrors: true
                        });
                        const newHtmlPage = await newPage.content();
                        await newBrowser.close();
                        const newEmail = findEmail(newHtmlPage);
                        const newPhone = findPhoneNumber(newHtmlPage);
                        if (newEmail != null) {
                            emails = email.concat(newEmail);
                        }
                        if (newPhone != null) {
                            phones = phone.concat(newPhone);
                        }
                    }
                    const uniqEmail = [...new Set(emails)];
                    const uniqPhone = [...new Set(phones)];
                    console.log("Url: " + url + "\n" + "Emails found: " + uniqEmail + "\n" + "Phone Number: " + uniqPhone + "\n" + "Title: " + title + "\n");
                } catch (err) {

                }
            }
            const t4 = performance.now();
            console.log("Call to search took " + (t4 - t3) / 60000 + "m.");
        })()
    });

function addCsvData(url) {
    csvData.push(url);
}

function findPhoneNumber(page) {
    return page.match(/(?!.*(\<a href.*?\>))[(]?\d{3}[)]?[(\s)?.-]\d{3}[\s.-]\d{4}/);
}

function findContactPage(page, url) {
    const links = page.match(/<a [^>]*\bhref\s*=\s*"([^"]*contact[^"]*)/)[1];
    if (links[0] !== 'h') {
        return 'https://www.' + url + links;
    }
    return links;
}

function findTitle(page) {
    return page.match(/<title[^>]*>([^<]+)<\/title>/)[1];
}

function findEmail(page) {
    const emails = page.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
    return [...new Set(emails)];
}
