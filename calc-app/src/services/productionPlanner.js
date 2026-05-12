/**
 * Production Planner Service
 * Calculates unit production times, building requirements, and production capacity
 */

import { parseIntSafe, formatDecimal, getCurrentGameDay } from './utils.js';

/**
 * Get production buildings from cart matching a building name
 * @param {object} block - Country block
 * @param {string} buildingName - Building name to search for
 * @returns {object[]} Matching cart entries
 */
export function getProductionBuildingEntries(block, buildingName) {
  if (!block || !buildingName || !block.cart) return [];
  return block.cart.filter((item) =>
    item.type === 'Building' && item.obj?.Name === buildingName
  );
}

/**
 * Summarize building entries by tier
 * @param {object[]} entries - Building cart entries
 * @returns {object} { totalCount, tierSummary }
 */
export function summarizeBuildingEntries(entries) {
  const totals = new Map();
  let totalCount = 0;

  entries.forEach((item) => {
    const tier = Math.min(5, parseIntSafe(item.obj?.Tier, 0));
    const count = Math.max(1, parseIntSafe(item.count, 1));
    totalCount += count;
    totals.set(tier, (totals.get(tier) || 0) + count);
  });

  const tierSummary = [...totals.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tier, count]) => `${count}x L${tier}`)
    .join(', ');

  return { totalCount, tierSummary };
}

/**
 * Calculate production preview for a unit
 * @param {object} block - Country block
 * @param {object} cartItem - Cart item to calculate for
 * @param {number} daysPassed - Game days passed
 * @param {number} unlockDay - Day unit is unlocked
 * @returns {object} Production preview or null if not available
 *
 * Preview includes:
 * - buildingName: Required building
 * - buildingCount: Number of buildings available
 * - buildingSummary: Human-readable tier summary
 * - optimalLevel: Optimal building tier for this unit
 * - hoursPerUnit: Base production time
 * - maxUnits: Max units producible in available time
 * - cappedUnits: min(requested, maxUnits)
 * - completionHours: Hours to complete requested count
 * - unitsPerDay: Production rate per day
 */
export function calculateUnitProductionPreview(block, cartItem, daysPassed, unlockDay = 1) {
  if (!block || !cartItem?.obj) return null;

  const startingTier = parseIntSafe(cartItem.obj.Tier, 1);
  const buildingRequired = String(cartItem.obj['building required'] || '').trim();
  const requestedCount = Math.max(1, parseIntSafe(cartItem.count, 1));

  // Get current production day (daysPassed + 1)
  const currentDay = getCurrentGameDay(daysPassed);
  const unlockAtDay = Math.max(1, parseIntSafe(unlockDay, 1));
  const producibleDays = Math.max(0, currentDay - unlockAtDay);
  const totalHours = producibleDays * 24;

  // Get base hours from unit data
  const baseHours = parseFloat(cartItem.obj['Min Build Time (hrs)'] || 0);
  const optimalLevel = Math.max(1, parseIntSafe(cartItem.obj.optimalproductionrequirement, 1));

  if (!Number.isFinite(baseHours) || baseHours <= 0) {
    return {
      available: false,
      buildingName,
      buildingSummary: '',
      buildingCount: 0,
      optimalLevel,
      targetTier: startingTier,
      requestedCount,
      hoursPerUnit: 0,
      maxUnits: 0,
      cappedUnits: 0,
      completionHours: 0,
      productionDayCount: currentDay,
      unlockDay: unlockAtDay,
      reason: 'No build time data',
    };
  }

  // Get production buildings
  const buildingEntries = getProductionBuildingEntries(block, buildingName);

  if (buildingEntries.length === 0) {
    return {
      available: false,
      buildingName,
      buildingSummary: '',
      buildingCount: 0,
      optimalLevel,
      targetTier: startingTier,
      requestedCount,
      hoursPerUnit: baseHours * Math.pow(2, optimalLevel - 1),
      maxUnits: 0,
      cappedUnits: 0,
      completionHours: 0,
      productionDayCount: currentDay,
      unlockDay: unlockAtDay,
      reason: `Requires ${buildingName}`,
    };
  }

  // Calculate production rate
  const { totalCount, tierSummary } = summarizeBuildingEntries(buildingEntries);

  const productionRatePerHour = buildingEntries.reduce((sum, item) => {
    const buildingTier = Math.min(5, parseIntSafe(item.obj?.Tier, 0));
    const buildingCount = Math.max(1, parseIntSafe(item.count, 1));
    const effectiveLevel = Math.min(buildingTier, optimalLevel);
    const hoursPerUnit = baseHours * Math.pow(2, optimalLevel - effectiveLevel);
    return sum + (hoursPerUnit > 0 ? buildingCount / hoursPerUnit : 0);
  }, 0);

  const hoursPerUnit = totalCount > 0 && productionRatePerHour > 0
    ? 1 / productionRatePerHour
    : baseHours * Math.pow(2, optimalLevel - 1);

  const maxUnitsByDay = totalHours * productionRatePerHour;
  const cappedUnits = Math.min(requestedCount, maxUnitsByDay);
  const completionHours = productionRatePerHour > 0 ? requestedCount / productionRatePerHour : 0;
  const unitsPerDay = productionRatePerHour * 24;

  return {
    available: true,
    buildingName,
    buildingSummary: tierSummary,
    buildingCount: totalCount,
    optimalLevel,
    targetTier: startingTier,
    requestedCount,
    hoursPerUnit: formatDecimal(hoursPerUnit, 2),
    maxUnits: formatDecimal(maxUnitsByDay, 2),
    cappedUnits: formatDecimal(cappedUnits, 2),
    completionHours: formatDecimal(completionHours, 2),
    unitsPerDay: formatDecimal(unitsPerDay, 2),
    productionDayCount: currentDay,
    unlockDay: unlockAtDay,
  };
}

/**
 * Calculate feasibility of entire plan
 * @param {object} block - Country block
 * @param {object} options - Options including daysPassed, researchData, etc.
 * @returns {object} Feasibility report
 */
export function calculateBlockFeasibility(block, options = {}) {
  const {
    daysPassed = 0,
    researchData = [],
    globalData = {},
  } = options;

  const issues = [];

  // Check each cart item
  (block.cart || []).forEach((cartItem, idx) => {
    // Check buildings required for units
    if (cartItem.type === 'Unit' || cartItem.type === 'UpgradeOnly') {
      const buildingRequired = String(cartItem.obj?.['building required'] || '').trim();
      if (buildingRequired) {
        const hasBuilding = block.cart.some((item) =>
          item.type === 'Building' && item.obj?.Name === buildingRequired
        );
        if (!hasBuilding) {
          issues.push({
            itemIdx: idx,
            type: 'missing_building',
            message: `${cartItem.obj?.Name} requires ${buildingRequired}`,
          });
        }
      }
    }

    // Check research unlocks
    if (cartItem.type === 'Unit' && cartItem.obj?.Name) {
      const currentDay = getCurrentGameDay(daysPassed);
      const unlockDay = researchData.find((r) =>
        r.Name === cartItem.obj.Name &&
        r.Faction === block.faction &&
        parseIntSafe(r.Tier, 1) === parseIntSafe(cartItem.obj.Tier, 1)
      )?.['Day Available'] || 1;

      if (currentDay < unlockDay) {
        issues.push({
          itemIdx: idx,
          type: 'research_not_unlocked',
          message: `${cartItem.obj?.Name} T${cartItem.obj?.Tier} unlocks on Day ${unlockDay}`,
        });
      }
    }
  });

  return {
    isFeasible: issues.length === 0,
    issues,
    summary: issues.length > 0
      ? `${issues.length} feasibility issue${issues.length > 1 ? 's' : ''} found`
      : 'Plan is feasible',
  };
}

/**
 * Estimate total production time for entire cart
 * @param {object} block - Country block
 * @param {number} daysPassed - Days passed
 * @returns {object} { totalHours, totalDays, bottleneck }
 */
export function estimateCartProductionTime(block, daysPassed) {
  if (!block.cart || block.cart.length === 0) {
    return { totalHours: 0, totalDays: 0, bottleneck: null };
  }

  let maxHours = 0;
  let bottleneck = null;

  (block.cart || []).forEach((cartItem) => {
    if (cartItem.type !== 'Unit') return;

    const preview = calculateUnitProductionPreview(block, cartItem, daysPassed);
    if (preview && preview.completionHours) {
      const hours = parseFloat(preview.completionHours) || 0;
      if (hours > maxHours) {
        maxHours = hours;
        bottleneck = `${cartItem.obj?.Name} T${cartItem.obj?.Tier}`;
      }
    }
  });

  return {
    totalHours: maxHours,
    totalDays: formatDecimal(maxHours / 24, 1),
    bottleneck,
  };
}
