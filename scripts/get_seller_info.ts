import { chromium } from "playwright";
import dotenv from "dotenv";
dotenv.config();

const HEADLESS = false; // must be false for eBay
const MAX_TIMEOUT = 30000;

// Convert "1.2K" or "3.5M" to number
function parseCompact(str: string | null): number | null {
  if (!str) return null;
  const s = str.toUpperCase();
  if (s.endsWith("K")) return Number(s.replace("K", "")) * 1000;
  if (s.endsWith("M")) return Number(s.replace("M", "")) * 1_000_000;
  return Number(str.replace(/\D/g, "")) || null;
}

export async function getSellerInfo(url: string) {
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
    viewport: { width: 1400, height: 900 },
    javaScriptEnabled: true,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(MAX_TIMEOUT);

  console.log("🔍 Loading store:", url);
  await page.goto(url, { waitUntil: "networkidle" });

  // Click on the "All items" tab if it exists
  const allItemsTab = await page.$('a[href*="Store-Items"]');
  if (allItemsTab) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      allItemsTab.click(),
    ]);
    console.log("📄 Navigated to All Items tab");
  }

  // Set filters: Buy It Now + New
  // Open "Buying Format" menu
  const buyingFormatBtn = await page.$(
    'span.filter-menu-button:has-text("Buying Format") button'
  );
  if (buyingFormatBtn) {
    await buyingFormatBtn.click();
    await page.waitForTimeout(500);
    const allListings = await page.$(
      'span.filter-menu-button__text:has-text("All Listings")'
    );
    const buyItNow = await page.$(
      'span.filter-menu-button__text:has-text("Buy It Now")'
    );
    if (buyItNow) {
      await buyItNow.click();
      await page.waitForTimeout(500);
    }
  }

  // Open "Condition" menu
  const conditionBtn = await page.$(
    'span.filter-menu-button:has-text("Condition") button'
  );
  if (conditionBtn) {
    await conditionBtn.click();
    await page.waitForTimeout(500);
    const newCondition = await page.$(
      'span.filter-menu-button__text:has-text("New")'
    );
    if (newCondition) {
      await newCondition.click();
      await page.waitForTimeout(500);
    }
  }

  // Fake human behavior
  await page.mouse.move(200, 300, { steps: 20 });
  await page.waitForTimeout(300);
  await page.mouse.move(400, 500, { steps: 20 });

  // Scroll slowly like a human
  await page.evaluate(async () => {
    for (let y = 0; y < 2000; y += 200) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 300));
    }
  });

  // Wait for store stats
  await page.waitForSelector(".str-seller-card__store-stats-content", {
    timeout: 8000,
  });

  const spans = await page.$$eval(
    ".str-seller-card__store-stats-content .str-text-span.BOLD",
    (els) => els.map((e) => e.textContent?.trim() || null)
  );

  // Scrape first 10 items from the grid container
  const first10Items = await page.$$eval(
    ".str-items-grid.app-layout__block--gutters .str-item-card",
    (cards) =>
      cards.slice(0, 10).map((card) => {
        const linkEl = card.querySelector("a") as HTMLAnchorElement;
        const title = linkEl?.textContent?.trim() || null;
        const link = linkEl?.href || null;
        return { title, link };
      })
  );

  const result = {
    store_url: url,
    feedback: spans?.[0] ?? null,
    items_sold: parseCompact(spans?.[1] ?? null),
    followers: parseCompact(spans?.[2] ?? null),
    first_10_items: first10Items,
    raw: {
      feedback: spans?.[0] ?? null,
      items_sold: spans?.[1] ?? null,
      followers: spans?.[2] ?? null,
      first_10_items: first10Items,
    },
    last_checked: new Date().toISOString(),
  };

  console.log("✅ Result:", result);

  await browser.close();
  return result;
}

if (require.main === module) {
  getSellerInfo("https://www.ebay.ca/str/surplusbydesign");
}