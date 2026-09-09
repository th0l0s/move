// ===== Theme toggle =====
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let mode = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  const icons = {
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  };
  function apply() {
    root.setAttribute('data-theme', mode);
    if (t) { t.innerHTML = mode === 'dark' ? icons.dark : icons.light; t.setAttribute('aria-label', 'Passa al tema ' + (mode === 'dark' ? 'chiaro' : 'scuro')); }
  }
  apply();
  if (t) t.addEventListener('click', () => { mode = mode === 'dark' ? 'light' : 'dark'; apply(); if (window.__reflowMap) window.__reflowMap(); });
})();

// ===== Mobile nav =====
(function () {
  const btn = document.querySelector('[data-nav-toggle]');
  const panel = document.querySelector('[data-mobile-nav]');
  if (!btn || !panel) return;
  function closeMenu() { btn.setAttribute('aria-expanded', 'false'); panel.classList.remove('is-open'); }
  function openMenu() { btn.setAttribute('aria-expanded', 'true'); panel.classList.add('is-open'); }
  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });
  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 780) closeMenu(); });
})();

// ===== Time helpers =====
function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function fromMinutes(min) { const h = Math.floor(min / 60) % 24; const m = min % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function nextTrain(arrivalHHMM, list, marginMin) {
  marginMin = marginMin == null ? 2 : marginMin;
  const limit = toMinutes(arrivalHHMM) + marginMin;
  for (const tstr of list) { if (toMinutes(tstr) >= limit) return tstr; }
  return null;
}
function waitClass(min) { if (min == null) return 'bad'; if (min <= 10) return 'good'; if (min <= 20) return 'ok'; return 'bad'; }
function waitLabel(min) { if (min == null) return 'nessun treno utile nel quadro consultato'; return 'attesa ' + min + ' min'; }

// ===== Legend + Lines list =====
const legendList = document.getElementById('legend-list');
const linesList = document.getElementById('lines-list');
const activeLines = new Set(LINES.map(l => l.id));

function iconFor(kind) {
  if (kind === 'stazione') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/></svg>';
}

LINES.forEach(line => {
  const item = document.createElement('label');
  item.className = 'legend-item';
  item.innerHTML = `
    <input type="checkbox" checked data-line="${line.id}" />
    <span class="legend-swatch" style="background:${line.color}"></span>
    <span class="li-text"><span class="li-code">${line.code}</span><span class="li-gestore">${line.gestore}</span></span>
  `;
  legendList.appendChild(item);
});

legendList.addEventListener('change', (e) => {
  const cb = e.target;
  if (cb.matches('input[data-line]')) {
    const id = cb.getAttribute('data-line');
    if (cb.checked) activeLines.add(id); else activeLines.delete(id);
    if (window.__updateMapVisibility) window.__updateMapVisibility(activeLines);
  }
});

LINES.forEach(line => {
  const card = document.createElement('div');
  card.className = 'line-card';
  card.style.setProperty('--line-color', line.color);
  const routeStops = line.stops.map(k => STOPS[k].name).join(' → ');
  const branch = line.branch ? `<div class="line-route"><strong>Ramo:</strong> ${line.branch.map(k => STOPS[k].name).join(' → ')} <em>(${line.branchLabel})</em></div>` : '';
  card.innerHTML = `
    <div class="bar"></div>
    <div class="body">
      <div class="top-row">
        <span class="line-code">${line.code}</span>
        <span class="line-gestore">${line.gestore}</span>
      </div>
      <div class="line-name">${line.name}</div>
      <div class="line-route">${routeStops}</div>
      ${branch}
      <div class="line-meta">
        <span class="tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${line.validita}</span>
        <span class="tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${line.giorni}</span>
      </div>
      <div class="line-note">${line.note}</div>
    </div>
  `;
  linesList.appendChild(card);
});

// ===== Map (MapLibre + OpenFreeMap) =====
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [9.545, 45.565],
  zoom: 11.2,
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

map.on('load', () => {
  LINES.forEach(line => {
    const coords = line.stops.map(k => STOPS[k].coord);
    map.addSource('line-' + line.id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } });
    map.addLayer({
      id: 'layer-' + line.id, type: 'line', source: 'line-' + line.id,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': line.color, 'line-width': 4, 'line-opacity': 0.85 }
    });
    if (line.branch) {
      const bcoords = line.branch.map(k => STOPS[k].coord);
      map.addSource('branch-' + line.id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: bcoords }, properties: {} } });
      map.addLayer({
        id: 'branchlayer-' + line.id, type: 'line', source: 'branch-' + line.id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': line.color, 'line-width': 3, 'line-dasharray': [2, 1.6], 'line-opacity': 0.75 }
      });
    }
  });

  Object.entries(STOPS).forEach(([key, stop]) => {
    const el = document.createElement('div');
    const isStation = stop.kind === 'stazione';
    const isMetro = stop.kind === 'metro';
    const size = isStation ? 16 : (stop.kind === 'frazione' ? 8 : 12);
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.background = isMetro ? '#c23b5a' : (isStation ? '#16202e' : '#ffffff');
    el.style.border = '2.5px solid ' + (isStation || isMetro ? '#ffffff' : '#16202e');
    el.style.borderRadius = isStation ? '3px' : '50%';
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
    el.style.cursor = 'pointer';

    const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
      `<div class="popup-title">${stop.name}</div><div class="popup-sub">${stop.sub || (isStation ? 'Stazione ferroviaria FS' : '')}</div>`
    );
    new maplibregl.Marker({ element: el }).setLngLat(stop.coord).setPopup(popup).addTo(map);
  });
});

window.__updateMapVisibility = function (active) {
  LINES.forEach(line => {
    const vis = active.has(line.id) ? 'visible' : 'none';
    if (map.getLayer('layer-' + line.id)) map.setLayoutProperty('layer-' + line.id, 'visibility', vis);
    if (map.getLayer('branchlayer-' + line.id)) map.setLayoutProperty('branchlayer-' + line.id, 'visibility', vis);
  });
};
window.__reflowMap = function () { map.resize(); };

// ===== Trova il bus giusto (route finder) =====
function getConnection(a, b) {
  return CONNECTIONS[a + '-' + b] || CONNECTIONS[b + '-' + a] || null;
}
function lineBadge(id) {
  const line = LINES.find(l => l.id === id);
  if (!line) return '';
  return `<span class="line-chip" style="--chip-color:${line.color}">${line.code}</span>`;
}
function placeName(key) {
  const p = PLACES.find(pl => pl.key === key);
  return p ? p.name : key;
}
function placeShort(key) {
  return placeName(key).split(' ')[0];
}

const routeFrom = document.getElementById('route-from');
const routeTo = document.getElementById('route-to');
const routeResults = document.getElementById('route-results');
const routeSwap = document.getElementById('route-swap');

PLACES.forEach(p => {
  const o1 = document.createElement('option'); o1.value = p.key; o1.textContent = p.name;
  routeFrom.appendChild(o1);
  const o2 = document.createElement('option'); o2.value = p.key; o2.textContent = p.name;
  routeTo.appendChild(o2);
});
routeFrom.value = 'fara';
routeTo.value = 'vaprio';

function renderChangeCard(from, to, changeData, isAlt) {
  const legLabels = changeData.legs.map(leg => leg.map(lineBadge).join(' ')).join(' <span class="arrow">→</span> ');
  const viaName = placeName(changeData.via);
  const title = isAlt ? 'Alternativa consigliata' : `${placeName(from)} → ${placeName(to)} — cambio a ${viaName}`;
  return `
    <div class="result-card wide ${isAlt ? 'alt' : ''}">
      <div class="dest">${title}</div>
      <div class="route-lines">${legLabels}</div>
      <p class="route-freq">${changeData.desc}</p>
    </div>`;
}

function renderRoute() {
  const from = routeFrom.value;
  const to = routeTo.value;
  if (from === to) {
    routeResults.innerHTML = `<div class="result-card wide"><div class="dest">Scegli due luoghi diversi</div><p class="route-freq">Partenza e arrivo coincidono: seleziona un'altra destinazione per vedere quale bus prendere.</p></div>`;
    return;
  }
  const conn = getConnection(from, to);
  if (!conn) {
    routeResults.innerHTML = `<div class="result-card wide"><div class="dest">Collegamento non censito</div><p class="route-freq">Questa combinazione non è ancora presente nella matrice.</p></div>`;
    return;
  }
  let html = '';
  if (conn.type === 'direct' || conn.type === 'limited') {
    const badges = conn.lines.map(lineBadge).join(' ');
    const limitedTag = conn.type === 'limited' ? '<span class="tag warn">corse limitate</span>' : '';
    html += `
      <div class="result-card wide">
        <div class="dest">${placeName(from)} → ${placeName(to)} — diretto ${limitedTag}</div>
        <div class="route-lines">${badges}</div>
        <p class="route-freq">${conn.freq}</p>
        ${conn.note ? `<p class="route-note">${conn.note}</p>` : ''}
      </div>`;
    if (conn.type === 'limited' && conn.alt) html += renderChangeCard(from, to, conn.alt, true);
  } else if (conn.type === 'change') {
    html += renderChangeCard(from, to, conn, false);
  }
  routeResults.innerHTML = html;
}
routeFrom.addEventListener('change', renderRoute);
routeTo.addEventListener('change', renderRoute);
routeSwap.addEventListener('click', () => {
  const f = routeFrom.value; routeFrom.value = routeTo.value; routeTo.value = f;
  renderRoute();
});
renderRoute();

// ===== Matrice di tutte le combinazioni =====
function renderMatrix() {
  const wrap = document.getElementById('matrix-wrap');
  const table = document.createElement('table');
  table.className = 'coinc-table matrix-table';
  const thead = '<thead><tr><th></th>' + PLACES.map(p => `<th>${placeShort(p.key)}</th>`).join('') + '</tr></thead>';
  let tbody = '<tbody>';
  PLACES.forEach(rowP => {
    tbody += `<tr><th>${rowP.name}</th>`;
    PLACES.forEach(colP => {
      if (rowP.key === colP.key) { tbody += '<td class="cell-diag">—</td>'; return; }
      const conn = getConnection(rowP.key, colP.key);
      if (!conn) { tbody += '<td>—</td>'; return; }
      if (conn.type === 'direct' || conn.type === 'limited') {
        const badges = conn.lines.map(lineBadge).join(' ');
        const star = conn.type === 'limited' ? '<span class="mx-star">*</span>' : '';
        tbody += `<td>${badges}${star}</td>`;
      } else {
        tbody += `<td class="cell-change">cambio a ${placeShort(conn.via)}</td>`;
      }
    });
    tbody += '</tr>';
  });
  tbody += '</tbody>';
  table.innerHTML = thead + tbody;
  wrap.innerHTML = '';
  wrap.appendChild(table);
}
renderMatrix();

// ===== Coincidence tables =====
function buildTable(containerId, busArrivals, destinations) {
  const container = document.getElementById(containerId);
  const table = document.createElement('table');
  table.className = 'coinc-table';
  const theadCols = ['Linea bus', 'Arrivo bus'].concat(destinations.map(d => d.label));
  table.innerHTML = `<thead><tr>${theadCols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  const tbody = document.createElement('tbody');
  busArrivals.forEach(row => {
    const tr = document.createElement('tr');
    let cells = `<td>${row.linea}</td><td class="cell-time">${row.ora}</td>`;
    destinations.forEach(d => {
      const trainTime = nextTrain(row.ora, d.list);
      const wait = trainTime ? (toMinutes(trainTime) - toMinutes(row.ora)) : null;
      cells += `<td class="cell-time">${trainTime || '—'} <span class="badge ${waitClass(wait)}">${wait != null ? wait + "'" : 'n/d'}</span></td>`;
    });
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);
}

buildTable('tbl-treviglio', BUS_ARRIVI_TREVIGLIO, [
  { label: 'Treno → Milano', list: TRAINS.treviglio_milano },
  { label: 'Treno → Bergamo', list: TRAINS.treviglio_bergamo },
]);
buildTable('tbl-cassano', BUS_ARRIVI_CASSANO, [
  { label: 'Treno → Milano', list: TRAINS.cassano_milano },
  { label: 'Treno → Treviglio/Bergamo', list: TRAINS.cassano_treviglio },
]);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tbl-treviglio').style.display = btn.dataset.target === 'tbl-treviglio' ? 'block' : 'none';
    document.getElementById('tbl-cassano').style.display = btn.dataset.target === 'tbl-cassano' ? 'block' : 'none';
  });
});

// ===== Critical routes =====
const CRITICAL = [
  {
    route: 'Fara Gera d\'Adda ↔ Cassano d\'Adda',
    text: 'Non esiste una linea diretta e frequente: la T10 ha solo poche corse dirette a metà giornata e in tarda serata (es. arrivi a Cassano FS verso le 18:25). Nella fascia scolastica/lavorativa (7-9 e 17-19) conviene sempre il cambio B812 fino a Vaprio + Z309 fino a Cassano FS, per un totale di circa 35-40 minuti con un solo interscambio.'
  },
  {
    route: 'Rientro pomeridiano verso Bergamo (13-16)',
    text: 'Diversi bus in arrivo a Treviglio FS nella fascia 13:00-16:30 lasciano un\'attesa di 30-45 minuti prima del treno per Bergamo (che parte solo al minuto :07 di ogni ora). Se la destinazione finale è verso Bergamo, vale la pena controllare se un bus leggermente più tardo riduce l\'attesa, invece di prendere il primo bus disponibile.'
  },
  {
    route: 'Domenica e festivi su tutta l\'area',
    text: 'T10, B812 e Z309 non garantiscono corse nei giorni festivi. L\'unica rete continuativa è Z311 (Vaprio-Gessate M2) e z405 (Cassano-Gessate-Treviglio): per Fara e Canonica, che non sono su queste linee, la domenica il bus è di fatto assente e serve valutare un passaggio in auto fino a Vaprio o Cassano.'
  },
  {
    route: 'Finestra 14 settembre 2026 (cambio orario)',
    text: 'Nella settimana del cambio da orario estivo a invernale/scolastico gli orari pubblicati possono variare anche di diversi minuti sulle stesse corse, e si aggiungono le corse scolastiche (sigle S5/S6/SSab). Chi deve arrivare puntuale a scuola o al lavoro dovrebbe riverificare gli orari il 14-15/09 anche se li ha già controllati a inizio settembre.'
  },
];

const criticalList = document.getElementById('critical-list');
CRITICAL.forEach(c => {
  const card = document.createElement('div');
  card.className = 'critical-card';
  card.innerHTML = `
    <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
    <div><h4>${c.route}</h4><p>${c.text}</p></div>
  `;
  criticalList.appendChild(card);
});

// ===== Sources =====
const SOURCES = [
  { name: 'SAI Autolinee — orari e linee (T10, B812)', url: 'https://www.saiautolinee.it', op: 'SAI / Bergamo Trasporti' },
  { name: 'Bergamo Trasporti — linee e orari', url: 'https://www.bergamotrasporti.it', op: 'SAI / Bergamo Trasporti' },
  { name: 'Nord Est Trasporti — orari Z309/Z311', url: 'https://www.nordesttrasporti.it', op: 'NET' },
  { name: 'Autoguidovie Milano Sud Est — linea z405', url: 'https://milanosudest.autoguidovie.it', op: 'Autoguidovie' },
  { name: 'RFI — Quadri orario online (stazioni)', url: 'https://www.rfi.it/it/stazioni/pagine-stazioni/servizi-di-qualita/informazioni-al-pubblico/quadri-orario-on-line.html', op: 'RFI' },
  { name: 'RFI — Quadro orario partenze, Treviglio', url: 'https://prm.rfi.it/qo_prm/QO_Partenze_SiPMR.aspx?Id=2712', op: 'RFI' },
  { name: 'RFI — Quadro orario partenze, Cassano d\'Adda', url: 'https://prm.rfi.it/qo_prm/QO_Partenze_SiPMR.aspx?Id=882&lin=it&dalle=00.00&alle=23.59&ora=00.00', op: 'RFI' },
  { name: 'Trenord — Orario ferroviario e circolazione', url: 'https://www.trenord.it/linee-e-orari/circolazione/orario-ferroviario/', op: 'Trenord' },
  { name: 'Trenord — Quadro S5/S6 Varese/Novara–Milano–Treviglio (PDF)', url: 'https://www.trenord.it/fileadmin/contenuti/TRENORD/2-Linee_e_orari/Orario_ferroviario/ORARIO_in_vigore/QS5-S6_giugno_2026.pdf', op: 'Trenord' },
];
const sourcesList = document.getElementById('sources-list');
SOURCES.forEach(s => {
  const item = document.createElement('div');
  item.className = 'source-item';
  item.innerHTML = `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a><span class="op">${s.op}</span>`;
  sourcesList.appendChild(item);
});

