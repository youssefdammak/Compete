import { NextRequest, NextResponse } from "next/server";
import { BrowserSDK } from "@/scripts/sdk/sdk.js";
import { chromium } from "playwright";

export const runtime = "nodejs";

const MAX_TIMEOUT = 20000; // Reduced from 45000 to 20000 (20 seconds)
const SELECTOR_TIMEOUT = 10000; // Separate shorter timeout for selectors

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

async function scrapeEbayProduct(itemUrl: string) {
  const sdk = new BrowserSDK(process.env.BROWSER_API_KEY!);
  let browser: any = null;

  try {
    console.log("💻 Creating Browser.cash session...");
    const session = await sdk.createSession({ region: "gcp-usc1-1" });
    const cdp = await sdk.getBrowserCDPUrl();

    console.log("🔗 Connecting Playwright to Browser.cash...");
    browser = await chromium.connectOverCDP(cdp);
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
      javaScriptEnabled: true,
      locale: "en-CA",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(MAX_TIMEOUT);

    console.log("🌐 Loading product URL:", itemUrl);
    try {
      await page.goto(itemUrl, {
        waitUntil: "domcontentloaded",
        timeout: MAX_TIMEOUT,
      });
      // Reduced timeout and make it non-blocking
      await page
        .waitForSelector("h1[itemprop='name']", {
          timeout: SELECTOR_TIMEOUT,
        })
        .catch(() => {
          console.warn("⚠ Title selector not found, continuing...");
        });
    } catch {
      console.warn("⚠ Navigation timeout, continuing anyway…");
    }

    await delay(50); // Reduced from 200ms to 50ms

    // Faster scroll - reduced delay per viewport
    await page.evaluate(async () => {
      const viewportHeight = window.innerHeight;
      const totalHeight = document.body.scrollHeight;
      for (let y = 0; y < totalHeight; y += viewportHeight) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 20)); // Reduced from 50ms to 20ms
      }
    });
    await delay(50); // Reduced from 200ms to 50ms

    // Close popups - parallel check instead of sequential
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
          await delay(50); // Reduced from 200ms to 50ms
        }
      } catch {}
    }

    // Detect bot check
    const botCheck = await page.$("text='Check your browser before accessing'");
    if (botCheck) {
      console.log(
        "⚠ eBay blocked automated access. Use a different session/IP."
      );
      return null;
    }

    // --- Scrape product fields ---
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
        .$eval(
          'div[data-testid="x-price-primary"] span',
          (el) => el.textContent
        )
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
        else if (
          curr.includes("C") ||
          (curr.includes("$") && curr.includes("C"))
        )
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
        .$eval(
          'div[data-testid="x-quantity"] span.ux-textspans--BOLD',
          (el) => {
            const match = (el.textContent || "").match(/\d+/);
            return match ? Number(match[0]) : null;
          }
        )
        .catch(() => null));

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

    return result;
  } catch (error) {
    console.error("❌ Error during scraping:", error);
    throw error;
  } finally {
    // Cleanup: close browser and end session
    try {
      if (browser) {
        await browser.close();
      }
    } catch (err) {
      console.warn("⚠ Error closing browser:", err);
    }
    try {
      await sdk.endSession();
    } catch (err) {
      console.warn("⚠ Error ending session:", err);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productUrl } = body;

    if (!productUrl) {
      return NextResponse.json(
        { error: "Missing required field: productUrl" },
        { status: 400 }
      );
    }

    const result = await scrapeEbayProduct(productUrl);

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Failed to scrape product - bot check detected or product not found",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error scraping product:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape product",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
