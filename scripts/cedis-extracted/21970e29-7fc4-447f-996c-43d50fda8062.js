// CEDIS Lerma — Occupancy Dashboard
// Computes per-location occupancy metrics and renders the "Ocupación" tab.
//
// Data source contract:
//   Today: deterministic simulation seeded by location id (ubicacion).
//   Prod:  replace `getOccupancy(loc)` with a fetch from window.__OCC__[loc.ubicacion]
//          populated by the Extensiv sync job (see integration.html).

const { useMemo: useMemoOcc, useState: useStateOcc, useEffect: useEffectOcc } = React;

// ---- Deterministic pseudo-random, seeded by string ----
function occHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

// Compute realistic occupancy pattern:
// - Pickline generally higher occupancy (65-95%)
// - Storage more spread (30-95%)
// - Staging variable (10-80%)
// - Inactiva = 0
// - Fila 1-15 (close to shipping) tends fuller
function computeOccupancy(loc) {
  // Allow live override
  if (typeof window !== 'undefined' && window.__OCC__ && window.__OCC__[loc.ubicacion] != null) {
    return Math.max(0, Math.min(1, window.__OCC__[loc.ubicacion]));
  }
  if (loc.estatus === 'Inactiva') return 0;
  const h = occHash(loc.ubicacion);
  let base;
  if (loc.tipo === 'Pickline') base = 0.65 + h * 0.30;
  else if (loc.tipo === 'Storage location') base = 0.30 + h * 0.65;
  else if (loc.tipo === 'Staging location') base = 0.10 + h * 0.70;
  else if (loc.tipo === 'Put-away') base = 0.20 + h * 0.50;
  else base = 0.4;
  // Proximity bonus: low fila numbers (closer to shipping) tend fuller
  const fila = Number(loc.fila) || 30;
  if (!isNaN(fila)) {
    const proximity = Math.max(0, 1 - fila / 62);
    base = base + proximity * 0.08;
  }
  // Nivel effect: nivel 1-2 (pickline levels) fuller
  const n = Number(loc.nivel);
  if (n === 1 || n === 2) base += 0.05;
  if (n === 5) base -= 0.07;
  return Math.max(0.02, Math.min(0.99, base));
}

function occColor(pct) {
  // 0 → empty green, 1 → red
  if (pct === 0) return '#e6ece8';
  if (pct < 0.35) return '#a8c2bb';
  if (pct < 0.60) return '#f0c674';
  if (pct < 0.85) return '#d88040';
  return '#c8373c';
}
function occTextColor(pct) {
  return pct < 0.35 ? '#2b3646' : '#fff';
}
function pctClass(p) {
  if (p >= 0.90) return 'full';
  if (p >= 0.75) return 'high';
  if (p >= 0.45) return 'mid';
  return 'low';
}

// ---- Sparkline ----
function Spark({ points, color = 'var(--brand)', w = 80, h = 24 }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function OccupancyDashboard({ data, index, kpi }) {
  // "Live" timestamp that ticks to show the dashboard is connected
  const [tick, setTick] = useStateOcc(0);
  useEffectOcc(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const now = new Date();
  const timeLabel = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  // ---- Aggregate metrics ----
  const agg = useMemoOcc(() => {
    if (!data) return null;
    const active = data.filter(d => d.estatus !== 'Inactiva');
    let sum = 0, count = 0, full = 0, critical = 0;
    const byRack = {};
    const byPhase = { F1: {sum:0,n:0,racks:['A','B','C']}, F2: {sum:0,n:0,racks:['D','E']}, F3: {sum:0,n:0,racks:['F','G','H']} };
    const byLevel = {1:{sum:0,n:0},2:{sum:0,n:0},3:{sum:0,n:0},4:{sum:0,n:0},5:{sum:0,n:0}};
    const byType = { Pickline:{sum:0,n:0}, 'Storage location':{sum:0,n:0}, 'Staging location':{sum:0,n:0}, 'Put-away':{sum:0,n:0} };
    // matrix[rack][nivel] = {sum, n}
    const matrix = {};
    // Top locations list
    const topLocs = [];

    for (const d of active) {
      const p = computeOccupancy(d);
      sum += p; count++;
      if (p >= 0.95) full++;
      if (p >= 0.90) critical++;
      const rack = d.pasillo;
      if (!byRack[rack]) byRack[rack] = { sum:0, n:0, full:0, crit:0 };
      byRack[rack].sum += p; byRack[rack].n++;
      if (p >= 0.95) byRack[rack].full++;
      if (p >= 0.90) byRack[rack].crit++;

      // Phase
      for (const ph of Object.keys(byPhase)) {
        if (byPhase[ph].racks.includes(rack)) {
          byPhase[ph].sum += p; byPhase[ph].n++;
        }
      }
      // Level
      const nv = Number(d.nivel);
      if (byLevel[nv]) { byLevel[nv].sum += p; byLevel[nv].n++; }
      // Type
      if (byType[d.tipo]) { byType[d.tipo].sum += p; byType[d.tipo].n++; }
      // Matrix
      if (['A','B','C','D','E','F','G','H'].includes(rack) && nv >= 1 && nv <= 5) {
        if (!matrix[rack]) matrix[rack] = {};
        if (!matrix[rack][nv]) matrix[rack][nv] = { sum:0, n:0 };
        matrix[rack][nv].sum += p;
        matrix[rack][nv].n++;
      }
      topLocs.push({ loc: d, pct: p });
    }

    topLocs.sort((a,b) => b.pct - a.pct);

    // Dedupe by ubicacion (Costilla/Pasillo share labels across nivel/fila)
    const dedupe = (arr) => {
      const seen = new Set(); const out = [];
      for (const it of arr) {
        if (seen.has(it.loc.ubicacion)) continue;
        seen.add(it.loc.ubicacion); out.push(it);
        if (out.length >= 8) break;
      }
      return out;
    };
    const leastSorted = [...topLocs].sort((a,b)=>a.pct-b.pct);

    return {
      overall: sum / count,
      totalActive: count,
      totalInactive: kpi.inactivas,
      fullCount: full,
      criticalCount: critical,
      byRack, byPhase, byLevel, byType, matrix,
      topLocs: dedupe(topLocs),
      leastLocs: dedupe(leastSorted),
    };
  }, [data, kpi]);

  // Fake 14-day trend per rack (deterministic from rack id + tick jitter)
  const trends = useMemoOcc(() => {
    const t = {};
    for (const r of ['A','B','C','D','E','F','G','H']) {
      const arr = [];
      for (let i = 0; i < 14; i++) {
        const seed = occHash(r + '_d' + i);
        const base = agg ? agg.byRack[r]?.sum / (agg.byRack[r]?.n || 1) : 0.6;
        arr.push(Math.max(0.15, Math.min(0.98, base - 0.1 + seed * 0.2)));
      }
      t[r] = arr;
    }
    return t;
  }, [agg]);

  if (!agg) return <div style={{padding:20, color:'var(--ink-3)'}}>Cargando ocupación…</div>;

  const freeSpots = agg.totalActive - Math.round(agg.overall * agg.totalActive);

  return (
    <div className="dash-grid">

      {/* ====== HEADER BAR ====== */}
      <div className="dash-card span-12" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px'}}>
        <div>
          <div className="mono" style={{fontSize:10,letterSpacing:'.16em',color:'var(--ink-4)',textTransform:'uppercase',fontWeight:600}}>DASHBOARD DE OCUPACIÓN · TIEMPO REAL</div>
          <div style={{fontSize:18, fontWeight:600, letterSpacing:'-.02em', color:'var(--ink)', marginTop:4}}>
            Bodega 1 — Estado operativo
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          <div className="live-dot">EN VIVO</div>
          <div style={{fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--ink-3)'}}>
            Actualizado {timeLabel} · Fuente: <span style={{color:'var(--brand)', fontWeight:600}}>Extensiv API</span>
          </div>
        </div>
      </div>

      {/* ====== BIG KPI ROW ====== */}
      <div className="kpi-tile brand span-3">
        <div className="kpi-label">Ocupación global</div>
        <div className="kpi-value">{(agg.overall * 100).toFixed(1)}<span className="unit">%</span></div>
        <div className="kpi-foot"><span>{Math.round(agg.overall * agg.totalActive).toLocaleString('es-MX')} de {agg.totalActive.toLocaleString('es-MX')} posiciones</span></div>
        <Spark points={[0.62,0.64,0.63,0.67,0.70,0.71,0.72,0.74,0.76,0.77,0.78,0.80,0.79,agg.overall]} color="rgba(255,255,255,.7)" w={88} h={28}/>
      </div>
      <div className="kpi-tile span-3">
        <div className="kpi-label">Espacios libres</div>
        <div className="kpi-value" style={{color:'var(--ok)'}}>{freeSpots.toLocaleString('es-MX')}</div>
        <div className="kpi-foot"><span className="up">▲</span> capacidad disponible para recibir</div>
      </div>
      <div className="kpi-tile span-3">
        <div className="kpi-label">Posiciones saturadas</div>
        <div className="kpi-value" style={{color:'var(--brand-red)'}}>{agg.fullCount.toLocaleString('es-MX')}</div>
        <div className="kpi-foot"><span className="down">●</span> ≥95% ocupación · requieren rotación</div>
      </div>
      <div className="kpi-tile span-3">
        <div className="kpi-label">En estado crítico</div>
        <div className="kpi-value" style={{color:'var(--staging)'}}>{agg.criticalCount.toLocaleString('es-MX')}</div>
        <div className="kpi-foot">≥90% · revisar en próximo turno</div>
      </div>

      {/* ====== HEATMAP MATRIX: Racks × Niveles ====== */}
      <div className="dash-card span-8">
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
          <h3>Matriz de ocupación · Racks × Niveles</h3>
          <div className="grad-legend">
            <span>0%</span>
            <div className="bar"></div>
            <span>100%</span>
          </div>
        </div>
        <div className="sub">Porcentaje medio por nivel físico en cada rack · hover para detalle</div>
        <div className="matrix" style={{gridTemplateColumns: '48px repeat(8, 1fr)'}}>
          {/* Header row */}
          <div className="m-cell head"></div>
          {['A','B','C','D','E','F','G','H'].map(r => (
            <div key={'h'+r} className="m-cell head">Rack {r}</div>
          ))}
          {/* Rows: nivel 5 at top, nivel 1 at bottom */}
          {[5,4,3,2,1].map(nv => (
            <React.Fragment key={nv}>
              <div className="m-cell head" style={{justifyContent:'flex-end', paddingRight:8}}>N{nv}</div>
              {['A','B','C','D','E','F','G','H'].map(r => {
                const cell = agg.matrix[r]?.[nv];
                if (!cell) return <div key={r+nv} className="m-cell" style={{background:'#f4f5f7'}}></div>;
                const avg = cell.sum / cell.n;
                return (
                  <div key={r+nv} className="m-cell"
                    style={{background:occColor(avg), color:occTextColor(avg)}}
                    title={`Rack ${r} · Nivel ${nv}\n${(avg*100).toFixed(0)}% ocupación\n${cell.n} posiciones`}>
                    <div className="mc-pct">{(avg*100).toFixed(0)}%</div>
                    <div className="mc-fr">{cell.n} pos</div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ====== OCCUPANCY BY TYPE (DONUT-ISH) ====== */}
      <div className="dash-card span-4">
        <h3>Por tipo de ubicación</h3>
        <div className="sub">Ocupación promedio</div>
        {Object.entries(agg.byType).filter(([k,v])=>v.n>0).map(([tipo, v]) => {
          const pct = v.sum / v.n;
          const color = tipo==='Pickline' ? 'var(--brand)' :
                        tipo==='Storage location' ? 'var(--storage)' :
                        tipo==='Staging location' ? 'var(--staging)' :
                        'var(--putaway)';
          const cls = tipo==='Pickline' ? '' :
                      tipo==='Storage location' ? 'steel' :
                      tipo==='Staging location' ? 'amber' : 'red';
          return (
            <div className="bar-row" key={tipo}>
              <div className="bar-label" style={{fontSize:11}}>{tipo.replace(' location','')}</div>
              <div className="bar-track"><div className={'bar-fill '+cls} style={{width:(pct*100)+'%', background:color}}></div></div>
              <div className="bar-val">{(pct*100).toFixed(0)}%</div>
            </div>
          );
        })}
      </div>

      {/* ====== BY RACK ====== */}
      <div className="dash-card span-6">
        <h3>Ocupación por rack</h3>
        <div className="sub">Promedio de los 5 niveles</div>
        {['A','B','C','D','E','F','G','H'].map(r => {
          const v = agg.byRack[r];
          if (!v) return null;
          const pct = v.sum / v.n;
          const ph = r==='A'||r==='B'||r==='C' ? 'var(--brand)' : r==='D'||r==='E' ? 'var(--ok)' : 'var(--brand-red)';
          return (
            <div className="bar-row" key={r}>
              <div className="bar-label">Rack {r}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:(pct*100)+'%', background:ph}}></div></div>
              <div className="bar-val">{(pct*100).toFixed(0)}%</div>
            </div>
          );
        })}
      </div>

      {/* ====== BY PHASE + BY LEVEL ====== */}
      <div className="dash-card span-3">
        <h3>Por fase</h3>
        <div className="sub">Agrupada por racks</div>
        {Object.entries(agg.byPhase).map(([id, v]) => {
          if (v.n === 0) return null;
          const pct = v.sum / v.n;
          const color = id==='F1'?'var(--brand)':id==='F2'?'var(--ok)':'var(--brand-red)';
          const label = id==='F1'?'Fase 1 · ABC':id==='F2'?'Fase 2 · DE':'Fase 3 · FGH';
          return (
            <div key={id} style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
                <span style={{fontSize:11, fontWeight:600, color:'var(--ink-2)'}}>{label}</span>
                <span className="mono" style={{fontSize:14, fontWeight:600, color:color}}>{(pct*100).toFixed(0)}%</span>
              </div>
              <div className="bar-track" style={{height:8}}><div className="bar-fill" style={{width:(pct*100)+'%', background:color, height:'100%'}}></div></div>
              <div className="mono" style={{fontSize:10, color:'var(--ink-4)', marginTop:3}}>{v.n.toLocaleString('es-MX')} posiciones</div>
            </div>
          );
        })}
      </div>

      <div className="dash-card span-3">
        <h3>Por nivel físico</h3>
        <div className="sub">Altura de rack (1 = piso)</div>
        {[1,2,3,4,5].map(nv => {
          const v = agg.byLevel[nv];
          if (!v || v.n === 0) return null;
          const pct = v.sum / v.n;
          return (
            <div className="bar-row" key={nv} style={{gridTemplateColumns:'42px 1fr 46px'}}>
              <div className="bar-label">N{nv}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:(pct*100)+'%', background:'var(--brand)'}}></div></div>
              <div className="bar-val">{(pct*100).toFixed(0)}%</div>
            </div>
          );
        })}
      </div>

      {/* ====== TOP LISTS ====== */}
      <div className="dash-card span-6">
        <h3>Posiciones más saturadas</h3>
        <div className="sub">Candidatas a rotación / reubicación</div>
        <div className="list-rows">
          {agg.topLocs.map(({loc, pct}, i) => (
            <div className="list-row" key={`${loc.ubicacion}-${i}`}>
              <div>
                <div className="nm">{loc.ubicacion}</div>
                <div className="meta">{loc.tipo} · Rack {loc.pasillo} · N{loc.nivel} · Fila {loc.fila}</div>
              </div>
              <div className="bar-track" style={{width:100, height:6}}>
                <div className="bar-fill" style={{width:(pct*100)+'%', background:occColor(pct)}}></div>
              </div>
              <div className={'pct ' + pctClass(pct)}>{(pct*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-card span-6">
        <h3>Posiciones con más capacidad libre</h3>
        <div className="sub">Destinos preferentes para put-away</div>
        <div className="list-rows">
          {agg.leastLocs.map(({loc, pct}, i) => (
            <div className="list-row" key={`${loc.ubicacion}-${i}`}>
              <div>
                <div className="nm">{loc.ubicacion}</div>
                <div className="meta">{loc.tipo} · Rack {loc.pasillo} · N{loc.nivel} · Fila {loc.fila}</div>
              </div>
              <div className="bar-track" style={{width:100, height:6}}>
                <div className="bar-fill" style={{width:(pct*100)+'%', background:occColor(pct)}}></div>
              </div>
              <div className={'pct ' + pctClass(pct)}>{(pct*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== TREND SPARKLINES ====== */}
      <div className="dash-card span-12">
        <h3>Tendencia 14 días · ocupación diaria por rack</h3>
        <div className="sub">Cada mini-gráfico representa una serie temporal · línea = ocupación % diaria</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:14, marginTop:10}}>
          {['A','B','C','D','E','F','G','H'].map(r => {
            const pts = trends[r];
            const cur = pts[pts.length-1];
            const prev = pts[pts.length-2];
            const delta = cur - prev;
            const color = r==='A'||r==='B'||r==='C' ? '#1f3864' : r==='D'||r==='E' ? '#2f7a4f' : '#c8373c';
            return (
              <div key={r} style={{padding:'12px 14px', border:'1px solid var(--line)', borderRadius:6, background:'#fafbfc'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                  <span style={{fontSize:11, fontWeight:600, color:'var(--ink-3)'}}>Rack {r}</span>
                  <span className="mono" style={{fontSize:10, color: delta>=0?'var(--brand-red)':'var(--ok)', fontWeight:600}}>
                    {delta>=0?'+':''}{(delta*100).toFixed(1)}%
                  </span>
                </div>
                <div className="mono" style={{fontSize:20, fontWeight:600, color:color, letterSpacing:'-.02em', margin:'4px 0 6px'}}>
                  {(cur*100).toFixed(0)}%
                </div>
                <svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none">
                  <path
                    d={pts.map((p,i) => {
                      const x = (i/(pts.length-1))*100;
                      const y = 32 - (p*30);
                      return `${i===0?'M':'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    }).join(' ')}
                    fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={pts.map((p,i) => {
                      const x = (i/(pts.length-1))*100;
                      const y = 32 - (p*30);
                      return `${i===0?'M':'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    }).join(' ') + ` L 100 32 L 0 32 Z`}
                    fill={color} opacity="0.08"
                  />
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== INTEGRATION FOOTER ====== */}
      <div className="dash-card span-12" style={{background:'#fafbfc'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24}}>
          <div>
            <h3 style={{color:'var(--brand)'}}>◉ Conexión Extensiv</h3>
            <div style={{fontSize:12, color:'var(--ink-2)', lineHeight:1.55}}>
              Los datos mostrados provienen de la API de Extensiv a través del endpoint <code style={{background:'#eef0f3',padding:'1px 5px',borderRadius:3,fontFamily:'JetBrains Mono, monospace',fontSize:11}}>/locations/inventory</code>.
              Polling cada 30 segundos · Webhooks habilitados para movimientos críticos.
            </div>
          </div>
          <div>
            <h3 style={{color:'var(--brand)'}}>◎ Acciones sugeridas</h3>
            <div style={{fontSize:12, color:'var(--ink-2)', lineHeight:1.55}}>
              <b>{agg.fullCount}</b> ubicaciones requieren rotación en las próximas 24h ·
              <b> {agg.criticalCount - agg.fullCount}</b> en observación ·
              Capacidad disponible: <b style={{color:'var(--ok)'}}>{freeSpots.toLocaleString('es-MX')}</b> posiciones.
            </div>
          </div>
          <div>
            <h3 style={{color:'var(--brand)'}}>◍ SLA operativo</h3>
            <div style={{fontSize:12, color:'var(--ink-2)', lineHeight:1.55}}>
              Meta de ocupación objetivo: <b>85%</b> ·
              Actual: <b style={{color: agg.overall > 0.85 ? 'var(--brand-red)' : 'var(--ok)'}}>{(agg.overall*100).toFixed(1)}%</b> ·
              {agg.overall > 0.85
                ? ' Superando el umbral — evaluar cross-docking.'
                : ' Dentro de rango operativo.'}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
