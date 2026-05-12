/**
 * Discord Exporter Service
 * Formats plan into Discord-friendly markdown format
 */

import { formatWhole, chunkLines, ITEM_TYPES } from './utils.js';
import { DISCORD_MESSAGE_LIMIT, parseIntSafe } from './constants.js';

/**
 * Build markdown header for plan
 * @param {string} mapName - Selected map name
 * @returns {string} Markdown header
 */
function buildPlanHeader(mapName) {
  const cleanMapName = mapName
    ? mapName.replace('.json', '').replace(/_/g, ' ')
    : 'Unselected Map';

  return `# CowCalc Build Plan - ${cleanMapName}`;
}

/**
 * Build markdown section for a single country block
 * @param {object} block - Country block
 * @param {object} mapData - Map data
 * @param {number} blockIndex - Block number (0-indexed)
 * @returns {string} Markdown section
 */
function buildCountrySection(block, mapData, blockIndex) {
  const lines = [];

  // Country header with Discord mention
  const countryObj = mapData?.parsedRows?.[block.selectedCountryIdx];
  const discordId = String(block?.discordId || '').trim();
  const countryMention = discordId ? `<@${discordId}> ` : '';
  const countryLabel = countryObj
    ? `${countryMention}${countryObj.Nation} (${countryObj.Faction})`
    : `Block ${formatWhole(blockIndex + 1)}`;

  lines.push(`## Country ${formatWhole(blockIndex + 1)}: ${countryLabel}`);

  // Separate items by type
  const buildingItems = (block.cart || []).filter((item) => item.type === ITEM_TYPES.BUILDING);
  const unitItems = (block.cart || []).filter((item) => item.type === ITEM_TYPES.UNIT);
  const upgradeItems = (block.cart || []).filter((item) => item.type === ITEM_TYPES.UPGRADE_ONLY);

  // Buildings section
  if (buildingItems.length > 0) {
    lines.push('### Buildings');
    buildingItems.forEach((item) => {
      const count = formatWhole(item.count || 1);
      const tier = formatWhole(item.obj?.Tier || 1);
      lines.push(`- ${item.obj?.Name || 'Building'} L${tier} x${count}`);

      // Add buff info
      const isIndustry = String(item.obj?.Name || '').includes('Industry');
      const isRecruiting = String(item.obj?.Name || '').includes('Recruiting Station');

      if (isIndustry || isRecruiting) {
        const target = item.buffTarget || (isIndustry ? 'Steel' : 'Manpower');
        lines.push(`  - Boost: ${target}`);
      }

      if (isRecruiting && item.provinceType) {
        lines.push(`  - Location: ${item.provinceType}`);
      }
    });
  }

  // Units section
  if (unitItems.length > 0) {
    lines.push('### Units');
    unitItems.forEach((item) => {
      const count = formatWhole(item.count || 1);
      const tier = formatWhole(item.obj?.Tier || 1);
      lines.push(`- ${item.obj?.Name || 'Unit'} L${tier} x${count}`);

      const buildingRequired = String(item.obj?.['building required'] || '').trim();
      if (buildingRequired) {
        lines.push(`  - Requires: ${buildingRequired}`);
      }

      if (item.upgradeTo) {
        lines.push(`  - Upgrade to: L${formatWhole(item.upgradeTo)}`);
      }
    });
  }

  // Upgrades section
  if (upgradeItems.length > 0) {
    lines.push('### Unit Upgrades');
    upgradeItems.forEach((item) => {
      const count = formatWhole(item.count || 1);
      const fromTier = formatWhole(item.fromTier || 1);
      const toTier = formatWhole(item.toTier || 2);
      lines.push(`- ${item.obj?.Name || 'Unit'}`);
      lines.push(`  - L${fromTier} → L${toTier} x${count}`);
    });
  }

  // Empty state
  if (buildingItems.length === 0 && unitItems.length === 0 && upgradeItems.length === 0) {
    lines.push('### No items queued');
  }

  return lines.join('\n');
}

/**
 * Build complete Discord export
 * @param {object} plan - Plan object with selectedMap, days, blocks
 * @param {object} mapData - Parsed map data
 * @returns {object} { title, chunks[], warnings[] }
 */
export function buildDiscordExport(plan, mapData) {
  const lines = [];
  const warnings = [];

  // Add header
  lines.push(buildPlanHeader(plan.selectedMap));
  lines.push('');

  // Add each country block
  (plan.blocks || []).forEach((block, blockIndex) => {
    if (blockIndex > 0) {
      lines.push('');
    }
    lines.push(buildCountrySection(block, mapData, blockIndex));
  });

  // Try to chunk into Discord message limit
  const chunks = chunkLines(lines, DISCORD_MESSAGE_LIMIT);

  if (!chunks) {
    warnings.push('Plan is too large for Discord. Sharing full text in single message.');
    return {
      title: `CowCalc Build Plan - ${plan.selectedMap || 'Export'}`,
      chunks: [lines.join('\n')],
      warnings,
      messageLimit: DISCORD_MESSAGE_LIMIT,
    };
  }

  return {
    title: `CowCalc Build Plan - ${plan.selectedMap || 'Export'}`,
    chunks,
    warnings,
    messageLimit: DISCORD_MESSAGE_LIMIT,
  };
}

/**
 * Build short Discord export (one-liner per item)
 * Useful for quick sharing
 * @param {object} plan - Plan object
 * @param {object} mapData - Map data
 * @returns {string} Single-line export
 */
export function buildDiscordExportCompact(plan, mapData) {
  const lines = [];

  (plan.blocks || []).forEach((block, blockIndex) => {
    const countryObj = mapData?.parsedRows?.[block.selectedCountryIdx];
    const countryLabel = countryObj
      ? `${countryObj.Nation} (${countryObj.Faction})`
      : `Block ${blockIndex + 1}`;

    const items = (block.cart || []).map((item) => {
      const count = formatWhole(item.count || 1);
      const tier = formatWhole(item.obj?.Tier || 1);
      const name = item.obj?.Name || 'Item';
      return `${name}L${tier}x${count}`;
    }).join(' + ');

    if (items) {
      lines.push(`${countryLabel}: ${items}`);
    }
  });

  return lines.join('\n');
}

/**
 * Format cost breakdown for Discord
 * @param {object} costs - Cost bucket { M, P, F, S, U }
 * @returns {string} Formatted cost string
 */
export function formatCostsForDiscord(costs) {
  if (!costs) return '';
  return `💰${formatWhole(costs.M)} | 👥${formatWhole(costs.P)} | 🌾${formatWhole(costs.F)} | ⚙️${formatWhole(costs.S)} | ⛽${formatWhole(costs.U)}`;
}

/**
 * Check if export will fit in Discord message limit
 * @param {object} plan - Plan object
 * @param {object} mapData - Map data
 * @returns {boolean} Whether export fits
 */
export function checkDiscordExportFits(plan, mapData) {
  const export_ = buildDiscordExport(plan, mapData);
  return export_.chunks.length === 1;
}

/**
 * Get a warning message if plan is too large
 * @param {object} plan - Plan object
 * @param {object} mapData - Map data
 * @returns {string|null} Warning message or null if fits
 */
export function getDiscordExportWarning(plan, mapData) {
  const export_ = buildDiscordExport(plan, mapData);
  if (export_.chunks.length > 1) {
    return `Plan is large and will be split into ${export_.chunks.length} Discord messages.`;
  }
  if (export_.warnings.length > 0) {
    return export_.warnings[0];
  }
  return null;
}
