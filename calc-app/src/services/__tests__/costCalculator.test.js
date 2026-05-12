import { describe, it, expect } from 'vitest';
import { calculateItemCost } from '../costCalculator.js';
import { ITEM_TYPES } from '../constants.js';

describe('costCalculator', () => {
  describe('calculateItemCost', () => {
    const mockBuildingData = [
      { Name: 'Barracks', Tier: '1', Money: '100', Manpower: '50', Food: '200', Steel: '0', Fuel: '0' },
      { Name: 'Barracks', Tier: '2', Money: '200', Manpower: '100', Food: '400', Steel: '0', Fuel: '0' },
      { Name: 'Industry', Tier: '1', Money: '500', Manpower: '0', Food: '0', Steel: '500', Fuel: '0', 'Min Build Time (hrs)': '10' },
      { Name: 'Industry', Tier: '2', Money: '1000', Manpower: '0', Food: '0', Steel: '1000', Fuel: '0', 'Min Build Time (hrs)': '20' },
    ];

    const mockUnitData = [
      { Name: 'Infantry', Tier: '1', Money: '1000', Manpower: '500', Food: '1000', Steel: '0', Fuel: '0' },
      { Name: 'Infantry', Tier: '2', Money: '1500', Manpower: '600', Food: '1500', Steel: '0', Fuel: '0' },
      { Name: 'Infantry', Tier: '3', Money: '2000', Manpower: '700', Food: '2000', Steel: '0', Fuel: '0' },
    ];

    const mockResearchData = [
      { Name: 'Infantry', Faction: 'Ally', Tier: '1', Money: '500', Manpower: '0', Food: '500', Steel: '0', Fuel: '0', 'Day Available': '1' },
      { Name: 'Infantry', Faction: 'Ally', Tier: '2', Money: '1000', Manpower: '0', Food: '1000', Steel: '0', Fuel: '0', 'Day Available': '2' },
    ];

    const emptyCost = { M: 0, P: 0, F: 0, S: 0, U: 0 };

    it('should return empty costs for null input', () => {
      const result = calculateItemCost({});
      expect(result.total).toEqual(emptyCost);
      expect(result.production).toEqual(emptyCost);
      expect(result.research).toEqual(emptyCost);
    });

    it('should calculate cost for a regular building (no buff)', () => {
      const cartItem = {
        type: ITEM_TYPES.BUILDING,
        count: 1,
        obj: { Name: 'Barracks', Tier: 2 }
      };

      const result = calculateItemCost(cartItem, { buildingData: mockBuildingData });

      expect(result.total.M).toBe(300);
      expect(result.total.P).toBe(150);
      expect(result.total.F).toBe(600);
      expect(result.total.S).toBe(0);
      expect(result.total.U).toBe(0);
    });

    it('should calculate cost for a regular building with count > 1', () => {
      const cartItem = {
        type: ITEM_TYPES.BUILDING,
        count: 2,
        obj: { Name: 'Barracks', Tier: 2 }
      };

      const result = calculateItemCost(cartItem, { buildingData: mockBuildingData });

      expect(result.total.M).toBe(600);
      expect(result.total.P).toBe(300);
      expect(result.total.F).toBe(1200);
    });

    it('should calculate cost for buff buildings honoring maxHours limit', () => {
      const cartItem = {
        type: ITEM_TYPES.BUILDING,
        count: 1,
        obj: { Name: 'Industry', Tier: 2 }
      };

      const result = calculateItemCost(cartItem, {
        buildingData: mockBuildingData,
        maxHours: 5
      });

      expect(result.total.M).toBe(500);
      expect(result.total.S).toBe(500);

      const result2 = calculateItemCost(cartItem, {
        buildingData: mockBuildingData,
        maxHours: 15
      });

      expect(result2.total.M).toBe(1500);
      expect(result2.total.S).toBe(1500);
    });

    it('should calculate cost for a base unit (no upgrade)', () => {
      const cartItem = {
        type: ITEM_TYPES.UNIT,
        count: 1,
        obj: mockUnitData[0] // Tier 1 Infantry
      };

      const result = calculateItemCost(cartItem, { unitData: mockUnitData });

      expect(result.total.M).toBe(1000);
      expect(result.total.P).toBe(500);
      expect(result.total.F).toBe(1000);
    });

    it('should calculate cost for a unit with upgrade', () => {
      const cartItem = {
        type: ITEM_TYPES.UNIT,
        count: 1,
        obj: mockUnitData[0], // Tier 1 Infantry
        upgradeTo: 3
      };

      const result = calculateItemCost(cartItem, { unitData: mockUnitData, factionMultiplier: 1 });

      expect(result.total.M).toBe(1000 + 1500 * 0.5); // 1750
      expect(result.total.P).toBe(500 + 600 * 0.5);   // 800
      expect(result.total.F).toBe(1000 + 1500 * 0.5); // 1750
    });

    it('should calculate cost for a unit with upgrade and faction multiplier', () => {
      const cartItem = {
        type: ITEM_TYPES.UNIT,
        count: 1,
        obj: mockUnitData[0], // Tier 1 Infantry
        upgradeTo: 2
      };

      const result = calculateItemCost(cartItem, { unitData: mockUnitData, factionMultiplier: 0.8 });

      expect(result.total.M).toBe(1000 + 1500 * 0.4);
    });

    it('should calculate cost for UPGRADE_ONLY items', () => {
      const cartItem = {
        type: ITEM_TYPES.UPGRADE_ONLY,
        count: 1,
        obj: mockUnitData[0], // Name: 'Infantry'
        fromTier: 1,
        toTier: 2
      };

      const result = calculateItemCost(cartItem, { unitData: mockUnitData, factionMultiplier: 1 });

      expect(result.total.M).toBe(1500 * 0.5);
      expect(result.total.P).toBe(600 * 0.5);
      expect(result.total.F).toBe(1500 * 0.5);
    });

    it('should calculate research costs correctly for a unit', () => {
      const cartItem = {
        type: ITEM_TYPES.UNIT,
        count: 1,
        obj: mockUnitData[0], // Tier 1 Infantry
        upgradeTo: 2
      };

      // Ensure mocks contain numeric tiers or are parsable correctly.
      const mockResearchDataInt = [
        { Name: 'Infantry', Faction: 'Ally', Tier: 1, Money: '500', Manpower: '0', Food: '500', Steel: '0', Fuel: '0', 'Day Available': '1' },
        { Name: 'Infantry', Faction: 'Ally', Tier: 2, Money: '1000', Manpower: '0', Food: '1000', Steel: '0', Fuel: '0', 'Day Available': '2' },
      ];

      const result = calculateItemCost(cartItem, {
        unitData: mockUnitData,
        researchData: mockResearchDataInt,
        faction: 'Ally',
        factionMultiplier: 1
      });

      expect(result.production.M).toBe(1750);
      expect(result.research.M).toBe(1500);
      expect(result.total.M).toBe(3250);
    });

    it('should calculate research costs correctly for UPGRADE_ONLY', () => {
      const cartItem = {
        type: ITEM_TYPES.UPGRADE_ONLY,
        count: 1,
        obj: mockUnitData[0], // Infantry
        fromTier: 1,
        toTier: 2
      };

      const mockResearchDataInt = [
        { Name: 'Infantry', Faction: 'Ally', Tier: 1, Money: '500', Manpower: '0', Food: '500', Steel: '0', Fuel: '0', 'Day Available': '1' },
        { Name: 'Infantry', Faction: 'Ally', Tier: 2, Money: '1000', Manpower: '0', Food: '1000', Steel: '0', Fuel: '0', 'Day Available': '2' },
      ];

      const result = calculateItemCost(cartItem, {
        unitData: mockUnitData,
        researchData: mockResearchDataInt,
        faction: 'Ally',
        factionMultiplier: 0.8
      });

      expect(result.production.M).toBe(600);
      expect(result.research.M).toBe(1200);
      expect(result.total.M).toBe(1800);
    });

    it('should handle errors gracefully by returning empty costs', () => {
      const cartItem = {
        type: ITEM_TYPES.BUILDING,
        count: 'invalid',
        obj: { Name: null, Tier: null } // avoid crash when calling .includes on Name
      };

      const result = calculateItemCost(cartItem, { buildingData: null });

      expect(result.total).toEqual(emptyCost);
    });
  });
});
