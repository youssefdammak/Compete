import { chromium } from "playwright";
import dotenv from "dotenv";
dotenv.config();

const HEADLESS = false; // true for headless
const MAX_TIMEOUT = 45000;

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

export async function scrapeEbayProduct(itemUrl: string) {
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
    locale: "en-CA",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(MAX_TIMEOUT);

  console.log("🌐 Loading product URL:", itemUrl);
  try {
    await page.goto(itemUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1[itemprop='name']", { timeout: MAX_TIMEOUT });
  } catch {
    console.warn("⚠ Navigation timeout, continuing anyway…");
  }

  await delay(200);

  // Faster human-like scroll
  await page.evaluate(async () => {
    const viewportHeight = window.innerHeight;
    const totalHeight = document.body.scrollHeight;
    for (let y = 0; y < totalHeight; y += viewportHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50)); // small delay
    }
  });
  await delay(200);

  // Close potential popups
  const popupSelectors = [
    'button:has-text("Continue")',
    'button:has-text("No Thanks")',
    'button[aria-label="Close"]',
    ".overlay-close",
  ];
  for (const sel of popupSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        console.log("🟡 Closing popup →", sel);
        await el.click({ force: true });
        await delay(200);
      }
    } catch {}
  }

  // Detect bot check
  const botCheck = await page.$("text='Check your browser before accessing'");
  if (botCheck) {
    console.log("⚠ eBay blocked automated access. Use a different session/IP.");
    await browser.close();
    return null;
  }

  // --- Scrape product fields with fallbacks ---
  const title =
    (await page
      .$eval("h1[itemprop='name']", (el) => el.textContent?.trim())
      .catch(() => null)) ||
    (await page
      .$eval('div[data-testid="x-item-title"] h1 span', (el) =>
        el.textContent?.trim()
      )
      .catch(() => null));

  const priceStr =
    (await page
      .$eval('span[itemprop="price"]', (el) => el.textContent)
      .catch(() => null)) ||
    (await page
      .$eval('div[data-testid="x-price-primary"] span', (el) => el.textContent)
      .catch(() => null));

  let price: number | null = null;
  let currency: string | null = null;

  if (priceStr) {
    const numMatch = priceStr.replace(/,/g, "").match(/[\d.]+/);
    price = numMatch ? Number(numMatch[0]) : null;

    const currencyMatch = priceStr.match(/^([^\d]*)/);
    if (currencyMatch) {
      const curr = currencyMatch[1].trim();
      if (curr.includes("US") || (curr.includes("$") && curr.includes("US")))
        currency = "USD";
      else if (curr.includes("C") || (curr.includes("$") && curr.includes("C")))
        currency = "CAD";
      else currency = curr || null;
    }
  }

  const shippingStr =
    (await page
      .$eval("span[data-testid='shipping-cost']", (el) => el.textContent)
      .catch(() => null)) ||
    (await page
      .$eval(
        "div.ux-labels-values--shipping span.ux-textspans--BOLD",
        (el) => el.textContent
      )
      .catch(() => "0"));

  const shipping_cost = shippingStr?.toLowerCase().includes("free")
    ? 0
    : parseCompact(shippingStr);

  const condition =
    (await page
      .$eval(
        'div[data-testid="x-item-condition"] div.x-item-condition-text span.ux-textspans',
        (el) => el.textContent?.trim()
      )
      .catch(() => null)) ||
    (await page
      .$eval('div[itemprop="itemCondition"]', (el) => el.textContent?.trim())
      .catch(() => null));

  const quantityAvailable =
    (await page
      .$eval('span[itemprop="inventoryLevel"]', (el) =>
        parseInt(el.textContent || "0")
      )
      .catch(() => null)) ||
    (await page
      .$eval(
        'div[data-testid="x-quantity"] span.ux-textspans--SECONDARY',
        (el) => {
          const match = (el.textContent || "").match(/\d+/);
          return match ? Number(match[0]) : null;
        }
      )
      .catch(() => null));

  const totalSold =
    (await page
      .$eval('span[itemprop="soldQuantity"]', (el) => {
        const match = (el.textContent || "").match(/[\d,]+/);
        return match ? Number(match[0].replace(/,/g, "")) : null;
      })
      .catch(() => null)) ||
    (await page
      .$eval('div[data-testid="x-quantity"] span.ux-textspans--BOLD', (el) => {
        const match = (el.textContent || "").match(/\d+/);
        return match ? Number(match[0]) : null;
      })
      .catch(() => null));

  // Attempt to get first image
  const image =
    (await page
      .$eval("img[itemprop='image']", (el) => el.getAttribute("src"))
      .catch(() => null)) ||
    (await page
      .$eval("div.ux-image-carousel-container img", (el) =>
        el.getAttribute("src")
      )
      .catch(() => null));

  const result = {
    product: {
      title,
      ebay_item_id: itemUrl.split("/itm/")[1]?.split("/")[0] || null,
      product_url: itemUrl,
      price,
      currency,
      shipping_cost,
      condition,
      quantity_available: quantityAvailable,
      total_sold_listing: totalSold,
      images: image ? [image] : [],
    },
    timestamp: new Date().toISOString(),
  };

  console.log("✅ Product scrape complete:", result);

  await delay(200);
  await browser.close();

  return result;
}

// Example usage
if (require.main === module) {
  scrapeEbayProduct("https://www.ebay.ca/itm/286422982038");
}
