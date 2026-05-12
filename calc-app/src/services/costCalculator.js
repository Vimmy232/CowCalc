/**
 * Cost Calculator Service
 * Computes production and research costs for cart items
 */

import {
  createCostBucket,
  addCost,
  addBuckets,
  parseIntSafe,
  getUpgradeCostSource,
} from './utils.js';
import {
  FACTION_MULTIPLIERS,
  ITEM_TYPES,
} from './constants.js';
import { getRequiredResearch } from './researchService.js';

/**
 * Calculate production cost for a building from tier 1 to target tier
 * Buff buildings (Industry, Recruiting Station) have special handling
 * @param {object} building - Building object
 * @param {object[]} buildingData - All building data
 * @param {number} targetTier - Target tier
 * @param {number} maxHours - Max hours available (for buff buildings)
 * @returns {object} Cost bucket
 */
function calculateBuildingProductionCost(building, buildingData, targetTier, maxHours = Infinity) {
  const cost = createCostBucket();
  const isBuff = building?.Name?.includes('Industry') || building?.Name?.includes('Recruiting Station');

  let currentHours = 0;
  for (let tier = 1; tier <= targetTier; tier++) {
    const tierBuilding = buildingData?.find((b) =>
      b.Name === building?.Name && parseIntSafe(b.Tier, 1) === tier
    );

    if (!tierBuilding) continue;

    if (isBuff) {
      if (currentHours >= maxHours) break;
      addCost(cost, tierBuilding, 1);
      currentHours += parseFloat(tierBuilding['Min Build Time (hrs)'] || 0);
    } else {
      addCost(cost, tierBuilding, 1);
    }
  }

  return cost;
}

/**
 * Calculate cost for a single cart item
 * @param {object} cartItem - Cart item object
 * @param {object} options - Calculation options
 *   - buildingData: all building data
 *   - unitData: faction unit data
 *   - researchData: all research data
 *   - faction: faction name
 *   - factionMultiplier: upgrade cost multiplier
 *   - maxHours: max hours for buff building calculation
 * @returns {object} { production, research, total }
 */
export function calculateItemCost(cartItem, options = {}) {
  const {
    buildingData = [],
    unitData = [],
    researchData = [],
    faction = null,
    factionMultiplier = 1,
    maxHours = Infinity,
  } = options;

  const qty = Math.max(1, parseIntSafe(cartItem.count, 1));
  const production = createCostBucket();
  const research = createCostBucket();

  try {
    // Handle Building
    if (cartItem.type === ITEM_TYPES.BUILDING) {
      const buildingCost = calculateBuildingProductionCost(
        cartItem.obj,
        buildingData,
        parseIntSafe(cartItem.obj?.Tier, 1),
        maxHours
      );
      Object.keys(buildingCost).forEach((key) => {
        production[key] = buildingCost[key] * qty;
      });
      return { production, research, total: { ...production } };
    }

    // Handle Unit
    if (cartItem.type === ITEM_TYPES.UNIT) {
      const unitCost = createCostBucket();
      addCost(unitCost, cartItem.obj, 1);

      // Add upgrade cost if applicable
      if (cartItem.upgradeTo) {
        const fromTier = parseIntSafe(cartItem.obj?.Tier, 1);
        const toTier = parseIntSafe(cartItem.upgradeTo, fromTier);
        const upgradeCostSource = getUpgradeCostSource(
          unitData,
          cartItem.obj?.Name,
          fromTier,
          toTier,
          cartItem.obj
        );
        if (upgradeCostSource) {
          addCost(unitCost, upgradeCostSource, 0.5 * factionMultiplier);
        }
      }

      Object.keys(unitCost).forEach((key) => {
        production[key] = unitCost[key] * qty;
      });
    }

    // Handle UpgradeOnly
    if (cartItem.type === ITEM_TYPES.UPGRADE_ONLY) {
      const costSource = cartItem.prevObj || getUpgradeCostSource(
        unitData,
        cartItem.obj?.Name,
        cartItem.fromTier,
        cartItem.toTier,
        cartItem.obj
      );
      if (costSource) {
        addCost(production, costSource, 0.5 * factionMultiplier * qty);
      }
    }

    // Calculate research costs
    if (faction && researchData.length > 0) {
      const maxTiers = {};
      if (cartItem.type === ITEM_TYPES.UNIT && cartItem.obj?.Name) {
        maxTiers[cartItem.obj.Name] = parseIntSafe(cartItem.upgradeTo || cartItem.obj.Tier, 1);
      } else if (cartItem.type === ITEM_TYPES.UPGRADE_ONLY && cartItem.obj?.Name) {
        maxTiers[cartItem.obj.Name] = parseIntSafe(cartItem.toTier, 1);
      }

      const requiredResearch = getRequiredResearch(researchData, maxTiers, faction);
      requiredResearch.forEach((req) => {
        addCost(research, req, factionMultiplier);
      });
    }

    return {
      production,
      research,
      total: {
        M: production.M + research.M,
        P: production.P + research.P,
        F: production.F + research.F,
        S: production.S + research.S,
        U: production.U + research.U,
      },
    };
  } catch (error) {
    console.error('[CowCalc] Error calculating item cost:', error);
    return {
      production: createCostBucket(),
      research: createCostBucket(),
      total: createCostBucket(),
    };
  }
}

/**
 * Calculate all costs for a country block's cart
 * @param {object} block - Country block
 * @param {object} options - Calculation options
 * @returns {object[]} Array of cost rows
 */
export function calculateBlockCosts(block, options = {}) {
  const {
    buildingData = [],
    researchData = [],
    faction = null,
  } = options;

  const factionMultiplier = FACTION_MULTIPLIERS[faction] || 1;
  const maxHours = (block.days || 1) * 24;

  return (block.cart || []).map((cartItem) => {
    const itemCost = calculateItemCost(cartItem, {
      ...options,
      factionMultiplier,
      maxHours,
    });

    return {
      ...itemCost,
      M: itemCost.total.M || 0,
      P: itemCost.total.P || 0,
      F: itemCost.total.F || 0,
      S: itemCost.total.S || 0,
      U: itemCost.total.U || 0,
    };
  });
}

/**
 * Calculate grand total costs across all blocks
 * @param {object[]} blocks - Array of country blocks
 * @param {object} options - Calculation options
 * @returns {object} Total cost bucket and breakdown
 */
export function calculatePlanTotalCosts(blocks, options = {}) {
  const grand = createCostBucket();
  const byBlock = {};

  (blocks || []).forEach((block, idx) => {
    const blockCosts = calculateBlockCosts(block, options);
    const blockTotal = createCostBucket();

    blockCosts.forEach((costRow) => {
      addBuckets(blockTotal, costRow.total);
    });

    byBlock[`Block ${idx + 1}`] = blockTotal;
    addBuckets(grand, blockTotal);
  });

  return {
    grand,
    byBlock,
  };
}

/**
 * Get cost breakdown explanation (useful for debugging)
 * @param {object} costRow - Single cost row
 * @returns {string} Human-readable cost explanation
 */
export function explainCost(costRow) {
  const parts = [];
  if (costRow.production && (costRow.production.M || costRow.production.P || costRow.production.F || costRow.production.S || costRow.production.U)) {
    parts.push(`Production: M${costRow.production.M} P${costRow.production.P} F${costRow.production.F} S${costRow.production.S} U${costRow.production.U}`);
  }
  if (costRow.research && (costRow.research.M || costRow.research.P || costRow.research.F || costRow.research.S || costRow.research.U)) {
    parts.push(`Research: M${costRow.research.M} P${costRow.research.P} F${costRow.research.F} S${costRow.research.S} U${costRow.research.U}`);
  }
  return parts.join(' + ');
}
