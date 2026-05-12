/**
 * Data Loader Service
 * Fetches and caches game data from JSON files
 */

import { parseSchemaRows, parseMapPayload } from './utils.js';
import { FACTION_FILES } from './constants.js';

/**
 * Fetch JSON data from public folder
 * @param {string} path - Path relative to public/ (e.g., 'data/Game_Stats_Allies.json')
 * @returns {Promise<object>} Parsed JSON data
 */
async function fetchJSON(path) {
  try {
    const response = await fetch(`/${path}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${path}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[CowCalc] Failed to load ${path}:`, error);
    throw error;
  }
}

/**
 * Load building data
 * @returns {Promise<object[]>} Array of building objects
 */
export async function loadBuildingData() {
  try {
    const data = await fetchJSON('data/Building_Stats.json');
    return parseSchemaRows(data, 'Building');
  } catch (error) {
    console.error('[CowCalc] Failed to load building data:', error);
    return [];
  }
}

/**
 * Load research data
 * @returns {Promise<object[]>} Array of research objects
 */
export async function loadResearchData() {
  try {
    const data = await fetchJSON('data/Research_Stats.json');
    return parseSchemaRows(data, 'Research');
  } catch (error) {
    console.error('[CowCalc] Failed to load research data:', error);
    return [];
  }
}

/**
 * Load unit data for a specific faction
 * @param {string} faction - Faction name (e.g., 'Ally', 'Axis')
 * @returns {Promise<object[]>} Array of unit objects
 */
export async function loadFactionUnitData(faction) {
  try {
    if (!faction || !FACTION_FILES[faction]) {
      console.warn(`[CowCalc] Unknown faction: ${faction}`);
      return [];
    }

    const filename = FACTION_FILES[faction];
    const data = await fetchJSON(`data/${filename}`);
    return parseSchemaRows(data, 'Unit');
  } catch (error) {
    console.error(`[CowCalc] Failed to load unit data for ${faction}:`, error);
    return [];
  }
}

/**
 * Load map data
 * @param {string} mapFileName - Map filename (e.g., 'World_at_War_classic.json')
 * @returns {Promise<object>} Parsed map data
 */
export async function loadMapData(mapFileName) {
  try {
    if (!mapFileName) throw new Error('Map filename required');
    const data = await fetchJSON(`maps/${mapFileName}`);
    return parseMapPayload(data);
  } catch (error) {
    console.error(`[CowCalc] Failed to load map ${mapFileName}:`, error);
    throw error;
  }
}

/**
 * Get list of available maps
 * @returns {Promise<string[]>} Array of map filenames
 */
export async function loadMapList() {
  try {
    const data = await fetchJSON('maps_index.json');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[CowCalc] Failed to load map list:', error);
    return [];
  }
}

/**
 * Load all global game data (buildings, research, maps)
 * @returns {Promise<object>} Global data object
 */
export async function loadGlobalGameData() {
  try {
    const [buildingData, researchData, mapList] = await Promise.all([
      loadBuildingData(),
      loadResearchData(),
      loadMapList(),
    ]);

    return {
      buildingData,
      researchData,
      mapList,
      loadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[CowCalc] Failed to load global data:', error);
    return {
      buildingData: [],
      researchData: [],
      mapList: [],
      loadedAt: null,
      error: error.message,
    };
  }
}

/**
 * Prefetch faction unit data for faster switching
 * @param {string[]} factions - Array of faction names to prefetch
 * @returns {Promise<object>} Map of faction to unit data
 */
export async function prefetchFactionData(factions) {
  const data = {};
  try {
    await Promise.all(factions.map(async (faction) => {
      try {
        data[faction] = await loadFactionUnitData(faction);
      } catch (error) {
        console.warn(`[CowCalc] Failed to prefetch ${faction}:`, error);
        data[faction] = [];
      }
    }));
  } catch (error) {
    console.error('[CowCalc] Error in prefetch:', error);
  }
  return data;
}

/**
 * Data cache for frequently accessed data
 */
const dataCache = {
  global: null,
  factions: {},
  maps: {},
  lastUpdated: null,
};

/**
 * Get cached global data or load it
 * @returns {Promise<object>} Global data
 */
export async function getCachedGlobalData() {
  if (dataCache.global && dataCache.lastUpdated) {
    const age = Date.now() - dataCache.lastUpdated;
    if (age < 1000 * 60 * 60) { // 1 hour cache
      return dataCache.global;
    }
  }

  dataCache.global = await loadGlobalGameData();
  dataCache.lastUpdated = Date.now();
  return dataCache.global;
}

/**
 * Get cached faction unit data
 * @param {string} faction - Faction name
 * @returns {Promise<object[]>} Unit data
 */
export async function getCachedFactionData(faction) {
  if (dataCache.factions[faction]) {
    return dataCache.factions[faction];
  }

  dataCache.factions[faction] = await loadFactionUnitData(faction);
  return dataCache.factions[faction];
}

/**
 * Get cached map data
 * @param {string} mapFileName - Map filename
 * @returns {Promise<object>} Map data
 */
export async function getCachedMapData(mapFileName) {
  if (dataCache.maps[mapFileName]) {
    return dataCache.maps[mapFileName];
  }

  dataCache.maps[mapFileName] = await loadMapData(mapFileName);
  return dataCache.maps[mapFileName];
}

/**
 * Clear all caches
 */
export function clearDataCache() {
  dataCache.global = null;
  dataCache.factions = {};
  dataCache.maps = {};
  dataCache.lastUpdated = null;
}
