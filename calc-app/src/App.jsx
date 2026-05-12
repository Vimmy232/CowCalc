import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import {
  FactionFiles,
  NO_UPGRADE_UNITS,
  UNIT_ABBREVIATIONS,
  EXCLUDED_ITEMS,
  BUILDING_ORDER,
  LS_KEY,
  sortByOrder,
  sortByUnitOrder,
  parseIntSafe,
  getUpgradeCostTier,
  getUpgradeCostSource,
  sortCartItems,
  formatWhole,
  formatDecimal,
  createCostBucket,
  addCost,
  addBuckets,
  getCurrentTimelineDay,
  getResearchUnlockDay,
  applyResearchPrerequisites,
  getUnitProductionPreview,
  buildDiscordPlanExport,
  loadSaved,
  clearSaved,
  createCompactPlan,
  hydrateBlocksFromCompactPlan,
  parseSchemaRows,
  parseMapPayload,
} from './lib/cowcalcCore';
import { calculateGlobalFeasibility } from './lib/feasibility';
import { customSmoothScroll } from './utils';

function ThemeToggleButton() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cowcalc_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cowcalc_theme', theme);
  }, [theme]);

  return (
    <button
      className="toolbar-btn toolbar-btn-theme"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      title="Toggle light/dark mode"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{display:'block'}}>
          <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{display:'block'}}>
          <path d="M12 7.93A5 5 0 016.07 2a5 5 0 100 10 5 5 0 005.93-4.07z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

function ScrollTopButton() {
  const [visible, setVisible] = useState(false);
  const frameRef = React.useRef(0);

  useEffect(() => {
    const updateVisibility = () => {
      frameRef.current = 0;
      const nextVisible = window.scrollY > 280;
      setVisible((currentVisible) => (currentVisible === nextVisible ? currentVisible : nextVisible));
    };

    const handleScroll = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(updateVisibility);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      className="scroll-top-btn"
      onClick={() => customSmoothScroll(0, 950)}
      aria-label="Move to top"
      title="Move to top"
    >
      ↑ Top
    </button>
  );
}

// Memoized Discord Export Modal - only re-renders when export data changes
function DiscordExportModal({ isOpen, discordExport, onClose, onCopy }) {
  if (!isOpen) return null;
  
  return (
    <div className="discord-export-overlay" role="dialog" aria-modal="true" aria-labelledby="discord-export-title" onClick={onClose}>
      <div className="discord-export-panel glass-panel" onClick={event => event.stopPropagation()}>
        <div className="discord-export-header">
          <div>
            <h2 id="discord-export-title" style={{ marginBottom: '0.35rem' }}>
              {discordExport ? discordExport.title : 'Preparing Discord export...'}
            </h2>
            <div className="cart-item-meta">
              {discordExport ? 'Combined export for all countries.' : 'Building export data from the current plan.'}
            </div>
          </div>
          <button className="toolbar-btn toolbar-btn-danger discord-export-close" onClick={onClose}>Close</button>
        </div>

        {!discordExport ? (
          <div className="discord-export-warning">
            Preparing export data. If this takes a moment, the plan is large.
          </div>
        ) : discordExport.warning ? (
          <div className="discord-export-warning">
            {discordExport.warning}
          </div>
        ) : null}

        {discordExport && (
          <div className="discord-export-parts">
            {discordExport.chunks.map((chunk, index) => (
              <div key={index} className="discord-export-part">
                <div className="discord-export-part-header">
                  <span>{discordExport.chunks.length > 1 ? `Combined Export (${formatWhole(index + 1)}/${formatWhole(discordExport.chunks.length)})` : 'Combined Export'}</span>
                  <div className="discord-export-part-meta">
                    {formatWhole(chunk.length)} / {formatWhole(discordExport.messageLimit)} chars
                  </div>
                  <button className="toolbar-btn toolbar-btn-discord discord-copy-btn" onClick={() => onCopy(chunk)}>Copy</button>
                </div>
                <textarea className="discord-export-textarea" readOnly value={chunk} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MemoDiscordExportModal = React.memo(DiscordExportModal);
const MemoCountryCard = React.memo(CountryCard);

// --- Country Block Component ---
function CountryCard({ block, blockIndex, updateBlock, removeBlock, globalData, mapData, days, isNew = false, cardRef = null }) {
  const [selectedType, setSelectedType] = useState('Unit');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedItemTier, setSelectedItemTier] = useState('');
  const [selectedItemCount, setSelectedItemCount] = useState('1');
  const [buffTarget, setBuffTarget] = useState('Steel');
  const [provinceLoc, setProvinceLoc] = useState('Core City');
  const [upgradeOnlyFromTier, setUpgradeOnlyFromTier] = useState(1);
  const [upgradeOnlyToTier, setUpgradeOnlyToTier] = useState(2);

  const sanitizeCountInput = (value) => String(value || '').replace(/\D/g, '');
  const sanitizeNonNegativeIntInput = (value) => String(value || '').replace(/\D/g, '');
  const sanitizeDiscordIdInput = (value) => String(value || '').replace(/\D/g, '');
  const parseCount = (value) => {
    const parsed = parseInt(sanitizeCountInput(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const countryObj = mapData && block.selectedCountryIdx >= 0 ? mapData.parsedRows[block.selectedCountryIdx] : null;
  const countryFaction = countryObj?.Faction || null;

  const requiresBuffTarget = selectedType === 'Building' && 
    (selectedItemName.includes('Industry') || selectedItemName.includes('Recruiting Station'));
  const currentTimelineDay = getCurrentTimelineDay(days);
  const getUnitTierUnlockDay = (unitName, tier) => {
    if (!unitName || !countryFaction) return 1;
    return getResearchUnlockDay(
      globalData.researchData,
      countryFaction,
      unitName,
      tier
    );
  };

  // Unique unit names ordered canonically; exclude no-upgrade units from UpgradeOnly
  const allUnitNames = sortByUnitOrder([...new Set(block.unitData.map(u => u.Name))]);
  const uniqueUnitNames = allUnitNames.filter(n => !NO_UPGRADE_UNITS.has(n));
  // Available tiers for selected unit in UpgradeOnly mode
  const tiersForUnit = useMemo(() => {
    const seen = new Set();
    return block.unitData
      .filter(u => u.Name === selectedItemName)
      .map(u => {
        const tier = parseIntSafe(u.Tier, 1);
        const availableDay = getUnitTierUnlockDay(selectedItemName, tier);
        return {
          tier,
          availableDay,
          disabled: availableDay > currentTimelineDay,
        };
      })
      .filter(entry => {
        if (seen.has(entry.tier)) return false;
        seen.add(entry.tier);
        return true;
      })
      .sort((a, b) => a.tier - b.tier);
  }, [block.unitData, selectedItemName, currentTimelineDay, getUnitTierUnlockDay]);

  useEffect(() => {
    if (selectedItemName.includes('Recruiting Station')) {
      setBuffTarget('Manpower');
    } else if (selectedItemName.includes('Industry')) {
      setBuffTarget('Steel');
    }
  }, [selectedItemName]);

  // Type select + item name row — units sorted by canonical order
  const currentList = (selectedType === 'Unit' ? block.unitData : (selectedType === 'Building' ? globalData.buildingData : []))
    .filter(i => !EXCLUDED_ITEMS.has(i.Name));

  const uniqueSelectableNames = selectedType === 'Unit'
    ? sortByUnitOrder([...new Set(currentList.map(i => i.Name))])
    : selectedType === 'Building'
    ? sortByOrder([...new Set(currentList.map(i => i.Name))], BUILDING_ORDER)
    : [...new Set(currentList.map(i => i.Name))];

  const selectedItemTierOptions = useMemo(() => {
    const seen = new Set();
    return currentList
      .filter(i => i.Name === selectedItemName)
      .map(i => {
        const tier = parseIntSafe(i.Tier, 1);
        const availableDay = selectedType === 'Unit'
          ? getUnitTierUnlockDay(selectedItemName, tier)
          : 1;
        return {
          tier,
          availableDay,
          disabled: selectedType === 'Unit' ? availableDay > currentTimelineDay : false,
        };
      })
      .filter(entry => {
        if (seen.has(entry.tier)) return false;
        seen.add(entry.tier);
        return true;
      })
      .sort((a, b) => a.tier - b.tier);
  }, [currentList, selectedItemName, selectedType, currentTimelineDay, getUnitTierUnlockDay]);

  useEffect(() => {
    if (selectedType === 'Unit' || selectedType === 'Building') {
      if (!selectedItemName || selectedItemTierOptions.length === 0) {
        setSelectedItemTier('');
        return;
      }

      const currentTier = parseIntSafe(selectedItemTier, -1);
      const currentOption = selectedItemTierOptions.find(option => option.tier === currentTier);
      if (currentOption && !currentOption.disabled) return;

      const preferredOption = selectedType === 'Unit'
        ? (selectedItemTierOptions.find(option => !option.disabled) || selectedItemTierOptions[0])
        : selectedItemTierOptions[0];

      if (preferredOption && currentTier !== preferredOption.tier) {
        setSelectedItemTier(String(preferredOption.tier));
      }
    } else {
      setSelectedItemTier('');
    }
  }, [selectedType, selectedItemName, selectedItemTier, selectedItemTierOptions]);

  useEffect(() => {
    if (selectedType !== 'UpgradeOnly') return;

    if (!selectedItemName || tiersForUnit.length === 0) {
      setUpgradeOnlyFromTier(1);
      setUpgradeOnlyToTier(2);
      return;
    }

    const unlockedTiers = tiersForUnit.filter(option => !option.disabled).map(option => option.tier);
    const currentFromTier = parseIntSafe(upgradeOnlyFromTier, 1);
    const currentFromOption = tiersForUnit.find(option => option.tier === currentFromTier);
    const preferredFromTier = currentFromOption && !currentFromOption.disabled
      ? currentFromTier
      : (unlockedTiers[0] || tiersForUnit[0].tier);

    if (preferredFromTier !== currentFromTier) {
      setUpgradeOnlyFromTier(preferredFromTier);
    }

    const currentToTier = parseIntSafe(upgradeOnlyToTier, preferredFromTier + 1);
    const currentToOption = tiersForUnit.find(option => option.tier === currentToTier);
    const preferredToTier = currentToOption && !currentToOption.disabled && currentToTier > preferredFromTier
      ? currentToTier
      : (tiersForUnit.find(option => option.tier > preferredFromTier && !option.disabled)?.tier || (preferredFromTier + 1));

    if (preferredToTier !== currentToTier) {
      setUpgradeOnlyToTier(preferredToTier);
    }
  }, [selectedType, selectedItemName, upgradeOnlyFromTier, upgradeOnlyToTier, tiersForUnit]);

  const shortenDisplay = (fullVal) => {
    if (!fullVal) return "";
    for (const [full, short] of Object.entries(UNIT_ABBREVIATIONS)) {
      if (fullVal.includes(full)) return fullVal.replace(full, short);
    }
    return fullVal;
  };

  const applyCartOrdering = (cart) => sortCartItems(cart, globalData.buildingData);
  const discordId = String(block.discordId || '').trim();
  const hasSelectedItem = selectedItemName !== '';
  const hasSelectedTier = selectedItemTier !== '';

  const handleCountryChange = (idx) => {
    if (idx === -1) {
      updateBlock(block.id, { selectedCountryIdx: -1, unitData: [], cart: [], capitalsTaken: 0 });
      return;
    }
    const cObj = mapData.parsedRows[idx];
    if (cObj && FactionFiles[cObj.Faction]) {
      fetch(`./data/${FactionFiles[cObj.Faction]}`)
        .then(res => res.json())
        .then(data => {
           let u = [];
           data.rows.forEach(r => {
              let obj = {};
              data.headers.forEach((h,i) => obj[h] = r[i]);
              obj._type = 'Unit';
              u.push(obj);
           });
           updateBlock(block.id, { selectedCountryIdx: idx, unitData: u, cart: [], capitalsTaken: block.capitalsTaken || 0 });
           setSelectedItemName('');
            setSelectedItemTier('');
        });
    } else {
      updateBlock(block.id, { selectedCountryIdx: idx, unitData: [], cart: [], capitalsTaken: 0 });
    }
  };

  const handleDiscordIdChange = (value) => {
    updateBlock(block.id, { discordId: sanitizeDiscordIdInput(value) });
  };

  const addToCart = () => {
    const itemCount = parseCount(selectedItemCount);
    if (!selectedItemName || itemCount < 1) return;

    if (selectedType === 'UpgradeOnly') {
      const toTier   = parseInt(upgradeOnlyToTier);
      const fromTier = parseInt(upgradeOnlyFromTier);
      if (toTier <= fromTier) return;
      if (getUnitTierUnlockDay(selectedItemName, fromTier) > currentTimelineDay) return;
      if (getUnitTierUnlockDay(selectedItemName, toTier) > currentTimelineDay) return;
      const targetObj = block.unitData.find(u => u.Name === selectedItemName && parseInt(u.Tier) === toTier);
      const prevObj = getUpgradeCostSource(block.unitData, selectedItemName, fromTier, toTier, targetObj);
      if (!targetObj) return;
      const newItem = {
        type: 'UpgradeOnly',
        obj: targetObj,   // toTier unit — used for Name / research lookup
        prevObj,          // costTier unit — used for 0.5x production cost
        fromTier,
        toTier,
        count: itemCount,
      };
      updateBlock(block.id, { cart: applyCartOrdering([...block.cart, newItem]) });
      setSelectedItemCount('1');
      return;
    }

    const list = selectedType === 'Unit' ? block.unitData : globalData.buildingData;
    const parsedTier = parseIntSafe(selectedItemTier, -1);
    if (parsedTier < 1) return;

    if (selectedType === 'Unit' && getUnitTierUnlockDay(selectedItemName, parsedTier) > currentTimelineDay) {
      return;
    }

    const itemObj = list.find(i => i.Name === selectedItemName && parseIntSafe(i.Tier, 1) === parsedTier);
    if (!itemObj) return;

    const isRc = itemObj.Name.includes('Recruiting Station');
    const isInd = itemObj.Name.includes('Industry');
    const boostVal = isRc ? itemObj['Manpower Boost (%)'] : (isInd ? itemObj['Resource Boost (%)'] : null);

    const newItem = { 
       type: selectedType, 
       obj: itemObj, 
       count: itemCount,
       buffTarget: isRc ? 'Manpower' : buffTarget,
       buffValue: boostVal,
       provinceType: isRc ? provinceLoc : null
    };

    if (selectedType === 'Building' || selectedType === 'Unit') {
      const existingIdx = block.cart.findIndex(c =>
        c.type === selectedType &&
        c.obj && c.obj.Name === newItem.obj.Name &&
        parseInt(c.obj.Tier || 1) === parseInt(newItem.obj.Tier || 1) &&
        (selectedType !== 'Building' || (
          (c.buffTarget || '') === (newItem.buffTarget || '') &&
          (c.provinceType || '') === (newItem.provinceType || '')
        ))
      );

      if (existingIdx !== -1) {
        const merged = [...block.cart];
        merged[existingIdx] = {
          ...merged[existingIdx],
          count: merged[existingIdx].count + itemCount,
        };
        updateBlock(block.id, { cart: applyCartOrdering(merged) });
        setSelectedItemCount('1');
        return;
      }
    }

    updateBlock(block.id, { cart: applyCartOrdering([...block.cart, newItem]) });
    setSelectedItemCount('1');
  };

  const removeFromCart = (idx) => {
    updateBlock(block.id, { cart: block.cart.filter((_, i) => i !== idx) });
  };

  const handleUpgrade = (idx, val) => {
    const newCart = [...block.cart];
    newCart[idx].upgradeTo = val;
    updateBlock(block.id, { cart: applyCartOrdering(newCart) });
  };

  const handleCartCountChange = (idx, value) => {
    const sanitized = sanitizeCountInput(value);
    const newCart = [...block.cart];
    newCart[idx] = {
      ...newCart[idx],
      count: sanitized === '' ? '' : parseInt(sanitized, 10),
    };
    updateBlock(block.id, { cart: applyCartOrdering(newCart) });
  };

  const handleCartLevelChange = (idx, value) => {
    const newTier = parseIntSafe(value, 0);
    if (newTier < 1) return;

    const newCart = [...block.cart];
    const item = newCart[idx];
    if (!item) return;

    if (item.type === 'Building') {
      const nextObj = globalData.buildingData.find(b =>
        b.Name === item.obj?.Name && parseIntSafe(b.Tier, 1) === newTier
      );
      if (!nextObj) return;

      const isRc = nextObj.Name.includes('Recruiting Station');
      const isInd = nextObj.Name.includes('Industry');
      const nextBuffVal = isRc
        ? nextObj['Manpower Boost (%)']
        : (isInd ? nextObj['Resource Boost (%)'] : item.buffValue);

      newCart[idx] = {
        ...item,
        obj: nextObj,
        buffValue: nextBuffVal,
      };
      updateBlock(block.id, { cart: applyCartOrdering(newCart) });
      return;
    }

    if (item.type === 'Unit') {
      const nextObj = block.unitData.find(u =>
        u.Name === item.obj?.Name && parseIntSafe(u.Tier, 1) === newTier
      );
      if (!nextObj) return;

      const existingUpgrade = parseIntSafe(item.upgradeTo, 0);
      newCart[idx] = {
        ...item,
        obj: nextObj,
        upgradeTo: existingUpgrade > newTier ? item.upgradeTo : undefined,
      };
      updateBlock(block.id, { cart: applyCartOrdering(newCart) });
      return;
    }

    if (item.type === 'UpgradeOnly') {
      const fromTier = parseIntSafe(item.fromTier, 1);
      const toTier = Math.max(fromTier + 1, newTier);
      const targetObj = block.unitData.find(u =>
        u.Name === item.obj?.Name && parseIntSafe(u.Tier, 1) === toTier
      );
      if (!targetObj) return;

      const prevObj = getUpgradeCostSource(block.unitData, item.obj?.Name, fromTier, toTier, targetObj);
      newCart[idx] = {
        ...item,
        obj: targetObj,
        prevObj,
        toTier,
      };
      updateBlock(block.id, { cart: applyCartOrdering(newCart) });
    }
  };

  const getItemTargetTier = (item) => {
    if (item.type === 'UpgradeOnly') return parseIntSafe(item.toTier, 1);
    if (item.type === 'Unit') return parseIntSafe(item.upgradeTo || item.obj?.Tier, 1);
    return parseIntSafe(item.obj?.Tier, 1);
  };

  const getUnitUnlockDay = (item) => {
    if (!item || item.type !== 'Unit' || !countryObj || !globalData.researchData || !Array.isArray(globalData.researchData)) return 1;
    const unitName = item.obj?.Name;
    if (!unitName) return 1;
    const unitTier = parseIntSafe(item.obj?.Tier, 1);
    const unlockResearch = globalData.researchData.find(r =>
      r && r.Name === unitName &&
      r.Faction === countryObj.Faction &&
      parseIntSafe(r.Tier, 1) === unitTier
    );
    return Math.max(1, parseIntSafe(unlockResearch?.['Day Available'], 1));
  };

  const calculateCartCosts = () => {
    const rows = block.cart.map(() => ({
      production: createCostBucket(),
      research: createCostBucket(),
      total: createCostBucket(),
      M: 0, P: 0, F: 0, S: 0, U: 0,
    }));

    const maxHours = days * 24;
    const isAlly = countryObj && countryObj.Faction === 'Ally';
    const mult = isAlly ? 0.8 : 1;

    // Production/building costs are row-local and scale with quantity.
    block.cart.forEach((c, idx) => {
      const qty = Math.max(1, parseIntSafe(c.count, 1));
      const p = rows[idx].production;

      if (c.type === 'Building') {
        const targetTier = parseIntSafe(c.obj?.Tier, 1);
        const isBuffBuilding = c.obj.Name.includes('Industry') || c.obj.Name.includes('Recruiting Station');
        let current_h = 0;

        for (let t = 1; t <= targetTier; t++) {
          const bItem = globalData.buildingData.find(b => b.Name === c.obj.Name && parseIntSafe(b.Tier, 1) === t);
          if (!bItem) continue;

          if (isBuffBuilding) {
            if (current_h >= maxHours) break;
            addCost(p, bItem, 1);
            current_h += parseFloat(bItem['Min Build Time (hrs)'] || 0);
          } else {
            addCost(p, bItem, 1);
          }
        }

        Object.keys(p).forEach(k => { p[k] *= qty; });
        return;
      }

      if (c.type === 'UpgradeOnly') {
        const costSrc = c.prevObj || getUpgradeCostSource(block.unitData, c.obj?.Name, c.fromTier, c.toTier, c.obj);
        if (costSrc) addCost(p, costSrc, 0.5 * mult);
        Object.keys(p).forEach(k => { p[k] *= qty; });
        return;
      }

      addCost(p, c.obj, 1);
      if (c.upgradeTo) {
        const fromTier = parseIntSafe(c.obj?.Tier, 1);
        const toTier = parseIntSafe(c.upgradeTo, fromTier);
        const fallbackTarget = block.unitData.find(u => u.Name === c.obj.Name && parseIntSafe(u.Tier, 1) === toTier);
        const costSrc = getUpgradeCostSource(block.unitData, c.obj.Name, fromTier, toTier, fallbackTarget);
        if (costSrc) addCost(p, costSrc, 0.5 * mult);
      }
      Object.keys(p).forEach(k => { p[k] *= qty; });
    });

    // Research costs follow the same max-tier + prerequisite logic as global feasibility.
    if (countryObj) {
      const maxTiers = {};
      const upgradeOnlyResearch = {};

      block.cart.forEach(c => {
        if (c.type === 'Unit' && c.obj && c.obj.Name) {
          const tier = getItemTargetTier(c);
          if (!maxTiers[c.obj.Name] || tier > maxTiers[c.obj.Name]) maxTiers[c.obj.Name] = tier;
        } else if (c.type === 'UpgradeOnly' && c.obj && c.obj.Name) {
          const to = parseIntSafe(c.toTier, 1);
          if (!upgradeOnlyResearch[c.obj.Name]) upgradeOnlyResearch[c.obj.Name] = { from: 0, to };
          else upgradeOnlyResearch[c.obj.Name].to = Math.max(upgradeOnlyResearch[c.obj.Name].to, to);
        }
      });

      Object.entries(upgradeOnlyResearch).forEach(([name, { to }]) => {
        if (!maxTiers[name] || maxTiers[name] < to) maxTiers[name] = to;
      });
      const maxTiersWithPrereqs = applyResearchPrerequisites(maxTiers);

      const firstUnitRow = block.cart.findIndex(c => c.type === 'Unit' || c.type === 'UpgradeOnly');
      const findOwnerRow = (name, tier) => {
        const idx = block.cart.findIndex(c =>
          (c.type === 'Unit' || c.type === 'UpgradeOnly') &&
          c.obj?.Name === name &&
          getItemTargetTier(c) >= tier
        );
        return idx >= 0 ? idx : firstUnitRow;
      };

      Object.entries(maxTiersWithPrereqs).forEach(([name, maxTier]) => {
        for (let t = 1; t <= maxTier; t++) {
          const rItem = globalData.researchData && globalData.researchData.find(r => r && r.Name === name && parseIntSafe(r.Tier, 1) === t && r.Faction === countryObj.Faction);
          if (!rItem) continue;
          const owner = findOwnerRow(name, t);
          if (owner >= 0 && owner < rows.length) addCost(rows[owner].research, rItem, mult);
        }
      });
    }

    rows.forEach((row) => {
      addBuckets(row.total, row.production);
      addBuckets(row.total, row.research);
      row.M = row.total.M;
      row.P = row.total.P;
      row.F = row.total.F;
      row.S = row.total.S;
      row.U = row.total.U;
    });

    return rows;
  };

  let cartCostRows = [];
  try {
    cartCostRows = calculateCartCosts();
  } catch (e) {
    console.error('[CowCalc] Error calculating cart costs:', e);
    cartCostRows = block.cart.map(() => ({
      production: createCostBucket(),
      research: createCostBucket(),
      total: createCostBucket(),
      M: 0, P: 0, F: 0, S: 0, U: 0,
    }));
  }
  const cartSubtotal = cartCostRows.reduce((acc, row) => {
    acc.M += row.M || 0;
    acc.P += row.P || 0;
    acc.F += row.F || 0;
    acc.S += row.S || 0;
    acc.U += row.U || 0;
    return acc;
  }, { M: 0, P: 0, F: 0, S: 0, U: 0 });

  return (
    <div ref={cardRef} className={`country-card${isNew ? ' country-card-enter' : ''}`}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h3 style={{fontSize: '1.2rem', margin: 0, color: 'var(--accent)'}}>
          Country {formatWhole(blockIndex + 1)} {countryObj ? `— ${countryObj.Nation} (${countryObj.Faction})` : ''}
        </h3>
        <button onClick={() => removeBlock(block.id)} className="btn-remove-block">Remove</button>
      </div>

      <div className="row" style={{marginTop: '1rem', alignItems: 'flex-end'}}>
        <div className="col" style={{flex: '2'}}>
          <label>Mapped Nation Selection</label>
          <select value={block.selectedCountryIdx} onChange={e => handleCountryChange(parseInt(e.target.value, 10))} disabled={!mapData}>
            <option value={-1}>-- Select A Country Internally --</option>
            {mapData?.parsedRows.map((r, i) => <option key={i} value={i}>{r.Nation} ({r.Faction})</option>)}
          </select>
        </div>
        <div className="col" style={{flex: '1'}}>
          <label>Discord User ID</label>
          <input
            type="text"
            inputMode="numeric"
            value={discordId}
            onChange={e => handleDiscordIdChange(e.target.value)}
            placeholder="123456789012345678"
            disabled={!mapData}
          />
        </div>
        <div className="col" style={{flex: '1'}}>
          <label>Capitals Taken</label>
          <input
            type="text"
            inputMode="numeric"
            value={String(block.capitalsTaken || 0)}
            onChange={e => {
              const sanitized = sanitizeNonNegativeIntInput(e.target.value);
              updateBlock(block.id, { capitalsTaken: sanitized === '' ? 0 : parseInt(sanitized, 10) });
            }}
            disabled={!countryObj}
          />
        </div>
      </div>

      {countryObj && (
        <div style={{marginTop: '0.5rem'}}>
          {selectedType === 'UpgradeOnly' ? (
            <div className="selection-box" style={{ padding: '0.8rem 1rem', marginBottom: '0.5rem' }}>
              {/* Row 1: Type + Unit Name */}
              <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.6rem'}}>
                <div style={{flex: '0 0 150px', display: 'flex', flexDirection: 'column', gap: '2px'}}>
                  <span className="add-field-label">Category</span>
                  <select className="mode-select" value={selectedType} onChange={e => { setSelectedType(e.target.value); setSelectedItemName(''); }} style={{marginBottom: 0}}>
                    <option value="Unit">Units</option>
                    <option value="Building">Buildings</option>
                    <option value="UpgradeOnly">Upgrade Only</option>
                  </select>
                </div>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '2px'}}>
                  <span className="add-field-label">Unit</span>
                  <div className="select-wrapper">
                    <select value={selectedItemName} onChange={e => { setSelectedItemName(e.target.value); setUpgradeOnlyFromTier(1); setUpgradeOnlyToTier(2); }} className={`custom-select ${selectedItemName === '' ? 'placeholder-active' : ''}`} style={{width: '100%', marginBottom: 0}}>
                      <option value="">-- Select Unit to Upgrade --</option>
                      {uniqueUnitNames.map((n,i) => <option key={i} value={n}>{n}</option>)}
                    </select>
                    <div className="select-display-overlay">
                      {shortenDisplay(selectedItemName) || "-- Unit Name --"}
                    </div>
                  </div>
                </div>
              </div>
              {/* Row 2: From → To + Qty + Add (no spacer — full width) */}
              <div style={{display: 'flex', gap: '0.75rem', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem'}}>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0}}>
                  <span className="add-field-label">From Level</span>
                  <div className="select-wrapper">
                    <select className="custom-select" value={upgradeOnlyFromTier} onChange={e => setUpgradeOnlyFromTier(parseInt(e.target.value))} style={{marginBottom: 0, width: '100%'}} disabled={!hasSelectedItem}>
                      {tiersForUnit.map(t => (
                        <option key={t.tier} value={t.tier} disabled={t.disabled}>
                          {formatWhole(t.tier)} {t.disabled ? `(Unlocks D${formatWhole(t.availableDay)})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="select-display-overlay">
                      {hasSelectedItem ? `Level ${formatWhole(upgradeOnlyFromTier)}` : '-'}
                    </div>
                  </div>
                </div>
                <span style={{color: 'var(--text-muted)', fontSize: '1.2rem', flexShrink: 0, paddingBottom: '4px'}}>→</span>
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0}}>
                  <span className="add-field-label">Upgrade To</span>
                  <div className="select-wrapper">
                    <select className="custom-select" value={upgradeOnlyToTier} onChange={e => setUpgradeOnlyToTier(parseInt(e.target.value))} style={{marginBottom: 0, width: '100%'}} disabled={!hasSelectedItem}>
                      {tiersForUnit.filter(t => t.tier > upgradeOnlyFromTier).map(t => (
                        <option key={t.tier} value={t.tier} disabled={t.disabled}>
                          {t.tier} {t.disabled ? `(Unlocks D${formatWhole(t.availableDay)})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="select-display-overlay">
                      {hasSelectedItem ? `Level ${formatWhole(upgradeOnlyToTier)}` : '-'}
                    </div>
                  </div>
                </div>
                <div style={{flex: '0.6', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <span className="add-field-label">Qty</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={selectedItemCount}
                    onChange={e => setSelectedItemCount(sanitizeCountInput(e.target.value))}
                    placeholder="1"
                    className="qty-input"
                    style={{ width: '100%' }}
                    disabled={!hasSelectedItem}
                  />
                </div>
                <div style={{flex: '0.6', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <span style={{fontSize: '0.7rem', color: 'transparent', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '0.05em'}}>_</span>
                  <button onClick={addToCart} className="btn-add-item" style={{ width: '100%' }} disabled={!hasSelectedItem}>Add</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="selection-box">
              <div className="add-controls-grid">
                <div className="add-field add-field-type">
                  <span className="add-field-label">Category</span>
                  <select className="mode-select" value={selectedType} onChange={e => { setSelectedType(e.target.value); setSelectedItemName(''); setSelectedItemTier(''); }}>
                    <option value="Unit">Units</option>
                    <option value="Building">Buildings</option>
                    <option value="UpgradeOnly">Upgrade Only</option>
                  </select>
                </div>
                <div className="add-field add-field-name">
                  <span className="add-field-label">{selectedType === 'Building' ? 'Building' : 'Unit'}</span>
                  <div className="select-wrapper">
                    <select value={selectedItemName} onChange={e => setSelectedItemName(e.target.value)} className={`custom-select ${selectedItemName === '' ? 'placeholder-active' : ''}`}>
                      <option value="">{selectedType === 'Building' ? '-- Building Name --' : '-- Unit Name --'}</option>
                      {uniqueSelectableNames.map((u, i) => <option key={i} value={u}>{u}</option>)}
                    </select>
                    <div className="select-display-overlay">
                      {shortenDisplay(selectedItemName) || (selectedType === 'Building' ? '-- Building Name --' : '-- Unit Name --')}
                    </div>
                  </div>
                </div>
                <div className="add-field add-field-level">
                  <span className="add-field-label">Level</span>
                  <div className="select-wrapper">
                    <select
                      className={`custom-select ${selectedItemTier === '' ? 'placeholder-active' : ''}`}
                      value={selectedItemTier}
                      onChange={e => setSelectedItemTier(e.target.value)}
                      disabled={!hasSelectedItem}
                    >
                      {selectedItemTierOptions.length === 0 ? (
                        <option value="">-</option>
                      ) : (
                        <>
                          <option value="">-</option>
                          {selectedItemTierOptions.map((tier) => (
                            <option key={tier.tier} value={String(tier.tier)} disabled={tier.disabled}>
                              Level {formatWhole(tier.tier)} {tier.disabled ? `(Unlocks D${formatWhole(tier.availableDay)})` : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <div className="select-display-overlay">
                      {selectedItemTier === '' ? '-' : `Level ${formatWhole(selectedItemTier)}`}
                    </div>
                  </div>
                </div>
                <div className="add-field add-field-qty">
                  <span className="add-field-label">Qty</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={selectedItemCount}
                    onChange={e => setSelectedItemCount(sanitizeCountInput(e.target.value))}
                    placeholder="Qty"
                    className="qty-input"
                    disabled={!hasSelectedItem}
                  />
                </div>
                <div className="add-field add-field-add">
                  <span className="add-field-label">Action</span>
                  <button onClick={addToCart} className="btn-add-item" disabled={!hasSelectedItem || !hasSelectedTier}>Add</button>
                </div>
              </div>
            </div>
          )}

          {requiresBuffTarget && (
             <div className="row" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
               <div className="col" style={{flex: '0.8', textAlign: 'right', paddingRight: '0.5rem'}}>
                 <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                   {selectedItemName.includes('Recruiting') ? "Province Location:" : "Target Resource:"}
                 </label>
               </div>
               <div className="col" style={{flex: '1.5'}}>
                 {selectedItemName.includes('Recruiting') ? (
                   <select value={provinceLoc} onChange={e => setProvinceLoc(e.target.value)} style={{marginBottom: 0}}>
                     <option value="Core City">Core City (600 Base)</option>
                     <option value="Normal Rural">Normal Rural (450 Base)</option>
                     <option value="Resource Rural">Resource Rural (150 Base)</option>
                   </select>
                 ) : (
                   <select value={buffTarget} onChange={e => setBuffTarget(e.target.value)} style={{marginBottom: 0}}>
                     <option value="Money">Money</option>
                     <option value="Food">Food</option>
                     <option value="Steel">Steel</option>
                     <option value="Fuel">Fuel</option>
                   </select>
                 )}
               </div>
               <div className="col" style={{flex: '0.9'}}></div>
             </div>
          )}
          
          <div className="cart-list" style={{marginTop: '1rem'}}>
             {block.cart.map((c, i) => {
                const cost = cartCostRows[i] || {
                  production: createCostBucket(),
                  research: createCostBucket(),
                  total: createCostBucket(),
                  M: 0, P: 0, F: 0, S: 0, U: 0,
                };
                let productionPreview = null;
                if (c.type === 'Unit' && c.obj && c.obj.Name) {
                  try {
                    productionPreview = getUnitProductionPreview(block, c, days, getUnitUnlockDay(c));
                  } catch (e) {
                    console.error('Error calculating production preview for', c.obj.Name, e);
                    productionPreview = null;
                  }
                }
                const upgradeOnlyCostTier = c.type === 'UpgradeOnly' ? getUpgradeCostTier(c.fromTier, c.toTier) : null;
                const unitUpgradeCostTier = c.type === 'Unit' && c.upgradeTo
                  ? getUpgradeCostTier(c.obj?.Tier, c.upgradeTo)
                  : null;
                const objName = c.obj?.Name;
                const editableLevelOptions = c.type === 'Building'
                  ? (objName ? globalData.buildingData
                    .filter(b => b.Name === objName)
                    .map(b => parseIntSafe(b.Tier, 1))
                    .sort((a, b) => a - b) : [])
                  : c.type === 'Unit'
                    ? (objName ? block.unitData
                      .filter(u => u.Name === objName)
                      .map(u => parseIntSafe(u.Tier, 1))
                      .sort((a, b) => a - b) : [])
                    : (objName ? block.unitData
                      .filter(u => u.Name === objName && parseIntSafe(u.Tier, 1) > parseIntSafe(c.fromTier, 1))
                      .map(u => parseIntSafe(u.Tier, 1))
                      .sort((a, b) => a - b) : []);
                return (
                <div key={i} className="cart-item" style={{ alignItems: 'flex-start' }}>
                  <div style={{flex: 1}}>
                    {c.type === 'UpgradeOnly' ? (
                      <>
                        <div className="cart-item-title" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                          <span>{c.obj.Name} — Upgrade Only</span>
                          <div className="inline-edit-row" aria-label="Upgrade item editors">
                            <div className="qty-inline-group" aria-label="Upgrade quantity editor">
                              <span className="qty-prefix">Units x</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={String(c.count)}
                                onChange={e => handleCartCountChange(i, e.target.value)}
                                className="qty-input qty-input-inline"
                                aria-label="Upgrade quantity"
                              />
                            </div>
                            <div className="qty-inline-group" aria-label="Upgrade level editor">
                              <span className="qty-prefix">Level:</span>
                              <select
                                value={String(parseIntSafe(c.toTier, 2))}
                                onChange={e => handleCartLevelChange(i, e.target.value)}
                                className="qty-input-inline inline-level-select"
                                aria-label="Upgrade level"
                              >
                                {editableLevelOptions.map((tier) => (
                                  <option key={tier} value={String(tier)}>{formatWhole(tier)}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="cart-item-meta">
                          L{c.fromTier} → L{c.toTier} • {(countryObj && countryObj.Faction === 'Ally') ? '0.4x' : '0.5x'} cost of L{formatWhole(upgradeOnlyCostTier || c.toTier)}
                          {(countryObj && countryObj.Faction === 'Ally') && <span style={{color:'var(--accent)',marginLeft:'4px'}}>✨ Allied -20%</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="cart-item-title" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                          <span>{c.obj.Name}</span>
                          <div className="inline-edit-row" aria-label="Item quantity and level editors">
                            <div className="qty-inline-group" aria-label="Item quantity editor">
                              <span className="qty-prefix">Units x</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={String(c.count)}
                                onChange={e => handleCartCountChange(i, e.target.value)}
                                className="qty-input qty-input-inline"
                                aria-label={c.type === 'Building' ? 'Building quantity' : 'Item quantity'}
                              />
                            </div>
                            <div className="qty-inline-group" aria-label="Item level editor">
                              <span className="qty-prefix">Level:</span>
                              <select
                                value={String(parseIntSafe(c.obj?.Tier, 1))}
                                onChange={e => handleCartLevelChange(i, e.target.value)}
                                className="qty-input-inline inline-level-select"
                                aria-label={c.type === 'Building' ? 'Building level' : 'Unit level'}
                              >
                                {editableLevelOptions.map((tier) => (
                                  <option key={tier} value={String(tier)}>{formatWhole(tier)}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        {c.buffTarget && c.buffValue && (
                          <div className="cart-item-meta" style={{display: 'flex', gap: '0.5rem'}}>
                            <span style={{color: 'var(--accent)'}}>[ Buffs {c.buffTarget} by {c.buffValue} {c.provinceType ? `| ${c.provinceType}` : ''} ]</span>
                          </div>
                        )}
                        {c.type === 'Unit' && c.obj && c.obj.Name && !NO_UPGRADE_UNITS.has(c.obj.Name) && (
                          <div style={{marginTop: '0.4rem'}}>
                            <select value={c.upgradeTo || ''} className={(c.upgradeTo || '') === '' ? 'placeholder-active' : ''} onChange={e => handleUpgrade(i, e.target.value)} style={{ fontSize: '0.8rem', padding: '0.2rem', minWidth: '150px' }}>
                              <option value="">-- No Upgrade --</option>
                              {globalData.researchData && Array.isArray(globalData.researchData) && globalData.researchData
                                .filter(r => r && r.Name === c.obj.Name && r.Faction === countryObj.Faction && parseInt(r.Tier) > parseInt(c.obj.Tier || 1))
                                .map(r => {
                                  const availableDay = parseInt(r['Day Available'] || 1);
                                  const disabled = availableDay > getCurrentTimelineDay(days);
                                  return <option key={String(r.Tier) + '_' + r.Name + '_' + r.Faction} value={r.Tier} disabled={disabled}>Upgrade to Level {formatWhole(r.Tier)} {disabled ? `(Unlocks D${formatWhole(availableDay)})` : ''}</option>;
                                })
                              }
                            </select>
                            {c.upgradeTo && <span style={{fontSize:'0.75rem',color:'var(--accent)',marginLeft:'0.5rem'}}>Base + Upgrade ({(countryObj && countryObj.Faction==='Ally')?'0.4x':'0.5x'} L{formatWhole(unitUpgradeCostTier || c.upgradeTo)})</span>}
                          </div>
                        )}
                        {c.type === 'Unit' && productionPreview && (
                          <div className={`production-preview ${productionPreview.available ? 'production-preview-ready' : 'production-preview-missing'}`}>
                            {productionPreview.available ? (
                              <>
                                <div className="production-preview-top">
                                  <strong>{productionPreview.buildingName}</strong>
                                  <span>{productionPreview.buildingSummary}</span>
                                </div>
                                <div className="production-preview-grid">
                                  <span>Rate: <strong>{formatDecimal(productionPreview.unitsPerDay, 2)}/day</strong></span>
                                  <span>Time/Unit: <strong>{formatDecimal(productionPreview.hoursPerUnit, 2)}h</strong></span>
                                  <span>Starts: <strong>D{formatWhole(productionPreview.unlockDay || 1)}</strong></span>
                                  <span>By D{formatWhole(productionPreview.productionDayCount)} start: <strong>{formatDecimal(productionPreview.cappedUnits, 2)} / {formatDecimal(productionPreview.requestedCount, 2)}</strong></span>
                                  <span>ETA: <strong>{formatDecimal(productionPreview.completionHours, 2)}h</strong> after start</span>
                                </div>
                              </>
                            ) : (
                              <span>Add <strong>{productionPreview.buildingName}</strong> to estimate output.</span>
                            )}
                          </div>
                        )}
                        <div className="unit-cost-breakdown">
                          <div className="cost-row">
                            <span>Production</span>
                            <div className="cost-row-values">
                              <span>💰 {formatWhole(cost.production.M)}</span>
                              <span>🧑 {formatWhole(cost.production.P)}</span>
                              <span>🌾 {formatWhole(cost.production.F)}</span>
                              <span>⚙️ {formatWhole(cost.production.S)}</span>
                              <span>⛽ {formatWhole(cost.production.U)}</span>
                            </div>
                          </div>
                          <div className="cost-row">
                            <span>Research</span>
                            <div className="cost-row-values">
                              <span>💰 {formatWhole(cost.research.M)}</span>
                              <span>🧑 0</span>
                              <span>🌾 {formatWhole(cost.research.F)}</span>
                              <span>⚙️ {formatWhole(cost.research.S)}</span>
                              <span>⛽ {formatWhole(cost.research.U)}</span>
                            </div>
                          </div>
                          <div className="cost-row cost-row-total">
                            <span>Total</span>
                            <div className="cost-row-values">
                              <span>💰 {formatWhole(cost.M)}</span>
                              <span>🧑 {formatWhole(cost.P)}</span>
                              <span>🌾 {formatWhole(cost.F)}</span>
                              <span>⚙️ {formatWhole(cost.S)}</span>
                              <span>⛽ {formatWhole(cost.U)}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    <div style={{marginTop:'0.5rem',fontSize:'0.75rem',color:'var(--text-muted)'}}>
                      {(countryObj&&countryObj.Faction==='Ally'&&(c.upgradeTo||c.type==='UpgradeOnly'))&&<span style={{color:'var(--accent)',marginLeft:'4px'}}>✨ (Allied -20%)</span>}
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(i)} className="btn-remove-item">X</button>
                </div>
             )})}
             {block.cart.length === 0 && <div className="cart-item-meta" style={{padding: '0.5rem 0'}}>No units/buildings queued.</div>}
             {block.cart.length > 0 && (
               <div className="cart-subtotal-row">
                 <span>Cart Subtotal</span>
                 <div className="cost-row-values">
                   <span>💰 {formatWhole(cartSubtotal.M)}</span>
                   <span>🧑 {formatWhole(cartSubtotal.P)}</span>
                   <span>🌾 {formatWhole(cartSubtotal.F)}</span>
                   <span>⚙️ {formatWhole(cartSubtotal.S)}</span>
                   <span>⛽ {formatWhole(cartSubtotal.U)}</span>
                 </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main App ---
function App() {
  const [globalData, setGlobalData] = useState({ mapsList: [], buildingData: [], researchData: [] });
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [discordExportOpen, setDiscordExportOpen] = useState(false);
  const [discordExportData, setDiscordExportData] = useState(null);
  const [copyNotification, setCopyNotification] = useState(false);

  // Lazy-initialise from localStorage if available
  const _saved = loadSaved();
  const [selectedMap, setSelectedMap] = useState(_saved?.selectedMap || '');
  const [mapData, setMapData] = useState(null);
  const [days, setDays] = useState(_saved?.days || 1);
  const [blocks, setBlocks] = useState(_saved?.blocks || []);
  const [_restored, setRestored] = useState(false); // gate to avoid overwriting on first map load
  const [newBlockId, setNewBlockId] = useState(null);
  const countryCardRefs = React.useRef({});
  const sanitizePositiveIntInput = (value) => String(value || '').replace(/\D/g, '');

  useEffect(() => {
    if (!newBlockId) return undefined;
    const el = countryCardRefs.current[newBlockId];
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.scrollY - 30;
      customSmoothScroll(topOffset, 950);
    }
    const t = setTimeout(() => setNewBlockId(null), 520);
    return () => clearTimeout(t);
  }, [blocks, newBlockId]);

  // Load globals once
  useEffect(() => {
    Promise.all([
      fetch('./maps_index.json').then(r => r.json()).catch(() => []),
      fetch('./data/Building_Stats.json').then(r => r.json()).catch(() => ({})),
      fetch('./data/Research_Stats.json').then(r => r.json()).catch(() => ({rows:[],headers:[]}))
    ]).then(([mapsList, bJson, rJson]) => {
      const buildingData = Object.values(bJson || {})
        .flatMap((schema) => parseSchemaRows(schema, 'Building'));
      const researchData = parseSchemaRows(rJson || { rows: [], headers: [] });

      setGlobalData({ mapsList: mapsList || [], buildingData, researchData });
    });
  }, []);

  useEffect(() => {
    if (!discordExportOpen) {
      setDiscordExportData(null);
    }
  }, [discordExportOpen]);

  useEffect(() => {
    if (!discordExportOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDiscordExportOpen(false);
      }
    };

    // Prevent body scroll when modal is open
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscrollBehavior;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [discordExportOpen]);

  // Auto-save to localStorage whenever relevant state changes
  useEffect(() => {
    if (!selectedMap) return; // don't save empty state
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ selectedMap, days, blocks }));
      setSavedIndicator(true);
      const t = setTimeout(() => setSavedIndicator(false), 1500);
      return () => clearTimeout(t);
    } catch { /* storage full */ }
  }, [selectedMap, days, blocks]);

  // When map changes, fetch map data; only reset blocks if this is a NEW map selection (not a restore)
  useEffect(() => {
    if (selectedMap) {
      fetch(`./maps/${selectedMap}`)
        .then(res => res.json())
        .then(data => {
           setMapData(parseMapPayload(data));
           // Only reset blocks if nothing was restored from storage
           setRestored(prev => {
             if (!prev) {
              setBlocks(b => b.length > 0 ? b : [{ id: Date.now(), selectedCountryIdx: -1, capitalsTaken: 0, discordId: '', unitData: [], cart: [] }]);
             }
             return true;
           });
        });
    } else {
      setMapData(null);
      setBlocks([]);
    }
  }, [selectedMap]);

  const updateBlock = useCallback((id, newProps) => {
    setBlocks((prevBlocks) => prevBlocks.map((block) => (block.id === id ? { ...block, ...newProps } : block)));
  }, []);

  const addBlock = () => {
    const id = Date.now();
    setBlocks((prevBlocks) => ([
      ...prevBlocks,
      { id, selectedCountryIdx: -1, capitalsTaken: 0, discordId: '', unitData: [], cart: [] },
    ]));
    setNewBlockId(id);
  };

  const removeBlock = useCallback((id) => {
    setBlocks((prevBlocks) => prevBlocks.filter((block) => block.id !== id));
  }, []);

  const openDiscordExport = useCallback(() => {
    console.log('[CowCalc] Opening Discord export...', { selectedMap, blocksCount: blocks.length, hasMapData: !!mapData });
    try {
      const exportData = buildDiscordPlanExport({ selectedMap, blocks, mapData });
      if (!exportData) throw new Error("Export returned no data");
      
      setDiscordExportData(exportData);
      setDiscordExportOpen(true);
    } catch (error) {
      console.error('[CowCalc] Discord export error:', error);
      setDiscordExportData({
        title: 'Export Failed',
        warning: error.message || 'Unknown error',
        messageLimit: 2000,
        chunks: ['Error during generation'],
        text: 'Error'
      });
      setDiscordExportOpen(true);
    }
  }, [selectedMap, blocks, mapData]);

  const copyDiscordText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(true);
      const t = setTimeout(() => setCopyNotification(false), 2000);
      return () => clearTimeout(t);
    } catch {
      alert('Could not copy to clipboard.');
    }
  };

  const closeDiscordExport = useCallback(() => {
    setDiscordExportOpen(false);
  }, []);
  const {
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
  } = useMemo(() => calculateGlobalFeasibility({
    blocks,
    mapData,
    globalData,
    days,
  }), [blocks, mapData, globalData, days]);

  const check = (req, av) => req <= av;

  return (
    <div className="app-container">
      <div className="main-section">
        
        {/* GLOBAL MAP SETTINGS */}
        <div className="glass-panel section-shell" style={{marginBottom: '2rem'}}>
          <div className="section-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem'}}>
            <h2 style={{margin:0}}>Global Game Core</h2>
            <div className="plan-toolbar">

              <span className="save-indicator" style={{opacity: savedIndicator ? 1 : 0}}>💾 Saved</span>

              <ThemeToggleButton />

              <button className="toolbar-btn toolbar-btn-primary" disabled={!selectedMap} onClick={() => {
                const plan = createCompactPlan(selectedMap, days, blocks);
                const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CowCalc_${selectedMap.replace('.json','')}.cowcalc.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}>↓ Export</button>

              <button className="toolbar-btn toolbar-btn-discord" disabled={!selectedMap} onClick={openDiscordExport}>Discord</button>

              <label className="toolbar-file-label">
                ↑ Import
                <input type="file" accept=".json,.cowcalc.json" style={{display:'none'}} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async ev => {
                    try {
                      const plan = JSON.parse(ev.target.result);
                      if (!plan.selectedMap || !plan.blocks) { alert('Invalid plan file.'); return; }

                      // New compact format: hydrate minimal cart references back into runtime objects.
                      if (plan.format === 'compact' && parseInt(plan._version || 0) >= 2) {
                        if (!globalData.buildingData?.length) {
                          alert('Game data still loading. Please try import again in a moment.');
                          return;
                        }
                        const hydratedBlocks = await hydrateBlocksFromCompactPlan(plan, globalData);
                        setRestored(false);
                        setDays(plan.days || 1);
                        setBlocks(hydratedBlocks || []);
                        setSelectedMap(plan.selectedMap);
                        return;
                      }

                      // Legacy format fallback (old exports with full runtime objects).
                      setRestored(false);
                      setDays(plan.days || 1);
                      setBlocks(plan.blocks || []);
                      setSelectedMap(plan.selectedMap);
                    } catch { alert('Could not read plan file.'); }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }} />
              </label>

              <button className="toolbar-btn toolbar-btn-danger" onClick={() => {
                if (window.confirm('Clear all saved data and reset?')) {
                  clearSaved(); setSelectedMap(''); setDays(1); setBlocks([]); setRestored(false);
                }
              }}>✕ Clear</button>

            </div>
          </div>
          <div className="row" style={{alignItems: 'flex-end'}}>
             <div className="col" style={{flex: '2'}}>
               <label>Scenario Map</label>
               <select value={selectedMap} className={selectedMap === '' ? 'placeholder-active' : ''} onChange={e => setSelectedMap(e.target.value)}>
                 <option value="">-- Set Global Map --</option>
                 {globalData.mapsList.map((m, i) => <option key={i} value={m}>{m.replace('.json', '').replace(/_/g, ' ')}</option>)}
               </select>
             </div>
             <div className="col" style={{flex: '1'}}>
               <label>Timeline Progress (Days Passed)</label>
               <input
                 type="text"
                 inputMode="numeric"
                 value={String(days)}
                 onChange={e => {
                   const sanitized = sanitizePositiveIntInput(e.target.value);
                   setDays(sanitized === '' ? 1 : Math.max(1, parseInt(sanitized, 10)));
                 }}
               />
             </div>
          </div>
        </div>

        {/* TEAM BLOCKS CONTAINER */}
        {mapData && (
          <div className="glass-panel section-shell">
            <div className="section-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: '1.5rem'}}>
              <h2>Team</h2>
              <button onClick={addBlock} className="btn-add-country" style={{width: 'auto'}}>+ Add Country to Team</button>
            </div>

            {blocks.map((b, i) => (
            <MemoCountryCard 
              key={b.id} 
              blockIndex={i} 
              block={b} 
              updateBlock={updateBlock} 
              removeBlock={removeBlock} 
              globalData={globalData} 
              mapData={mapData}
              days={days}
              isNew={b.id === newBlockId}
              cardRef={(el) => {
                if (el) countryCardRefs.current[b.id] = el;
              }}
            />
            ))}
          </div>
        )}
      </div>

      <div className="sidebar">
        <div className="glass-panel section-shell global-feasibility-panel">
          <h2>Global Team Feasibility</h2>
           <p className="cart-item-meta feasibility-description" style={{marginBottom: '1rem'}}>
             Includes base initial pools (15k rss/80k cash) plus {days} days of aggregate country-wide production natively factoring specific morale scaling per Country, not including unit upkeep.
          </p>
          
          <div className="resource-grid" style={{marginTop: '1.5rem'}}>
            <div className="resource-card">
               <div>Money</div>
               <div className={`resource-amount ${check(totalReqMoney, availMoney) ? 'positive' : 'negative'}`}>
                 {check(totalReqMoney, availMoney) ? "+" : ""}{formatWhole(availMoney - totalReqMoney)}
               </div>
               <div className="cart-item-meta">Start: {formatWhole(startMoney)}</div>
               <div className="cart-item-meta">Income: +{formatWhole(incomeMoney)}</div>
               <div className="cart-item-meta" style={{marginTop: '0.2rem', paddingTop:'0.2rem'}}>Req: {formatWhole(totalReqMoney)}</div>
            </div>
            <div className="resource-card">
               <div>Food</div>
               <div className={`resource-amount ${check(totalReqFood, availFood) ? 'positive' : 'negative'}`}>
                 {check(totalReqFood, availFood) ? "+" : ""}{formatWhole(availFood - totalReqFood)}
               </div>
               <div className="cart-item-meta">Start: {formatWhole(startFood)}</div>
               <div className="cart-item-meta">Income: +{formatWhole(incomeFood)}</div>
               <div className="cart-item-meta" style={{marginTop: '0.2rem', paddingTop:'0.2rem'}}>Req: {formatWhole(totalReqFood)}</div>
            </div>
            <div className="resource-card">
               <div>Steel</div>
               <div className={`resource-amount ${check(totalReqSteel, availSteel) ? 'positive' : 'negative'}`}>
                 {check(totalReqSteel, availSteel) ? "+" : ""}{formatWhole(availSteel - totalReqSteel)}
               </div>
               <div className="cart-item-meta">Start: {formatWhole(startSteel)}</div>
               <div className="cart-item-meta">Income: +{formatWhole(incomeSteel)}</div>
               <div className="cart-item-meta" style={{marginTop: '0.2rem', paddingTop:'0.2rem'}}>Req: {formatWhole(totalReqSteel)}</div>
            </div>
            <div className="resource-card">
               <div>Fuel</div>
               <div className={`resource-amount ${check(totalReqFuel, availFuel) ? 'positive' : 'negative'}`}>
                 {check(totalReqFuel, availFuel) ? "+" : ""}{formatWhole(availFuel - totalReqFuel)}
               </div>
               <div className="cart-item-meta">Start: {formatWhole(startFuel)}</div>
               <div className="cart-item-meta">Income: +{formatWhole(incomeFuel)}</div>
               <div className="cart-item-meta" style={{marginTop: '0.2rem', paddingTop:'0.2rem'}}>Req: {formatWhole(totalReqFuel)}</div>
            </div>
          </div>

          {/* Per-country Manpower — not shared, must be feasible individually */}
          {perBlockMP.length > 0 && (
            <div style={{marginTop: '1.5rem'}}>
              <div className="manpower-section-heading" style={{marginBottom:'0.75rem', textAlign: 'center'}}>
                Manpower — per country
              </div>
              <div className="manpower-section-note" style={{fontSize:'0.72rem', marginBottom:'0.75rem', fontStyle:'italic', textAlign: 'center'}}>
                Manpower is not shared. Each country must be self-sufficient.
              </div>
              {perBlockMP.map(bp => {
                const surplus = bp.avail - bp.req;
                const ok = surplus >= 0;
                const percentage = bp.avail > 0 ? Math.max(0, Math.min(100, (surplus / bp.avail) * 100)) : 0;
                
                return (
                  <div key={bp.id} className="manpower-card" style={{
                    padding: '0.85rem', 
                    marginBottom: '0.75rem', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="manpower-country-name" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{bp.name}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: ok ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center' }}>
                        {ok ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{marginRight:'4px',flexShrink:0,display:'inline-block',verticalAlign:'middle'}}>
                            <circle cx="6" cy="6" r="5.5" stroke="#4ade80" strokeWidth="1"/>
                            <path d="M3.5 6l1.8 1.8 3.2-3.2" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{marginRight:'4px',flexShrink:0,display:'inline-block',verticalAlign:'middle'}}>
                            <path d="M6 1.5L11 10.5H1L6 1.5Z" stroke="#f87171" strokeWidth="1" strokeLinejoin="round"/>
                            <path d="M6 5v2.5" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round"/>
                            <circle cx="6" cy="9" r="0.6" fill="#f87171"/>
                          </svg>
                        )}
                        {ok ? '+' : ''}{formatWhole(surplus)}
                      </span>
                    </div>
                    
                    {/* Progress Bar Container */}
                    <div className={ok ? 'manpower-progress-track' : 'manpower-progress-track manpower-progress-track-negative'} style={{ height: '6px', width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', 
                        width: `${percentage}%`, 
                        background: ok ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `0 0 8px ${ok ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      <span>{formatWhole(surplus)} / {formatWhole(bp.avail)} <span style={{fontSize: '0.65rem', opacity: 0.7}}>MP</span></span>
                      <span>{formatWhole(percentage)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ScrollTopButton />

      {copyNotification && (
        <div className="copy-notification">
          ✓ Copied to clipboard
        </div>
      )}

      <MemoDiscordExportModal 
        isOpen={discordExportOpen}
        discordExport={discordExportData} 
        onClose={closeDiscordExport}
        onCopy={copyDiscordText}
      />
    </div>
  );
}

export default App;
