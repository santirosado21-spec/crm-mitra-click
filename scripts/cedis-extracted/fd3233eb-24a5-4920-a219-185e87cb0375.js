// CEDIS Lerma - Layout visual interactivo
// Bodega 1

const { useState, useEffect, useMemo, useRef } = React;

// ========= CONSTANTS =========
// Racks A & H have 62 positions; B-G have 56 positions offset (A-fila 7 ↔ B-fila 1 ... A-fila 62 ↔ B-fila 56)
// Puente (bridge gap) at fila 30 (A/H) which is B-fila 24.
// Costillas (staging) sit between the rack pairs near the rampa side (bottom, fila ~4 A/H)
const RACKS = ['A','B','C','D','E','F','G','H'];
const PHASES = [
  { id: 'F1', label: 'Fase 1', subtitle: 'Racks A · B · C', racks: ['A','B','C'], color: '#1f3864', tint: '#dee4f0' },
  { id: 'F2', label: 'Fase 2', subtitle: 'Racks D · E',     racks: ['D','E'],     color: '#2f7a4f', tint: '#dcefe3' },
  { id: 'F3', label: 'Fase 3', subtitle: 'Racks F · G · H', racks: ['F','G','H'], color: '#c8373c', tint: '#f5d9da' },
];
function phaseOf(rack) { return PHASES.find(p => p.racks.includes(rack)); }
const RACK_DEFS = {
  A: { filas: 62, offsetFromA: 0 },
  B: { filas: 56, offsetFromA: 6 }, // B1 aligns with A7
  C: { filas: 56, offsetFromA: 6 },
  D: { filas: 56, offsetFromA: 6 },
  E: { filas: 56, offsetFromA: 6 },
  F: { filas: 56, offsetFromA: 6 },
  G: { filas: 56, offsetFromA: 6 },
  H: { filas: 62, offsetFromA: 0 },
};
const PUENTE_ROW = 30; // A-numbering. Walkway at rows 29–30 actually; but fila 30 is the crossover gap row
const PUENTE_ROWS_A = [30]; // one-row break
const NIVELES = [1,2,3,4,5];

// rack horizontal positions (in plan grid units). Pairs: A solo, BC pair, DE pair, FG pair, H solo.
// columns layout: A | aisle | B C | aisle | D E | aisle | F G | aisle | H
const RACK_COLS = {
  A: 0,
  B: 3, C: 4,
  D: 7, E: 8,
  F: 11, G: 12,
  H: 15,
};
const COL_COUNT = 16; // 0..15

// Inactive positions (all on fila 29, all niveles, all racks)
const INACTIVE_FILA = 29;

// Color mapping — Supply Chain MX brand palette
const COLORS = {
  brand: '#1f3864',
  brandRed: '#c8373c',
  pick: '#1f3864',          // pickline = brand navy
  pickLight: '#d5dded',
  storage: '#5c7095',       // storage steel-blue (navy-family)
  storageLight: '#d6dde8',
  staging: '#d68c2a',
  stagingLight: '#f6e5c8',
  putaway: '#6b4a8f',
  putawayLight: '#ddd1ea',
  inactive: '#c8373c',      // inactive = brand red
  inactiveLight: '#f5d9da',
  puente: '#c9cfd8',
};

// ========= HELPERS =========
function classify(rack, fila) {
  if (fila === INACTIVE_FILA) return 'inactive';
  // Pickline: nivel 1 & 2 (first two niveles). For color we only encode per-position, not per-nivel
  return 'pickline';
}

function rackOffset(rack) { return RACK_DEFS[rack].offsetFromA; }
function rackFilas(rack) { return RACK_DEFS[rack].filas; }

// Map a pos (rack, fila) to the A-reference row index for vertical alignment
function toRefRow(rack, fila) {
  return fila + rackOffset(rack); // A/H already offsetFromA=0; B-G have offset=6 so B-fila-1 -> 7
}

// ========= APP =========
function App() {
  const [tab, setTab] = useState(() => localStorage.getItem('cedis.tab') || 'plan');
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [highlight, setHighlight] = useState(null); // from search
  const [filterTipo, setFilterTipo] = useState(new Set(['Pickline','Storage location','Staging location','Put-away']));
  const [filterEstatus, setFilterEstatus] = useState(new Set(['Activa','Inactiva','']));
  const [filterRack, setFilterRack] = useState(new Set(RACKS.concat(['Costilla','Pasillo'])));
  const [searchQ, setSearchQ] = useState('');
  const [nivelFocus, setNivelFocus] = useState('todos'); // 'todos' | '1'..'5'
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    window.__LOCATIONS_LOADING__.then(d => {
      if (!d) return;
      setData(d);
    });
  }, []);

  useEffect(() => { localStorage.setItem('cedis.tab', tab); }, [tab]);

  // Build fast index
  const index = useMemo(() => {
    if (!data) return null;
    const ix = {};
    for (const d of data) {
      const k = d.pasillo;
      if (!ix[k]) ix[k] = {};
      const f = d.fila;
      if (!ix[k][f]) ix[k][f] = {};
      ix[k][f][d.nivel] = d;
    }
    return ix;
  }, [data]);

  // KPI / aggregates
  const kpi = useMemo(() => {
    if (!data) return null;
    return {
      total: data.length,
      activas: data.filter(d=>d.estatus==='Activa').length,
      inactivas: data.filter(d=>d.estatus==='Inactiva').length,
      pickline: data.filter(d=>d.tipo==='Pickline').length,
      storage: data.filter(d=>d.tipo==='Storage location').length,
      staging: data.filter(d=>d.tipo==='Staging location').length,
      putaway: data.filter(d=>d.tipo==='Put-away').length,
    };
  }, [data]);

  const searchMatches = useMemo(() => {
    if (!data || !searchQ) return null;
    const q = searchQ.trim().toUpperCase();
    const m = new Set();
    for (const d of data) {
      if (d.ubicacion.toUpperCase().includes(q)) m.add(d.ubicacion);
    }
    return m;
  }, [searchQ, data]);

  if (!data) {
    return <div style={{padding:40,color:'#5c6a7d'}}>Cargando layout…</div>;
  }

  return (
    <div className="page">
      <div className="brand-cell">
        <img className="logo-img" src="assets/supply-chain-mx-logo.png" alt="Supply Chain MX" />
        <div>
          <div className="brand-name"><span>Supply</span><span className="accent">Chain</span> <span style={{fontWeight:500, color:'var(--ink-3)', fontSize:11, letterSpacing:'.18em'}}>MX</span></div>
          <div className="brand-sub">CEDIS Lerma</div>
        </div>
      </div>
      <header className="topbar">
        <div className="crumb">
          <span>Layouts</span>
          <span className="sep">›</span>
          <span>Lerma</span>
          <span className="sep">›</span>
          <span style={{color:'var(--ink)',fontWeight:500}}>Bodega 1</span>
        </div>
        <h1 style={{marginLeft:16}}>Layout visual — Bodega 1</h1>
        <div className="tabs">
          <button className={tab==='plan'?'on':''} onClick={()=>setTab('plan')}>Planta</button>
          <button className={tab==='elev'?'on':''} onClick={()=>setTab('elev')}>Elevaciones</button>
          <button className={tab==='occ'?'on':''} onClick={()=>setTab('occ')}>Ocupación</button>
          <button className={tab==='data'?'on':''} onClick={()=>setTab('data')}>Tabla</button>
          <button className={tab==='cover'?'on':''} onClick={()=>setTab('cover')}>Portada</button>
        </div>
        <button className="print-btn" onClick={()=>window.open('Layout CEDIS Lerma - Print.html', '_blank')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
          Exportar PDF
        </button>
      </header>

      <Sidebar
        kpi={kpi}
        searchQ={searchQ} setSearchQ={setSearchQ}
        filterTipo={filterTipo} setFilterTipo={setFilterTipo}
        filterEstatus={filterEstatus} setFilterEstatus={setFilterEstatus}
        filterRack={filterRack} setFilterRack={setFilterRack}
        nivelFocus={nivelFocus} setNivelFocus={setNivelFocus}
      />

      <main className="canvas-area">
        <div className="tab-content">
          {tab==='cover' && <Cover kpi={kpi} />}
          {tab==='plan' && (
            <PlanView
              data={data}
              index={index}
              selected={selected} setSelected={setSelected}
              searchMatches={searchMatches}
              filterTipo={filterTipo}
              filterEstatus={filterEstatus}
              filterRack={filterRack}
              nivelFocus={nivelFocus}
              setTooltip={setTooltip}
            />
          )}
          {tab==='elev' && (
            <ElevationView
              index={index} data={data}
              selected={selected} setSelected={setSelected}
              searchMatches={searchMatches}
              filterTipo={filterTipo}
              filterEstatus={filterEstatus}
              filterRack={filterRack}
              setTooltip={setTooltip}
            />
          )}
          {tab==='data' && (
            <DataTable data={data} searchMatches={searchMatches}
              filterTipo={filterTipo} filterEstatus={filterEstatus} filterRack={filterRack} />
          )}
          {tab==='occ' && (
            <OccupancyDashboard data={data} index={index} kpi={kpi} />
          )}
        </div>
        {selected && tab!=='data' && (
          <DetailCard d={selected} onClose={()=>setSelected(null)} />
        )}
      </main>

      {tooltip && <Tooltip {...tooltip} />}
    </div>
  );
}

// ========= SIDEBAR =========
function Sidebar({ kpi, searchQ, setSearchQ, filterTipo, setFilterTipo,
  filterEstatus, setFilterEstatus, filterRack, setFilterRack, nivelFocus, setNivelFocus }) {

  function toggle(setter, set, val) {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  }

  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a96a8" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input
            placeholder="Buscar ubicación (MX-A-1-29…)"
            value={searchQ} onChange={e=>setSearchQ(e.target.value)}
          />
        </div>
      </div>

      <div className="side-section">
        <div className="side-label">Resumen</div>
        <div className="kpi-grid">
          <div className="kpi full">
            <div className="v">{kpi.total.toLocaleString('es-MX')}</div>
            <div className="l">Ubicaciones totales</div>
          </div>
          <div className="kpi">
            <div className="v" style={{color:'var(--ok)'}}>{kpi.activas.toLocaleString('es-MX')}</div>
            <div className="l">Activas</div>
          </div>
          <div className="kpi">
            <div className="v" style={{color:'var(--bad)'}}>{kpi.inactivas}</div>
            <div className="l">Inactivas</div>
          </div>
        </div>
      </div>

      <div className="side-section">
        <div className="side-label">Tipo de ubicación</div>
        <LegendRow color={COLORS.pick} label="Pickline" count={kpi.pickline}
          on={filterTipo.has('Pickline')} onClick={()=>toggle(setFilterTipo, filterTipo, 'Pickline')} />
        <LegendRow color={COLORS.storage} label="Storage" count={kpi.storage}
          on={filterTipo.has('Storage location')} onClick={()=>toggle(setFilterTipo, filterTipo, 'Storage location')} />
        <LegendRow color={COLORS.staging} label="Staging (Costilla)" count={kpi.staging}
          on={filterTipo.has('Staging location')} onClick={()=>toggle(setFilterTipo, filterTipo, 'Staging location')} />
        <LegendRow color={COLORS.putaway} label="Put-away" count={kpi.putaway}
          on={filterTipo.has('Put-away')} onClick={()=>toggle(setFilterTipo, filterTipo, 'Put-away')} />
        <LegendRow color={COLORS.inactive} label="Inactiva" count={kpi.inactivas}
          on={filterEstatus.has('Inactiva')} onClick={()=>toggle(setFilterEstatus, filterEstatus, 'Inactiva')} />
      </div>

      <div className="side-section">
        <div className="side-label">Pasillos</div>
        <div>
          {RACKS.map(r => (
            <button key={r} className={'filter-chip' + (filterRack.has(r)?' on':'')}
              onClick={()=>toggle(setFilterRack, filterRack, r)}>
              <span className="mono">{r}</span>
            </button>
          ))}
          <button className={'filter-chip' + (filterRack.has('Costilla')?' on':'')}
            onClick={()=>toggle(setFilterRack, filterRack, 'Costilla')}>Costillas</button>
          <button className={'filter-chip' + (filterRack.has('Pasillo')?' on':'')}
            onClick={()=>toggle(setFilterRack, filterRack, 'Pasillo')}>Put-away</button>
        </div>
      </div>

      <div className="side-section">
        <div className="side-label">Foco por nivel</div>
        <div>
          <button className={'filter-chip'+(nivelFocus==='todos'?' on':'')} onClick={()=>setNivelFocus('todos')}>Todos</button>
          {NIVELES.map(n => (
            <button key={n} className={'filter-chip'+(nivelFocus===String(n)?' on':'')} onClick={()=>setNivelFocus(String(n))}>
              Nivel {n}
            </button>
          ))}
        </div>
      </div>

      <div className="side-section">
        <div className="side-label">Infraestructura</div>
        <div className="legend-item"><div className="sw" style={{background:'#f1f3f6',borderStyle:'dashed'}}/>Puente (paso)</div>
        <div className="legend-item"><div className="sw" style={{background:'#edd7bd',border:'1px dashed #c19b66'}}/>Rampa / Muelle</div>
        <div className="legend-item"><div className="sw" style={{background:'#e6eaf0'}}/>Mezzanine</div>
        <div className="legend-item"><div className="sw" style={{background:'white',border:'1.5px solid #5c6a7d'}}/>Portón / Accesos</div>
      </div>
    </aside>
  );
}
function LegendRow({color,label,count,on,onClick}) {
  return (
    <div className="legend-item" style={{justifyContent:'space-between', cursor:'pointer', opacity: on?1:.4}} onClick={onClick}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div className="sw" style={{background:color}} />
        <span>{label}</span>
      </div>
      <span className="mono" style={{fontSize:11,color:'var(--ink-3)'}}>{count}</span>
    </div>
  );
}

// ========= PLAN VIEW =========
// Top-down floor plan: vertical racks running N-S. Entry (rampa + portón) on south side.
function PlanView({ data, index, selected, setSelected, searchMatches,
  filterTipo, filterEstatus, filterRack, nivelFocus, setTooltip }) {

  // Grid sizing
  const CELL_W = 18;
  const CELL_H = 11;
  const RACK_W = CELL_W * 2; // each rack is 2 cells wide (2 niveles shown on top view? no - just wide visual)
  // For plan we render each rack as a column of fila cells (A-fila=62 rows tall).
  // A & H are solo (1 rack wide). B-C, D-E, F-G are paired (back-to-back, 2 racks wide).
  // Each "rack-column" is 28px wide.
  const RW = 28;
  const GAP_AISLE = 64; // main aisle between rack pairs
  const GAP_TIGHT = 2; // back-to-back gap
  const GAP_PHASE = 28; // extra gap between phases (visual separator)
  // Row height per fila
  const FH = 9;
  const TOP_MARGIN = 240;   // extra room: phase banners + pasillo labels + aisle labels + rack headers + mezzanine
  const BOTTOM_MARGIN = 320; // room for infra (rampa, recepción, portón, put-away) WITHOUT overlap
  const LEFT_MARGIN = 90;
  const RIGHT_MARGIN = 110;

  // Column layout
  const rackLayout = {
    A: { x: 0, single: true },
    B: { x: 1, pairRight: true },
    C: { x: 2, pairLeft: true },
    D: { x: 3, pairRight: true },
    E: { x: 4, pairLeft: true },
    F: { x: 5, pairRight: true },
    G: { x: 6, pairLeft: true },
    H: { x: 7, single: true },
  };
  // compute x positions — grouped by phase with extra gap between phases
  const rackX = {};
  let cursor = LEFT_MARGIN;
  // Fase 1 : A | B C
  rackX.A = cursor; cursor += RW + GAP_AISLE;
  rackX.B = cursor; rackX.C = cursor + RW + GAP_TIGHT; cursor = rackX.C + RW;
  // Phase gap
  cursor += GAP_PHASE;
  // Fase 2 : D E
  cursor += GAP_AISLE - GAP_PHASE; // aisle before D
  rackX.D = cursor; rackX.E = cursor + RW + GAP_TIGHT; cursor = rackX.E + RW;
  // Phase gap
  cursor += GAP_PHASE;
  // Fase 3 : F G | H
  cursor += GAP_AISLE - GAP_PHASE;
  rackX.F = cursor; rackX.G = cursor + RW + GAP_TIGHT; cursor = rackX.G + RW + GAP_AISLE;
  rackX.H = cursor; cursor += RW + RIGHT_MARGIN;

  const totalW = cursor;
  // max filas = 62 (A/H). Fila 1 at bottom, Fila 62 at top
  const MAX_F = 62;
  const totalH = TOP_MARGIN + MAX_F * FH + BOTTOM_MARGIN;

  function yForA(fila) {
    // fila 1 at bottom, fila 62 at top
    return TOP_MARGIN + (MAX_F - fila) * FH;
  }

  function getColor(loc, nivel) {
    if (!loc) return '#eef1f5';
    if (loc.estatus === 'Inactiva') return COLORS.inactive;
    if (loc.tipo === 'Pickline') return COLORS.pick;
    if (loc.tipo === 'Storage location') return COLORS.storage;
    if (loc.tipo === 'Staging location') return COLORS.staging;
    if (loc.tipo === 'Put-away') return COLORS.putaway;
    return COLORS.storage;
  }

  function isVisible(loc) {
    if (!loc) return false;
    if (!filterTipo.has(loc.tipo)) return false;
    if (!filterEstatus.has(loc.estatus)) return false;
    if (!filterRack.has(loc.pasillo)) return false;
    return true;
  }

  function isHighlighted(loc) {
    if (!loc || !searchMatches) return false;
    return searchMatches.has(loc.ubicacion);
  }

  function isDim(loc) {
    if (!loc) return false;
    if (nivelFocus !== 'todos') {
      // If we're focusing on a nivel, dim all positions that don't have that nivel (which is all — so instead dim by nivel in cell rendering)
      return false;
    }
    return !isVisible(loc);
  }

  // Build cells
  const cells = [];
  for (const r of RACKS) {
    const nFilas = rackFilas(r);
    for (let f = 1; f <= nFilas; f++) {
      const filaRef = toRefRow(r, f); // A-equivalent row number
      // represent each fila as stacked nivel bar horizontally across RW
      // For top-down we paint one tile per (rack,fila), colored by the "dominant" type at nivel 1
      // but we also want nivel-focus view: when focusing nivel n, color by that specific level
      const loc1 = index[r]?.[f]?.[1];
      const locAny = loc1 || index[r]?.[f]?.[2] || index[r]?.[f]?.[3];
      const loc = nivelFocus === 'todos' ? (loc1 || locAny) : index[r]?.[f]?.[Number(nivelFocus)];
      if (!loc) continue;
      const x = rackX[r];
      const y = yForA(filaRef);
      cells.push({ rack: r, fila: f, loc, x, y, filaRef });
    }
  }

  // Costillas positions (staging): between B-C, D-E, F-G, at fila 4 (A-ref around 4-10)
  const costillas = [
    { label: 'B/C', x: rackX.B + RW + GAP_TIGHT/2, range: [1,4] },
    { label: 'D/E', x: rackX.D + RW + GAP_TIGHT/2, range: [1,4] },
    { label: 'F/G', x: rackX.F + RW + GAP_TIGHT/2, range: [1,4] },
  ];

  // Puente at fila 30 (A-ref) — horizontal walkway spanning all racks
  const puenteY = yForA(30);

  function handleClick(loc) { setSelected(loc); }
  function handleEnter(e, loc) {
    setTooltip({
      x: e.clientX, y: e.clientY,
      title: loc.ubicacion,
      rows: [
        ['Tipo', loc.tipo],
        ['Estatus', loc.estatus || '—'],
        ['Pasillo', loc.pasillo],
        ['Nivel', loc.nivel],
        ['Fila', loc.fila],
      ]
    });
  }
  function handleMove(e, loc) { setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null); }
  function handleLeave() { setTooltip(null); }

  return (
    <div className="plan-wrap">
      <div className="plan-head">
        <div>
          <div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:'var(--ink-4)',textTransform:'uppercase'}}>Plano general · Vista superior</div>
          <h2>Bodega 1 — Planta de piso</h2>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <span className="stamp">Escala esquemática</span>
          <span className="meta">N↑ · CEDIS Lerma, MX</span>
        </div>
      </div>

      <div className="plan-scroll">
        <svg width={totalW} height={totalH} style={{display:'block',minWidth:'100%'}} viewBox={`0 0 ${totalW} ${totalH}`}>
          <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#f4ead9" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#c19b66" strokeWidth="1.5"/>
            </pattern>
            <pattern id="hatchLight" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#eef1f5" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#c5ccd6" strokeWidth="1"/>
            </pattern>
            <pattern id="mezzPattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#e6eaf0"/>
              <circle cx="5" cy="5" r="1" fill="#b6bfcc"/>
            </pattern>
          </defs>

          {/* Building envelope */}
          <rect x="30" y="60"
            width={totalW - 60}
            height={totalH - 120}
            fill="#fcfdfe" stroke="#5c6a7d" strokeWidth="2" rx="4"/>

          {/* Phase zone backgrounds (tints) — span the rack area only */}
          {PHASES.map(ph => {
            const xs = ph.racks.map(r => rackX[r]);
            const x0 = Math.min(...xs) - 14;
            const x1 = Math.max(...xs) + RW + 14;
            const yTop = TOP_MARGIN - 56;
            const yBot = TOP_MARGIN + MAX_F * FH + 20;
            return (
              <g key={'phz'+ph.id}>
                <rect x={x0} y={yTop} width={x1 - x0} height={yBot - yTop}
                  fill={ph.tint} opacity="0.4" rx="3"/>
                <rect x={x0} y={yTop} width={x1 - x0} height={22}
                  fill={ph.color} rx="3"/>
                <text x={(x0+x1)/2} y={yTop + 10} fontSize="10" fill="white" fontFamily="Inter" fontWeight="700" letterSpacing=".2em" textAnchor="middle">{ph.label.toUpperCase()}</text>
                <text x={(x0+x1)/2} y={yTop + 20} fontSize="9" fill="white" opacity="0.85" fontFamily="JetBrains Mono" textAnchor="middle">{ph.subtitle}</text>
              </g>
            );
          })}

          {/* (Brújula removida — el texto N↑ en el encabezado indica orientación) */}

          {/* Mezzanine - OUTSIDE rack grid, above F/G/H */}
          <g>
            <rect x={rackX.F - 10} y="66" width={rackX.H + RW - rackX.F + 20} height={44} fill="url(#mezzPattern)" stroke="#8a96a8" strokeDasharray="3 3"/>
            <text x={(rackX.F + rackX.H + RW)/2} y="84" fontSize="11" fill="#5c6a7d" fontFamily="Inter" fontWeight="700" letterSpacing=".12em" textAnchor="middle">▲ MEZZANINE</text>
            <text x={(rackX.F + rackX.H + RW)/2} y="100" fontSize="9" fill="#5c6a7d" fontFamily="Inter" fontWeight="500" letterSpacing=".14em" textAnchor="middle">NIVEL SUPERIOR</text>
          </g>

          {/* Puerta acceso — on north edge, above D-E phase */}
          <g transform={`translate(${(rackX.D + rackX.E + RW)/2}, 60)`}>
            <rect x="-32" y="-7" width="64" height="14" fill="#fff" stroke="#1e3a5f" strokeWidth="2"/>
            <text y="-14" textAnchor="middle" fontSize="10" fill="#1e3a5f" fontFamily="Inter" fontWeight="700" letterSpacing=".12em">PUERTA DE ACCESO</text>
          </g>

          {/* Puente (bridge walkway) - horizontal break across racks at fila 30 */}
          <rect x={rackX.A - 8} y={puenteY - 2} width={(rackX.H - rackX.A) + RW + 16} height={FH+4} fill="url(#hatchLight)" />
          <text x={rackX.A + (rackX.H - rackX.A)/2} y={puenteY + 12} fontSize="9" fill="#5c6a7d" fontFamily="Inter" fontWeight="700" letterSpacing=".2em" textAnchor="middle">— PUENTE —</text>

          {/* Aisle labels (main aisles between rack pairs) \u2014 placed ABOVE phase banners with clearance */}
          {[
            ['Pasillo 1', (rackX.A + RW + rackX.B)/2],
            ['Pasillo 2', (rackX.C + RW + rackX.D)/2],
            ['Pasillo 3', (rackX.E + RW + rackX.F)/2],
            ['Pasillo 4', (rackX.G + RW + rackX.H)/2],
          ].map(([lbl,x]) => (
            <g key={lbl}>
              <rect x={x-40} y={TOP_MARGIN - 100} width={80} height={16} fill="white" stroke="#8a96a8" rx="2"/>
              <text x={x} y={TOP_MARGIN - 89} fontSize="9" fill="#2b3646" fontFamily="Inter" fontWeight="700" letterSpacing=".14em" textAnchor="middle">{lbl.toUpperCase()}</text>
              <line x1={x} y1={TOP_MARGIN - 82} x2={x} y2={TOP_MARGIN - 62} stroke="#8a96a8" strokeDasharray="2 2"/>
              <polygon points={`${x-3},${TOP_MARGIN-64} ${x+3},${TOP_MARGIN-64} ${x},${TOP_MARGIN-58}`} fill="#8a96a8"/>
            </g>
          ))}

          {/* Rack headers \u2014 colored by phase */}
          {RACKS.map(r => {
            const ph = phaseOf(r);
            return (
              <g key={'h'+r}>
                <rect x={rackX[r]} y={TOP_MARGIN - 16} width={RW} height={14} fill={ph.color} rx="2"/>
                <text x={rackX[r]+RW/2} y={TOP_MARGIN - 5} fontSize="11" fill="white" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">{r}</text>
              </g>
            );
          })}

          {/* Rack spines (draw background column) */}
          {RACKS.map(r => {
            const nF = rackFilas(r);
            const firstY = yForA(toRefRow(r, nF));
            const lastY = yForA(toRefRow(r, 1)) + FH;
            return (
              <rect key={'spine'+r} x={rackX[r]} y={firstY}
                width={RW} height={lastY - firstY}
                fill="#f4f5f7" stroke="#d6dae1" strokeWidth="0.5"/>
            );
          })}

          {/* Position cells */}
          {cells.map(c => {
            const loc = c.loc;
            const color = getColor(loc);
            const visible = isVisible(loc);
            const hi = isHighlighted(loc);
            const dim = nivelFocus==='todos' ? !visible : !visible;
            return (
              <g key={`${c.rack}-${c.fila}`}>
                <rect
                  className={'pos' + (selected && selected.ubicacion===loc.ubicacion?' sel':'') + (hi?' hi':'') + (dim?' dim':'')}
                  x={c.x + 1} y={c.y + 0.5}
                  width={RW - 2} height={FH - 1}
                  fill={color}
                  stroke={hi ? '#d68c2a' : 'rgba(0,0,0,.15)'}
                  strokeWidth={hi ? 2 : 0.5}
                  onClick={()=>handleClick(loc)}
                  onMouseEnter={e=>handleEnter(e, loc)}
                  onMouseMove={e=>handleMove(e, loc)}
                  onMouseLeave={handleLeave}
                />
              </g>
            );
          })}

          {/* Fila number ticks every 10 (on rack A) */}
          {[1,10,20,30,40,50,60,62].map(f => (
            <g key={'tk'+f}>
              <text x={rackX.A - 10} y={yForA(f) + FH/2 + 3} fontSize="9" fill="#8a96a8" fontFamily="JetBrains Mono" textAnchor="end">{f}</text>
              <line x1={rackX.A - 5} y1={yForA(f) + FH/2} x2={rackX.A - 2} y2={yForA(f) + FH/2} stroke="#d6dae1"/>
            </g>
          ))}
          {[1,10,20,30,40,50,56].map(f => (
            <g key={'tkh'+f}>
              <text x={rackX.H + RW + 10} y={yForA(toRefRow('B', f)) + FH/2 + 3} fontSize="9" fill="#8a96a8" fontFamily="JetBrains Mono" textAnchor="start">{f}</text>
            </g>
          ))}

          {/* Costillas (staging locations) — drawn BETWEEN rack-pair columns, in the aisle at bottom of rack area
              Positioned at fila 1-4 range (bottom), BETWEEN the two racks of each pair. Kept thin to avoid overlap. */}
          {costillas.map(c => {
            const yTop = yForA(c.range[1] + 6);
            const yBot = yForA(c.range[0]) + FH;
            return (
              <g key={'cs'+c.label}>
                <rect x={c.x - 10} y={yTop} width={20} height={yBot - yTop}
                  fill={COLORS.stagingLight} stroke={COLORS.staging} strokeWidth="1" strokeDasharray="3 2"/>
                <text x={c.x} y={(yTop+yBot)/2 - 4} fontSize="7" fill={COLORS.staging} fontFamily="Inter" fontWeight="700" textAnchor="middle" letterSpacing=".1em">COST.</text>
                <text x={c.x} y={(yTop+yBot)/2 + 7} fontSize="8" fill={COLORS.staging} fontFamily="JetBrains Mono" fontWeight="600" textAnchor="middle">{c.label}</text>
              </g>
            );
          })}

          {/* ================== SOUTH INFRASTRUCTURE BAND ==================
              Lives entirely in BOTTOM_MARGIN — no overlap with rack cells.
              Band starts yBand = TOP_MARGIN + MAX_F*FH + 40 (40px buffer from last fila) */}
          {(() => {
            const yBandTop = TOP_MARGIN + MAX_F * FH + 40;
            const bandH = 220;
            return (
              <g>
                {/* Band separator */}
                <line x1="50" y1={yBandTop - 16} x2={totalW - 50} y2={yBandTop - 16} stroke="#d6dae1" strokeDasharray="4 3"/>
                <text x="50" y={yBandTop - 22} fontSize="9" fill="#8a96a8" fontFamily="Inter" fontWeight="700" letterSpacing=".18em">ZONA SUR · OPERACIONES</text>

                {/* Rampa / Muelle — left */}
                <g>
                  <rect x="50" y={yBandTop} width="180" height="110" fill="url(#hatch)" stroke="#c19b66" strokeWidth="1.5" rx="3"/>
                  <text x="140" y={yBandTop + 20} fontSize="12" fill="#8a5a1e" fontFamily="Inter" fontWeight="700" textAnchor="middle" letterSpacing=".12em">RAMPA</text>
                  <text x="140" y={yBandTop + 34} fontSize="8" fill="#8a5a1e" fontFamily="Inter" textAnchor="middle" letterSpacing=".06em">MUELLE DE CARGA</text>
                  {[0,1,2,3].map(i => (
                    <g key={'tb'+i}>
                      <rect x={58 + i*42} y={yBandTop + 52} width={36} height={36}
                        fill="white" stroke="#8a5a1e" strokeWidth="1" strokeDasharray="2 2"/>
                      <text x={76 + i*42} y={yBandTop + 74} fontSize="10" fill="#8a5a1e" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="600">M{i+1}</text>
                    </g>
                  ))}
                </g>

                {/* Recepción — center */}
                <g>
                  <rect x="245" y={yBandTop} width="200" height="80" fill="#e2f2e8" stroke="#2f7a4f" strokeWidth="1.5" rx="3"/>
                  <text x="345" y={yBandTop + 26} fontSize="12" fill="#1b5532" fontFamily="Inter" fontWeight="700" textAnchor="middle" letterSpacing=".12em">RECEPCIÓN</text>
                  <text x="345" y={yBandTop + 44} fontSize="8" fill="#1b5532" fontFamily="Inter" textAnchor="middle" letterSpacing=".06em">ÁREA DE INGRESO DE MERCANCÍA</text>
                  <text x="345" y={yBandTop + 60} fontSize="7" fill="#1b5532" fontFamily="JetBrains Mono" textAnchor="middle" opacity="0.7">inspección · conteo · asignación</text>
                </g>

                {/* Put-away — center-right */}
                <g>
                  <rect x="460" y={yBandTop} width="170" height="80" fill={COLORS.putawayLight} stroke={COLORS.putaway} strokeWidth="1.5" strokeDasharray="4 2" rx="3"/>
                  <text x="545" y={yBandTop + 26} fontSize="12" fill={COLORS.putaway} fontFamily="Inter" fontWeight="700" textAnchor="middle" letterSpacing=".08em">PUT-AWAY</text>
                  <text x="545" y={yBandTop + 44} fontSize="8" fill={COLORS.putaway} fontFamily="Inter" textAnchor="middle" letterSpacing=".04em">zona de acomodo</text>
                  <text x="545" y={yBandTop + 60} fontSize="7" fill={COLORS.putaway} fontFamily="JetBrains Mono" textAnchor="middle" opacity="0.7">4 ubicaciones</text>
                </g>

                {/* Portón — bottom edge, wide */}
                <g>
                  <rect x="50" y={yBandTop + 130} width="260" height="22" fill="white" stroke="#1e3a5f" strokeWidth="2.5"/>
                  <text x="180" y={yBandTop + 145} fontSize="12" fill="#1e3a5f" fontFamily="Inter" fontWeight="700" textAnchor="middle" letterSpacing=".16em">▼ PORTÓN PRINCIPAL</text>
                  <path d={`M 50 ${yBandTop + 152} A 80 80 0 0 1 130 ${yBandTop + 72}`} fill="none" stroke="#1e3a5f" strokeWidth="0.8" strokeDasharray="2 2"/>
                  <text x="180" y={yBandTop + 170} fontSize="9" fill="#5c6a7d" fontFamily="Inter" textAnchor="middle" letterSpacing=".1em">ACCESO DE VEHICULOS / ENTRADA PRINCIPAL</text>
                </g>

                {/* Legend mini — right side, beside the portón row */}
                <g transform={`translate(340, ${yBandTop + 108})`}>
                  <rect x="0" y="0" width="290" height="72" fill="white" stroke="#d6dae1" rx="3"/>
                  <text x="12" y="16" fontSize="9" fill="#5c6a7d" fontFamily="Inter" fontWeight="700" letterSpacing=".14em">FASES</text>
                  {PHASES.map((p, i) => (
                    <g key={p.id} transform={`translate(12, ${26 + i*14})`}>
                      <rect width="12" height="9" fill={p.color}/>
                      <text x="20" y="8" fontSize="10" fill="#2b3646" fontFamily="Inter" fontWeight="600">{p.label}</text>
                      <text x="70" y="8" fontSize="9" fill="#5c6a7d" fontFamily="JetBrains Mono">{p.subtitle}</text>
                    </g>
                  ))}
                </g>
              </g>
            );
          })()}

          {/* Scale bar */}
          <g transform={`translate(${totalW - 220}, ${totalH - 40})`}>
            <line x1="0" y1="0" x2="150" y2="0" stroke="#5c6a7d" strokeWidth="2"/>
            <line x1="0" y1="-4" x2="0" y2="4" stroke="#5c6a7d" strokeWidth="2"/>
            <line x1="75" y1="-3" x2="75" y2="3" stroke="#5c6a7d" strokeWidth="1"/>
            <line x1="150" y1="-4" x2="150" y2="4" stroke="#5c6a7d" strokeWidth="2"/>
            <text x="0" y="16" fontSize="9" fill="#5c6a7d" fontFamily="JetBrains Mono">0</text>
            <text x="75" y="16" fontSize="9" fill="#5c6a7d" fontFamily="JetBrains Mono" textAnchor="middle">~10m</text>
            <text x="150" y="16" fontSize="9" fill="#5c6a7d" fontFamily="JetBrains Mono" textAnchor="end">~20m</text>
          </g>
        </svg>
      </div>

      <PlanFooterStats />
    </div>
  );
}

function PlanFooterStats() {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginTop:16}}>
      {[
        ['Racks', '8', 'A · B · C · D · E · F · G · H'],
        ['Niveles', '5', 'por posición'],
        ['Pasillos operativos', '4', 'entre pares de racks'],
        ['Puntos de acceso', '3', 'Portón · Puerta · Rampa'],
      ].map(([l,v,s]) => (
        <div key={l} style={{padding:'12px 14px',background:'var(--bg)',borderRadius:6,border:'1px solid var(--line-2)'}}>
          <div style={{fontSize:10,color:'var(--ink-4)',letterSpacing:'.1em',textTransform:'uppercase'}}>{l}</div>
          <div className="mono" style={{fontSize:20,fontWeight:600,marginTop:2}}>{v}</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{s}</div>
        </div>
      ))}
    </div>
  );
}

// ========= ELEVATION VIEW =========
// Side elevation: shows all 5 niveles for each rack
function ElevationView({ index, data, selected, setSelected, searchMatches, filterTipo, filterEstatus, filterRack, setTooltip }) {

  function getColor(loc) {
    if (!loc) return '#eef1f5';
    if (loc.estatus === 'Inactiva') return COLORS.inactive;
    if (loc.tipo === 'Pickline') return COLORS.pick;
    if (loc.tipo === 'Storage location') return COLORS.storage;
    return COLORS.storage;
  }
  function isVisible(loc) {
    if (!loc) return false;
    if (!filterTipo.has(loc.tipo)) return false;
    if (!filterEstatus.has(loc.estatus)) return false;
    if (!filterRack.has(loc.pasillo)) return false;
    return true;
  }
  function isHighlighted(loc) {
    if (!loc || !searchMatches) return false;
    return searchMatches.has(loc.ubicacion);
  }

  const CW = 16, CH = 26;
  const PAD_TOP = 50, PAD_L = 50, PAD_B = 30;

  return (
    <div className="elev-container">
      {RACKS.filter(r => filterRack.has(r)).map(r => {
        const nFilas = rackFilas(r);
        const w = PAD_L + nFilas * CW + 30;
        const h = PAD_TOP + NIVELES.length * CH + PAD_B;
        const countActivas = Object.keys(index[r]||{}).reduce((acc,f)=>{
          for (const n of NIVELES) if (index[r][f]?.[n]?.estatus==='Activa') acc++;
          return acc;
        },0);
        const countInactivas = Object.keys(index[r]||{}).reduce((acc,f)=>{
          for (const n of NIVELES) if (index[r][f]?.[n]?.estatus==='Inactiva') acc++;
          return acc;
        },0);
        return (
          <div className="elev-rack" key={r}>
            <div className="head">
              <div>
                <div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:'var(--ink-4)',textTransform:'uppercase'}}>Elevación · Vista lateral</div>
                <div className="name">Rack {r} <span style={{color:'var(--ink-4)',fontWeight:400,fontSize:14,marginLeft:6}}>/ {nFilas} filas × 5 niveles</span></div>
              </div>
              <div className="stats">
                <span style={{color:'var(--ok)'}}>● {countActivas} activas</span>
                {countInactivas > 0 && <span style={{color:'var(--bad)',marginLeft:14}}>● {countInactivas} inactivas</span>}
              </div>
            </div>
            <div className="elev-scroll">
              <svg width={w} height={h}>
                {/* floor line */}
                <line x1={PAD_L - 10} y1={PAD_TOP + 5 * CH + 4} x2={w - 20} y2={PAD_TOP + 5 * CH + 4} stroke="#5c6a7d" strokeWidth="2"/>
                {/* floor hatch */}
                {Array.from({length: Math.floor((w-PAD_L-20)/8)}).map((_,i)=>(
                  <line key={i} x1={PAD_L + i*8} y1={PAD_TOP+5*CH+4} x2={PAD_L + i*8 - 6} y2={PAD_TOP+5*CH+10} stroke="#8a96a8" strokeWidth="0.5"/>
                ))}
                {/* Nivel labels */}
                {NIVELES.map((n,i) => (
                  <g key={n}>
                    <text x={PAD_L - 8} y={PAD_TOP + (5-i-1)*CH + CH/2 + 4} fontSize="10" fill="#5c6a7d" fontFamily="JetBrains Mono" fontWeight="600" textAnchor="end">N{n}</text>
                    <line x1={PAD_L - 5} y1={PAD_TOP + (5-i-1)*CH + CH/2} x2={PAD_L} y2={PAD_TOP + (5-i-1)*CH + CH/2} stroke="#d6dae1"/>
                  </g>
                ))}
                {/* Pickline / storage zone labels */}
                <text x={PAD_L - 8} y={PAD_TOP + 4*CH + CH/2 + 4} fontSize="8" fill={COLORS.pick} fontFamily="Inter" fontWeight="700" textAnchor="end" transform={`rotate(-90, ${PAD_L-30}, ${PAD_TOP + 4*CH + CH/2})`}>PICK</text>

                {/* Fila ticks */}
                {Array.from({length: nFilas}).map((_,i) => {
                  const f = i+1;
                  if (f % 5 !== 0 && f !== 1 && f !== nFilas) return null;
                  return (
                    <text key={f} x={PAD_L + i*CW + CW/2} y={PAD_TOP + 5*CH + 22} fontSize="9" fill="#8a96a8" fontFamily="JetBrains Mono" textAnchor="middle">{f}</text>
                  );
                })}
                {/* Puente marker at fila 30 for A/H (or corresponding on B-G) */}
                {(r==='A' || r==='H') && (
                  <g>
                    <rect x={PAD_L + (30-1)*CW - 1} y={PAD_TOP - 6} width={CW + 2} height={5*CH + 10} fill="url(#hatchLight)"/>
                    <text x={PAD_L + (30-1)*CW + CW/2} y={PAD_TOP - 10} fontSize="8" fill="#5c6a7d" fontFamily="Inter" fontWeight="700" textAnchor="middle">PUENTE</text>
                  </g>
                )}
                {(r!=='A' && r!=='H') && (
                  <g>
                    <rect x={PAD_L + (24-1)*CW - 1} y={PAD_TOP - 6} width={CW + 2} height={5*CH + 10} fill="url(#hatchLight)"/>
                    <text x={PAD_L + (24-1)*CW + CW/2} y={PAD_TOP - 10} fontSize="8" fill="#5c6a7d" fontFamily="Inter" fontWeight="700" textAnchor="middle">PUENTE</text>
                  </g>
                )}

                {/* Cells - one per fila x nivel */}
                {Array.from({length: nFilas}).flatMap((_,i) => {
                  const fila = i+1;
                  return NIVELES.map(n => {
                    const loc = index[r]?.[fila]?.[n];
                    if (!loc) return null;
                    const x = PAD_L + i*CW;
                    const y = PAD_TOP + (5-n)*CH;
                    const color = getColor(loc);
                    const visible = isVisible(loc);
                    const hi = isHighlighted(loc);
                    return (
                      <rect
                        key={`${r}-${fila}-${n}`}
                        className={'pos' + (selected && selected.ubicacion===loc.ubicacion?' sel':'') + (hi?' hi':'') + (!visible?' dim':'')}
                        x={x + 1} y={y + 1}
                        width={CW - 2} height={CH - 2}
                        fill={color}
                        stroke={hi ? '#d68c2a' : 'rgba(0,0,0,.2)'}
                        strokeWidth={hi ? 2 : 0.5}
                        rx="1"
                        onClick={()=>setSelected(loc)}
                        onMouseEnter={e=>setTooltip({ x: e.clientX, y: e.clientY, title: loc.ubicacion, rows: [['Tipo', loc.tipo],['Estatus', loc.estatus||'—'],['Dim (m)', `${loc.W}×${loc.L}×${loc.H}`],['Max peso', loc.maxW+' kg']] })}
                        onMouseMove={e=>setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={()=>setTooltip(null)}
                      />
                    );
                  });
                }).flat()}

                <defs>
                  <pattern id="hatchLight" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill="#eef1f5" />
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#c5ccd6" strokeWidth="1"/>
                  </pattern>
                </defs>
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========= DETAIL CARD =========
function DetailCard({ d, onClose }) {
  return (
    <div className="detail-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div>
          <div className="mono" style={{fontSize:10,color:'var(--ink-4)',letterSpacing:'.1em',textTransform:'uppercase'}}>Ubicación seleccionada</div>
          <div className="mono" style={{fontSize:22,fontWeight:600,letterSpacing:'-.01em'}}>{d.ubicacion}</div>
        </div>
        <button onClick={onClose} style={{background:'transparent',border:0,cursor:'pointer',fontSize:18,color:'var(--ink-4)',padding:'4px 8px'}}>✕</button>
      </div>
      <div className="detail-grid">
        <div className="f"><div className="l">Pasillo</div><div className="v">{d.pasillo}</div></div>
        <div className="f"><div className="l">Fila</div><div className="v">{d.fila}</div></div>
        <div className="f"><div className="l">Nivel</div><div className="v">{d.nivel}</div></div>
        <div className="f"><div className="l">Estatus</div><div className="v"><span className={'badge '+(d.estatus==='Activa'?'ok':d.estatus==='Inactiva'?'bad':'tipo')}>{d.estatus || '—'}</span></div></div>
        <div className="f"><div className="l">Tipo</div><div className="v"><span className="badge tipo">{d.tipo}</span></div></div>
        <div className="f"><div className="l">Ancho</div><div className="v">{d.W} m</div></div>
        <div className="f"><div className="l">Largo</div><div className="v">{d.L} m</div></div>
        <div className="f"><div className="l">Altura</div><div className="v">{d.H} m</div></div>
        <div className="f"><div className="l">Peso máx.</div><div className="v">{d.maxW} kg</div></div>
        <div className="f"><div className="l">Cant. mín.</div><div className="v">{d.minQ}</div></div>
      </div>
    </div>
  );
}

// ========= DATA TABLE =========
function DataTable({ data, searchMatches, filterTipo, filterEstatus, filterRack }) {
  const filtered = data.filter(d => {
    if (searchMatches && !searchMatches.has(d.ubicacion)) return false;
    if (!filterTipo.has(d.tipo)) return false;
    if (!filterEstatus.has(d.estatus)) return false;
    if (!filterRack.has(d.pasillo)) return false;
    return true;
  });
  return (
    <div style={{background:'var(--paper)',border:'1px solid var(--line)',borderRadius:8,padding:20}}>
      <div className="plan-head">
        <div>
          <div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:'var(--ink-4)',textTransform:'uppercase'}}>Listado completo de posiciones</div>
          <h2>Ubicaciones — {filtered.length.toLocaleString('es-MX')} de {data.length.toLocaleString('es-MX')}</h2>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Ubicación</th><th>Pasillo</th><th>Nivel</th><th>Fila</th>
            <th>Estatus</th><th>Tipo</th><th>Dim (m)</th><th>Max kg</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 500).map(d => (
            <tr key={d.ubicacion + d.nivel + d.fila}>
              <td style={{fontWeight:600}}>{d.ubicacion}</td>
              <td>{d.pasillo}</td>
              <td>{d.nivel}</td>
              <td>{d.fila}</td>
              <td><span className={'badge '+(d.estatus==='Activa'?'ok':d.estatus==='Inactiva'?'bad':'tipo')} style={{padding:'1px 6px',borderRadius:3,fontSize:10}}>{d.estatus||'—'}</span></td>
              <td>{d.tipo}</td>
              <td>{d.W}×{d.L}×{d.H}</td>
              <td>{d.maxW}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 500 && (
        <div style={{padding:'12px 14px',color:'var(--ink-3)',fontSize:12,textAlign:'center'}}>
          Mostrando primeras 500 filas · {filtered.length - 500} adicionales ocultas (usa filtros para refinar)
        </div>
      )}
    </div>
  );
}

// ========= COVER =========
function Cover({ kpi }) {
  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="cover">
      <svg className="compass" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="26" fill="white" stroke="#d6dae1"/>
        <path d="M 28 6 L 33 28 L 28 24 L 23 28 Z" fill="#1e3a5f"/>
        <path d="M 28 50 L 33 28 L 28 32 L 23 28 Z" fill="#8a96a8"/>
        <text x="28" y="5" fontSize="8" textAnchor="middle" fill="#1e3a5f" fontFamily="Inter" fontWeight="700">N</text>
      </svg>
      <div className="mono" style={{fontSize:11,color:'var(--accent)',letterSpacing:'.2em',textTransform:'uppercase',fontWeight:600,marginBottom:8}}>Supply Chain MX · CEDIS Lerma</div>
      <h1>Layout visual — Bodega 1</h1>
      <div className="sub">Plano interactivo y referencia de ubicaciones · Abril 2026</div>
      <div className="cover-grid">
        <div className="f"><div className="l">Ubicaciones totales</div><div className="v">{kpi.total.toLocaleString('es-MX')}</div></div>
        <div className="f"><div className="l">Racks principales</div><div className="v">8 · A–H</div></div>
        <div className="f"><div className="l">Niveles</div><div className="v">5 por posición</div></div>
        <div className="f"><div className="l">Fecha de emisión</div><div className="v">{today}</div></div>
        <div className="f"><div className="l">Pickline</div><div className="v" style={{color:COLORS.pick}}>{kpi.pickline.toLocaleString('es-MX')}</div></div>
        <div className="f"><div className="l">Storage</div><div className="v" style={{color:COLORS.storage}}>{kpi.storage.toLocaleString('es-MX')}</div></div>
        <div className="f"><div className="l">Staging (Costilla)</div><div className="v" style={{color:COLORS.staging}}>{kpi.staging}</div></div>
        <div className="f"><div className="l">Put-away</div><div className="v" style={{color:COLORS.putaway}}>{kpi.putaway}</div></div>
      </div>
      <div className="cover-hero">
        <div className="box">
          <h3>Alcance del documento</h3>
          <p>Este documento contiene el render visual y tabular del Centro de Distribución Lerma (Bodega 1), incluyendo la vista en planta, las elevaciones laterales de los ocho racks principales y el listado completo de ubicaciones con sus características físicas (dimensiones, peso máximo, estatus operativo y tipo).</p>
        </div>
        <div className="box">
          <h3>Cómo leer el plano</h3>
          <p>Cada celda representa una posición física. El color indica su función operativa: <b style={{color:COLORS.pick}}>Pickline</b> (niveles inferiores de picking), <b style={{color:COLORS.storage}}>Storage</b> (almacenamiento en altura), <b style={{color:COLORS.staging}}>Staging/Costilla</b> y <b style={{color:COLORS.putaway}}>Put-away</b>. El tono <b style={{color:COLORS.inactive}}>rojo</b> marca las 40 posiciones inactivas ubicadas en la fila 29, donde corre el puente de paso.</p>
        </div>
      </div>
    </div>
  );
}

// ========= TOOLTIP =========
function Tooltip({ x, y, title, rows }) {
  return (
    <div className="tt" style={{ left: x, top: y }}>
      <div className="tt-t">{title}</div>
      {rows.map(([k,v]) => (
        <div className="tt-r" key={k}><span>{k}</span><span>{v}</span></div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App/>);
