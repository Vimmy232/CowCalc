import { describe, it, expect } from 'vitest';
import { parseIntSafe } from '../src/services/utils.js';

describe('parseIntSafe', () => {
  it('should parse a valid integer string correctly', () => {
    expect(parseIntSafe('10')).toBe(10);
    expect(parseIntSafe('-5')).toBe(-5);
    expect(parseIntSafe('0')).toBe(0);
  });

  it('should parse valid numbers', () => {
    expect(parseIntSafe(42)).toBe(42);
    expect(parseIntSafe(-7)).toBe(-7);
  });

  it('should parse strings starting with numbers', () => {
    expect(parseIntSafe('10abc')).toBe(10);
    expect(parseIntSafe('12.5')).toBe(12);
  });

  it('should return 0 as default fallback when parsing fails', () => {
    expect(parseIntSafe('abc')).toBe(0);
    expect(parseIntSafe(null)).toBe(0);
    expect(parseIntSafe(undefined)).toBe(0);
    expect(parseIntSafe({})).toBe(0);
    expect(parseIntSafe([])).toBe(0);
    expect(parseIntSafe(NaN)).toBe(0);
    expect(parseIntSafe(Infinity)).toBe(0);
  });

  it('should return the provided fallback when parsing fails', () => {
    expect(parseIntSafe('abc', 5)).toBe(5);
    expect(parseIntSafe(null, -1)).toBe(-1);
    expect(parseIntSafe(undefined, 100)).toBe(100);
    expect(parseIntSafe(NaN, 42)).toBe(42);
  });
});
