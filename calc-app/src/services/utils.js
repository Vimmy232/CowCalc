/**
 * Utility Functions - Parsing, Sorting, Formatting
 */

import { UNIT_ORDER, BUILDING_ORDER, UNIT_ABBREVIATIONS } from './constants.js';

/**
 * Safe integer parsing with fallback
 * @param {*} value - Value to parse
 * @param {number} fallback - Default if parsing fails
 * @returns {number} Parsed integer or fallback
 */
export function parseIntSafe(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Sort array of names by predefined order list
 * @param {string[]} names - Names to sort
 * @param {string[]} orderList - Canonical order
 * @returns {string[]} Sorted names
 */
export function sortByOrder(names, orderList) {
  return [...names].sort((a, b) => {
    const ia = orderList.indexOf(a);
    const ib = orderList.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function sortByUnitOrder(names) {
  return sortByOrder(names, UNIT_ORDER);
}

export function sortByBuildingOrder(names) {
  return sortByOrder(names, BUILDING_ORDER);
}

/**
 * Format number with comma separators and specified decimal places
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default 0)
 * @returns {string} Formatted number
 */
const formatCache = new Map();

export function formatNumber(value, decimals = 0) {
  const parsed = Number(value ?? 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  
  if (!formatCache.has(decimals)) {
    formatCache.set(decimals, new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }));
  }
  
  return formatCache.get(decimals).format(safe);
}

export function formatWhole(value) {
  return formatNumber(value, 0);
}

export function formatDecimal(value, decimals = 2) {
  return formatNumber(value, decimals);
}

/**
 * Abbreviate long unit/building names for display
 * @param {string} fullName - Full item name
 * @returns {string} Abbreviated name or original if no abbreviation exists
 */
export function abbreviateItemName(fullName) {
  if (!fullName) return '';
  for (const [full, short] of Object.entries(UNIT_ABBREVIATIONS)) {
    if (fullName.includes(full)) {
      return fullName.replace(full, short);
    }
  }
  return fullName;
}

/**
 * Parse JSON schema (rows + headers format)
 * @param {object} schema - Schema object with rows and headers
 * @param {string} typeTag - Optional type tag to add to each row
 * @returns {object[]} Array of parsed objects
 */
export function parseSchemaRows(schema, typeTag = null) {
  if (!schema || !Array.isArray(schema.rows) || !Array.isArray(schema.headers)) {
    return [];
  }

  return schema.rows.map((row) => {
    const obj = {};
    schema.headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    if (typeTag) obj._type = typeTag;
    return obj;
  });
}

/**
 * Parse map payload data
 * @param {object} mapPayload - Raw map data from JSON
 * @returns {object} Parsed map with country list and 100-point lookup
 */
export function parseMapPayload(mapPayload) {
  const parsedRows = parseSchemaRows({
    rows: mapPayload?.rows || [],
    headers: mapPayload?.headers || []
  });

  const rows100Map = {};
  if (Array.isArray(mapPayload?.rows_100) && Array.isArray(mapPayload?.headers_100)) {
    const rows100 = parseSchemaRows({
      rows: mapPayload.rows_100,
      headers: mapPayload.headers_100
    });
    rows100.forEach((row) => {
      if (row.Nation) rows100Map[row.Nation] = row;
    });
  }

  return {
    ...mapPayload,
    parsedRows,
    rows100Map,
  };
}

/**
 * Calculate upgrade cost tier based on from/to tiers
 * @param {number} fromTier - Starting tier
 * @param {number} toTier - Target tier
 * @returns {number|null} Cost tier or null if invalid
 */
export function getUpgradeCostTier(fromTier, toTier) {
  const from = parseIntSafe(fromTier, 1);
  const to = parseIntSafe(toTier, from);
  if (to <= from) return null;
  return (to - from === 1) ? to : (to - 1);
}

/**
 * Find upgrade cost source from unit data
 * @param {object[]} unitData - Array of unit stats
 * @param {string} unitName - Unit name
 * @param {number} fromTier - From tier
 * @param {number} toTier - To tier
 * @param {object} fallbackObj - Default if not found
 * @returns {object|null} Cost source object
 */
export function getUpgradeCostSource(unitData, unitName, fromTier, toTier, fallbackObj = null) {
  const costTier = getUpgradeCostTier(fromTier, toTier);
  if (!costTier) return null;
  if (!Array.isArray(unitData) || !unitName) return fallbackObj;

  return unitData.find((u) =>
    u.Name === unitName && parseIntSafe(u.Tier, 1) === costTier
  ) || fallbackObj;
}

/**
 * Create empty resource cost bucket
 * @returns {object} Cost bucket { M, P, F, S, U }
 */
export function createCostBucket() {
  return { M: 0, P: 0, F: 0, S: 0, U: 0 };
}

/**
 * Add cost from source to bucket, with optional multiplier
 * @param {object} bucket - Target cost bucket
 * @param {object} source - Source cost object
 * @param {number} multiplier - Multiplier (default 1)
 * @returns {object} Modified bucket
 */
export function addCost(bucket, source, multiplier = 1) {
  bucket.M += (parseFloat(source.Money) || 0) * multiplier;
  bucket.P += (parseFloat(source.Manpower) || 0) * multiplier;
  bucket.F += (parseFloat(source.Food) || 0) * multiplier;
  bucket.S += (parseFloat(source.Steel) || 0) * multiplier;
  bucket.U += (parseFloat(source.Fuel) || 0) * multiplier;
  return bucket;
}

/**
 * Merge two cost buckets
 * @param {object} target - Target bucket
 * @param {object} source - Source bucket
 * @returns {object} Modified target
 */
export function addBuckets(target, source) {
  target.M += source.M || 0;
  target.P += source.P || 0;
  target.F += source.F || 0;
  target.S += source.S || 0;
  target.U += source.U || 0;
  return target;
}

/**
 * Format cost bucket to string for display
 * @param {object} bucket - Cost bucket
 * @returns {string} Formatted string
 */
export function formatCostBucket(bucket) {
  return `💰 ${formatWhole(bucket.M)} | 👥 ${formatWhole(bucket.P)} | 🌾 ${formatWhole(bucket.F)} | ⚙️ ${formatWhole(bucket.S)} | ⛽ ${formatWhole(bucket.U)}`;
}

/**
 * Sanitize numeric input
 * @param {string} value - Input value
 * @returns {string} Sanitized numeric value
 */
export function sanitizeNumericInput(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Get current game day from days passed
 * @param {number} daysPassed - Number of days that have passed
 * @returns {number} Current day (daysPassed + 1)
 */
export function getCurrentGameDay(daysPassed) {
  return Math.max(1, parseIntSafe(daysPassed, 1) + 1);
}

/**
 * Deep equality check for objects (simple version)
 * @param {object} obj1 - First object
 * @param {object} obj2 - Second object
 * @returns {boolean} Whether objects are deeply equal
 */
export function isDeepEqual(obj1, obj2) {
  try {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  } catch {
    return obj1 === obj2;
  }
}

/**
 * Chunk array of strings by character limit (for Discord)
 * @param {string[]} lines - Lines to chunk
 * @param {number} limit - Character limit per chunk
 * @returns {string[]|null} Array of chunks or null if single line exceeds limit
 */
export function chunkLines(lines, limit) {
  if (!Array.isArray(lines) || lines.length === 0) return [''];
  if (!Number.isFinite(limit) || limit < 1) return null;

  const chunks = [];
  let currentLines = [];
  let currentLength = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = String(lines[i] || '');
    const nextLength = currentLines.length === 0
      ? line.length
      : currentLength + 1 + line.length;

    if (nextLength <= limit) {
      currentLines.push(line);
      currentLength = nextLength;
      continue;
    }

    if (currentLines.length === 0) return null;

    chunks.push(currentLines.join('\n'));
    currentLines = [line];
    currentLength = line.length;
  }

  if (currentLines.length > 0) {
    chunks.push(currentLines.join('\n'));
  }

  return chunks;
}
