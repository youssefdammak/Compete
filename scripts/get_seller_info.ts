import { chromium } from "playwright";
import dotenv from "dotenv";
dotenv.config();

const HEADLESS = false; // must be false for eBay
const MAX_TIMEOUT = 45000;

// Convert "1.2K" or "3.5M" to number
function parseCompact(str: string | null): number | null {
  if (!str) return null;
  const s = str.toUpperCase();
  if (s.endsWith("K")) return Number(s.replace("K", "")) * 1000;
  if (s.endsWith("M")) return Number(s.replace("M", "")) * 1_000_000;
  const numMatch = str.replace(/,/g, "").match(/[\d.]+/);
  return numMatch ? Number(numMatch[0]) : null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // Click "All items" tab if exists
  const allItemsTab = await page.$('a[href*="Store-Items"]');
  if (allItemsTab) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      allItemsTab.click(),
    ]);
    console.log("📄 Navigated to All Items tab");
  }

  // Set filters: Buy It Now + New
  // Buying Format
  const buyingFormatBtn = await page.$(
    'span.filter-menu-button:has-text("Buying Format") button'
  );
  if (buyingFormatBtn) {
    await buyingFormatBtn.click();
    await delay(500);
    const buyItNow = await page.$(
      'span.filter-menu-button__text:has-text("Buy It Now")'
    );
    if (buyItNow) {
      await buyItNow.click();
      await delay(500);
    }
  }

  // Condition
  const conditionBtn = await page.$(
    'span.filter-menu-button:has-text("Condition") button'
  );
  if (conditionBtn) {
    await conditionBtn.click();
    await delay(500);
    const newCondition = await page.$(
      'span.filter-menu-button__text:has-text("New")'
    );
    if (newCondition) {
      await newCondition.click();
      await delay(500);
    }
  }

  // Scroll slowly like a human to load items
  await page.evaluate(async () => {
    for (let y = 0; y < 2000; y += 200) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
  });

  // Wait for seller name
  let sellerName: string | null = null;
  try {
    await page.waitForSelector(".str-seller-card__store-name a", {
      timeout: 8000,
    });
    sellerName = await page.$eval(
      ".str-seller-card__store-name a",
      (el) => (el as HTMLElement).innerText.trim()
    );
  } catch {
    sellerName = null;
  }

  // Seller logo
  const sellerLogo =
    (await page.$eval(".str-header__logo--img", (el) =>
      el.getAttribute("src")
    ).catch(() => null)) || null;

  // Store stats
  let spans: (string | null)[] = [];
  try {
    await page.waitForSelector(".str-seller-card__store-stats-content", {
      timeout: 8000,
    });
    spans = await page.$$eval(
      ".str-seller-card__store-stats-content .str-text-span.BOLD",
      (els) => els.map((e) => e.textContent?.trim() || null)
    );
  } catch {}

  // Click About tab to get overview
  const aboutTab = await page.$('div[role="tab"]:has-text("About")');
  if (aboutTab) {
    await Promise.all([page.waitForTimeout(500), aboutTab.click()]);
  }

  let overview = null;
  try {
    overview = await page.$eval(
      ".str-about-section, .str-about-content",
      (el) => el.textContent?.trim()
    );
  } catch {
    overview = null;
  }

  // First 10 items
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
    seller_name: sellerName,
    seller_logo: sellerLogo,
    overview,
    feedback: spans?.[0] ?? null,
    items_sold: parseCompact(spans?.[1] ?? null),
    followers: parseCompact(spans?.[2] ?? null),
    first_10_items: first10Items,
    last_checked: new Date().toISOString(),
  };

  console.log("✅ Store scrape complete:", result);

  await browser.close();
  return result;
}

// Example usage
if (require.main === module) {
  getSellerInfo("https://www.ebay.ca/str/surplusbydesign");
}
