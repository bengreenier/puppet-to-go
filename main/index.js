const fs = require("fs");
const { app, BrowserWindow } = require("electron");
const pie = require("puppeteer-in-electron");
const puppeteer = require("puppeteer-core");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const debug = require("debug");
const bluebird = require("bluebird");

const log = debug("puppet-to-go");
const argv = yargs(hideBin(process.argv))
  .describe("config-file", "The path to the configuration file")
  .alias("c", "config-file")
  .demandOption(["config-file"])
  .showHelpOnFail(true).argv;

const main = async () => {
  await pie.initialize(app);

  if (!fs.existsSync(argv["config-file"])) {
    throw new Error(`Config file '${argv["config-file"]}' not found`);
  }

  const configRaw = await fs.promises.readFile(argv["config-file"]);
  const config = JSON.parse(configRaw);
  const screenshotFolder = config.folder || "";

  if (!fs.existsSync(screenshotFolder)) {
    await fs.promises.mkdir(screenshotFolder, { recursive: true });
  }

  if (!config.sequence) {
    throw new Error(
      `Config file '${argv["config-file"]}' does not contain 'sequence' array element`
    );
  }

  const browser = await pie.connect(app, puppeteer);
  const window = new BrowserWindow({
    webPreferences: { contextIsolation: true },
  });

  await window.loadURL("data:text/html;charset=utf-8,<h1>Loading...</h1>");

  const page = await pie.getPage(browser, window);

  bluebird
    .mapSeries(config.sequence, (element) => {
      return page
        .setViewport({
          width: element.width || 1920,
          height: element.height || 1080,
          deviceScaleFactor: 1,
        })
        .then(async () => {
          window.setSize(element.width || 1920, element.height || 1080, true);

          log(`browser: goto ${element.url}`);
          await page.goto(element.url, {
            timeout: 0,
            waitUntil: "domcontentloaded",
          });

          if (element.waitForNavigation) {
            log(`browser: waitForNavigation`);
            const desiredUrl =
              element.waitForNavigation?.extensions?.waitForUrl;
            let currentPageUrl = page.url();

            do {
              await page.waitForNavigation(element.waitForNavigation);
              currentPageUrl = page.url();
              log(
                `browser: waitForNavigation (${desiredUrl} == ${currentPageUrl})`
              );
            } while (desiredUrl && currentPageUrl != desiredUrl);
          }

          if (element.waitForSelector) {
            log(`browser: waitForSelector`);
            await page.waitForSelector(element.waitForSelector);
          }

          if (element.waitForTimeout) {
            log(`browser: waitForTimeout`);
            await page.waitForTimeout(element.waitForTimeout);
          }

          if (element.displayName) {
            let saveFile = element.displayName;

            if (element.timestamp === true) {
              saveFile +=
                "_" +
                new Date()
                  .toISOString()
                  .replaceAll("-", "_")
                  .replaceAll(":", "_");
            }

            // hard path
            if (element.scrollElement) {
              let pageFrame = page.mainFrame();

              // if it's a super complex scenario, we need to change the frame
              if (element.scrollElementHandle) {
                const frameHandle = await page.$(element.scrollElementHandle);
                pageFrame = await frameHandle.contentFrame();
              }

              const el = await pageFrame.$(element.scrollElement);
              const scrollHeight = await el.evaluate(
                (node) => node.scrollHeight
              );
              const pageHeight = page.viewport().height;
              const chunks = Math.ceil(scrollHeight / pageHeight);

              log(
                `browser: scrollElement present. screenshot will be ${chunks} chunks`
              );

              // this is gross, refactor
              let currentChunk = 0;
              do {
                await el.evaluate(
                  (node, scrollToPx) => (node.scrollTop = scrollToPx),
                  [currentChunk * pageHeight]
                );

                log(
                  `browser: saving screenshot to ${saveFile}_${currentChunk}.png`
                );

                await page.screenshot({
                  path: `${screenshotFolder}/${saveFile}_${currentChunk}.png`,
                  type: "png",
                  fullPage: typeof element.scrollElement === "undefined",
                });

                currentChunk++;
              } while (currentChunk < chunks);
            } else {
              // normal path
              saveFile += ".png";

              log(`browser: saving screenshot to ${saveFile}`);

              await page.screenshot({
                path: `${screenshotFolder}/${saveFile}`,
                type: "png",
                fullPage: typeof element.scrollElement === "undefined",
              });
            }
          }
        });
    })
    .then(() => {
      console.log("completed!");
      process.exit(0);
    });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
