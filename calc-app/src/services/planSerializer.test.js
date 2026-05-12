import { describe, it, expect } from 'vitest';
import { validatePlan } from './planSerializer';

describe('validatePlan', () => {
  it('should return invalid for null or undefined plan', () => {
    const resultNull = validatePlan(null);
    expect(resultNull.isValid).toBe(false);
    expect(resultNull.errors).toContain('Plan is null or undefined');

    const resultUndefined = validatePlan(undefined);
    expect(resultUndefined.isValid).toBe(false);
    expect(resultUndefined.errors).toContain('Plan is null or undefined');
  });

  it('should return errors for empty object plan', () => {
    const plan = {};
    const result = validatePlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('selectedMap must be a string');
    expect(result.errors).toContain('days must be a non-negative integer');
    expect(result.errors).toContain('blocks must be an array');
  });

  it('should validate selectedMap as string', () => {
    const plan = { selectedMap: 123, days: 0, blocks: [] };
    const result = validatePlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('selectedMap must be a string');
  });

  it('should validate days as non-negative integer', () => {
    const validPlan = { selectedMap: 'map', days: 0, blocks: [] };
    expect(validatePlan(validPlan).isValid).toBe(true);

    const planNegative = { selectedMap: 'map', days: -1, blocks: [] };
    const resultNegative = validatePlan(planNegative);
    expect(resultNegative.isValid).toBe(false);
    expect(resultNegative.errors).toContain('days must be a non-negative integer');

    const planFloat = { selectedMap: 'map', days: 1.5, blocks: [] };
    const resultFloat = validatePlan(planFloat);
    expect(resultFloat.isValid).toBe(false);
    expect(resultFloat.errors).toContain('days must be a non-negative integer');

    const planString = { selectedMap: 'map', days: '0', blocks: [] };
    const resultString = validatePlan(planString);
    expect(resultString.isValid).toBe(false);
    expect(resultString.errors).toContain('days must be a non-negative integer');
  });

  it('should validate blocks as an array', () => {
    const plan = { selectedMap: 'map', days: 0, blocks: {} };
    const result = validatePlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('blocks must be an array');
  });

  it('should validate individual blocks', () => {
    const plan = {
      selectedMap: 'map',
      days: 0,
      blocks: [
        { selectedCountryIdx: 'not-int', cart: [] },
        { selectedCountryIdx: 1, cart: 'not-array' }
      ]
    };
    const result = validatePlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('blocks[0].selectedCountryIdx must be an integer');
    expect(result.errors).toContain('blocks[1].cart must be an array');
  });

  it('should return valid for a correctly structured plan', () => {
    const validPlan = {
      selectedMap: 'World Map',
      days: 5,
      blocks: [
        {
          selectedCountryIdx: 1,
          cart: []
        }
      ]
    };
    const result = validatePlan(validPlan);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
