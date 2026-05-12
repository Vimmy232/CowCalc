import React, { useState, useEffect } from 'react';
import { getMetaBuilds } from '../../services/api';

export function MetaBuildsModal({ isOpen, onClose, onImport }) {
  const [builds, setBuilds] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBuilds();
    }
  }, [isOpen]);

  const loadBuilds = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMetaBuilds();
      setBuilds(data);
    } catch (err) {
      setError('Failed to load meta builds.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="discord-export-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="discord-export-panel glass-panel" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', maxHeight:'80vh', overflowY:'auto'}}>
        <div className="discord-export-header">
          <h2 style={{color:'var(--accent)', margin:0}}>Pre-Built Meta Library</h2>
          <button className="toolbar-btn toolbar-btn-danger discord-export-close" onClick={onClose}>Close</button>
        </div>

        {error && <div style={{color:'var(--error)', marginBottom:'1rem'}}>{error}</div>}

        {loading ? (
          <p>Loading library...</p>
        ) : builds.length === 0 ? (
          <p>No meta builds available in the library yet.</p>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {builds.map(b => (
              <div key={b.id} style={{padding:'1rem', borderRadius:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem'}}>
                  <h3 style={{margin:0, fontSize:'1.1rem'}}>{b.title}</h3>
                  <button className="btn-add-item" style={{padding:'0.3rem 0.6rem', fontSize:'0.85rem'}} onClick={() => {
                    try {
                      // Attempt to import the generic plan_data
                      onImport(b.plan_data);
                      onClose();
                    } catch (e) {
                      alert('Failed to parse this build.');
                    }
                  }}>Import Build</button>
                </div>
                {b.description && <p style={{fontSize:'0.9rem', color:'var(--text-muted)', margin:0}}>{b.description}</p>}
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.5rem', opacity:0.6}}>
                  By {b.author || 'Admin'} • {new Date(b.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
