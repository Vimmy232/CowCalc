/**
 * Game Constants & Configuration
 * Centralized definitions for units, buildings, factions, and game mechanics
 */

export const FACTION_FILES = {
  Ally: 'Game_Stats_Allies.json',
  Axis: 'Game_Stats_Axis.json',
  Commintern: 'Game_Stats_Commie.json',
  'Pan-Asian': 'Game_Stats_Pan.json',
};

export const FACTION_MULTIPLIERS = {
  Ally: 0.8,      // Ally gets 20% discount on unit upgrades
  Axis: 1,
  Commintern: 1,
  'Pan-Asian': 1,
};

export const UNIT_ORDER = [
  'Militia', 'Infantry', 'Motorized Infantry', 'Mechanized Infantry', 'Marines',
  'Commandos', 'Paratroopers', 'Flame Tank', 'Amphibious Tank',
  'Anti Tank', 'Artillery', 'SP Artillery', 'Anti Air', 'SP Anti Air',
  'Armored Car', 'Light Tank', 'Medium Tank', 'Heavy Tank', 'Tank Destroyer',
  'Interceptor', 'Tactical Bomber', 'Attack Bomber', 'Strategic Bomber', 'Naval Bomber',
  'Aircraft Transport',
  'Destroyer', 'Submarine', 'Cruiser', 'Battleship', 'Aircraft Carrier', 'Transport Ship',
  'Rocket Artillery', 'SP Rocket Artillery', 'Railroad Gun',
  'Flying Bomb', 'Rocket', 'Rocket Fighter',
  'Nuclear Bomber', 'Nuclear Fallout', 'Nuclear Rocket',
];

export const BUILDING_ORDER = [
  'Barracks', 'Ordnance Foundry', 'Tank Plant', 'Aircraft Factory', 'Secret Lab',
  'Industry', 'Recruiting Station', 'Propaganda Office', 'Local Industry',
  'Airstrip', 'Bunkers', 'Fortifications', 'Infrastructure',
  'Naval Base', 'Local Port', 'Capitol',
];

export const NO_UPGRADE_UNITS = new Set(['Transport Ship']);

export const EXCLUDED_ITEMS = new Set([
  'Aircraft Transport',
  'Transport Convoy',
  'Flame Tank',
  'Amphibious Tank',
  'Marines',
  'Fallout Lvl 1',
  'Fallout Lvl 2',
  'Nuclear Fallout',
]);

export const UNIT_ABBREVIATIONS = {
  'Motorized Infantry': 'Mot Infantry',
  'Mechanized Infantry': 'Mech Infantry',
  'Amphibious Tank': 'Amphi Tank',
  'Tactical Bomber': 'Tac Bomber',
  'Strategic Bomber': 'Strat Bomber',
  'SP Rocket Artillery': 'SPRA',
  'Nuclear Bomber': 'Nuke Bomber',
};

export const RESOURCE_NAMES = {
  M: 'Money',
  P: 'Manpower',
  F: 'Food',
  S: 'Steel',
  U: 'Fuel',
};

export const STORAGE_KEY = 'cowcalc_v2';

/**
 * Unit Tier Upgrade Prerequisites
 * Specifies which units must be researched before others can be researched
 */
export const UPGRADE_PREREQUISITES = {
  'Motorized Infantry': [{ unit: 'Infantry', tier: 1 }],
  'Mechanized Infantry': [{ unit: 'Motorized Infantry', tier: 1 }],
  'Commandos': [{ unit: 'Motorized Infantry', tier: 1 }],
  'Paratroopers': [{ unit: 'Motorized Infantry', tier: 1 }],
  
  'SP Artillery': [{ unit: 'Artillery', tier: 1 }],
  'SP Anti Air': [{ unit: 'Anti Air', tier: 1 }],
  'SP Rocket Artillery': [{ unit: 'Rocket Artillery', tier: 1 }],
  
  'Medium Tank': [{ unit: 'Light Tank', tier: 1 }],
  'Tank Destroyer': [{ unit: 'Light Tank', tier: 1 }],
  'Heavy Tank': [{ unit: 'Medium Tank', tier: 1 }],
  
  'Rocket': [{ unit: 'Flying Bomb', tier: 1 }],
  'Rocket Fighter': [{ unit: 'Flying Bomb', tier: 1 }],
  
  'Nuclear Bomber': [{ unit: 'Atomic Bomb', tier: 1 }],
  'Nuclear Rocket': [
    { unit: 'Atomic Bomb', tier: 3 },
    { unit: 'Rocket', tier: 4 },
    { unit: 'Flying Bomb', tier: 1 },
  ],
};

export const PROVINCE_TYPES = ['Core City', 'City', 'Town', 'Village'];

export const ITEM_TYPES = {
  UNIT: 'Unit',
  BUILDING: 'Building',
  UPGRADE_ONLY: 'UpgradeOnly',
};

export const DISCORD_MESSAGE_LIMIT = 2000;
