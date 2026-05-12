import React, { useState } from 'react';
import { ThemeToggleButton } from '../Theme/ThemeToggle.jsx';
import { AuthModal } from './AuthModal.jsx';
import { DeveloperBackdoor } from './DeveloperBackdoor.jsx';
import { MetaBuildsModal } from './MetaBuildsModal.jsx';
import { getAuthToken, getAdminStatus } from '../../services/api';

export function ToolbarButtons({
  selectedMap,
  days,
  blocks,
  setDays,
  setBlocks,
  setSelectedMap,
  setRestored,
  savedIndicator,
  openDiscordExport,
  createCompactPlan,
  clearSaved,
  hydrateBlocksFromCompactPlan,
  globalData
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  const isLogged = !!getAuthToken();
  const isAdmin = getAdminStatus();

  return (
    <div className="plan-toolbar">
      <span className="save-indicator" style={{opacity: savedIndicator ? 1 : 0}}>💾 Saved</span>

      <ThemeToggleButton />

      <button className="toolbar-btn toolbar-btn-discord" onClick={() => setAuthOpen(true)}>
        {isLogged ? 'Account' : 'Login'}
      </button>

      {isAdmin && (
        <button className="toolbar-btn toolbar-btn-danger" onClick={() => setDevOpen(true)}>
          Dev Console
        </button>
      )}

      {isLogged && (
        <button className="toolbar-btn toolbar-btn-primary" onClick={() => setMetaOpen(true)}>
          Meta Library
        </button>
      )}

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

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <DeveloperBackdoor isOpen={devOpen} onClose={() => setDevOpen(false)} />
      <MetaBuildsModal
        isOpen={metaOpen}
        onClose={() => setMetaOpen(false)}
        onImport={async (plan) => {
          if (!plan.selectedMap || !plan.blocks) { alert('Invalid plan data from database.'); return; }
          if (plan.format === 'compact' && parseInt(plan._version || 0) >= 2) {
            if (!globalData.buildingData?.length) {
              alert('Game data still loading. Please try again.');
              return;
            }
            const hydratedBlocks = await hydrateBlocksFromCompactPlan(plan, globalData);
            setRestored(false);
            setDays(plan.days || 1);
            setBlocks(hydratedBlocks || []);
            setSelectedMap(plan.selectedMap);
          } else {
            setRestored(false);
            setDays(plan.days || 1);
            setBlocks(plan.blocks || []);
            setSelectedMap(plan.selectedMap);
          }
        }}
      />
    </div>
  );
}
