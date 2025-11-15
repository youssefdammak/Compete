
import { chromium } from "playwright";
import dotenv from "dotenv";
dotenv.config();

const HEADLESS = false; // must be false for eBay
const MAX_TIMEOUT = 30000;

function parseCompact(str: string | null): number | null {
  if (!str) return null;
  const s = str.toUpperCase();
  if (s.endsWith("K")) return Number(s.replace("K", "")) * 1000;
  if (s.endsWith("M")) return Number(s.replace("M", "")) * 1_000_000;
  return Number(s.replace(/\D/g, "")) || null;
}

export async function scrapeEbayStore(url: string) {
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

  // Wait for container
  await page.waitForSelector(".str-seller-card__store-stats-content", {
    timeout: 8000,
  });

  // Extract all <span class="str-text-span BOLD">
  const spans = await page.$$eval(
    ".str-seller-card__store-stats-content .str-text-span.BOLD",
    (els) => els.map((e) => e.textContent?.trim() || null)
  );

  // 🔍 Extract FIRST product title
  const productTitle = await page.evaluate(() => {
    const selectors = [
      ".str-item-card__title",              // storefront card title
      ".str-item-card a",                   // storefront card link
      ".s-item__title",                     // fallback: search-style title
      ".srp-results .s-item__title",        // fallback
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent) {
        const text = el.textContent.trim();
        if (text && text !== "New Listing") return text;
      }
    }
    return null;
  });

  const result = {
    store_url: url,
    feedback: spans?.[0] ?? null,
    items_sold: parseCompact(spans?.[1] ?? null),
    followers: parseCompact(spans?.[2] ?? null),
    first_product_title: productTitle,
    raw: {
      feedback: spans?.[0] ?? null,
      items_sold: spans?.[1] ?? null,
      followers: spans?.[2] ?? null,
      first_product_title: productTitle,
    },
    last_checked: new Date().toISOString(),
  };

  console.log("✅ Result:", result);

  await browser.close();
  return result;
}

if (require.main === module) {
  scrapeEbayStore("https://www.ebay.ca/str/surplusbydesign");
}
