import { describe, it, expect } from 'vitest';
import { calculateGlobalFeasibility } from './feasibility.js';

describe('calculateGlobalFeasibility', () => {
  it('should handle empty or missing inputs gracefully', () => {
    const result = calculateGlobalFeasibility({});

    expect(result).toMatchObject({
      totalReqMoney: 0,
      totalReqFood: 0,
      totalReqSteel: 0,
      totalReqFuel: 0,
      startMoney: 0,
      startFood: 0,
      startSteel: 0,
      startFuel: 0,
      incomeMoney: 0,
      incomeFood: 0,
      incomeSteel: 0,
      incomeFuel: 0,
      availMoney: 0,
      availFood: 0,
      availSteel: 0,
      availFuel: 0,
      perBlockMP: [],
    });
  });

  it('should fallback properly with empty maps and global data but valid basic inputs', () => {
    const result = calculateGlobalFeasibility({
      blocks: [
        {
          id: 'b1',
          cart: [],
        }
      ],
      mapData: null,
      globalData: null,
      days: 5
    });

    expect(result).toMatchObject({
      totalReqMoney: 0,
      perBlockMP: [], // since selectedCountryIdx is not set, no country object is found, so it doesn't push to perBlockMP
    });
  });

  it('should calculate building costs correctly for non-buff buildings', () => {
    const buildingData = [
      { Name: 'Barracks', Tier: '1', Money: '1000', Manpower: '500', Food: '100', Steel: '200', Fuel: '0' },
      { Name: 'Barracks', Tier: '2', Money: '1500', Manpower: '600', Food: '200', Steel: '300', Fuel: '50' },
    ];

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: -1, // No country to avoid income calculation for this specific test
      cart: [
        {
          type: 'Building',
          obj: { Name: 'Barracks', Tier: '2' },
          count: 2,
        }
      ]
    }];

    const result = calculateGlobalFeasibility({
      blocks,
      globalData: { buildingData },
      days: 1
    });

    // Cost should be (Tier 1 + Tier 2) * 2
    // Money = (1000 + 1500) * 2 = 5000
    // Food = (100 + 200) * 2 = 600
    // Steel = (200 + 300) * 2 = 1000
    // Fuel = (0 + 50) * 2 = 100
    expect(result.totalReqMoney).toBe(5000);
    expect(result.totalReqFood).toBe(600);
    expect(result.totalReqSteel).toBe(1000);
    expect(result.totalReqFuel).toBe(100);
  });

  it('should limit buff building costs by maxHours (safeDays * 24)', () => {
    const buildingData = [
      { Name: 'Industry', Tier: '1', Money: '2000', Manpower: '0', Food: '0', Steel: '1000', Fuel: '500', 'Min Build Time (hrs)': '12' },
      { Name: 'Industry', Tier: '2', Money: '3000', Manpower: '0', Food: '0', Steel: '2000', Fuel: '1000', 'Min Build Time (hrs)': '24' },
      { Name: 'Industry', Tier: '3', Money: '4000', Manpower: '0', Food: '0', Steel: '3000', Fuel: '1500', 'Min Build Time (hrs)': '48' },
    ];

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: -1,
      cart: [
        {
          type: 'Building',
          obj: { Name: 'Industry', Tier: '3' },
          count: 1,
        }
      ]
    }];

    // days = 1 -> maxHours = 24
    // Tier 1 takes 12 hrs. We have 12 hrs left.
    // Tier 2 takes 24 hrs. We can only process Tier 2 partially, but the loop breaks if currentHours >= maxHours before adding.
    // Actually, in the code: `if (currentHours >= maxHours) break;`
    // Tier 1: currentHours = 0 < 24. Adds Tier 1 cost. currentHours becomes 12.
    // Tier 2: currentHours = 12 < 24. Adds Tier 2 cost. currentHours becomes 36.
    // Tier 3: currentHours = 36 >= 24. Breaks. Does NOT add Tier 3 cost.

    const result = calculateGlobalFeasibility({
      blocks,
      globalData: { buildingData },
      days: 1
    });

    // Money = 2000 + 3000 = 5000
    expect(result.totalReqMoney).toBe(5000);
    expect(result.totalReqSteel).toBe(3000);
  });

  it('should calculate unit costs correctly', () => {
    const blocks = [{
      id: 'b1',
      selectedCountryIdx: -1,
      cart: [
        {
          type: 'Unit',
          obj: { Name: 'Infantry', Tier: '1', Money: '500', Manpower: '1000', Food: '500', Steel: '100', Fuel: '0' },
          count: 3,
        }
      ]
    }];

    const result = calculateGlobalFeasibility({ blocks, days: 1 });

    expect(result.totalReqMoney).toBe(1500); // 500 * 3
    expect(result.totalReqFood).toBe(1500);
  });

  it('should calculate regular Unit upgrade costs correctly, applying Ally discount', () => {
    const unitData = [
      { Name: 'Infantry', Tier: '1', Money: '500' },
      { Name: 'Infantry', Tier: '2', Money: '1000' }
    ];
    const parsedRows = [{ Faction: 'Ally', Nation: 'UK' }];

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: 0,
      unitData,
      cart: [
        {
          type: 'Unit',
          obj: { Name: 'Infantry', Tier: '1', Money: '500', Manpower: '1000' },
          upgradeTo: '2',
          count: 2,
        }
      ]
    }];

    const result = calculateGlobalFeasibility({
      blocks,
      mapData: { parsedRows, rows100Map: {} },
      days: 1
    });

    // Upgrade costs from unitData:
    // It finds costSrc using getUpgradeCostSource (we won't deeply mock cowcalcCore, we'll let it use its actual logic)
    // Actually, cowcalcCore has `getUpgradeCostTier(fromTier, toTier) => toTier` roughly.
    // So target is Tier 2, Money = 1000.
    // reqMoney starts at obj.Money (500)
    // upgradeMult = 0.8 (Ally)
    // add: 0.5 * 0.8 * costSrc.Money(1000) = 400
    // reqMoney = 500 + 400 = 900
    // count = 2 => 1800
    expect(result.totalReqMoney).toBe(1800);
  });

  it('should calculate UpgradeOnly items correctly with non-Ally mult', () => {
    const unitData = [
      { Name: 'Tank', Tier: '1', Money: '1000' },
      { Name: 'Tank', Tier: '2', Money: '2000', Steel: '1000' },
      { Name: 'Tank', Tier: '3', Money: '3000', Steel: '2000' }
    ];
    const parsedRows = [{ Faction: 'Axis', Nation: 'Germany' }]; // Non-Ally

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: 0,
      unitData,
      cart: [
        {
          type: 'UpgradeOnly',
          obj: { Name: 'Tank' },
          fromTier: 1,
          toTier: 3,
          count: 5,
        }
      ]
    }];

    const result = calculateGlobalFeasibility({
      blocks,
      mapData: { parsedRows, rows100Map: {} },
      days: 1
    });

    // UpgradeOnly calculation from tier 1 to 3:
    // getUpgradeCostTier(1, 3) -> 3 - 1 > 1 -> return 3 - 1 = 2
    // costSrc is Tier 2 Tank (Money: 2000, Steel: 1000)
    // Non-Ally mult = 1
    // totalReqMoney += 0.5 * 1 * 2000 * 5 = 5000
    // totalReqSteel += 0.5 * 1 * 1000 * 5 = 2500
    expect(result.totalReqMoney).toBe(5000);
    expect(result.totalReqSteel).toBe(2500);
  });

  it('should correctly accumulate research costs including prerequisites', () => {
    const researchData = [
      { Name: 'Motorized Infantry', Tier: '1', Faction: 'Comintern', Money: '1000', Food: '0', Steel: '0', Fuel: '0' },
      { Name: 'Infantry', Tier: '1', Faction: 'Comintern', Money: '500', Food: '500', Steel: '0', Fuel: '0' }, // Prereq for Motorized
    ];
    const parsedRows = [{ Faction: 'Comintern', Nation: 'USSR' }];

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: 0,
      cart: [
        {
          type: 'Unit',
          count: 1,
          obj: { Name: 'Motorized Infantry', Tier: '1' }
        }
      ]
    }];

    const result = calculateGlobalFeasibility({
      blocks,
      mapData: { parsedRows, rows100Map: {} },
      globalData: { researchData },
      days: 1
    });

    // Motorized Infantry needs Infantry 1
    // ResMult for Comintern is 1.0
    // Money = 1000 + 500 = 1500
    expect(result.totalReqMoney).toBe(1500);
    expect(result.totalReqFood).toBe(500);
  });

  it('should correctly accumulate upgradeOnlyResearch costs', () => {
    const researchData = [
      { Name: 'Artillery', Tier: '1', Faction: 'Pan-Asian', Money: '500', Food: '0', Steel: '0', Fuel: '0' },
      { Name: 'Artillery', Tier: '2', Faction: 'Pan-Asian', Money: '1000', Food: '0', Steel: '0', Fuel: '0' },
      { Name: 'Artillery', Tier: '3', Faction: 'Pan-Asian', Money: '1500', Food: '0', Steel: '0', Fuel: '0' },
    ];
    const parsedRows = [{ Faction: 'Pan-Asian', Nation: 'Japan' }];

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: 0,
      cart: [
        {
          type: 'Unit',
          count: 1,
          obj: { Name: 'Artillery', Tier: '1' } // requires Tier 1
        },
        {
          type: 'UpgradeOnly',
          count: 1,
          obj: { Name: 'Artillery' },
          fromTier: 1,
          toTier: 3,
        }
      ]
    }];

    const result = calculateGlobalFeasibility({
      blocks,
      mapData: { parsedRows, rows100Map: {} },
      globalData: { researchData },
      days: 1
    });

    // Required tiers -> Artillery 1. Cost = 500
    // UpgradeOnly -> from 1 to 3. (starts from max(1+1, 1+1) = 2 to 3)
    // So it processes Tier 2 (1000) and Tier 3 (1500).
    // Total Money = 500 + 1000 + 1500 = 3000
    expect(result.totalReqMoney).toBe(3000);
  });

  it('should calculate baseline income and buffs correctly', () => {
    const parsedRows = [{ Faction: 'Axis', Nation: 'Germany', Money: '100', Food: '100' }]; // v70
    const rows100Map = { 'Germany': { Money: '200', Food: '200' } }; // v100

    const buildingData = [
      { Name: 'Industry', Tier: '1', 'Min Build Time (hrs)': '12', 'Resource Boost (%)': '10%' }
    ];

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: 0,
      capitalsTaken: 1, // day 0: pct=0, day 1: pct=10, day 2: pct=10 etc
      cart: [
        {
          type: 'Building',
          obj: { Name: 'Industry', Tier: '1' },
          buffTarget: 'Money',
          count: 1
        }
      ]
    }];

    // safeDays = 2 -> 48 hours
    // Base Production for Industry = 6000
    // duration = 12 hours
    // targetBuff = 0.1
    // hoursToBuild = 12
    // avgBuff = 0 + 0.5 * 0.1 * (12/12) = 0.05
    // accumulatedExtraYield (first 12h) = 0.05 * 12 = 0.6
    // remaining 36h (maxHours=48 - 12): previousBuff = 0.1
    // accumulatedExtraYield (remaining) = 0.1 * 36 = 3.6
    // Total extra yield = 4.2
    // boostGainedTotal = (6000 / 24) * 4.2 * 1 = 250 * 4.2 = 1050
    // equivDailyBoost = 1050 / 2 = 525

    // Base Income (days = 2):
    // Day 0: pct=0. dailyMorale=70. moraleDelta=0. Money = v70 = 100
    // Day 1: dayChangePct=5. capitalPct=10. dailyMorale=85. moraleDelta=15.
    // Money = 100 + 15 * (200 - 100) / 30 = 100 + 15 * 100 / 30 = 100 + 50 = 150
    // totalMoney = 100 + 150 = 250
    // incomeMoney = 250 + (buffMoney * safeDays) = 250 + (525 * 2) = 1300

    const result = calculateGlobalFeasibility({
      blocks,
      mapData: { parsedRows, rows100Map },
      globalData: { buildingData },
      days: 2
    });

    expect(result.startMoney).toBe(80000); // 80000 base
    expect(result.incomeMoney).toBe(1300);
    // availMoney = startMoney + incomeMoney = 81300
    expect(result.availMoney).toBe(81300);

    // PerBlock MP check
    // v70.Manpower = 0, v100.Manpower = 0 => totalManpower = 0. buffManpower = 0.
    // blockAvailMP = 12000 + 0 = 12000
    expect(result.perBlockMP[0]).toMatchObject({
      id: 'b1',
      avail: 12000
    });
  });

  it('should calculate recruiting station buffs properly', () => {
    const parsedRows = [{ Faction: 'Axis', Nation: 'Germany' }];

    const buildingData = [
      { Name: 'Recruiting Station', Tier: '1', 'Min Build Time (hrs)': '6', 'Manpower Boost (%)': '20%' }
    ];

    const blocks = [{
      id: 'b1',
      selectedCountryIdx: 0,
      cart: [
        {
          type: 'Building',
          obj: { Name: 'Recruiting Station', Tier: '1' },
          buffTarget: 'Manpower',
          provinceType: 'Normal Rural',
          count: 2
        }
      ]
    }];

    // days = 1 -> 24 hours
    // Base Production for Recruiting Station Normal Rural = 450
    // targetBuff = 0.2
    // hoursToBuild = 6
    // avgBuff = 0.1. extra Yield = 0.6
    // remaining 18h: buff = 0.2. extra Yield = 0.2 * 18 = 3.6
    // Total yield = 4.2
    // boostGainedTotal = (450 / 24) * 4.2 * 2 (count=2) = 18.75 * 8.4 = 157.5
    // equivDailyBoost = 157.5 / 1 = 157.5

    const result = calculateGlobalFeasibility({
      blocks,
      mapData: { parsedRows },
      globalData: { buildingData },
      days: 1
    });

    // start manpower isn't a global var in the function.
    // However, incomeMP is added to the blockAvailMP:
    // blockAvailMP = 12000 + totalManpower (0) + buffManpower * 1 (157.5) = 12157.5
    expect(result.perBlockMP[0].avail).toBe(12157.5);
  });
});
