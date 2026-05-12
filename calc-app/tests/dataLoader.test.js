import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCachedGlobalData,
  getCachedFactionData,
  getCachedMapData,
  clearDataCache
} from '../src/services/dataLoader.js';

describe('dataLoader caching', () => {
  beforeEach(() => {
    // Reset cache before each test
    clearDataCache();

    // Mock global.fetch
    global.fetch = vi.fn();
  });

  it('clearDataCache resets the cache state completely', async () => {
    // Setup mock responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    // Populate the cache by calling the caching methods
    await getCachedGlobalData();
    await getCachedFactionData('Ally');
    await getCachedMapData('World_at_War_classic.json');

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalled();
    const fetchCountBefore = global.fetch.mock.calls.length;

    // Call the methods again, they should return cached data and NOT call fetch
    await getCachedGlobalData();
    await getCachedFactionData('Ally');
    await getCachedMapData('World_at_War_classic.json');

    expect(global.fetch.mock.calls.length).toBe(fetchCountBefore);

    // Now clear the cache
    clearDataCache();

    // Call the methods again, they should call fetch this time
    await getCachedGlobalData();
    await getCachedFactionData('Ally');
    await getCachedMapData('World_at_War_classic.json');

    expect(global.fetch.mock.calls.length).toBeGreaterThan(fetchCountBefore);
  });
});
