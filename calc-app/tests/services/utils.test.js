import { describe, it, expect } from 'vitest';
import { isDeepEqual } from '../../src/services/utils.js';

describe('isDeepEqual', () => {
  it('should return true for identical primitives', () => {
    expect(isDeepEqual(1, 1)).toBe(true);
    expect(isDeepEqual('a', 'a')).toBe(true);
    expect(isDeepEqual(true, true)).toBe(true);
    expect(isDeepEqual(null, null)).toBe(true);
  });

  it('should return false for different primitives', () => {
    expect(isDeepEqual(1, 2)).toBe(false);
    expect(isDeepEqual('a', 'b')).toBe(false);
    expect(isDeepEqual(true, false)).toBe(false);
    expect(isDeepEqual(null, undefined)).toBe(false);
  });

  it('should return true for identical objects', () => {
    expect(isDeepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(isDeepEqual({ a: { b: 2 } }, { a: { b: 2 } })).toBe(true);
    expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isDeepEqual({ a: { b: 2 } }, { a: { b: 3 } })).toBe(false);
    expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  describe('error handling (circular references)', () => {
    it('should fallback to strict equality when stringification fails and objects are identical', () => {
      const obj1 = { name: 'circular' };
      obj1.self = obj1; // Create circular reference

      // When the exact same object reference is passed, strict equality (obj1 === obj2) returns true
      expect(isDeepEqual(obj1, obj1)).toBe(true);
    });

    it('should fallback to strict equality when stringification fails and objects are different', () => {
      const obj1 = { name: 'circular' };
      obj1.self = obj1;

      const obj2 = { name: 'circular' };
      obj2.self = obj2;

      // When different object references are passed, strict equality (obj1 === obj2) returns false
      expect(isDeepEqual(obj1, obj2)).toBe(false);
    });

    it('should handle one circular and one normal object', () => {
      const obj1 = { name: 'circular' };
      obj1.self = obj1;

      const obj2 = { name: 'circular' };

      // JSON.stringify will fail on obj1, falling back to strict equality
      expect(isDeepEqual(obj1, obj2)).toBe(false);
    });
  });
});
