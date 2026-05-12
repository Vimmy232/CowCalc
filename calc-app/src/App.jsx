import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import {
  LS_KEY,
  buildDiscordPlanExport,
  loadSaved,
  parseSchemaRows,
  parseMapPayload,
} from './lib/cowcalcCore';
import { calculateGlobalFeasibility } from './lib/feasibility';
import { customSmoothScroll } from './utils';

import { ScrollTopButton } from './components/Common/ScrollTopButton';
import { MemoDiscordExportModal } from './components/Toolbar/DiscordExportModal';
import { Sidebar } from './components/Layout/Sidebar';
import { PlanEditor } from './components/PlanEditor/PlanEditor';

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

  const feasibilityProps = useMemo(() => calculateGlobalFeasibility({
    blocks,
    mapData,
    globalData,
    days,
  }), [blocks, mapData, globalData, days]);

  return (
    <div className="app-container">
      <PlanEditor
        globalData={globalData}
        selectedMap={selectedMap}
        setSelectedMap={setSelectedMap}
        mapData={mapData}
        days={days}
        setDays={setDays}
        blocks={blocks}
        setBlocks={setBlocks}
        setRestored={setRestored}
        updateBlock={updateBlock}
        removeBlock={removeBlock}
        addBlock={addBlock}
        countryCardRefs={countryCardRefs}
        newBlockId={newBlockId}
        savedIndicator={savedIndicator}
        openDiscordExport={openDiscordExport}
      />

      <Sidebar {...feasibilityProps} days={days} />

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
// Trigger new PR
