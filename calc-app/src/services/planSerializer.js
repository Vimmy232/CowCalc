/**
 * Plan Serializer Service
 * Handles plan save/load/compact format conversion
 */

import { STORAGE_KEY } from './constants.js';

const PLAN_VERSION = 2;
const PLAN_FORMAT = 'v2';

/**
 * Create compact plan representation for efficient storage
 * @param {object} plan - Full plan object
 * @returns {object} Compact plan
 */
export function createCompactPlan(plan) {
  return {
    _version: PLAN_VERSION,
    _format: PLAN_FORMAT,
    selectedMap: plan.selectedMap || '',
    days: plan.days || 0,
    blocks: (plan.blocks || []).map((block) => ({
      id: block.id || Date.now(),
      selectedCountryIdx: block.selectedCountryIdx || -1,
      capitalsTaken: block.capitalsTaken || 0,
      discordId: block.discordId || '',
      cart: (block.cart || []).map((item) => ({
        type: item.type,
        name: item.obj?.Name || '',
        tier: parseInt(item.obj?.Tier || 1, 10),
        count: parseInt(item.count || 1, 10),
        upgradeTo: item.upgradeTo || null,
        buffTarget: item.buffTarget || null,
        provinceType: item.provinceType || null,
        fromTier: item.fromTier || null,
        toTier: item.toTier || null,
      })),
    })),
  };
}

/**
 * Decompress compact plan back to full plan (needs global data)
 * Note: This returns a partial plan structure; full hydration needs data fetching
 * @param {object} compactPlan - Compact plan format
 * @returns {object} Partial plan structure
 */
export function decompressCompactPlan(compactPlan) {
  return {
    selectedMap: compactPlan.selectedMap || '',
    days: compactPlan.days || 0,
    blocks: (compactPlan.blocks || []).map((block) => ({
      id: block.id,
      selectedCountryIdx: block.selectedCountryIdx,
      capitalsTaken: block.capitalsTaken,
      discordId: block.discordId,
      cart: [], // Will be hydrated by caller
    })),
  };
}

/**
 * Save plan to localStorage
 * @param {object} plan - Plan to save
 * @returns {boolean} Success status
 */
export function savePlanToLocalStorage(plan) {
  try {
    const compact = createCompactPlan(plan);
    const json = JSON.stringify(compact);
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (error) {
    console.error('[CowCalc] Error saving plan to localStorage:', error);
    return false;
  }
}

/**
 * Load plan from localStorage
 * @returns {object|null} Loaded plan or null if not found
 */
export function loadPlanFromLocalStorage() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const data = JSON.parse(json);
    if (data._version !== PLAN_VERSION) {
      console.warn(`[CowCalc] Plan version mismatch: ${data._version} vs ${PLAN_VERSION}`);
    }
    return decompressCompactPlan(data);
  } catch (error) {
    console.error('[CowCalc] Error loading plan from localStorage:', error);
    return null;
  }
}

/**
 * Clear plan from localStorage
 * @returns {boolean} Success status
 */
export function clearPlanFromLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[CowCalc] Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Export plan as JSON file
 * @param {object} plan - Plan to export
 * @param {string} filename - Optional filename (default: CowCalc_Plan_[timestamp].json)
 */
export function exportPlanToFile(plan, filename = null) {
  try {
    const compact = createCompactPlan(plan);
    const json = JSON.stringify(compact, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `CowCalc_Plan_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('[CowCalc] Error exporting plan:', error);
    return false;
  }
}

/**
 * Import plan from JSON file (async)
 * @param {File} file - JSON file to import
 * @returns {Promise<object|null>} Decompressed plan or null on error
 */
export async function importPlanFromFile(file) {
  try {
    const text = await file.text();
    const compact = JSON.parse(text);
    if (compact._version !== PLAN_VERSION) {
      console.warn(`[CowCalc] Imported plan version mismatch: ${compact._version} vs ${PLAN_VERSION}`);
    }
    return decompressCompactPlan(compact);
  } catch (error) {
    console.error('[CowCalc] Error importing plan:', error);
    return null;
  }
}

/**
 * Validate plan structure
 * @param {object} plan - Plan to validate
 * @returns {object} { isValid: boolean, errors: [] }
 */
export function validatePlan(plan) {
  const errors = [];

  if (!plan) {
    errors.push('Plan is null or undefined');
    return { isValid: false, errors };
  }

  if (typeof plan.selectedMap !== 'string') {
    errors.push('selectedMap must be a string');
  }

  if (!Number.isInteger(plan.days) || plan.days < 0) {
    errors.push('days must be a non-negative integer');
  }

  if (!Array.isArray(plan.blocks)) {
    errors.push('blocks must be an array');
  } else {
    plan.blocks.forEach((block, idx) => {
      if (!Number.isInteger(block.selectedCountryIdx)) {
        errors.push(`blocks[${idx}].selectedCountryIdx must be an integer`);
      }
      if (!Array.isArray(block.cart)) {
        errors.push(`blocks[${idx}].cart must be an array`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new empty plan
 * @returns {object} Empty plan structure
 */
export function createEmptyPlan() {
  return {
    selectedMap: '',
    days: 0,
    blocks: [],
  };
}

/**
 * Create a new country block
 * @param {number} countryIdx - Map country index
 * @returns {object} New block
 */
export function createEmptyBlock(countryIdx = -1) {
  return {
    id: Date.now() + Math.random(),
    selectedCountryIdx: countryIdx,
    capitalsTaken: 0,
    discordId: '',
    unitData: [],
    cart: [],
  };
}

/**
 * Duplicate a country block (useful for copy-paste planning)
 * @param {object} block - Block to duplicate
 * @returns {object} New block with same cart
 */
export function duplicateBlock(block) {
  return {
    ...createEmptyBlock(block.selectedCountryIdx),
    unitData: block.unitData,
    cart: block.cart.map((item) => ({ ...item })),
  };
}

/**
 * Merge two plans (combine blocks from both)
 * @param {object} plan1 - First plan
 * @param {object} plan2 - Second plan
 * @returns {object} Merged plan (uses plan1's map/days, combines blocks)
 */
export function mergePlans(plan1, plan2) {
  return {
    ...plan1,
    blocks: [...(plan1.blocks || []), ...(plan2.blocks || [])],
  };
}
