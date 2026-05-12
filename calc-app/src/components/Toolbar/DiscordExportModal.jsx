import React from 'react';
import { formatWhole } from '../../lib/cowcalcCore';

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

export const MemoDiscordExportModal = React.memo(DiscordExportModal);
