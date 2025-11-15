// BrowserSDK for browser.cash API
// You can override this with BROWSER_API_BASE_URL environment variable
const BROWSER_API_BASE_URL = process.env.BROWSER_API_BASE_URL || 'https://api.browser.cash';

export interface BrowserSession {
  sessionId: string;
  [key: string]: unknown;
}

export class BrowserSDK {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('BROWSER_API_KEY is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = BROWSER_API_BASE_URL;
  }

  async createSession(options: Record<string, unknown> = {}): Promise<BrowserSession> {
    const response = await fetch(`${this.baseUrl}/v1/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create browser session: ${error}`);
    }

    return await response.json();
  }

  async getBrowserCDPUrl(sessionId?: string): Promise<string> {
    // Fetch the CDP URL for the current session
    // The actual endpoint may vary based on browser.cash API documentation
    const endpoint = sessionId 
      ? `${this.baseUrl}/v1/sessions/${sessionId}/cdp`
      : `${this.baseUrl}/v1/sessions/cdp`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get CDP URL: ${error}`);
    }

    const data = await response.json();
    return data.cdpUrl || data.url || data.wsEndpoint || '';
  }
}

