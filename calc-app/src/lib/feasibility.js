import {
  parseIntSafe,
  getUpgradeCostSource,
  applyResearchPrerequisites,
} from './cowcalcCore.js';

export function calculateGlobalFeasibility({ blocks, mapData, globalData, days }) {
  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const buildingData = globalData?.buildingData || [];
  const researchData = globalData?.researchData || [];
  const parsedRows = mapData?.parsedRows || [];
  const rows100Map = mapData?.rows100Map || {};
  const safeDays = Math.max(1, parseIntSafe(days, 1));

  let totalReqMoney = 0;
  let totalReqFood = 0;
  let totalReqSteel = 0;
  let totalReqFuel = 0;

  const perBlockMP = [];

  let startMoney = 0;
  let startFood = 0;
  let startSteel = 0;
  let startFuel = 0;
  let incomeMoney = 0;
  let incomeFood = 0;
  let incomeSteel = 0;
  let incomeFuel = 0;

  safeBlocks.forEach((block, blockIdx) => {
    let blockReqMP = 0;
    const countryObj = block?.selectedCountryIdx >= 0 ? parsedRows[block.selectedCountryIdx] : null;

    const maxHours = safeDays * 24;

    (block.cart || []).forEach((item) => {
      if (item.type === 'Building') {
        const targetTier = parseIntSafe(item.obj?.Tier, 1);
        const isBuffBuilding = item.obj?.Name?.includes('Industry') || item.obj?.Name?.includes('Recruiting Station');

        let bMoney = 0;
        let bManpower = 0;
        let bFood = 0;
        let bSteel = 0;
        let bFuel = 0;
        let currentHours = 0;

        for (let tier = 1; tier <= targetTier; tier++) {
          const bItem = buildingData.find((building) =>
            building.Name === item.obj?.Name && parseIntSafe(building.Tier, 1) === tier
          );
          if (!bItem) continue;

          if (isBuffBuilding) {
            if (currentHours >= maxHours) break;
            bMoney += parseFloat(bItem.Money || 0);
            bManpower += parseFloat(bItem.Manpower || 0);
            bFood += parseFloat(bItem.Food || 0);
            bSteel += parseFloat(bItem.Steel || 0);
            bFuel += parseFloat(bItem.Fuel || 0);
            currentHours += parseFloat(bItem['Min Build Time (hrs)'] || 0);
          } else {
            bMoney += parseFloat(bItem.Money || 0);
            bManpower += parseFloat(bItem.Manpower || 0);
            bFood += parseFloat(bItem.Food || 0);
            bSteel += parseFloat(bItem.Steel || 0);
            bFuel += parseFloat(bItem.Fuel || 0);
          }
        }

        totalReqMoney += bMoney * item.count;
        blockReqMP += bManpower * item.count;
        totalReqFood += bFood * item.count;
        totalReqSteel += bSteel * item.count;
        totalReqFuel += bFuel * item.count;
        return;
      }

      if (item.type === 'UpgradeOnly') {
        const isAlly = countryObj && countryObj.Faction === 'Ally';
        const upgradeMult = isAlly ? 0.8 : 1;
        const costSrc = item.prevObj || getUpgradeCostSource(block.unitData, item.obj?.Name, item.fromTier, item.toTier, item.obj);
        if (!costSrc) return;

        totalReqMoney += 0.5 * upgradeMult * parseFloat(costSrc.Money || 0) * item.count;
        blockReqMP += 0.5 * upgradeMult * parseFloat(costSrc.Manpower || 0) * item.count;
        totalReqFood += 0.5 * upgradeMult * parseFloat(costSrc.Food || 0) * item.count;
        totalReqSteel += 0.5 * upgradeMult * parseFloat(costSrc.Steel || 0) * item.count;
        totalReqFuel += 0.5 * upgradeMult * parseFloat(costSrc.Fuel || 0) * item.count;
        return;
      }

      let reqMoney = parseFloat(item.obj?.Money || 0);
      let reqManpower = parseFloat(item.obj?.Manpower || 0);
      let reqFood = parseFloat(item.obj?.Food || 0);
      let reqSteel = parseFloat(item.obj?.Steel || 0);
      let reqFuel = parseFloat(item.obj?.Fuel || 0);

      if (item.upgradeTo) {
        const isAlly = countryObj && countryObj.Faction === 'Ally';
        const upgradeMult = isAlly ? 0.8 : 1;
        const fromTier = parseIntSafe(item.obj?.Tier, 1);
        const toTier = parseIntSafe(item.upgradeTo, fromTier);
        const fallbackTarget = block.unitData.find((unit) =>
          unit.Name === item.obj?.Name && parseIntSafe(unit.Tier, 1) === toTier
        );
        const costSrc = getUpgradeCostSource(block.unitData, item.obj?.Name, fromTier, toTier, fallbackTarget);
        if (costSrc) {
          reqMoney += 0.5 * upgradeMult * parseFloat(costSrc.Money || 0);
          reqManpower += 0.5 * upgradeMult * parseFloat(costSrc.Manpower || 0);
          reqFood += 0.5 * upgradeMult * parseFloat(costSrc.Food || 0);
          reqSteel += 0.5 * upgradeMult * parseFloat(costSrc.Steel || 0);
          reqFuel += 0.5 * upgradeMult * parseFloat(costSrc.Fuel || 0);
        }
      }

      totalReqMoney += reqMoney * item.count;
      blockReqMP += reqManpower * item.count;
      totalReqFood += reqFood * item.count;
      totalReqSteel += reqSteel * item.count;
      totalReqFuel += reqFuel * item.count;
    });

    const maxTiers = {};
    const upgradeOnlyResearch = {};

    (block.cart || []).forEach((item) => {
      if (item.type === 'Unit') {
        const tier = parseIntSafe(item.upgradeTo || item.obj?.Tier, 1);
        if (!maxTiers[item.obj?.Name] || tier > maxTiers[item.obj?.Name]) maxTiers[item.obj?.Name] = tier;
      } else if (item.type === 'UpgradeOnly') {
        const toTier = parseIntSafe(item.toTier, 1);
        if (!upgradeOnlyResearch[item.obj?.Name]) {
          upgradeOnlyResearch[item.obj?.Name] = { from: 0, to: toTier };
        } else {
          upgradeOnlyResearch[item.obj?.Name].to = Math.max(upgradeOnlyResearch[item.obj?.Name].to, toTier);
        }
      }
    });

    Object.entries(upgradeOnlyResearch).forEach(([name, { to }]) => {
      if (!maxTiers[name] || maxTiers[name] < to) maxTiers[name] = to;
    });

    const requiredTiers = applyResearchPrerequisites(maxTiers);

    if (countryObj) {
      const resMult = countryObj.Faction === 'Ally' ? 0.8 : 1;

      Object.entries(requiredTiers).forEach(([name, maxTier]) => {
        for (let tier = 1; tier <= maxTier; tier++) {
          const rItem = researchData.find((research) =>
            research.Name === name &&
            parseIntSafe(research.Tier, 1) === tier &&
            research.Faction === countryObj.Faction
          );
          if (!rItem) continue;

          totalReqMoney += parseFloat(rItem.Money || 0) * resMult;
          totalReqFood += parseFloat(rItem.Food || 0) * resMult;
          totalReqSteel += parseFloat(rItem.Steel || 0) * resMult;
          totalReqFuel += parseFloat(rItem.Fuel || 0) * resMult;
        }
      });

      Object.entries(upgradeOnlyResearch).forEach(([name, { from, to }]) => {
        const alreadyCoveredUpTo = requiredTiers[name] || 0;
        const startFrom = Math.max(from + 1, alreadyCoveredUpTo + 1);
        for (let tier = startFrom; tier <= to; tier++) {
          const rItem = researchData.find((research) =>
            research.Name === name &&
            parseIntSafe(research.Tier, 1) === tier &&
            research.Faction === countryObj.Faction
          );
          if (!rItem) continue;

          totalReqMoney += parseFloat(rItem.Money || 0) * resMult;
          totalReqFood += parseFloat(rItem.Food || 0) * resMult;
          totalReqSteel += parseFloat(rItem.Steel || 0) * resMult;
          totalReqFuel += parseFloat(rItem.Fuel || 0) * resMult;
        }
      });

      startMoney += 80000;
      startFood += 15000;
      startSteel += 15000;
      startFuel += 15000;

      const nation100 = rows100Map[countryObj.Nation];

      const v70 = {
        Money: parseFloat(countryObj.Money || 0),
        Manpower: parseFloat(countryObj.Manpower || 0),
        Food: parseFloat(countryObj.Food || 0),
        Steel: parseFloat(countryObj.Steel || 0),
        Fuel: parseFloat(countryObj.Fuel || 0),
      };

      const v100 = nation100
        ? {
          Money: parseFloat(nation100.Money || 0),
          Manpower: parseFloat(nation100.Manpower || 0),
          Food: parseFloat(nation100.Food || 0),
          Steel: parseFloat(nation100.Steel || 0),
          Fuel: parseFloat(nation100.Fuel || 0),
        }
        : v70;

      let buffMoney = 0;
      let buffManpower = 0;
      let buffFood = 0;
      let buffSteel = 0;
      let buffFuel = 0;

      (block.cart || []).forEach((item) => {
        if (!(item.buffTarget && item.type === 'Building')) return;

        const targetTier = parseIntSafe(item.obj?.Tier, 1);
        let currentHours = 0;
        let accumulatedExtraYield = 0;
        let previousBuff = 0;

        for (let tier = 1; tier <= targetTier; tier++) {
          const bItem = buildingData.find((building) =>
            building.Name === item.obj?.Name && parseIntSafe(building.Tier, 1) === tier
          );
          if (!bItem) continue;
          if (currentHours >= maxHours) break;

          const duration = parseFloat(bItem['Min Build Time (hrs)'] || 0);
          const boostStr = bItem.Name.includes('Recruiting Station')
            ? bItem['Manpower Boost (%)']
            : bItem['Resource Boost (%)'];
          const targetBuff = parseFloat((boostStr || '0').replace('%', '')) / 100;

          const hoursToBuild = Math.min(duration, maxHours - currentHours);
          const durationDiv = duration > 0 ? duration : 1;
          const avgBuff = previousBuff + 0.5 * (targetBuff - previousBuff) * (hoursToBuild / durationDiv);

          accumulatedExtraYield += avgBuff * hoursToBuild;
          currentHours += hoursToBuild;
          previousBuff += (targetBuff - previousBuff) * (hoursToBuild / durationDiv);
        }

        if (currentHours < maxHours) {
          accumulatedExtraYield += previousBuff * (maxHours - currentHours);
        }

        let baseProduction = 0;
        if (item.obj?.Name?.includes('Industry') && !item.obj?.Name?.includes('Local')) {
          baseProduction = 6000;
        } else if (item.obj?.Name?.includes('Local Industry')) {
          baseProduction = 1500;
        } else if (item.obj?.Name?.includes('Recruiting Station')) {
          if (item.provinceType === 'Core City') baseProduction = 600;
          else if (item.provinceType === 'Normal Rural') baseProduction = 450;
          else if (item.provinceType === 'Resource Rural') baseProduction = 150;
          else baseProduction = 600;
        }

        const boostGainedTotal = (baseProduction / 24) * accumulatedExtraYield * item.count;
        const equivDailyBoost = boostGainedTotal / safeDays;

        if (item.buffTarget === 'Money') buffMoney += equivDailyBoost;
        else if (item.buffTarget === 'Manpower') buffManpower += equivDailyBoost;
        else if (item.buffTarget === 'Food') buffFood += equivDailyBoost;
        else if (item.buffTarget === 'Steel') buffSteel += equivDailyBoost;
        else if (item.buffTarget === 'Fuel') buffFuel += equivDailyBoost;
      });

      const blockCapitals = block.capitalsTaken || 0;
      let totalMoney = 0;
      let totalManpower = 0;
      let totalFood = 0;
      let totalSteel = 0;
      let totalFuel = 0;

      for (let day = 0; day < safeDays; day++) {
        const dayChangePct = day > 0 ? day * 5 : 0;
        const capitalPct = day > 0 ? blockCapitals * 10 : 0;
        const dailyMorale = Math.min(100, 70 + dayChangePct + capitalPct);
        const moraleDelta = dailyMorale - 70;

        totalMoney += v70.Money + moraleDelta * (v100.Money - v70.Money) / 30;
        totalManpower += v70.Manpower + moraleDelta * (v100.Manpower - v70.Manpower) / 30;
        totalFood += v70.Food + moraleDelta * (v100.Food - v70.Food) / 30;
        totalSteel += v70.Steel + moraleDelta * (v100.Steel - v70.Steel) / 30;
        totalFuel += v70.Fuel + moraleDelta * (v100.Fuel - v70.Fuel) / 30;
      }

      incomeMoney += totalMoney + (buffMoney * safeDays);
      incomeFood += totalFood + (buffFood * safeDays);
      incomeSteel += totalSteel + (buffSteel * safeDays);
      incomeFuel += totalFuel + (buffFuel * safeDays);

      const blockIncomeMP = totalManpower + (buffManpower * safeDays);
      const blockAvailMP = 12000 + blockIncomeMP;
      const blockName = countryObj
        ? (countryObj['Country Name'] || countryObj.Nation || `Block ${blockIdx + 1}`)
        : `Block ${blockIdx + 1}`;

      perBlockMP.push({ id: block.id, name: blockName, req: blockReqMP, avail: blockAvailMP });
    }
  });

  const availMoney = startMoney + incomeMoney;
  const availFood = startFood + incomeFood;
  const availSteel = startSteel + incomeSteel;
  const availFuel = startFuel + incomeFuel;

  return {
    totalReqMoney,
    totalReqFood,
    totalReqSteel,
    totalReqFuel,
    startMoney,
    startFood,
    startSteel,
    startFuel,
    incomeMoney,
    incomeFood,
    incomeSteel,
    incomeFuel,
    availMoney,
    availFood,
    availSteel,
    availFuel,
    perBlockMP,
  };
}
