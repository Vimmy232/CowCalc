/**
 * Research Service
 * Handles unit/tier unlock logic based on game day and faction
 */

import { parseIntSafe, UPGRADE_PREREQUISITES } from './constants.js';

/**
 * Get the game day when a specific unit tier is unlocked
 * @param {object[]} researchData - Research data array
 * @param {string} faction - Faction name
 * @param {string} unitName - Unit name
 * @param {number} tier - Unit tier
 * @returns {number} Day when unlocked (1+ minimum)
 */
export function getResearchUnlockDay(researchData, faction, unitName, tier) {
  if (!Array.isArray(researchData) || !faction || !unitName) {
    return 1;
  }

  const research = researchData.find((r) =>
    r.Name === unitName &&
    r.Faction === faction &&
    parseIntSafe(r.Tier, 1) === parseIntSafe(tier, 1)
  );

  return Math.max(1, parseIntSafe(research?.['Day Available'], 1));
}

/**
 * Check if a unit tier is unlocked at the given game day
 * @param {object[]} researchData - Research data array
 * @param {string} faction - Faction name
 * @param {string} unitName - Unit name
 * @param {number} tier - Unit tier
 * @param {number} currentDay - Current game day
 * @returns {boolean} Whether the tier is unlocked
 */
export function isUnitTierUnlocked(researchData, faction, unitName, tier, currentDay) {
  const unlockDay = getResearchUnlockDay(researchData, faction, unitName, tier);
  return currentDay >= unlockDay;
}

/**
 * Get list of available tiers for a unit at current game day
 * @param {object[]} researchData - Research data array
 * @param {string} faction - Faction name
 * @param {string} unitName - Unit name
 * @param {number} currentDay - Current game day
 * @returns {object[]} Array of { tier, unlockDay, isUnlocked }
 */
export function getAvailableTiersByFaction(researchData, faction, unitName, currentDay) {
  if (!researchData || !faction || !unitName) {
    return [{ tier: 1, unlockDay: 1, isUnlocked: true }];
  }

  const tiers = researchData
    .filter((r) =>
      r.Name === unitName &&
      r.Faction === faction
    )
    .map((r) => ({
      tier: parseIntSafe(r.Tier, 1),
      unlockDay: parseIntSafe(r['Day Available'], 1),
    }))
    .filter((entry, index, array) =>
      array.findIndex((other) => other.tier === entry.tier) === index
    )
    .sort((a, b) => a.tier - b.tier)
    .map((entry) => ({
      ...entry,
      isUnlocked: currentDay >= entry.unlockDay,
    }));

  return tiers.length > 0 ? tiers : [{ tier: 1, unlockDay: 1, isUnlocked: true }];
}

/**
 * Apply unit upgrade prerequisites to max tier list
 * Ensures prerequisite units are included when a unit is selected
 * @param {object} maxTiers - Object mapping unit name to max tier
 * @returns {object} Modified maxTiers with prerequisites added
 */
export function applyUpgradePrerequisites(maxTiers) {
  const result = { ...maxTiers };

  // Helper to ensure a unit has at least a minimum tier
  const ensureMinTier = (unitName, minTier) => {
    if (!result[unitName] || result[unitName] < minTier) {
      result[unitName] = minTier;
    }
  };

  // Apply prerequisites
  Object.entries(UPGRADE_PREREQUISITES).forEach(([unitName, prerequisites]) => {
    if (result[unitName]) {
      prerequisites.forEach(({ unit, tier }) => {
        ensureMinTier(unit, tier);
      });
    }
  });

  return result;
}

/**
 * Get all research items needed to unlock up to maxTier for each unit
 * Includes prerequisite units
 * @param {object[]} researchData - All research data
 * @param {object} maxTiers - { unitName: maxTier }
 * @param {string} faction - Faction name
 * @returns {object[]} Array of research items needed
 */
export function getRequiredResearch(researchData, maxTiers, faction) {
  if (!researchData || !maxTiers || !faction) return [];

  const maxTiersWithPrereqs = applyUpgradePrerequisites(maxTiers);
  const required = [];

  Object.entries(maxTiersWithPrereqs).forEach(([unitName, maxTier]) => {
    for (let tier = 1; tier <= maxTier; tier++) {
      const research = researchData.find((r) =>
        r.Name === unitName &&
        r.Faction === faction &&
        parseIntSafe(r.Tier, 1) === tier
      );
      if (research) {
        required.push(research);
      }
    }
  });

  return required;
}

/**
 * Check if unit tier has all prerequisites unlocked
 * @param {object[]} researchData - Research data
 * @param {string} faction - Faction name
 * @param {string} unitName - Unit name
 * @param {number} tier - Target tier
 * @param {number} currentDay - Current game day
 * @returns {object} { isValid: boolean, missing: [], reason?: string }
 */
export function validateUnitTierPrerequisites(researchData, faction, unitName, tier, currentDay) {
  const maxTiers = { [unitName]: tier };
  const maxTiersWithPrereqs = applyUpgradePrerequisites(maxTiers);
  const missing = [];

  Object.entries(maxTiersWithPrereqs).forEach(([name, maxTier]) => {
    for (let t = 1; t <= maxTier; t++) {
      const unlockDay = getResearchUnlockDay(researchData, faction, name, t);
      if (currentDay < unlockDay) {
        missing.push({
          unit: name,
          tier: t,
          unlockDay,
          daysRemaining: unlockDay - currentDay,
        });
      }
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    reason: missing.length > 0
      ? `Missing research: ${missing.map((m) => `${m.unit} T${m.tier}`).join(', ')}`
      : null,
  };
}
