import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock seguro de WebSocket para testes isolados sem rede
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState = 1;
  onopen: any = null;
  onmessage: any = null;
  onerror: any = null;
  onclose: any = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (typeof this.onopen === "function") {
        this.onopen({ type: "open" });
      }
    }, 0);
  }

  send() {}
  close() {
    this.readyState = 3;
    setTimeout(() => {
      if (typeof this.onclose === "function") {
        this.onclose({ type: "close" });
      }
    }, 0);
  }

  addEventListener(event: string, handler: any) {
    if (event === "open") setTimeout(() => handler({ type: "open" }), 0);
  }
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}

globalThis.WebSocket = MockWebSocket as any;
if (typeof window !== "undefined") {
  window.WebSocket = MockWebSocket as any;
}
