/**
 * Full Amazon Product Scraper using Browser.cash + Playwright
 * -----------------------------------------------------------
 * Features:
 * - Configurable headless mode & max timeout
 * - Universal popup handler for Amazon
 * - Search product → pick FIRST RESULT only
 * - Verify seller matches competitor
 * - Extract product data in structured format
 */

import { BrowserSDK } from "./sdk/sdk.js";
import { chromium, Page } from "playwright";
import dotenv from "dotenv";
dotenv.config();

// Configurable settings
const HEADLESS = process.env.HEADLESS === "true";
const MAX_TIMEOUT = Number(process.env.MAX_TIMEOUT || 45000);

// Amazon popup killer
async function dismissAmazonPopups(page: Page) {
  const selectors = [
    // Prime & upsells
    'button:has-text("No Thanks")',
    'button:has-text("Not now")',
    "input#primePopUpNo",

    // Continue shopping / location
    'button:has-text("Continue shopping")',
    'a:has-text("Continue shopping")',
    'button:has-text("Continue")',
    'button:has-text("Done")',

    // Add-on upsell modals
    'button:has-text("Go to Cart")',
    'button:has-text("Skip")',
    'button:has-text("Continue without this item")',

    // Generic close buttons
    'button[aria-label="Close"]',
    ".a-button-close",
  ];

  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        console.log("🟡 Closing popup →", sel);
        await el.click({ force: true });
        await page.waitForTimeout(500);
      }
    } catch {}
  }
}

// Retry wrapper
async function safeAction(page: Page, action: () => Promise<any>) {
  try {
    await action();
  } catch {
    await dismissAmazonPopups(page);
    await action();
  }
}

// Extract clean number from Amazon price format
function parsePrice(str: string | null): number | null {
  if (!str) return null;
  const match = str.replace(/[^0-9.]/g, "");
  return match ? Number(match) : null;
}

async function scrapeAmazonProduct(competitor: string, productName: string) {
  const sdk = new BrowserSDK(process.env.BROWSER_API_KEY!);

  console.log("💻 Creating Browser.cash session...");
  const session = await sdk.createSession({ region: "gcp-usc1-1" });
  const cdp = await sdk.getBrowserCDPUrl();

  console.log("🔗 Connecting Playwright to Browser.cash...");
  const browser = await chromium.connectOverCDP(cdp);
  const context = await browser.newContext();
  const page = await context.newPage();

  page.setDefaultTimeout(MAX_TIMEOUT);

  // 1. Go to Amazon
  await safeAction(page, () =>
    page.goto("https://www.amazon.com/", { timeout: MAX_TIMEOUT })
  );
  await dismissAmazonPopups(page);

  // 2. Search for the product
  await safeAction(page, async () => {
    await page.fill("#twotabsearchtextbox", productName);
    await page.keyboard.press("Enter");
  });

  await page.waitForLoadState("domcontentloaded");
  await dismissAmazonPopups(page);

  // 3. Select FIRST PRODUCT in results
  const firstProduct = await page.$(
    "div[data-component-type='s-search-result']"
  );

  if (!firstProduct) {
    console.log("❌ No search results found.");
    return [];
  }

  const url = await firstProduct.$eval("a.a-link-normal", (el) =>
    el.getAttribute("href")
  );
  const fullUrl = url ? "https://www.amazon.com" + url : null;

  if (!fullUrl) {
    console.log("❌ Could not extract product URL.");
    return [];
  }

  // 4. Navigate into product page
  await safeAction(page, () => page.goto(fullUrl));
  await page.waitForLoadState("domcontentloaded");
  await dismissAmazonPopups(page);

  // 5. Verify seller
  let seller = null;
  try {
    seller = await page.$eval(
      "#sellerProfileTriggerId",
      (el) => el.textContent?.trim() || ""
    );
  } catch {
    // Fallback
    try {
      seller = await page.$eval(
        "#bylineInfo",
        (el) => el.textContent?.trim() || ""
      );
    } catch {}
  }

  if (!seller || !seller.toLowerCase().includes(competitor.toLowerCase())) {
    console.log(
      `⚠ Seller mismatch. Found: "${seller}", Expected: "${competitor}"`
    );
    return [];
  }

  // 6. Extract product data
  const title = await page
    .$eval("#productTitle", (el) => el.textContent?.trim() || null)
    .catch(() => null);
  const image = await page
    .$eval("#landingImage", (el) => el.getAttribute("src"))
    .catch(() => null);
  const priceStr = await page
    .$eval(".a-offscreen", (el) => el.textContent)
    .catch(() => null);
  const ratingStr = await page
    .$eval("i.a-icon-star span", (el) => el.textContent)
    .catch(() => null);
  const reviewCountStr = await page
    .$eval("#acrCustomerReviewText", (el) => el.textContent)
    .catch(() => null);

  const result = [
    {
      competitor,
      product: {
        id: fullUrl.split("/dp/")[1]?.split("/")[0] || null,
        name: title || null,
        url: fullUrl,
        category: null, // Amazon hides category deeply → optional to add later
        image_url: image || null,
        current: {
          price: parsePrice(priceStr),
          currency: priceStr ? "USD" : null,
          stock_status: "In Stock", // could be improved by detecting stock label
          rating: ratingStr ? Number(ratingStr.split(" ")[0]) : null,
          review_count: reviewCountStr
            ? Number(reviewCountStr.replace(/\D/g, ""))
            : null,
          last_checked: new Date().toISOString(),
        },
        history: [],
        alerts: [],
      },
    },
  ];

  console.log("✅ Scrape complete.");
  return result;
}

// Run if called directly
if (require.main === module) {
  scrapeAmazonProduct(
    "Hewcho",
    "Sleeping Bags for Adults Women Backpacking Lightweight Waterproof- Summer Weather Sleeping Bag for Girls Warm Camping Hiking Outdoor Travel Hunting with Compression Bag"
  ).then((res) => console.log(JSON.stringify(res, null, 2)));
}
