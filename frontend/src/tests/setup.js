import "@testing-library/jest-dom";

if (typeof window.matchMedia !== "function") {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (typeof window.IntersectionObserver !== "function") {
  window.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

if (!navigator.geolocation) {
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: () => {},
      watchPosition: () => 0,
      clearWatch: () => {},
    },
    configurable: true,
  });
}
