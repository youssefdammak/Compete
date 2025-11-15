declare module "patchright" {
  export interface Browser {
    contexts(): BrowserContext[];
    newContext(options?: unknown): Promise<BrowserContext>;
  }

  export interface BrowserContext {
    pages(): Page[];
    newPage(): Promise<Page>;
    isClosed(): boolean;
    close(): Promise<void>;
  }

  export interface Page {
    goto(url: string, options?: { waitUntil?: string }): Promise<void>;
    locator(selector: string): Locator;
    waitForSelector(
      selector: string,
      options?: { timeout?: number }
    ): Promise<void>;
    close(options?: { runBeforeUnload?: boolean }): Promise<void>;
    isClosed(): boolean;
  }

  export interface Locator {
    textContent(): Promise<string | null>;
    getAttribute(name: string): Promise<string | null>;
  }

  export const chromium: {
    connectOverCDP(endpointURL: string): Promise<Browser>;
  };
}
