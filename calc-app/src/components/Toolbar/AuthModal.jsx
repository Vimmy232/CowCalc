import React, { useState } from 'react';
import { login, logout, getAuthToken, getAdminStatus } from '../../services/api';

export function AuthModal({ isOpen, onClose }) {
  const [keyName, setKeyName] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const isLogged = !!getAuthToken();
  const isAdmin = getAdminStatus();

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(keyName, secret);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="discord-export-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="discord-export-panel glass-panel" onClick={e => e.stopPropagation()} style={{maxWidth: '400px'}}>
        <div className="discord-export-header">
          <h2 style={{margin:0}}>Account Access</h2>
          <button className="toolbar-btn toolbar-btn-danger discord-export-close" onClick={onClose}>Close</button>
        </div>

        {isLogged ? (
          <div>
            <p>You are logged in.</p>
            {isAdmin && <p style={{color:'var(--accent)'}}>Admin access granted.</p>}
            <button className="btn-add-item" onClick={handleLogout} style={{width:'100%', marginTop:'1rem', background:'var(--error)'}}>Logout</button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {error && <div style={{color:'var(--error)', fontSize:'0.9rem'}}>{error}</div>}
            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
              <label>Project Key Name</label>
              <input type="text" value={keyName} onChange={e => setKeyName(e.target.value)} required style={{padding:'0.5rem', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.2)', color:'white'}} />
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
              <label>Secret</label>
              <input type="password" value={secret} onChange={e => setSecret(e.target.value)} required style={{padding:'0.5rem', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.2)', color:'white'}} />
            </div>
            <button type="submit" className="btn-add-item">Login</button>
          </form>
        )}
      </div>
    </div>
  );
}
