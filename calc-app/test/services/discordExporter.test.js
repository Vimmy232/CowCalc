import { describe, it, expect } from 'vitest';
import { formatCostsForDiscord } from '../../src/services/discordExporter.js';

describe('formatCostsForDiscord', () => {
  it('should format a complete cost object correctly', () => {
    const costs = { M: 1000, P: 2500, F: 50, S: 10, U: 5 };
    const result = formatCostsForDiscord(costs);
    expect(result).toBe('💰1,000 | 👥2,500 | 🌾50 | ⚙️10 | ⛽5');
  });

  it('should format costs when values are zero', () => {
    const costs = { M: 0, P: 0, F: 0, S: 0, U: 0 };
    const result = formatCostsForDiscord(costs);
    expect(result).toBe('💰0 | 👥0 | 🌾0 | ⚙️0 | ⛽0');
  });

  it('should return an empty string if costs is null or undefined', () => {
    expect(formatCostsForDiscord(null)).toBe('');
    expect(formatCostsForDiscord(undefined)).toBe('');
  });

  it('should handle missing properties by formatting them as 0', () => {
    const costs = { M: 100 }; // Missing P, F, S, U
    const result = formatCostsForDiscord(costs);
    expect(result).toBe('💰100 | 👥0 | 🌾0 | ⚙️0 | ⛽0');
  });

  it('should handle negative values correctly', () => {
    const costs = { M: -500, P: -1000, F: -50, S: -10, U: -5 };
    const result = formatCostsForDiscord(costs);
    expect(result).toBe('💰-500 | 👥-1,000 | 🌾-50 | ⚙️-10 | ⛽-5');
  });

  it('should handle decimal values by rounding/formatting as whole numbers', () => {
    const costs = { M: 1000.5, P: 2500.1, F: 50.9, S: 10.4, U: 5.5 };
    const result = formatCostsForDiscord(costs);
    expect(result).toBe('💰1,001 | 👥2,500 | 🌾51 | ⚙️10 | ⛽6');
  });
});
