import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config();

const AGENT_API_KEY = process.env.AGENT_API_KEY!;
const COMPETITOR = "Logitech";
const PRODUCT = "MX Master 3";

async function runAgentTask() {
  const prompt = `
You are an expert web scraper. Search for "${COMPETITOR} ${PRODUCT}" on Amazon.com. 
Return a JSON array of products with the following structure for each product:

{
  "competitor": "${COMPETITOR}",
  "product": {
    "id": "unique product identifier or null",
    "name": "product title or null",
    "url": "product page URL or null",
    "category": "product category or null",
    "image_url": "main product image URL or null",
    "current": {
      "price": "current price as number or null",
      "currency": "currency code or null",
      "stock_status": "In Stock / Out of Stock / null",
      "rating": "average rating as number or null",
      "review_count": "number of reviews or null",
      "last_checked": "ISO 8601 timestamp of this check"
    },
    "history": [],  
    "alerts": []   
  }
}

Rules:
1. Include all products on the **first page of Amazon search results** for this query.
2. If a field is unavailable, return 'null' for single values or '[]' for arrays.
3. Exclude unrelated content, ads, and scripts.
4. Return **valid JSON only**, no extra text.
`;

  const response = await fetch(
    "https://agent-api.browser.cash/v1/task/create",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AGENT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent: "gemini",
        prompt,
        mode: "text",
        stepLimit: 20,
      }),
    }
  );

  if (!response.ok) {
    console.error("Agent API error:", response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log("Agent task created. Task ID:", data.id || data.taskId);

  // Polling for completion
  let result: any = null;
  for (let i = 0; i < 20; i++) {
    const statusRes = await fetch(
      `https://agent-api.browser.cash/v1/task/${data.id || data.taskId}`,
      {
        headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
      }
    );
    const statusData = await statusRes.json();
    if (statusData.status === "completed") {
      result = statusData.result;
      break;
    }
    await new Promise((r) => setTimeout(r, 30000));
  }

  if (!result) {
    console.error("Task did not complete in time.");
    return;
  }

  console.log("Fetched HTML (snippet):\n", result.slice(0, 1000));
}

runAgentTask().catch(console.error);
