import { NextRequest, NextResponse } from "next/server";
import { FunnelRun } from "@/types/funnel";
import dns from "dns/promises";

export const runtime = "nodejs";

type AgentInput = { competitor: string; query: string };

function buildAgentPrompt({ competitor, query }: AgentInput) {
  return `You are an autonomous browsing agent. Your task:

1. Open Google in a desktop browser.
2. Search for the query: "${query}".
3. Find and click the top sponsored (paid) ad that is related to the competitor "${competitor}".
4. From that ad, follow the user funnel:
   - Landing page
   - Product page (if relevant)
   - Add to cart (if available)
   - Checkout page (until the final price is visible, but do NOT actually complete payment).

Navigation rules:
- Do NOT use the browser back button.
- Do NOT call any equivalent of "go back" or page.goBack.
- If you click the wrong link or land on an irrelevant page:
  - Stay on the current page and either:
    - use the page's own navigation (menus, links), or
    - type a new URL or perform a new search from the current page.
- Never rely on browser history; always navigate forward via links or new URLs/searches.
- Never intentionally close the page or browser window.

At each major step (ad, landing, product, cart, checkout):
- Record:
  - URL
  - Step type: "ad" | "landing" | "product" | "cart" | "checkout" | "other"
  - Title (page title or main heading)
  - Notes (key offer, discount, or observations)
  - Price and currency, if clearly visible (otherwise null).

If at any point you are blocked (e.g., CAPTCHA, region restriction) or cannot proceed further:
- Stop the exploration.
- Still return the best JSON you can with whatever steps you've collected so far.

When finished, return ONLY a JSON object with this exact structure (no additional commentary, no markdown):

{
  "steps": [
    {
      "id": "string",
      "type": "ad" | "landing" | "product" | "cart" | "checkout" | "other",
      "url": "https://example.com",
      "title": "string or null",
      "notes": "string or null",
      "price": 123.45,
      "currency": "USD"
    }
  ],
  "finalPrice": 123.45,
  "currency": "USD"
}


`;
}

function normalizeAgentResult(raw: any, input: AgentInput): FunnelRun {
  // If the agent returned a structure matching { steps, finalPrice, currency }, try to map it.
  const now = new Date().toISOString();
  const id = `run_${Date.now()}`;
  // If the agent returned a wrapper like { answer: '...JSON...' } or a plain string containing JSON, try to extract JSON first
  const tryExtractJson = (maybe: any) => {
    if (!maybe) return null;

    const extractFromString = (str: string) => {
      if (!str || typeof str !== 'string') return null;
      // try fenced block first
      const fenced = str.match(/```json\s*([\s\S]*?)```/m);
      if (fenced && fenced[1]) {
        try { return JSON.parse(fenced[1]); } catch (_) { /* fallthrough */ }
      }

      // try to find the last JSON object-like block
      const jsonMatch = str.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]); } catch (e) { return null; }
      }

      return null;
    };

    if (typeof maybe === 'string') {
      return extractFromString(maybe);
    }

    if (typeof maybe === 'object') {
      // if object already looks like the desired payload, return it
      if (Array.isArray(maybe.steps)) return maybe;

      // otherwise try common text fields that might contain a JSON string
      const textFields = ['answer', 'output', 'text', 'result', 'data'];
      for (const f of textFields) {
        const v = maybe[f];
        if (typeof v === 'string') {
          const ex = extractFromString(v);
          if (ex) return ex;
        }
        if (v && typeof v === 'object' && Array.isArray(v.steps)) return v;
      }

      return null;
    }

    return null;
  };

  const coercedRaw = (() => {
    // raw may be { answer: '...' } or similar wrappers
    if (!raw) return raw
    if (typeof raw === 'string') {
      const ex = tryExtractJson(raw)
      return ex || raw
    }
    if (typeof raw === 'object') {
      // common fields to inspect
      const candidates = [raw, raw.result, raw.output, raw.response, raw.data, raw.answer]
      for (const c of candidates) {
        const ex = tryExtractJson(c)
        if (ex) return ex
      }
      return raw
    }
    return raw
  })()

  if (coercedRaw && Array.isArray(coercedRaw.steps) && coercedRaw.steps.length > 0) {
    const steps = coercedRaw.steps.map((s: any, idx: number) => ({
      id: s.id || `step_${idx + 1}`,
      type: s.type || (idx === 0 ? "ad" : idx === coercedRaw.steps.length - 1 ? "checkout" : "other"),
      url: s.url || "",
      title: s.title || undefined,
      notes: s.notes || undefined,
      price: typeof s.price === "number" ? s.price : s.price ? Number(s.price) : undefined,
      currency: s.currency || coercedRaw.currency || undefined,
      screenshotUrl: s.screenshotUrl || undefined,
      order: idx + 1,
    }));

    return {
      id,
      competitor: input.competitor,
      query: input.query,
      createdAt: now,
      steps,
      finalPrice: typeof coercedRaw.finalPrice === "number" ? coercedRaw.finalPrice : null,
      currency: coercedRaw.currency || null,
    };
  }

  // Fallback sample run when raw data is missing or unexpected
  const sample: FunnelRun = {
    id,
    competitor: input.competitor,
    query: input.query,
    createdAt: now,
    currency: "USD",
    finalPrice: 59.99,
    steps: [
      {
        id: "s1",
        type: "ad",
        url: "https://ads.example.com/click?campaign=wireless-mouse&utm_source=google",
        title: "Sponsored — GamerPro Wireless Mouse",
        notes: "Top sponsored ad",
        order: 1,
        screenshotUrl: "/placeholder.svg",
      },
      {
        id: "s2",
        type: "landing",
        url: "https://gamerpro.example.com/wireless-mouse?ref=ad",
        title: "GamerPro — Wireless Mouse Landing",
        notes: "Landing contains hero banner + limited time offer",
        order: 2,
        screenshotUrl: "/placeholder.svg",
      },
      {
        id: "s3",
        type: "product",
        url: "https://gamerpro.example.com/products/wireless-mouse-pro",
        title: "Wireless Mouse Pro — 16000 DPI",
        notes: "Product page shows price, variants, and reviews",
        price: 69.99,
        currency: "USD",
        order: 3,
        screenshotUrl: "/placeholder.svg",
      },
      {
        id: "s4",
        type: "checkout",
        url: "https://gamerpro.example.com/checkout?cart=123",
        title: "Checkout — GamerPro",
        notes: "Final checkout page (post-discount)",
        price: 59.99,
        currency: "USD",
        order: 4,
        screenshotUrl: "/placeholder.svg",
      },
    ],
  };

  // mark fallback so callers can distinguish a real agent result from a generated sample
  ;(sample as any).__fallback = true
  return sample;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const competitor = typeof body.competitor === "string" ? body.competitor : "Unknown";
    const query = typeof body.query === "string" ? body.query : "";

    const input = { competitor, query };

    const agentPrompt = buildAgentPrompt(input);

    const apiBase = process.env.AGENT_API_URL;
    const apiKey = process.env.AGENT_API_KEY;
    // No automatic session manipulation: respect provider sessions as-is. We won't attempt to stop sessions.

    if (!apiBase) {
      console.error("AGENT_API_URL (or BROWSERCASH_AGENT_URL) not configured. Cannot call agent.");
      return NextResponse.json({ error: "Agent URL not configured" }, { status: 500 });
    }

    if (!apiKey) {
      console.error("AGENT_API_KEY not configured. Cannot call agent.");
      return NextResponse.json({ error: "Agent API key not configured" }, { status: 500 });
    }

    // Build create-task endpoint
    const base = apiBase.replace(/\/$/, "");
    const endpoint = `${base}/v1/task/create`;

    // Diagnostic: resolve DNS for the host and log addresses (cached)
    // Only print these diagnostics when AGENT_DEBUG=true to avoid noisy logs in normal dev
    try {
      const host = new URL(base).hostname;
      // cache lookup on module so we don't run DNS resolution on every request
      if (!(global as any).__agentDnsCache) {
        (global as any).__agentDnsCache = {};
      }

      const cache = (global as any).__agentDnsCache;
      if (!cache[host]) {
        cache[host] = await dns.lookup(host, { all: true }).catch((e) => {
          if (process.env.AGENT_DEBUG === "true") console.error("DNS lookup failed:", e);
          return null;
        });
      }

    } catch (err) {
      if (process.env.AGENT_DEBUG === "true") console.error("Failed to parse agent URL for DNS diagnostics:", err);
    }

    const pollIntervalMs = Number(process.env.AGENT_POLL_INTERVAL_MS || 1000); // default 1s

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Helper to check if client aborted the request
    const clientAborted = () => Boolean((req as any)?.signal?.aborted);

    // Single create-task then poll until completion. No retries.
    // Respect client cancellation
    if (clientAborted()) {
      if (process.env.AGENT_DEBUG === 'true') console.warn('Client aborted request');
      return NextResponse.json({ error: 'Client aborted' }, { status: 499 });
    }

    // Call create-task
    let createRes: Response;
    try {
      if (process.env.AGENT_DEBUG === "true") console.log("Calling agent create-task endpoint:", endpoint, "(key present?", !!apiKey, ")");
      createRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ agent: "gemini", prompt: agentPrompt, mode: "text", stepLimit: 60 }),
      });
    } catch (fetchErr: any) {
      if (process.env.AGENT_DEBUG === "true") console.error("Failed to call Browser Cash agent (network error):", fetchErr);
      return NextResponse.json({ error: "Agent network error", details: String(fetchErr?.message || fetchErr) }, { status: 502 });
    }

    // Read raw text first so we can always log the agent response (even if non-JSON)
    const createText = await createRes.text().catch(() => "(failed to read response body)");

    if (!createRes.ok) {
      // Always log non-OK responses so we can see provider errors in server logs
      console.error("Agent create-task returned non-ok status:", createRes.status, createText);
      return NextResponse.json({ error: "Agent returned error", status: createRes.status, body: createText }, { status: 502 });
    }

    let createJson: any = null;
    try {
      createJson = JSON.parse(createText);
    } catch (e) {
      // Failed to parse JSON — log raw text for debugging and return an error
      console.error("Failed to parse create-task response as JSON:", e, "raw:", createText);
      return NextResponse.json({ error: "Agent returned invalid create-task JSON", body: createText }, { status: 502 });
    }

    // Always log the immediate create-task response for visibility (parsed JSON)
    try {
      console.log("Agent create-task response:", createJson);
    } catch (logErr) {
      console.error("Failed to log create-task response:", logErr);
    }

    // If create-task returned an immediate result (e.g., steps array), normalize and return it.
    if (Array.isArray(createJson.steps) && createJson.steps.length > 0) {
      try { console.log("Agent immediate response:", createJson); } catch (logErr) { console.error("Failed to log immediate agent response:", logErr); }
      if (process.env.AGENT_DEBUG === "true") console.log("Agent returned immediate steps; normalizing result.");
      const run = normalizeAgentResult(createJson, input);
      return NextResponse.json(run, { status: 200 });
    }

    // Extract task id and poll once until completion or failure
    const taskId = createJson.id || createJson.taskId || createJson.task?.id || createJson.data?.id;
    if (!taskId) {
      // No task id and no steps — fall back to sample run
      const run = normalizeAgentResult(null, input);
      return NextResponse.json(run, { status: 200 });
    }

    const pollEndpoint = `${base.replace(/\/$/, "")}/v1/task/${encodeURIComponent(taskId)}`;
    if (process.env.AGENT_DEBUG === "true") console.log("Polling task status at:", pollEndpoint, `(will wait until completed or failed)`);

    while (true) {
      if (clientAborted()) {
        if (process.env.AGENT_DEBUG === 'true') console.warn('Client aborted request during polling — stopping');
        return NextResponse.json({ error: 'Client aborted' }, { status: 499 });
      }

      let statusRes: Response;
      try {
        statusRes = await fetch(pollEndpoint, {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch (pollErr: any) {
        console.error("Task status fetch error:", pollErr);
        return NextResponse.json({ error: 'Agent task status fetch failed', details: String(pollErr?.message || pollErr) }, { status: 502 });
      }

      if (!statusRes.ok) {
        const txt = await statusRes.text().catch(() => "(failed to read body)");
        console.error("Task status returned non-ok:", statusRes.status, txt);
        return NextResponse.json({ error: 'Agent task status error', status: statusRes.status, body: txt }, { status: 502 });
      }

      const rawStatusText = await statusRes.text().catch(() => "(failed to read body)");
      let statusJson: any = null;
      try {
        statusJson = JSON.parse(rawStatusText);
      } catch (e) {
        console.error("Failed to parse task status JSON. Raw response:", rawStatusText, "error:", e);
        return NextResponse.json({ error: 'Invalid task status JSON', body: rawStatusText }, { status: 502 });
      }

      try { console.log("Task status:", statusJson); } catch (logErr) { console.error("Failed to log task status:", logErr); }

      const status = (statusJson.status || statusJson.state || statusJson.task?.status || '').toString().toLowerCase();

      if (status === 'completed' || status === 'finished' || status === 'success' || status === 'done') {
        const finalPayload = statusJson.result || statusJson.output || statusJson.response || statusJson.data || statusJson.result_json || statusJson.json || statusJson;
        try { console.log('Agent final payload:', finalPayload); } catch (logErr) { console.error('Failed to log final agent payload:', logErr); }
        if (process.env.AGENT_DEBUG === "true") console.log('Task completed; payload:', finalPayload);
        const run = normalizeAgentResult(finalPayload, input);
        return NextResponse.json(run, { status: 200 });
      }

      if (status === 'failed' || status === 'error') {
        const body = statusJson.failedReason || statusJson.error || statusJson.message || JSON.stringify(statusJson);
        return NextResponse.json({ error: 'Agent task failed', details: body }, { status: 502 });
      }

      // not finished yet — wait interval then poll again
      await sleep(pollIntervalMs);
    }
  } catch (err) {
    console.error("Ad funnels POST error:", err);
    return NextResponse.json({ error: "Failed to explore ad funnel" }, { status: 500 });
  }
}
