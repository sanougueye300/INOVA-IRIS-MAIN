import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";

// Mock sessionStorage pour tous les tests
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Polyfill Web Crypto API complet (Node.js webcrypto avec support HMAC, SHA-256, etc.)
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  writable: true,
  configurable: true,
});
