import React, { useState, useEffect } from 'react';
import { listKeys, createKey, forceLogoutAll, getAdminStatus } from '../../services/api';

export function DeveloperBackdoor({ isOpen, onClose }) {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState({ key_name: '', secret: '', is_admin: false });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const isAdmin = getAdminStatus();

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadKeys();
    }
  }, [isOpen, isAdmin]);

  const loadKeys = async () => {
    try {
      const data = await listKeys();
      setKeys(data);
    } catch (err) {
      setError('Failed to load keys');
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      await createKey(newKey.key_name, newKey.secret, newKey.is_admin);
      setMsg(`Key ${newKey.key_name} created successfully!`);
      setNewKey({ key_name: '', secret: '', is_admin: false });
      loadKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForceLogout = async () => {
    if (!window.confirm("Are you sure you want to invalidate all active sessions globally?")) return;
    setMsg(''); setError('');
    try {
      const res = await forceLogoutAll();
      setMsg(res.message);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;
  if (!isAdmin) {
    return (
      <div className="discord-export-overlay" role="dialog" onClick={onClose}>
        <div className="discord-export-panel glass-panel" onClick={e => e.stopPropagation()} style={{maxWidth: '400px'}}>
          <div className="discord-export-header">
            <h2 style={{color:'var(--error)'}}>Access Denied</h2>
            <button className="toolbar-btn toolbar-btn-danger discord-export-close" onClick={onClose}>Close</button>
          </div>
          <p>You must be logged in as an administrator to view this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discord-export-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="discord-export-panel glass-panel" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', maxHeight:'80vh', overflowY:'auto'}}>
        <div className="discord-export-header">
          <h2 style={{color:'var(--accent)'}}>Developer Console</h2>
          <button className="toolbar-btn toolbar-btn-danger discord-export-close" onClick={onClose}>Close</button>
        </div>

        {msg && <div style={{color:'var(--success)', marginBottom:'1rem'}}>{msg}</div>}
        {error && <div style={{color:'var(--error)', marginBottom:'1rem'}}>{error}</div>}

        <div style={{marginBottom:'2rem'}}>
          <h3>Emergency Actions</h3>
          <button className="btn-add-item" style={{background:'var(--error)'}} onClick={handleForceLogout}>Force Logout All Users</button>
        </div>

        <div style={{marginBottom:'2rem'}}>
          <h3>Create New Key</h3>
          <form onSubmit={handleCreateKey} style={{display:'flex', gap:'0.5rem', alignItems:'flex-end', flexWrap:'wrap'}}>
            <div style={{display:'flex', flexDirection:'column', gap:'4px', flex:1}}>
              <label>Key Name</label>
              <input type="text" value={newKey.key_name} onChange={e => setNewKey({...newKey, key_name: e.target.value})} required style={{padding:'0.4rem', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.2)', color:'white'}} />
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'4px', flex:1}}>
              <label>Secret</label>
              <input type="text" value={newKey.secret} onChange={e => setNewKey({...newKey, secret: e.target.value})} required style={{padding:'0.4rem', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.2)', color:'white'}} />
            </div>
            <label style={{display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.4rem'}}>
              <input type="checkbox" checked={newKey.is_admin} onChange={e => setNewKey({...newKey, is_admin: e.target.checked})} />
              Is Admin
            </label>
            <button type="submit" className="btn-add-item" style={{marginBottom:'0.2rem'}}>Create</button>
          </form>
        </div>

        <div>
          <h3>Existing Keys</h3>
          <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.2)'}}>
                <th style={{padding:'0.5rem 0'}}>Name</th>
                <th style={{padding:'0.5rem 0'}}>Role</th>
                <th style={{padding:'0.5rem 0'}}>Created</th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={{borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                  <td style={{padding:'0.5rem 0'}}>{k.key_name}</td>
                  <td style={{padding:'0.5rem 0'}}>{k.is_admin ? <span style={{color:'var(--accent)'}}>Admin</span> : 'User'}</td>
                  <td style={{padding:'0.5rem 0'}}>{new Date(k.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
