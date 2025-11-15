import { chromium, Browser, BrowserContext, Page } from "patchright";

// Next.js environment variable handling
const DEFAULT_CDP_URL = process.env.TAURINE_CDP_URL;

export interface ConnectResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cleanup: () => Promise<void>;
}

export interface StaticData {
  name: string | null;
  category: string | null;
  image_url: string | null;
}

export interface DynamicData {
  price: number;
  stock_status: string;
  rating: number;
  review_count: number;
}

export interface ProductData {
  competitor: string;
  product: {
    id: string;
    name: string | null;
    url: string;
    category: string | null;
    image_url: string | null;
    current: {
      price: number;
      currency: string;
      stock_status: string;
      rating: number;
      review_count: number;
      last_checked: string;
    };
    history: unknown[];
    alerts: unknown[];
  };
}

// -----------------------------
// Helper: connect to CDP
// -----------------------------
export async function connect({
  cdpUrl = DEFAULT_CDP_URL,
  contextOptions = {},
}: {
  cdpUrl?: string;
  contextOptions?: unknown;
} = {}): Promise<ConnectResult> {
  if (!cdpUrl) {
    throw new Error(
      "CDP URL is required. Set TAURINE_CDP_URL environment variable."
    );
  }

  const browser = await chromium.connectOverCDP(cdpUrl.trim());
  const context =
    browser.contexts()[0] || (await browser.newContext(contextOptions));
  const page = context.pages()[0] || (await context.newPage());

  async function cleanup(): Promise<void> {
    try {
      if (!page.isClosed()) await page.close({ runBeforeUnload: false });
    } catch {}
    try {
      if (!context.isClosed()) await context.close();
    } catch {}
  }

  return { browser, context, page, cleanup };
}

// -----------------------------
// Scrape static info using CDP
// -----------------------------
export async function fetchStaticData(
  page: Page,
  url: string
): Promise<StaticData> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const name = await page
    .locator("h1.product-title")
    .textContent()
    .catch(() => null);
  const category = await page
    .locator(".breadcrumb li:last-child")
    .textContent()
    .catch(() => null);
  const image_url = await page
    .locator(".product-image img")
    .getAttribute("src")
    .catch(() => null);

  return { name, category, image_url };
}

// -----------------------------
// Scrape dynamic info (Agent API style)
// -----------------------------
export async function fetchDynamicData(page: Page): Promise<DynamicData> {
  // Wait for price and stock info
  await page
    .waitForSelector(".product-price", { timeout: 5000 })
    .catch(() => {});
  await page
    .waitForSelector(".availability-status", { timeout: 5000 })
    .catch(() => {});

  const priceText = await page
    .locator(".product-price")
    .textContent()
    .catch(() => "0");
  const stock_status = await page
    .locator(".availability-status")
    .textContent()
    .catch(() => "Unknown");
  const rating = await page
    .locator(".product-rating")
    .textContent()
    .catch(() => "0");
  const review_count = await page
    .locator(".review-count")
    .textContent()
    .catch(() => "0");

  const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;

  return {
    price,
    stock_status,
    rating: parseFloat(rating) || 0,
    review_count: parseInt(review_count, 10) || 0,
  };
}

// -----------------------------
// Build Golden JSON
// -----------------------------
export async function trackProduct(
  competitor: string,
  productName: string,
  productUrl: string
): Promise<ProductData> {
  const { browser, page, cleanup } = await connect();

  try {
    const staticData = await fetchStaticData(page, productUrl);
    const dynamicData = await fetchDynamicData(page);

    return {
      competitor,
      product: {
        id: productName.replace(/\s+/g, "-").toUpperCase(),
        name: staticData.name,
        url: productUrl,
        category: staticData.category,
        image_url: staticData.image_url,
        current: {
          price: dynamicData.price,
          currency: "USD",
          stock_status: dynamicData.stock_status,
          rating: dynamicData.rating,
          review_count: dynamicData.review_count,
          last_checked: new Date().toISOString(),
        },
        history: [],
        alerts: [],
      },
    };
  } finally {
    await cleanup();
  }
}
