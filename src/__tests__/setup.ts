import "@testing-library/jest-dom";

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

// Mock crypto.subtle (Web Crypto API)
Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: {
      digest: async (algorithm: string, data: ArrayBuffer) => {
        // Simple mock SHA-256 — retourne un buffer de 32 bytes basé sur l'input
        const view = new Uint8Array(data);
        const result = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          result[i] = view[i % view.length] ^ (i * 7);
        }
        return result.buffer;
      },
    },
    getRandomValues: <T extends ArrayBufferView>(arr: T): T => {
      if (arr instanceof Uint32Array) {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 0xffffffff);
        }
      }
      return arr;
    },
  },
  writable: true,
});
