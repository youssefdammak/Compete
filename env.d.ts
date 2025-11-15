/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    AGENT_API_KEY?: string;
    BROWSER_API_KEY?: string;
    BROWSER_API_BASE_URL?: string;
    NODE_ENV: "development" | "production" | "test";
  }
}
