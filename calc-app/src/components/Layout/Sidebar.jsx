import React from 'react';
import { formatWhole } from '../../lib/cowcalcCore';

export function Sidebar({
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
  days,
}) {
  const check = (req, av) => req <= av;

  return (
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

        {/* Per-country Manpower */}
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
  );
}
