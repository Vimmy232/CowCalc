import { parseSchemaRows } from './lib/cowcalcCore';

export async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Backward-compatible alias retained for existing imports.
export function parseDataData(schema) {
  return parseSchemaRows(schema);
}

export function parseBuildingData(json) {
  if (!json) return [];
  return Object.values(json).flatMap((schema) => {
    const parsed = parseSchemaRows(schema, 'Building');
    parsed.forEach((item) => {
      if (!item.Tier) item.Tier = '1';
    });
    return parsed;
  });
}

export function calculateResearchCost(researchData, name, tier, faction) {
  let money = 0;
  let food = 0;
  let steel = 0;
  let fuel = 0;

  const parsed = Array.isArray(researchData)
    ? researchData
    : parseSchemaRows(researchData || { headers: [], rows: [] });

  for (let currentTier = 1; currentTier <= parseInt(tier, 10); currentTier++) {
    const item = parsed.find((entry) =>
      entry.Name === name &&
      Number(entry.Tier) === currentTier &&
      (entry.Faction === faction || entry.Faction === 'All')
    );

    if (!item) continue;

    money += parseFloat(item.Money || 0);
    food += parseFloat(item.Food || 0);
    steel += parseFloat(item.Steel || 0);
    fuel += parseFloat(item.Fuel || 0);
  }

  return { money, food, steel, fuel };
}

export function customSmoothScroll(targetY, duration = 800) {
  const startY = window.scrollY || window.pageYOffset;
  const distance = targetY - startY;
  let startTime = null;

  // easeInOutQuart for a smoother, premium feel
  function easeInOutQuart(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t * t + b;
    t -= 2;
    return -c / 2 * (t * t * t * t - 2) + b;
  }

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const nextY = easeInOutQuart(timeElapsed, startY, distance, duration);
    
    window.scrollTo(0, nextY);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    } else {
      window.scrollTo(0, targetY);
    }
  }

  requestAnimationFrame(animation);
}
