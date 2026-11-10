import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Live network is unavailable in product unit tests; mock the request.'))));
});
afterEach(() => { vi.unstubAllGlobals(); });
