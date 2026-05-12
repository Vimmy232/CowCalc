export const FactionFiles = {
  Ally: 'Game_Stats_Allies.json',
  Axis: 'Game_Stats_Axis.json',
  Commintern: 'Game_Stats_Commie.json',
  'Pan-Asian': 'Game_Stats_Pan.json',
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

export const NO_UPGRADE_UNITS = new Set(['Transport Ship']);

export const UNIT_ABBREVIATIONS = {
  'Motorized Infantry': 'Mot Infantry',
  'Mechanized Infantry': 'Mech Infantry',
  'Amphibious Tank': 'Amphi Tank',
  'Tactical Bomber': 'Tac Bomber',
  'Strategic Bomber': 'Strat Bomber',
  'SP Rocket Artillery': 'SPRA',
  'Nuclear Bomber': 'Nuke Bomber',
};

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

export const BUILDING_ORDER = [
  'Barracks', 'Ordnance Foundry', 'Tank Plant', 'Aircraft Factory', 'Secret Lab',
  'Industry', 'Recruiting Station', 'Propaganda Office', 'Local Industry',
  'Airstrip', 'Bunkers', 'Fortifications', 'Infrastructure',
  'Naval Base', 'Local Port', 'Capitol',
];

export const LS_KEY = 'cowcalc_v1';

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
  return [...names].sort((a, b) => {
    const ia = UNIT_ORDER.indexOf(a);
    const ib = UNIT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function parseIntSafe(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseSchemaRows(schema, typeTag = null) {
  if (!schema || !Array.isArray(schema.rows) || !Array.isArray(schema.headers)) return [];
  return schema.rows.map((row) => {
    const obj = {};
    schema.headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    if (typeTag) obj._type = typeTag;
    return obj;
  });
}

export function parseMapPayload(mapPayload) {
  const parsedRows = parseSchemaRows({ rows: mapPayload?.rows || [], headers: mapPayload?.headers || [] });
  const rows100Map = {};

  if (Array.isArray(mapPayload?.rows_100) && Array.isArray(mapPayload?.headers_100)) {
    const rows100 = parseSchemaRows({ rows: mapPayload.rows_100, headers: mapPayload.headers_100 });
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

export function getUpgradeCostTier(fromTier, toTier) {
  const from = parseIntSafe(fromTier, 1);
  const to = parseIntSafe(toTier, from);
  if (to <= from) return null;
  return (to - from === 1) ? to : (to - 1);
}

export function getUpgradeCostSource(unitData, unitName, fromTier, toTier, fallbackObj = null) {
  const costTier = getUpgradeCostTier(fromTier, toTier);
  if (!costTier) return null;
  if (!Array.isArray(unitData) || !unitName) return fallbackObj;
  return unitData.find((u) => u.Name === unitName && parseIntSafe(u.Tier, 1) === costTier) || fallbackObj;
}

export function sortCartItems(cart, buildingData) {
  if (!Array.isArray(cart)) return [];

  const buildingNameOrder = new Map();
  (buildingData || []).forEach((building, index) => {
    const name = String(building?.Name || '');
    if (name && !buildingNameOrder.has(name)) buildingNameOrder.set(name, index);
  });

  const decorated = cart.map((item, originalIndex) => ({ item, originalIndex }));

  decorated.sort((a, b) => {
    const getGroup = (entry) => {
      const type = entry.item?.type;
      const name = String(entry.item?.obj?.Name || '');
      if (type === 'Building') {
        if (name === 'Industry') return 1;
        if (name === 'Local Industry') return 2;
        if (name === 'Recruiting Station') return 3;
        return 0;
      }
      if (type === 'Unit' || type === 'UpgradeOnly') return 4;
      return 5;
    };

    const groupA = getGroup(a);
    const groupB = getGroup(b);
    if (groupA !== groupB) return groupA - groupB;

    if (groupA <= 3) {
      const nameA = String(a.item?.obj?.Name || '');
      const nameB = String(b.item?.obj?.Name || '');
      const orderA = buildingNameOrder.has(nameA) ? buildingNameOrder.get(nameA) : Number.MAX_SAFE_INTEGER;
      const orderB = buildingNameOrder.has(nameB) ? buildingNameOrder.get(nameB) : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;

      const tierA = parseIntSafe(a.item?.obj?.Tier, 1);
      const tierB = parseIntSafe(b.item?.obj?.Tier, 1);
      if (tierA !== tierB) return tierA - tierB;
    }

    return a.originalIndex - b.originalIndex;
  });

  return decorated.map((entry) => entry.item);
}

const formatCache = new Map();

export function formatNumber(value, digits = 0) {
  const parsed = Number(value ?? 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  
  if (!formatCache.has(digits)) {
    formatCache.set(digits, new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }));
  }
  
  return formatCache.get(digits).format(safe);
}

export function formatWhole(value) {
  return formatNumber(value, 0);
}

export function formatDecimal(value, digits = 2) {
  return formatNumber(value, digits);
}

export function createCostBucket() {
  return { M: 0, P: 0, F: 0, S: 0, U: 0 };
}

export function addCost(bucket, source, multiplier = 1) {
  bucket.M += parseFloat(source.Money || 0) * multiplier;
  bucket.P += parseFloat(source.Manpower || 0) * multiplier;
  bucket.F += parseFloat(source.Food || 0) * multiplier;
  bucket.S += parseFloat(source.Steel || 0) * multiplier;
  bucket.U += parseFloat(source.Fuel || 0) * multiplier;
  return bucket;
}

export function addBuckets(target, source) {
  target.M += source.M;
  target.P += source.P;
  target.F += source.F;
  target.S += source.S;
  target.U += source.U;
  return target;
}

export function getProductionDayCount(days) {
  return Math.max(1, parseIntSafe(days, 1));
}

export function getCurrentTimelineDay(days) {
  return getProductionDayCount(days) + 1;
}

export function getResearchUnlockDay(researchData, faction, name, tier) {
  if (!Array.isArray(researchData) || !faction || !name) return 1;
  const row = researchData.find((research) =>
    research.Name === name &&
    research.Faction === faction &&
    parseIntSafe(research.Tier, 1) === parseIntSafe(tier, 1)
  );
  return Math.max(1, parseIntSafe(row?.['Day Available'], 1));
}

export function applyResearchPrerequisites(maxTiersInput) {
  const maxTiers = { ...(maxTiersInput || {}) };

  const needsPrereq = (name, minTier) => {
    if (!maxTiers[name] || maxTiers[name] < minTier) maxTiers[name] = minTier;
  };

  if (maxTiers['Motorized Infantry']) needsPrereq('Infantry', 1);
  if (maxTiers['Mechanized Infantry']) needsPrereq('Motorized Infantry', 1);
  if (maxTiers['Commandos']) needsPrereq('Motorized Infantry', 1);
  if (maxTiers['Paratroopers']) needsPrereq('Motorized Infantry', 1);
  if (maxTiers['Motorized Infantry']) needsPrereq('Infantry', 1);

  if (maxTiers['SP Artillery']) needsPrereq('Artillery', 1);
  if (maxTiers['SP Anti Air']) needsPrereq('Anti Air', 1);
  if (maxTiers['SP Rocket Artillery']) needsPrereq('Rocket Artillery', 1);

  if (maxTiers['Medium Tank']) needsPrereq('Light Tank', 1);
  if (maxTiers['Tank Destroyer']) needsPrereq('Light Tank', 1);
  if (maxTiers['Heavy Tank']) needsPrereq('Medium Tank', 1);
  if (maxTiers['Medium Tank']) needsPrereq('Light Tank', 1);

  if (maxTiers.Rocket) needsPrereq('Flying Bomb', 1);
  if (maxTiers['Rocket Fighter']) needsPrereq('Flying Bomb', 1);

  const nuclearBomberTier = maxTiers['Nuclear Bomber'] || 0;
  if (nuclearBomberTier >= 2) needsPrereq('Atomic Bomb', nuclearBomberTier - 1);
  if (maxTiers['Nuclear Rocket']) {
    needsPrereq('Atomic Bomb', 3);
    needsPrereq('Rocket', 4);
    needsPrereq('Flying Bomb', 1);
  }

  return maxTiers;
}

export function getProductionBuildingEntries(block, buildingName) {
  if (!block || !buildingName || !block.cart) return [];
  return block.cart.filter((item) => item.type === 'Building' && item.obj?.Name === buildingName);
}

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
    .map(([tier, count]) => `${formatWhole(count)}x L${formatWhole(tier)}`)
    .join(', ');

  return { totalCount, tierSummary };
}

export function getUnitProductionPreview(block, unitItem, days, unlockDay = 1) {
  if (!block || !unitItem?.obj) return null;

  const startingTier = parseIntSafe(unitItem.obj.Tier, 1);
  const unitObj = block.unitData?.find((unit) => unit.Name === unitItem.obj.Name && parseIntSafe(unit.Tier, 1) === startingTier) || unitItem.obj;
  const buildingName = String(unitObj['building required'] || '').trim();
  const requestedCount = Math.max(1, parseIntSafe(unitItem.count, 1));

  if (!buildingName) return null;

  const optimalLevel = Math.max(1, parseIntSafe(unitObj.optimalproductionrequirement, 1));
  const baseHours = parseFloat(unitObj['Min Build Time (hrs)'] || 0);
  const buildingEntries = getProductionBuildingEntries(block, buildingName);
  const productionDay = getCurrentTimelineDay(days);
  const unlockAtDay = Math.max(1, parseIntSafe(unlockDay, 1));
  const producibleDays = Math.max(0, productionDay - unlockAtDay);
  const totalHours = producibleDays * 24;

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
      productionDayCount: productionDay,
      unlockDay: unlockAtDay,
    };
  }

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
      productionDayCount: productionDay,
      unlockDay: unlockAtDay,
    };
  }

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
    hoursPerUnit,
    maxUnits: maxUnitsByDay,
    cappedUnits,
    completionHours,
    unitsPerDay,
    productionDayCount: productionDay,
    unlockDay: unlockAtDay,
  };
}

export function chunkDiscordLines(lines, limit) {
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

    if (currentLines.length === 0) {
      return null;
    }

    chunks.push(currentLines.join('\n'));
    currentLines = [line];
    currentLength = line.length;
  }

  if (currentLines.length > 0) {
    chunks.push(currentLines.join('\n'));
  }

  return chunks;
}

export function buildDiscordPlanExport({ selectedMap, blocks, mapData }) {
  const mapLabel = selectedMap
    ? selectedMap.replace('.json', '').replace(/_/g, ' ')
    : 'Unselected Map';
  const hardLimit = 2000;
  const messageLimit = hardLimit;
  const warnings = [];
  const lines = [];

  (blocks || []).forEach((block, blockIndex) => {
    const countryObj = mapData?.parsedRows?.[block.selectedCountryIdx];
    const discordId = String(block?.discordId || '').trim();
    const countryMentionPrefix = discordId ? `<@${discordId}> ` : '';
    const countryLabel = countryObj
      ? `${countryMentionPrefix}${countryObj.Nation} (${countryObj.Faction})`
      : `Block ${formatWhole(blockIndex + 1)}`;
    const countryLines = [];

    countryLines.push(`## Country ${formatWhole(blockIndex + 1)}: ${countryLabel}`);

    const buildingItems = (block.cart || []).filter((item) => item.type === 'Building');
    const unitItems = (block.cart || []).filter((item) => item.type === 'Unit');
    const upgradeItems = (block.cart || []).filter((item) => item.type === 'UpgradeOnly');

    if (buildingItems.length) {
      countryLines.push('### Buildings');
      buildingItems.forEach((item) => {
        const count = formatWhole(item.count || 1);
        const buildingTier = formatWhole(item.obj?.Tier || 1);
        countryLines.push(`- ${item.obj?.Name || 'Building'} L${buildingTier} x${count}`);

        if (String(item.obj?.Name || '') === 'Industry' || String(item.obj?.Name || '') === 'Local Industry') {
          countryLines.push(`  - What: ${item.buffTarget || 'Production'}`);
        }

        if (String(item.obj?.Name || '').includes('Recruiting Station') && item.provinceType) {
          countryLines.push(`  - Province: ${item.provinceType}`);
        }
      });
    }

    if (unitItems.length) {
      countryLines.push('### Units');
      unitItems.forEach((item) => {
        const count = formatWhole(item.count || 1);
        const unitTier = formatWhole(item.obj?.Tier || 1);
        countryLines.push(`- ${item.obj?.Name || 'Unit'} L${unitTier} x${count}`);

        const buildingRequired = String(item.obj?.['building required'] || '').trim();
        if (buildingRequired) {
          countryLines.push(`  - Base: ${buildingRequired}`);
        }

        if (item.upgradeTo) {
          countryLines.push(`  - Upgrade: L${formatWhole(item.upgradeTo)}`);
        }
      });
    }

    if (upgradeItems.length) {
      countryLines.push('### Upgrades');
      upgradeItems.forEach((item) => {
        const count = formatWhole(item.count || 1);
        const fromTier = formatWhole(item.fromTier || 1);
        const toTier = formatWhole(item.toTier || item.obj?.Tier || 1);
        countryLines.push(`- ${item.obj?.Name || 'Unit'}`);
        countryLines.push(`  - L${fromTier} -> L${toTier} x${count}`);
      });
    }

    if (!buildingItems.length && !unitItems.length && !upgradeItems.length) {
      countryLines.push('### No queued items');
    }

    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(...countryLines);
  });

  let chunks = chunkDiscordLines(lines, messageLimit);
  if (!chunks) {
    warnings.push('Combined export could not fit within the current message limit.');
    chunks = [lines.join('\n')];
  }

  return {
    title: `CowCalc Build Plan - ${mapLabel}`,
    warning: warnings.join(' '),
    messageLimit,
    chunks,
    text: chunks.join('\n\n'),
  };
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    return;
  }
}

export function createCompactPlan(selectedMap, days, blocks) {
  return {
    _version: 3,
    format: 'compact',
    selectedMap,
    days,
    blocks: (blocks || []).map((block) => ({
      id: block.id,
      selectedCountryIdx: block.selectedCountryIdx,
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

export async function hydrateBlocksFromCompactPlan(plan, globalData) {
  const mapJson = await fetch(`./maps/${plan.selectedMap}`).then((response) => response.json());
  const { parsedRows } = parseMapPayload(mapJson);

  const factionCache = {};
  const loadFactionUnits = async (faction) => {
    if (!faction || !FactionFiles[faction]) return [];
    if (factionCache[faction]) return factionCache[faction];
    const data = await fetch(`./data/${FactionFiles[faction]}`).then((response) => response.json());
    const units = parseSchemaRows(data, 'Unit');
    factionCache[faction] = units;
    return units;
  };

  const hydratedBlocks = [];
  for (let blockIndex = 0; blockIndex < (plan.blocks || []).length; blockIndex++) {
    const compactBlock = plan.blocks[blockIndex];
    const countryObj = parsedRows[compactBlock.selectedCountryIdx];
    const unitData = await loadFactionUnits(countryObj?.Faction);
    const cart = [];

    (compactBlock.cart || []).forEach((item) => {
      const count = Math.max(1, parseInt(item.count || 1, 10));
      if (item.type === 'Building') {
        const obj = globalData.buildingData.find((building) =>
          building.Name === item.name && parseInt(building.Tier || 1, 10) === parseInt(item.tier || 1, 10)
        );
        if (!obj) return;
        const isRecruitingStation = obj.Name.includes('Recruiting Station');
        const isIndustry = obj.Name.includes('Industry');
        const boostVal = isRecruitingStation ? obj['Manpower Boost (%)'] : (isIndustry ? obj['Resource Boost (%)'] : null);
        cart.push({
          type: 'Building',
          obj,
          count,
          buffTarget: isRecruitingStation ? 'Manpower' : (item.buffTarget || null),
          buffValue: boostVal,
          provinceType: item.provinceType || null,
        });
        return;
      }

      if (item.type === 'Unit') {
        const obj = unitData.find((unit) =>
          unit.Name === item.name && parseInt(unit.Tier || 1, 10) === parseInt(item.tier || 1, 10)
        );
        if (!obj) return;
        cart.push({ type: 'Unit', obj, count, upgradeTo: item.upgradeTo || undefined });
        return;
      }

      if (item.type === 'UpgradeOnly') {
        const fromTier = parseInt(item.fromTier || 1, 10);
        const toTier = parseInt(item.toTier || 2, 10);
        const obj = unitData.find((unit) => unit.Name === item.name && parseInt(unit.Tier || 1, 10) === toTier);
        if (!obj) return;
        const prevObj = getUpgradeCostSource(unitData, item.name, fromTier, toTier, obj);
        cart.push({ type: 'UpgradeOnly', obj, prevObj, fromTier, toTier, count });
      }
    });

    hydratedBlocks.push({
      id: compactBlock.id || (Date.now() + blockIndex),
      selectedCountryIdx: compactBlock.selectedCountryIdx,
      capitalsTaken: compactBlock.capitalsTaken || 0,
      discordId: compactBlock.discordId || '',
      unitData,
      cart: sortCartItems(cart, globalData.buildingData),
    });
  }

  return hydratedBlocks;
}
