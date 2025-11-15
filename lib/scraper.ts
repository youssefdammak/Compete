import { chromium, Browser, BrowserContext, Page } from "playwright";
import { BrowserSDK } from "./browser-sdk";

const AGENT_API_URL = "https://agent-api.browser.cash/v1/task/create";
const AGENT_API_KEY = process.env.AGENT_API_KEY;
const BROWSER_API_KEY = process.env.BROWSER_API_KEY;

export interface ProductData {
  competitor: string;
  product: {
    id: string;
    name: string | null;
    url: string;
    category: string | null;
    image_url: string | null;
    current: {
      price: number | null;
      currency: string;
      stock_status: string | null;
      rating: number | null;
      review_count: number | null;
      last_checked: string;
    };
    history: unknown[];
    alerts: unknown[];
  };
}

export interface AgentTaskResult {
  [key: string]: unknown;
}

// -----------------------------
// Agent API helper
// -----------------------------
export async function runAgentTask(
  url: string,
  instructions: string
): Promise<AgentTaskResult> {
  if (!AGENT_API_KEY) {
    console.warn("AGENT_API_KEY not set, skipping Agent API call");
    return {};
  }

  const resp = await fetch(AGENT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AGENT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent: "gemini",
      prompt: instructions,
      mode: "text",
      stepLimit: 10,
    }),
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Agent API error: ${error}`);
  }

  return await resp.json();
}

// -----------------------------
// Product tracking
// -----------------------------
export async function trackProduct(
  competitor: string,
  productName: string,
  productUrl: string
): Promise<ProductData> {
  if (!BROWSER_API_KEY) {
    throw new Error(
      "BROWSER_API_KEY is required. Set it in your environment variables."
    );
  }

  // 1️⃣ Browser API: create session and get CDP URL
  const sdk = new BrowserSDK(BROWSER_API_KEY);
  const session = await sdk.createSession({}); // optionally add region
  console.log(`Browser session created: ${session.sessionId}`);

  const cdpUrl = await sdk.getBrowserCDPUrl(session.sessionId);
  console.log(`CDP URL: ${cdpUrl}`);

  // 2️⃣ Connect Playwright via CDP
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded" });

    // ------------------------
    // 3️⃣ Optional: run Agent API if page is dynamic
    // ------------------------
    let agentResult: AgentTaskResult = {};
    try {
      agentResult = await runAgentTask(
        productUrl,
        `Extract product info for "${productName}" including price, stock, rating, image URL, and category`
      );
      console.log("Agent API result:", agentResult);
    } catch (error) {
      console.warn("Agent API failed, continuing with static scraping:", error);
    }

    // ------------------------
    // 4️⃣ Extract data via CDP (static scraping)
    // ------------------------
    const name =
      (await page
        .locator("h1.product-title")
        .textContent()
        .catch(() => null)) || productName;
    const category = await page
      .locator(".breadcrumb li:last-child")
      .textContent()
      .catch(() => null);
    const priceText = await page
      .locator(".product-price")
      .textContent()
      .catch(() => null);
    const stock = await page
      .locator(".availability-status")
      .textContent()
      .catch(() => null);
    const ratingText = await page
      .locator(".product-rating")
      .textContent()
      .catch(() => "0");
    const reviewText = await page
      .locator(".review-count")
      .textContent()
      .catch(() => "0");
    const imageUrl = await page
      .locator(".product-image img")
      .getAttribute("src")
      .catch(() => null);

    const price = priceText
      ? parseFloat(priceText.replace(/[^0-9.]/g, ""))
      : null;
    const rating = ratingText ? parseFloat(ratingText) || null : null;
    const reviews = reviewText ? parseInt(reviewText, 10) || null : null;

    const result: ProductData = {
      competitor,
      product: {
        id: productName.replace(/\s+/g, "-").toUpperCase(),
        name,
        url: productUrl,
        category,
        image_url: imageUrl,
        current: {
          price,
          currency: "USD",
          stock_status: stock,
          rating,
          review_count: reviews,
          last_checked: new Date().toISOString(),
        },
        history: [],
        alerts: [],
      },
    };

    console.log("Product JSON:", JSON.stringify(result, null, 2));
    return result;
  } finally {
    await browser.close();
  }
}
