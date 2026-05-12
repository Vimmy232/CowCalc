import React from 'react';
import { MemoCountryCard } from './CountryBlock/CountryCard.jsx';
import { ToolbarButtons } from "../Toolbar/ToolbarButtons.jsx";
import { createCompactPlan, clearSaved, hydrateBlocksFromCompactPlan } from '../../lib/cowcalcCore.js';

export function PlanEditor({
  globalData,
  selectedMap,
  setSelectedMap,
  mapData,
  days,
  setDays,
  blocks,
  setBlocks,
  setRestored,
  updateBlock,
  removeBlock,
  addBlock,
  countryCardRefs,
  newBlockId,
  savedIndicator,
  openDiscordExport,
}) {
  const sanitizePositiveIntInput = (value) => String(value || '').replace(/\D/g, '');

  return (
    <div className="main-section">

      {/* GLOBAL MAP SETTINGS */}
      <div className="glass-panel section-shell" style={{marginBottom: '2rem'}}>
        <div className="section-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem'}}>
          <h2 style={{margin:0}}>Global Game Core</h2>

          <ToolbarButtons
            selectedMap={selectedMap}
            days={days}
            blocks={blocks}
            setDays={setDays}
            setBlocks={setBlocks}
            setSelectedMap={setSelectedMap}
            setRestored={setRestored}
            savedIndicator={savedIndicator}
            openDiscordExport={openDiscordExport}
            createCompactPlan={createCompactPlan}
            clearSaved={clearSaved}
            hydrateBlocksFromCompactPlan={hydrateBlocksFromCompactPlan}
            globalData={globalData}
          />

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
  );
}
