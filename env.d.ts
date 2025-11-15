/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    TAURINE_CDP_URL?: string;
    NODE_ENV: "development" | "production" | "test";
  }
}

