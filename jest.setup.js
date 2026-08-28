// jest.setup.js
import '@testing-library/jest-dom';

// React 19 removed React.act. We need to polyfill it before any modules import React.
const React = require('react');

// Create a simple act implementation
const actImpl = (callback) => {
  const result = callback();
  if (result && typeof result.then === 'function') {
    return result.then(() => undefined);
  }
  return undefined;
};

// Add act to React if it doesn't exist
if (!React.act) {
  React.act = actImpl;
}

// jsdom doesn't implement matchMedia; useDarkMode reads it for the initial
// OS-preference fallback when localStorage has no stored value yet.
window.matchMedia = window.matchMedia || function matchMedia(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
};

// jsdom has no rAF/canvas rendering; games that draw to a <canvas> (Snake,
// Great Wall) or animate via requestAnimationFrame (Nick of T-Time) only
// need these to exist, not to actually paint anything.
window.requestAnimationFrame =
  window.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 0));
window.cancelAnimationFrame =
  window.cancelAnimationFrame || ((id) => clearTimeout(id));

// jsdom's real getContext exists but only logs "not implemented" and
// returns undefined, so it must be overridden unconditionally.
HTMLCanvasElement.prototype.getContext = () =>
  new Proxy(
    {},
    {
      get: (target, prop) =>
        prop in target ? target[prop] : () => new Proxy({}, { get: () => () => {} }),
    }
  );

// jsdom does no layout, so every element measures 0 — ResizeObserver just
// needs to exist for components that use it to size a canvas.
window.ResizeObserver =
  window.ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
