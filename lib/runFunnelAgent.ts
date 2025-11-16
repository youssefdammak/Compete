export type FunnelStepType = "ad" | "landing" | "product" | "cart" | "checkout" | "other";

export interface FunnelStep {
  id: string;
  type: FunnelStepType;
  url: string;
  title: string | null;
  notes: string | null;
  price: number | null;
  currency: string | null;
}

export interface FunnelResult {
  steps: FunnelStep[];
  finalPrice: number | null;
  currency: string | null;
  error?: string;
}

const CREATE_URL = 'https://agent-api.browser.cash/v1/task/create';
const API_KEY = process.env.BROWSER_CASH_AGENT_API_KEY;

async function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function extractFirstJsonBlock(text: string): string | null {
  if (!text) return null;
  // try fenced block first
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();

  // then try the first {...} block
  const m = text.match(/\{[\s\S]*\}/m);
  return m ? m[0] : null;
}

function safeFallback(): FunnelResult {
  return {
    steps: [],
    finalPrice: null,
    currency: null,
    error: 'Agent was blocked or browser failed (captcha / screenshot error). Try again or change query.',
  };
}

export async function runFunnelAgent(query: string): Promise<FunnelResult> {
  if (!API_KEY) {
    return { steps: [], finalPrice: null, currency: null, error: 'Agent API key not configured (set BROWSER_CASH_AGENT_API_KEY)' };
  }

  const prompt = `You are an autonomous browsing agent. Your task:\n\n1. Open Google in a desktop browser.\n2. Search for the query: "${query}".\n3. Find and click the top sponsored (paid) ad related to the query.\n4. From that ad, follow the funnel: landing -> product -> add-to-cart -> checkout (stop when final price is visible; DO NOT complete payment).\n\nAt each major step record: id, url, type (ad|landing|product|cart|checkout|other), title, notes, price (number|null), currency (string|null).\n\nReturn ONLY a JSON object with keys: steps (array), finalPrice (number|null), currency (string|null).`;

  try {
    const createRes = await fetch(CREATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ agent: 'gemini', prompt, mode: 'text', stepLimit: 40 }),
    });

    if (!createRes.ok) {
      const txt = await createRes.text().catch(() => '(no body)');
      return { steps: [], finalPrice: null, currency: null, error: `Agent create error: ${createRes.status} ${txt}` };
    }

    const createJson = await createRes.json().catch(() => null);
    const taskId = (createJson && (createJson.taskId || createJson.id || createJson.task?.id || createJson.data?.id)) || null;
    if (!taskId) {
      // If provider returned an immediate result object with steps, try to parse and normalize
      if (createJson && Array.isArray(createJson.steps)) {
        const result = createJson;
        return {
          steps: Array.isArray(result.steps) ? result.steps : [],
          finalPrice: typeof result.finalPrice === 'number' ? result.finalPrice : null,
          currency: result.currency ?? null,
        };
      }
      return { steps: [], finalPrice: null, currency: null, error: 'Agent create returned no taskId' };
    }

    const pollUrl = `https://agent-api.browser.cash/v1/task/${encodeURIComponent(String(taskId))}`;
    const pollInterval = 2500; // ms

    while (true) {
      const statusRes = await fetch(pollUrl, { headers: { Authorization: `Bearer ${API_KEY}` } });
      if (!statusRes.ok) {
        const txt = await statusRes.text().catch(() => '(no body)');
        return { steps: [], finalPrice: null, currency: null, error: `Agent status error: ${statusRes.status} ${txt}` };
      }

      const statusJson = await statusRes.json().catch(() => null);
      if (!statusJson) return { steps: [], finalPrice: null, currency: null, error: 'Invalid agent status JSON' };

      const state = (statusJson.state || statusJson.status || '').toString().toLowerCase();

      if (state === 'completed' || state === 'finished' || state === 'success' || state === 'done') {
        // The provider may return result.answer as a string
        const result = statusJson.result || statusJson.output || statusJson.data || statusJson;
        const answer = result?.answer ?? result?.output ?? result?.text ?? result;

        // If answer is an object already with the expected keys
        if (answer && typeof answer === 'object' && Array.isArray(answer.steps)) {
          return {
            steps: answer.steps,
            finalPrice: typeof answer.finalPrice === 'number' ? answer.finalPrice : null,
            currency: answer.currency ?? null,
          };
        }

        // If answer is a string, try to parse JSON or extract a JSON block
        if (typeof answer === 'string') {
          // try full JSON parse
          try {
            const parsed = JSON.parse(answer);
            return {
              steps: Array.isArray(parsed.steps) ? parsed.steps : [],
              finalPrice: typeof parsed.finalPrice === 'number' ? parsed.finalPrice : null,
              currency: parsed.currency ?? null,
            };
          } catch (_) {
            // try extract first JSON block
            const block = extractFirstJsonBlock(answer);
            if (block) {
              try {
                const parsed = JSON.parse(block);
                return {
                  steps: Array.isArray(parsed.steps) ? parsed.steps : [],
                  finalPrice: typeof parsed.finalPrice === 'number' ? parsed.finalPrice : null,
                  currency: parsed.currency ?? null,
                };
              } catch (__e) {
                return { steps: [], finalPrice: null, currency: null, error: 'Agent returned completed status but payload JSON could not be parsed' };
              }
            }
          }
        }

        return { steps: [], finalPrice: null, currency: null, error: 'Agent returned completed status but no parseable JSON answer found' };
      }

      if (state === 'failed' || state === 'error') {
        const failedReason = (statusJson.failedReason || statusJson.error || statusJson.message || '').toString().toLowerCase();
        if (failedReason.includes('page.screenshot') || failedReason.includes('recaptcha') || failedReason.includes('captcha')) {
          return safeFallback();
        }
        const body = statusJson.failedReason || statusJson.error || statusJson.message || JSON.stringify(statusJson);
        return { steps: [], finalPrice: null, currency: null, error: `Agent task failed: ${body}` };
      }

      // still running
      await delay(pollInterval);
    }
  } catch (err: any) {
    return { steps: [], finalPrice: null, currency: null, error: `Network or unexpected error: ${String(err?.message || err)}` };
  }
}

export default runFunnelAgent;
