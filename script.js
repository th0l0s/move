/* Adda Transit — logica della pagina.
   I dati stanno tutti in data.js: qui c'e' solo come vengono mostrati.
   Niente framework, niente build: si apre il file e funziona. */

// ===== Tema chiaro/scuro =====
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  const SALVATO = 'adda.tema';
  let mode;
  try { mode = localStorage.getItem(SALVATO); } catch (e) { mode = null; }
  if (mode !== 'dark' && mode !== 'light') mode = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  const icons = {
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  };
  function apply() {
    root.setAttribute('data-theme', mode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0f1520' : '#f4f6f9');
    if (t) { t.innerHTML = mode === 'dark' ? icons.dark : icons.light; t.setAttribute('aria-label', 'Passa al tema ' + (mode === 'dark' ? 'chiaro' : 'scuro')); }
  }
  apply();
  if (t) t.addEventListener('click', () => {
    mode = mode === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(SALVATO, mode); } catch (e) { /* modalita' privata: pazienza */ }
    apply();
    if (window.__reflowMap) window.__reflowMap();
  });
})();

// ===== Menu su telefono =====
(function () {
  const btn = document.querySelector('[data-nav-toggle]');
  const panel = document.querySelector('[data-mobile-nav]');
  if (!btn || !panel) return;
  function closeMenu() { btn.setAttribute('aria-expanded', 'false'); panel.classList.remove('is-open'); }
  function openMenu() { btn.setAttribute('aria-expanded', 'true'); panel.classList.add('is-open'); }
  btn.addEventListener('click', () => {
    btn.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 780) closeMenu(); });
})();

// ===== Utilita' =====
function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function nextTrain(arrivalHHMM, list, marginMin) {
  const arr = toMinutes(arrivalHHMM) + (marginMin || 0);
  for (const t of list) if (toMinutes(t) >= arr) return t;
  return null;
}
function waitClass(min) { if (min == null) return 'bad'; if (min <= 10) return 'good'; if (min <= 20) return 'ok'; return 'bad'; }
function waitWord(min) { if (min == null) return 'nessun treno'; if (min <= 10) return 'comoda'; if (min <= 20) return 'media'; return 'lunga'; }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function getLine(id) { return LINES.find((l) => l.id === id) || null; }
function getConnection(a, b) { return CONNECTIONS[a + '-' + b] || CONNECTIONS[b + '-' + a] || null; }
function placeName(key) { const p = PLACES.find((pl) => pl.key === key); return p ? p.name : key; }
function placeShort(key) { return placeName(key).split(' ')[0]; }

/* Il colore della linea arriva dalla variabile CSS, cosi' cambia da solo
   fra tema chiaro e scuro. La mappa usa invece line.color, perche' le
   tile sono sempre chiare. */
function lineChip(id, extra) {
  const line = getLine(id);
  if (!line) return '';
  return `<span class="line-chip line-${line.id}${extra ? ' ' + extra : ''}">${esc(line.code)}</span>`;
}

/* La linea circola nel giorno scelto? */
function lineRuns(id, quando) {
  const line = getLine(id);
  if (!line) return false;
  return quando === 'weekend' ? !!line.festivi : true;
}

// ===== Avviso del cambio orario =====
(function () {
  const box = document.getElementById('change-banner');
  if (!box) return;
  const cambio = new Date(2026, 8, 14);          // 14 settembre 2026
  const oggi = new Date();
  const giorni = Math.ceil((cambio - oggi) / 86400000);
  let testo = null;
  if (giorni > 0 && giorni <= 21) {
    testo = `<strong>Fra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'} cambiano gli orari.</strong> Il 14 settembre finisce l'orario estivo e partono le corse scolastiche. Dal 13 in poi ricontrolla il libretto della tua linea, anche se lo hai già guardato.`;
  } else if (giorni <= 0 && giorni > -14) {
    testo = `<strong>Gli orari sono cambiati il 14 settembre.</strong> Sono partite le corse scolastiche e alcune partenze si sono spostate di qualche minuto. Controlla il libretto della tua linea prima di fidarti di un orario vecchio.`;
  }
  if (!testo) return;
  box.innerHTML = testo;
  box.hidden = false;
})();

// ===== Lo strumento: da dove parti, dove vai =====
const routeFrom = document.getElementById('route-from');
const routeTo = document.getElementById('route-to');
const routeResults = document.getElementById('route-results');
const routeSwap = document.getElementById('route-swap');
let quando = 'scuola';

PLACES.forEach((p) => {
  const o1 = document.createElement('option'); o1.value = p.key; o1.textContent = p.name; routeFrom.appendChild(o1);
  const o2 = document.createElement('option'); o2.value = p.key; o2.textContent = p.name; routeTo.appendChild(o2);
});

/* Se arrivi da un link condiviso, la tratta e' gia' impostata. */
(function () {
  const q = new URLSearchParams(location.search);
  const da = q.get('da'), a = q.get('a');
  const valido = (k) => PLACES.some((p) => p.key === k);
  routeFrom.value = valido(da) ? da : 'fara';
  routeTo.value = valido(a) ? a : 'treviglio';
  if (routeFrom.value === routeTo.value) routeTo.value = PLACES.find((p) => p.key !== routeFrom.value).key;
})();

/* "Vado a scuola" e "Torno a casa" sono la stessa tratta al contrario:
   invertono i due campi. "Weekend" non inverte, filtra le linee. */
function setQuando(nuovo, btn) {
  document.querySelectorAll('.when-btn').forEach((b) => {
    const on = b === btn;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if ((nuovo === 'casa' && quando !== 'casa') || (nuovo !== 'casa' && quando === 'casa')) scambia();
  quando = nuovo;
  renderRoute();
}
function scambia() {
  const f = routeFrom.value; routeFrom.value = routeTo.value; routeTo.value = f;
}

function freqUmana(testo) {
  if (!testo) return '';
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

function bloccoCambio(dati) {
  const gambe = dati.legs.map((leg) => leg.map((id) => lineChip(id)).join('<span class="oppure">o</span>'))
    .join('<span class="freccia" aria-hidden="true">→</span>');
  return `
    <div class="leg-row">${gambe}</div>
    <p class="result-desc">${esc(dati.desc)}</p>`;
}

/* Se scendi in stazione, il treno dopo interessa quanto il bus. */
function bloccoTreni(to) {
  if (to !== 'treviglio' && to !== 'cassano') return '';
  const conf = to === 'treviglio'
    ? { arrivi: BUS_ARRIVI_TREVIGLIO, mete: [['Milano', TRAINS.treviglio_milano], ['Bergamo', TRAINS.treviglio_bergamo]], nome: 'Treviglio' }
    : { arrivi: BUS_ARRIVI_CASSANO, mete: [['Milano', TRAINS.cassano_milano], ['Treviglio', TRAINS.cassano_treviglio]], nome: "Cassano d'Adda" };
  const righe = conf.mete.map(([meta, lista]) => {
    const attese = conf.arrivi.map((a) => {
      const t = nextTrain(a.ora, lista);
      return t ? toMinutes(t) - toMinutes(a.ora) : null;
    }).filter((x) => x != null);
    if (!attese.length) return '';
    const media = Math.round(attese.reduce((s, x) => s + x, 0) / attese.length);
    return `<li><span>Treno per ${meta}</span><span class="badge ${waitClass(media)}">in media ${media}' <span class="badge-word">${waitWord(media)}</span></span></li>`;
  }).join('');
  return `
    <div class="result-extra">
      <h4>E poi il treno da ${conf.nome}</h4>
      <ul class="mini-list">${righe}</ul>
      <a class="text-link" href="#treni">Vedi tutte le coincidenze</a>
    </div>`;
}

function renderRoute() {
  const from = routeFrom.value;
  const to = routeTo.value;
  aggiornaUrl(from, to);

  if (from === to) {
    routeResults.innerHTML = `<div class="result-card"><p class="result-head">Scegli due posti diversi</p><p class="result-desc">Partenza e arrivo sono lo stesso luogo.</p></div>`;
    return;
  }
  const conn = getConnection(from, to);
  if (!conn) {
    routeResults.innerHTML = `<div class="result-card"><p class="result-head">Questa tratta non c'è</p><p class="result-desc">Non è fra le combinazioni che abbiamo verificato.</p></div>`;
    return;
  }

  const diretto = conn.type === 'direct' || conn.type === 'limited';
  /* Vale la domenica? Per un diretto basta una linea festiva; con un
     cambio servono entrambi i pezzi del viaggio. */
  const domenicaOk = diretto
    ? conn.lines.some((id) => lineRuns(id, 'weekend'))
    : conn.legs.every((leg) => leg.some((id) => lineRuns(id, 'weekend')));

  let titolo, sottotitolo, corpo;
  if (diretto) {
    titolo = conn.type === 'limited' ? 'Diretto, ma con poche corse' : 'Diretto, nessun cambio';
    sottotitolo = conn.lines.map((id) => lineChip(id)).join('<span class="oppure">o</span>');
    corpo = `<p class="result-desc">${freqUmana(conn.freq)}${conn.note ? ' ' + esc(conn.note) : ''}</p>`;
  } else {
    titolo = `Un cambio, a ${placeShort(conn.via)}`;
    sottotitolo = '';
    corpo = bloccoCambio(conn);
  }

  let avvisi = '';
  if (quando === 'weekend' && !domenicaOk) {
    avvisi += `<p class="alert stop"><strong>La domenica questo bus non c'è.</strong> ${diretto
      ? 'Nessuna delle linee di questa tratta circola nei festivi.'
      : 'Almeno uno dei due pezzi del viaggio non è coperto nei festivi.'} Il sabato invece si viaggia, con meno corse.</p>`;
  } else if (quando === 'weekend') {
    avvisi += `<p class="alert ok"><strong>La domenica funziona.</strong> Le linee di questa tratta circolano anche nei festivi, con meno corse del solito.</p>`;
  } else if (!domenicaOk) {
    avvisi += `<p class="alert warn">Dal lunedì al sabato va bene. <strong>La domenica no</strong>: nei festivi questa tratta non è coperta.</p>`;
  }
  if (conn.type === 'limited' && conn.alt) {
    avvisi += `<div class="alt-box"><p class="alt-head">Meglio così</p>${bloccoCambio(conn.alt)}</div>`;
  }

  routeResults.innerHTML = `
    <div class="result-card">
      <p class="result-route">${esc(placeName(from))} <span aria-hidden="true">→</span> ${esc(placeName(to))}</p>
      <p class="result-head">${titolo}</p>
      ${sottotitolo ? `<div class="leg-row">${sottotitolo}</div>` : ''}
      ${corpo}
      ${avvisi}
      ${bloccoTreni(to)}
      <div class="result-actions">
        <button type="button" class="act" id="act-save"></button>
        <button type="button" class="act" id="act-share">Condividi</button>
      </div>
    </div>`;

  collegaAzioni(from, to);
}

function aggiornaUrl(from, to) {
  if (!history.replaceState) return;
  const u = new URL(location.href);
  u.searchParams.set('da', from);
  u.searchParams.set('a', to);
  history.replaceState(null, '', u);
}

routeFrom.addEventListener('change', renderRoute);
routeTo.addEventListener('change', renderRoute);
routeSwap.addEventListener('click', () => { scambia(); renderRoute(); });
document.querySelectorAll('.when-btn').forEach((b) => {
  b.setAttribute('aria-pressed', b.classList.contains('is-on') ? 'true' : 'false');
  b.addEventListener('click', () => setQuando(b.dataset.when, b));
});

// ===== Le mie tratte, salvate solo qui =====
const SAVE_KEY = 'adda.tratte.v1';
function leggiSalvate() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch (e) { return []; }
}
function scriviSalvate(v) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(v.slice(0, 8))); } catch (e) { /* storage bloccato */ }
}
function eSalvata(from, to) {
  return leggiSalvate().some((t) => t.da === from && t.a === to);
}
function collegaAzioni(from, to) {
  const save = document.getElementById('act-save');
  const share = document.getElementById('act-share');
  if (save) {
    const gia = eSalvata(from, to);
    save.textContent = gia ? 'Salvata' : 'Salva tratta';
    save.classList.toggle('is-on', gia);
    save.onclick = () => {
      let v = leggiSalvate();
      v = gia ? v.filter((t) => !(t.da === from && t.a === to)) : [{ da: from, a: to }].concat(v);
      scriviSalvate(v);
      renderSalvate();
      collegaAzioni(from, to);
    };
  }
  if (share) {
    share.onclick = async () => {
      const u = new URL(location.href);
      u.searchParams.set('da', from); u.searchParams.set('a', to);
      const testo = `${placeName(from)} → ${placeName(to)}: che bus prendere`;
      if (navigator.share) {
        try { await navigator.share({ title: 'Adda Transit', text: testo, url: u.toString() }); return; } catch (e) { return; }
      }
      window.open('https://wa.me/?text=' + encodeURIComponent(testo + ' ' + u.toString()), '_blank', 'noopener');
    };
  }
}

function renderSalvate() {
  const box = document.getElementById('saved-list');
  if (!box) return;
  const v = leggiSalvate();
  if (!v.length) {
    box.innerHTML = `<p class="saved-empty">Non ne hai ancora salvate. Cerca una tratta qui sopra e tocca <strong>Salva tratta</strong>: la ritrovi qui ogni volta che apri la pagina.</p>`;
    return;
  }
  box.innerHTML = v.map((t) => {
    const conn = getConnection(t.da, t.a);
    const chip = conn && (conn.type === 'direct' || conn.type === 'limited')
      ? conn.lines.map((id) => lineChip(id)).join('')
      : `<span class="mx-change">cambio a ${esc(placeShort(conn ? conn.via : ''))}</span>`;
    return `<button type="button" class="saved-item" data-da="${esc(t.da)}" data-a="${esc(t.a)}">
        <span class="saved-names">${esc(placeShort(t.da))} <span aria-hidden="true">→</span> ${esc(placeShort(t.a))}</span>
        <span class="saved-lines">${chip}</span>
      </button>`;
  }).join('');
  box.querySelectorAll('.saved-item').forEach((b) => {
    b.addEventListener('click', () => {
      routeFrom.value = b.dataset.da;
      routeTo.value = b.dataset.a;
      renderRoute();
      document.getElementById('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

renderRoute();
renderSalvate();

// ===== Legenda e schede delle linee =====
const legendList = document.getElementById('legend-list');
const linesList = document.getElementById('lines-list');
const activeLines = new Set(LINES.map((l) => l.id));

LINES.forEach((line) => {
  const item = document.createElement('label');
  item.className = 'legend-item';
  item.innerHTML = `
    <input type="checkbox" checked data-line="${line.id}" />
    <span class="legend-swatch line-${line.id}"></span>
    <span class="li-text"><span class="li-code">${esc(line.code)}</span>${line.alias ? `<span class="li-alias">${esc(line.alias)}</span>` : ''}<span class="li-gestore">${esc(line.gestore)}</span></span>`;
  legendList.appendChild(item);
});
legendList.addEventListener('change', (e) => {
  const cb = e.target;
  if (!cb.matches('input[data-line]')) return;
  const id = cb.getAttribute('data-line');
  if (cb.checked) activeLines.add(id); else activeLines.delete(id);
  if (window.__updateMapVisibility) window.__updateMapVisibility(activeLines);
});

LINES.forEach((line) => {
  const card = document.createElement('article');
  card.className = 'line-card line-' + line.id;
  const percorso = line.stops.map((k) => STOPS[k].name).join(' · ');
  const ramo = line.branch
    ? `<p class="line-route"><strong>Ramo:</strong> ${line.branch.map((k) => STOPS[k].name).join(' · ')} <em>(${esc(line.branchLabel)})</em></p>`
    : '';
  card.innerHTML = `
    <div class="bar"></div>
    <div class="body">
      <div class="top-row">
        <span class="line-chip line-${line.id}">${esc(line.code)}</span>
        ${line.alias ? `<span class="line-alias">${esc(line.alias)}</span>` : ''}
        <span class="line-gestore">${esc(line.gestore)}</span>
      </div>
      <p class="line-route">${esc(percorso)}</p>
      ${ramo}
      <p class="line-days ${line.festivi ? 'ok' : 'no'}">${line.festivi ? 'Passa tutti i giorni, domenica compresa' : 'Dal lunedì al sabato. La domenica non passa'}</p>
      <p class="line-when">${esc(line.validita)}</p>
      <p class="line-note">${esc(line.note)}</p>
    </div>`;
  linesList.appendChild(card);
});

// ===== Tutte le tratte, una lista per luogo di partenza =====
(function () {
  const wrap = document.getElementById('matrix-list');
  if (!wrap) return;
  wrap.innerHTML = PLACES.map((rowP) => {
    const righe = PLACES.filter((p) => p.key !== rowP.key).map((colP) => {
      const conn = getConnection(rowP.key, colP.key);
      let valore;
      if (!conn) valore = '<span class="mx-none">nessun dato</span>';
      else if (conn.type === 'change') valore = `<span class="mx-change">cambio a ${esc(placeShort(conn.via))}</span>`;
      else valore = conn.lines.map((id) => lineChip(id)).join('') + (conn.type === 'limited' ? '<span class="mx-star" title="poche corse">*</span>' : '');
      return `<li><span class="mx-dest">${esc(colP.name)}</span><span class="mx-val">${valore}</span></li>`;
    }).join('');
    return `<details class="mx-group"><summary>Da ${esc(rowP.name)}</summary><ul>${righe}</ul></details>`;
  }).join('');
})();

// ===== Coincidenze coi treni, in righe leggibili =====
function buildCoinc(containerId, arrivi, mete) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = arrivi.map((row) => {
    const celle = mete.map((d) => {
      const treno = nextTrain(row.ora, d.list);
      const attesa = treno ? toMinutes(treno) - toMinutes(row.ora) : null;
      return `<li><span class="cn-dest">${esc(d.label)}</span>
        <span class="cn-time">${treno || '—'}</span>
        <span class="badge ${waitClass(attesa)}">${attesa != null ? attesa + "'" : 'n/d'} <span class="badge-word">${waitWord(attesa)}</span></span></li>`;
    }).join('');
    return `<article class="cn-card">
        <header class="cn-head">${lineChip(row.line)}<span class="cn-arrivo">arrivi alle <strong>${esc(row.ora)}</strong></span></header>
        <ul class="cn-body">${celle}</ul>
      </article>`;
  }).join('');
}
buildCoinc('tbl-treviglio', BUS_ARRIVI_TREVIGLIO, [
  { label: 'Treno per Milano', list: TRAINS.treviglio_milano },
  { label: 'Treno per Bergamo', list: TRAINS.treviglio_bergamo },
]);
buildCoinc('tbl-cassano', BUS_ARRIVI_CASSANO, [
  { label: 'Treno per Milano', list: TRAINS.cassano_milano },
  { label: 'Treno per Treviglio', list: TRAINS.cassano_treviglio },
]);

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      document.getElementById(b.dataset.target).hidden = !on;
    });
  });
});

// ===== Tratte fragili e fonti =====
const CRITICAL = [
  {
    route: "Fara Gera d'Adda ↔ Cassano d'Adda",
    text: "Non c'è una linea diretta e frequente. La T10 ha solo poche corse dirette, a metà giornata e in tarda serata. La mattina e nel tardo pomeriggio conta sul cambio a Vaprio: B812 fino a Vaprio, poi Z309 fino alla stazione di Cassano, circa 35-40 minuti in tutto."
  },
  {
    route: 'Rientro verso Bergamo nel pomeriggio',
    text: 'Il treno per Bergamo parte al minuto :07 di ogni ora. Diversi bus arrivano a Treviglio fra le 13 e le 16:30 lasciandoti 30-45 minuti di attesa. A volte prendere il bus dopo ti fa arrivare alla stessa ora, ma aspettando molto meno in stazione.'
  },
  {
    route: 'Domenica, ovunque',
    text: "T10, B812 e Z309 non passano. Restano solo Z311 e z405. Da Fara e da Canonica, che non sono su queste due linee, la domenica il bus non c'è: ti serve un passaggio fino a Vaprio o a Cassano."
  },
  {
    route: 'La settimana del 14 settembre 2026',
    text: "Nei giorni del cambio orario le stesse corse possono spostarsi di diversi minuti e si aggiungono quelle scolastiche, segnate con le sigle S5, S6 e SSab. Se devi arrivare puntuale, ricontrolla gli orari il 14 e il 15, anche se li avevi già guardati."
  },
];
const criticalList = document.getElementById('critical-list');
if (criticalList) {
  criticalList.innerHTML = CRITICAL.map((c) => `<div class="critical-card"><h4>${esc(c.route)}</h4><p>${esc(c.text)}</p></div>`).join('');
}

const SOURCES = [
  { name: 'SAI Autolinee, orari di T10 e B812', url: 'https://www.saiautolinee.it', op: 'SAI / Bergamo Trasporti' },
  { name: 'Bergamo Trasporti, linee e orari', url: 'https://www.bergamotrasporti.it', op: 'SAI / Bergamo Trasporti' },
  { name: 'Nord Est Trasporti, orari di Z309 e Z311', url: 'https://www.nordesttrasporti.it', op: 'NET' },
  { name: 'Autoguidovie Milano Sud Est, linea z405', url: 'https://milanosudest.autoguidovie.it', op: 'Autoguidovie' },
  { name: 'RFI, quadri orario delle stazioni', url: 'https://www.rfi.it/it/stazioni/pagine-stazioni/servizi-di-qualita/informazioni-al-pubblico/quadri-orario-on-line.html', op: 'RFI' },
  { name: 'RFI, partenze da Treviglio', url: 'https://prm.rfi.it/qo_prm/QO_Partenze_SiPMR.aspx?Id=2712', op: 'RFI' },
  { name: "RFI, partenze da Cassano d'Adda", url: 'https://prm.rfi.it/qo_prm/QO_Partenze_SiPMR.aspx?Id=882&lin=it&dalle=00.00&alle=23.59&ora=00.00', op: 'RFI' },
  { name: 'Trenord, orario ferroviario e circolazione', url: 'https://www.trenord.it/linee-e-orari/circolazione/orario-ferroviario/', op: 'Trenord' },
  { name: 'Trenord, quadro S5 e S6 verso Treviglio (PDF)', url: 'https://www.trenord.it/fileadmin/contenuti/TRENORD/2-Linee_e_orari/Orario_ferroviario/ORARIO_in_vigore/QS5-S6_giugno_2026.pdf', op: 'Trenord' },
];
const sourcesList = document.getElementById('sources-list');
if (sourcesList) {
  sourcesList.innerHTML = SOURCES.map((s) =>
    `<a class="source-item" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}<span class="op">${esc(s.op)}</span></a>`).join('');
}

// ===== Mappa: si carica solo quando serve =====
(function () {
  const box = document.getElementById('map');
  const btn = document.getElementById('map-load');
  if (!box) return;
  let avviata = false;

  function caricaScript() {
    return new Promise((ok, ko) => {
      if (window.maplibregl) return ok();
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'vendor/maplibre-gl.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'vendor/maplibre-gl.js';
      s.onload = ok; s.onerror = ko;
      document.head.appendChild(s);
    });
  }

  function disegna() {
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [9.545, 45.565],
      zoom: 11.2,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      LINES.forEach((line) => {
        const coords = line.stops.map((k) => STOPS[k].coord);
        map.addSource('line-' + line.id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } });
        map.addLayer({
          id: 'layer-' + line.id, type: 'line', source: 'line-' + line.id,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': line.color, 'line-width': 4, 'line-opacity': 0.85 }
        });
        if (line.branch) {
          const b = line.branch.map((k) => STOPS[k].coord);
          map.addSource('branch-' + line.id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: b }, properties: {} } });
          map.addLayer({
            id: 'branchlayer-' + line.id, type: 'line', source: 'branch-' + line.id,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': line.color, 'line-width': 3, 'line-dasharray': [2, 1.6], 'line-opacity': 0.75 }
          });
        }
      });
      Object.entries(STOPS).forEach(([, stop]) => {
        const el = document.createElement('div');
        const isStation = stop.kind === 'stazione';
        const isMetro = stop.kind === 'metro';
        const size = isStation ? 16 : (stop.kind === 'frazione' ? 8 : 12);
        el.style.cssText = `width:${size}px;height:${size}px;background:${isMetro ? '#c23b5a' : (isStation ? '#16202e' : '#ffffff')};border:2.5px solid ${isStation || isMetro ? '#ffffff' : '#16202e'};border-radius:${isStation ? '3px' : '50%'};box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:pointer`;
        const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
          .setHTML(`<div class="popup-title">${esc(stop.name)}</div><div class="popup-sub">${esc(stop.sub || (isStation ? 'Stazione dei treni' : ''))}</div>`);
        new maplibregl.Marker({ element: el }).setLngLat(stop.coord).setPopup(popup).addTo(map);
      });
    });
    window.__updateMapVisibility = function (attive) {
      LINES.forEach((line) => {
        const vis = attive.has(line.id) ? 'visible' : 'none';
        if (map.getLayer('layer-' + line.id)) map.setLayoutProperty('layer-' + line.id, 'visibility', vis);
        if (map.getLayer('branchlayer-' + line.id)) map.setLayoutProperty('branchlayer-' + line.id, 'visibility', vis);
      });
    };
    window.__reflowMap = function () { map.resize(); };
  }

  function avvia() {
    if (avviata) return;
    avviata = true;
    if (btn) btn.remove();
    box.classList.add('is-loading');
    caricaScript().then(() => { box.classList.remove('is-loading'); disegna(); })
      .catch(() => { box.classList.remove('is-loading'); box.innerHTML = '<p class="map-error">La mappa non si è caricata. Le linee e le fermate le trovi comunque qui sotto.</p>'; });
  }

  if (btn) btn.addEventListener('click', avvia);
  /* Su schermi larghi la mappa parte da sola appena si avvicina.
     Su telefono resta il pulsante, per non bruciare dati sulla rete della scuola. */
  if (window.innerWidth > 780 && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); avvia(); }
    }, { rootMargin: '200px' });
    io.observe(box);
  }
})();

// ===== App installabile =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* niente offline: la pagina funziona lo stesso */ }));
}
