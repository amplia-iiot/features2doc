const puppeteer = require("puppeteer");
const path = require("path");

async function generatePDF(url, output, extraConfig) {
  var options = {
    path: `${output}/Features.pdf`,
    format: "A4",
    margin: {
      top:  extraConfig && extraConfig.headerTemplate?110: 60,
      bottom: extraConfig && extraConfig.footerTemplate?80: 60,
      right: 40,
      left: 40,
    },
    headerTemplate: extraConfig?extraConfig.headerTemplate:undefined,
    footerTemplate: extraConfig?extraConfig.footerTemplate:undefined,
    displayHeaderFooter: !!(extraConfig && (extraConfig.headerTemplate || extraConfig.footerTemplate)), 
    printBackground: true
  };

  try {
    // Launch a new browser session.
    const browser = await puppeteer.launch({headless: true});
    // Open a new Page.
    const page = await browser.newPage();
    // Go to our invoice page that we serve on `localhost: 8000`.
    if (process.platform === 'win32') {
      await page.goto(`file://${path.resolve(url.replace(/[\\]/g, '/'))}`, {waitUntil: 'domcontentloaded'});
    } else {
      await page.goto(`file://${path.resolve(url)}`, {waitUntil: 'domcontentloaded'});
    }
  
    // Save the page as PDF.
    await page.pdf(options);
    await browser.close();
    console.log(`PDF successfully created in -> ${path.resolve(options.path)}`);
  } catch (e) {
    console.error(`Error generating PDF file`);
    console.error(`HTML path ${url}`);
    console.error(`HTML url replace ${url.replace(/[\\]/g, "/")}`);
    console.error(e);
  }

  console.log('Finish process!!!');
}

module.exports = {
  generatePDF
}
