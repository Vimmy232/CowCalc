import { describe, it, expect } from 'vitest';
import {
  getResearchUnlockDay,
  applyUpgradePrerequisites,
  validateUnitTierPrerequisites
} from '../src/services/researchService.js';
import { UPGRADE_PREREQUISITES } from '../src/services/constants.js';

describe('getResearchUnlockDay', () => {
  const mockResearchData = [
    { Name: 'Infantry', Faction: 'Ally', Tier: 1, 'Day Available': 1 },
    { Name: 'Infantry', Faction: 'Ally', Tier: 2, 'Day Available': 3 },
    { Name: 'Motorized Infantry', Faction: 'Ally', Tier: 1, 'Day Available': 5 },
    { Name: 'Motorized Infantry', Faction: 'Ally', Tier: 2, 'Day Available': 7 },
  ];

  it('should return 1 when researchData is missing or not an array', () => {
    expect(getResearchUnlockDay(null, 'Ally', 'Infantry', 1)).toBe(1);
    expect(getResearchUnlockDay(undefined, 'Ally', 'Infantry', 1)).toBe(1);
    expect(getResearchUnlockDay({}, 'Ally', 'Infantry', 1)).toBe(1);
    expect(getResearchUnlockDay('string', 'Ally', 'Infantry', 1)).toBe(1);
  });

  it('should return 1 when faction is missing', () => {
    expect(getResearchUnlockDay(mockResearchData, null, 'Infantry', 1)).toBe(1);
    expect(getResearchUnlockDay(mockResearchData, undefined, 'Infantry', 1)).toBe(1);
    expect(getResearchUnlockDay(mockResearchData, '', 'Infantry', 1)).toBe(1);
  });

  it('should return 1 when unitName is missing', () => {
    expect(getResearchUnlockDay(mockResearchData, 'Ally', null, 1)).toBe(1);
    expect(getResearchUnlockDay(mockResearchData, 'Ally', undefined, 1)).toBe(1);
    expect(getResearchUnlockDay(mockResearchData, 'Ally', '', 1)).toBe(1);
  });

  it('should return correct Day Available when matching research is found', () => {
    expect(getResearchUnlockDay(mockResearchData, 'Ally', 'Infantry', 1)).toBe(1);
    expect(getResearchUnlockDay(mockResearchData, 'Ally', 'Infantry', 2)).toBe(3);
    expect(getResearchUnlockDay(mockResearchData, 'Ally', 'Motorized Infantry', 1)).toBe(5);
    expect(getResearchUnlockDay(mockResearchData, 'Ally', 'Motorized Infantry', 2)).toBe(7);
  });

  it('should correctly parse tier even if passed as string', () => {
    expect(getResearchUnlockDay(mockResearchData, 'Ally', 'Infantry', '2')).toBe(3);
  });

  it('should fallback to 1 if no matching research is found', () => {
    // Missing faction from mock
    expect(getResearchUnlockDay(mockResearchData, 'Axis', 'Infantry', 1)).toBe(1);

    // Missing unitName from mock
    expect(getResearchUnlockDay(mockResearchData, 'Ally', 'Mechanized Infantry', 1)).toBe(1);

    // Missing tier from mock
    expect(getResearchUnlockDay(mockResearchData, 'Ally', 'Infantry', 3)).toBe(1);
  });

  it('should return at least 1 even if Day Available is invalid or less than 1', () => {
    const invalidMockData = [
      { Name: 'Infantry', Faction: 'Ally', Tier: 1, 'Day Available': 0 },
      { Name: 'Infantry', Faction: 'Ally', Tier: 2, 'Day Available': -5 },
      { Name: 'Infantry', Faction: 'Ally', Tier: 3, 'Day Available': 'invalid' },
      { Name: 'Infantry', Faction: 'Ally', Tier: 4 }, // Missing 'Day Available'
    ];

    expect(getResearchUnlockDay(invalidMockData, 'Ally', 'Infantry', 1)).toBe(1);
    expect(getResearchUnlockDay(invalidMockData, 'Ally', 'Infantry', 2)).toBe(1);
    expect(getResearchUnlockDay(invalidMockData, 'Ally', 'Infantry', 3)).toBe(1);
    expect(getResearchUnlockDay(invalidMockData, 'Ally', 'Infantry', 4)).toBe(1);
  });
});

describe('applyUpgradePrerequisites', () => {
  it('should include prerequisites when computing max tiers', () => {
    // Testing hardcoded prerequisites
    // Based on UPGRADE_PREREQUISITES: 'Motorized Infantry' -> [{ unit: 'Infantry', tier: 1 }]
    const initialTiers = { 'Motorized Infantry': 2 };
    const result = applyUpgradePrerequisites(initialTiers);

    expect(result).toHaveProperty('Motorized Infantry', 2);
    expect(result).toHaveProperty('Infantry', 1); // Prerequisite injected
  });

  it('should not downgrade existing higher tiers of a prerequisite', () => {
    // If we already want Infantry tier 3, we don't downgrade it to 1
    const initialTiers = { 'Motorized Infantry': 2, 'Infantry': 3 };
    const result = applyUpgradePrerequisites(initialTiers);

    expect(result).toHaveProperty('Motorized Infantry', 2);
    expect(result).toHaveProperty('Infantry', 3);
  });
});

describe('validateUnitTierPrerequisites', () => {
  const mockResearchData = [
    { Name: 'Infantry', Faction: 'Ally', Tier: 1, 'Day Available': 1 },
    { Name: 'Motorized Infantry', Faction: 'Ally', Tier: 1, 'Day Available': 5 },
  ];

  it('should be valid when current day meets all prerequisite requirements', () => {
    // Motorized Infantry needs Infantry T1 (available day 1)
    // Motorized Infantry itself available day 5
    const currentDay = 5;
    const result = validateUnitTierPrerequisites(mockResearchData, 'Ally', 'Motorized Infantry', 1, currentDay);

    expect(result.isValid).toBe(true);
    expect(result.missing.length).toBe(0);
    expect(result.reason).toBeNull();
  });

  it('should be invalid when a prerequisite is not yet available', () => {
    // Motorized Infantry T1 available day 5, but current day is only 3
    // Infantry T1 available day 1 (so it's available)
    const currentDay = 3;
    const result = validateUnitTierPrerequisites(mockResearchData, 'Ally', 'Motorized Infantry', 1, currentDay);

    expect(result.isValid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    // Since current day is 3, Motorized Infantry T1 (day 5) is missing
    expect(result.missing.some(m => m.unit === 'Motorized Infantry')).toBe(true);
  });
});
