/* Adda Transit — logica della pagina.
   I dati stanno tutti in data.js: qui c'e' solo come vengono usati e mostrati.
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
function lineCode(id) { const l = getLine(id); return l ? l.code : id; }
function placeName(key) {
  const p = PLACES.find((pl) => pl.key === key);
  if (p) return p.name;
  return STOPS[key] ? STOPS[key].name : key;
}
function placeShort(key) { return placeName(key).split(' ')[0]; }

/* Il colore della linea arriva dalla variabile CSS, cosi' cambia da solo
   fra tema chiaro e scuro. La mappa usa invece line.color, perche' le
   tile sono sempre chiare. */
function lineChip(id, extra) {
  const line = getLine(id);
  if (!line) return '';
  return `<span class="line-chip line-${line.id}${extra ? ' ' + extra : ''}">${esc(line.code)}</span>`;
}

/* ===== Il motore: quali bus collegano davvero due posti =====
   Ogni linea porta gli elenchi fermate ufficiali, uno per direzione. Una tratta esiste
   solo se c'e' una direzione che tocca prima la partenza e poi l'arrivo. Cosi' la pagina
   non promette corse che non esistono: la T10, per dire, ferma a Fara Gera d'Adda solo
   nelle corse verso Treviglio, e da Fara verso Trezzo non serve a niente.
   Un paese puo' comparire due volte in una direzione (la B812 entra a Vaprio e torna
   indietro da Canonica): per questo si confronta la prima occorrenza della partenza con
   l'ultima dell'arrivo. */

function rottaCopre(rotta, da, a) {
  const i = rotta.stops.indexOf(da);
  const j = rotta.stops.lastIndexOf(a);
  return i !== -1 && j !== -1 && i < j;
}

/* Le linee che portano da "da" ad "a", con quello che c'e' da sapere su ognuna. */
function lineeChePortano(da, a, soloFestivi) {
  const out = [];
  LINES.forEach((line) => {
    if (soloFestivi && !line.festivi) return;
    const rotte = line.rotte.filter((r) => rottaCopre(r, da, a));
    if (!rotte.length) return;
    const piene = rotte.filter((r) => !r.limitata);
    const usate = piene.length ? piene : rotte;
    const limitata = !piene.length;
    const ritorno = line.rotte.filter((r) => rottaCopre(r, a, da) && (limitata || !r.limitata));
    out.push({
      id: line.id,
      limitata,
      scolastica: usate.every((r) => r.solo === 'scolastico'),
      soloAndata: ritorno.length === 0,
      dir: usate[0].dir,
      freq: line.freq,
      festivi: !!line.festivi,
    });
  });
  return out;
}

/* Un solo cambio, nel posto piu' comodo fra quelli elencati in HUBS. */
function trovaCambio(da, a, soloFestivi) {
  for (const via of HUBS) {
    if (via === da || via === a) continue;
    const prima = lineeChePortano(da, via, soloFestivi).filter((o) => !o.limitata);
    const dopo = lineeChePortano(via, a, soloFestivi).filter((o) => !o.limitata);
    if (prima.length && dopo.length) return { tipo: 'cambio', via, gambe: [prima, dopo] };
  }
  return null;
}

/* La risposta completa per una tratta, nel giorno scelto. */
function risolvi(da, a, soloFestivi) {
  const dirette = lineeChePortano(da, a, soloFestivi);
  const piene = dirette.filter((o) => !o.limitata);
  if (piene.length) {
    return { tipo: 'diretto', opzioni: piene, limitate: dirette.filter((o) => o.limitata) };
  }
  if (dirette.length) {
    return { tipo: 'poche', opzioni: dirette, alt: trovaCambio(da, a, soloFestivi) };
  }
  return trovaCambio(da, a, soloFestivi) || { tipo: 'niente' };
}

/* Riassunto in una riga, per la lista delle tratte salvate e per la matrice. */
function riassunto(da, a) {
  const r = risolvi(da, a, false);
  if (r.tipo === 'diretto' || r.tipo === 'poche') {
    return r.opzioni.map((o) => lineChip(o.id)).join('') + (r.tipo === 'poche' ? '<span class="mx-star" title="poche corse">*</span>' : '');
  }
  if (r.tipo === 'cambio') return `<span class="mx-change">cambio a ${esc(placeShort(r.via))}</span>`;
  return '<span class="mx-none">nessun bus</span>';
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

// ===== Lo strumento: dove ti trovi, dove vuoi andare =====
const routeFrom = document.getElementById('route-from');
const routeTo = document.getElementById('route-to');
const routeResults = document.getElementById('route-results');
const routeSwap = document.getElementById('route-swap');
let giorno = 'feriale';   // 'feriale' oppure 'domenica'

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

function setGiorno(nuovo, btn) {
  document.querySelectorAll('.when-btn').forEach((b) => {
    const on = b === btn;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  giorno = nuovo;
  renderRoute();
}
function scambia() {
  const f = routeFrom.value; routeFrom.value = routeTo.value; routeTo.value = f;
}

function elencoLinee(opzioni, sep) {
  return opzioni.map((o) => lineCode(o.id)).join(sep || ' o la ');
}
function chipLinee(opzioni) {
  return opzioni.map((o) => lineChip(o.id)).join('<span class="oppure">o</span>');
}
function bloccoCambio(c, arrivo) {
  const gambe = c.gambe.map((g) => chipLinee(g)).join('<span class="freccia" aria-hidden="true">→</span>');
  const testo = `Prendi la ${elencoLinee(c.gambe[0])} fino a ${placeName(c.via)}, poi la ${elencoLinee(c.gambe[1])} fino a ${placeName(arrivo)}.`;
  return `<div class="leg-row">${gambe}</div><p class="result-desc">${esc(testo)}</p>`;
}

/* Se scendi in stazione il treno dopo interessa, ma qui si parla di bus:
   sta in secondo piano, chiuso, e si apre se serve davvero. */
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
    <details class="result-treni dim-block">
      <summary>Se poi prendi il treno da ${conf.nome}</summary>
      <ul class="mini-list">${righe}</ul>
      <a class="text-link" href="#treni">Vedi tutte le coincidenze</a>
    </details>`;
}

function renderRoute() {
  const from = routeFrom.value;
  const to = routeTo.value;
  aggiornaUrl(from, to);

  if (from === to) {
    routeResults.innerHTML = `<div class="result-card"><p class="result-head">Scegli due posti diversi</p><p class="result-desc">Dove ti trovi e dove vuoi andare sono lo stesso posto.</p></div>`;
    return;
  }

  const feriale = risolvi(from, to, false);
  const festivo = risolvi(from, to, true);
  const r = giorno === 'domenica' ? festivo : feriale;
  const nota = NOTE_TRATTE[from + '-' + to] || NOTE_TRATTE[to + '-' + from] || '';

  let titolo = '', sottotitolo = '', corpo = '', avvisi = '';

  if (r.tipo === 'diretto' || r.tipo === 'poche') {
    titolo = r.tipo === 'poche' ? 'Diretto, ma con poche corse' : 'Diretto, nessun cambio';
    sottotitolo = chipLinee(r.opzioni);
    const freq = r.tipo === 'poche'
      ? 'Poche corse al giorno: guarda il libretto prima di contarci.'
      : r.opzioni[0].freq;
    corpo = `<p class="result-desc">${esc(freq)}${nota ? ' ' + esc(nota) : ''}</p>`;

    /* Una linea puo' servire una tratta in un senso solo: la T10 ferma a Fara
       Gera d'Adda unicamente nelle corse verso Treviglio. Dirlo evita l'attesa a vuoto. */
    r.opzioni.filter((o) => o.soloAndata).forEach((o) => {
      corpo += `<p class="result-desc">La ${esc(lineCode(o.id))} fa questa tratta solo nelle corse <strong>${esc(o.dir)}</strong>. Al ritorno non passa da tutti e due i posti: inverti i due campi e guarda che bus ti dice.</p>`;
    });
    const scolastiche = r.opzioni.filter((o) => o.scolastica);
    if (scolastiche.length) {
      corpo += `<p class="result-desc">La ${elencoLinee(scolastiche)} fa questa tratta solo nel periodo scolastico.</p>`;
    }
    if (r.limitate && r.limitate.length) {
      corpo += `<p class="result-desc">Ci sono anche poche corse della ${elencoLinee(r.limitate)}, ma non ci contare.</p>`;
    }
    if (r.tipo === 'poche' && r.alt) {
      avvisi += `<div class="alt-box"><p class="alt-head">Meglio così</p>${bloccoCambio(r.alt, to)}</div>`;
    }
  } else if (r.tipo === 'cambio') {
    titolo = `Un cambio, a ${placeShort(r.via)}`;
    corpo = bloccoCambio(r, to) + (nota ? `<p class="result-desc">${esc(nota)}</p>` : '');
  } else {
    titolo = giorno === 'domenica' ? 'La domenica non ci arrivi' : 'Con il bus non ci arrivi';
    corpo = giorno === 'domenica'
      ? `<p class="result-desc">Nei festivi nessuna linea copre questa tratta, nemmeno cambiando. Passano solo la Z311 fra Vaprio e Gessate e la z405 fra Cassano, Gessate e Treviglio.</p>`
      : `<p class="result-desc">Nessuna linea, nemmeno con un cambio, collega questi due posti negli elenchi fermate ufficiali.</p>`;
  }

  /* La domenica si decide dal calcolo fatto sulle sole linee festive, non da una nota scritta a mano. */
  if (giorno === 'domenica') {
    if (r.tipo !== 'niente') {
      avvisi += `<p class="alert ok"><strong>La domenica si viaggia.</strong> Le linee qui sopra circolano anche nei festivi, con meno corse del solito.</p>`;
    }
  } else if (festivo.tipo === 'niente') {
    avvisi += `<p class="alert warn">Dal lunedì al sabato va bene. <strong>La domenica no</strong>: nei festivi questa tratta non è coperta.</p>`;
  } else if (festivo.tipo === 'cambio' && r.tipo !== 'cambio') {
    avvisi += `<p class="alert warn">La domenica questo bus non c'è. Resta solo il giro con un cambio a ${esc(placeShort(festivo.via))}: ${esc(elencoLinee(festivo.gambe[0]))} e poi ${esc(elencoLinee(festivo.gambe[1]))}.</p>`;
  }

  routeResults.innerHTML = `
    <div class="result-card">
      <p class="result-route">${esc(placeName(from))} <span aria-hidden="true">→</span> ${esc(placeName(to))}</p>
      <p class="result-head">${titolo}</p>
      ${sottotitolo ? `<div class="leg-row">${sottotitolo}</div>` : ''}
      ${corpo}
      ${avvisi}
      ${r.tipo === 'niente' ? '' : bloccoTreni(to)}
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
  b.addEventListener('click', () => setGiorno(b.dataset.when, b));
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
  box.innerHTML = v.map((t) => `
      <button type="button" class="saved-item" data-da="${esc(t.da)}" data-a="${esc(t.a)}">
        <span class="saved-names">${esc(placeShort(t.da))} <span aria-hidden="true">→</span> ${esc(placeShort(t.a))}</span>
        <span class="saved-lines">${riassunto(t.da, t.a)}</span>
      </button>`).join('');
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

/* Nel percorso disegnato un paese puo' tornare due volte (la B812 rientra da Canonica):
   nel testo lo si scrive una volta sola. */
function nomiPercorso(chiavi) {
  const visti = [];
  chiavi.forEach((k) => { if (visti[visti.length - 1] !== STOPS[k].name && !visti.includes(STOPS[k].name)) visti.push(STOPS[k].name); });
  return visti.join(' · ');
}

LINES.forEach((line) => {
  const card = document.createElement('article');
  card.className = 'line-card line-' + line.id;
  const rami = (line.rami || []).map((r) =>
    `<p class="line-route"><strong>Ramo:</strong> ${esc(nomiPercorso(r.stops))} <em>(${esc(r.label)})</em></p>`).join('');
  card.innerHTML = `
    <div class="bar"></div>
    <div class="body">
      <div class="top-row">
        <span class="line-chip line-${line.id}">${esc(line.code)}</span>
        ${line.alias ? `<span class="line-alias">${esc(line.alias)}</span>` : ''}
        <span class="line-gestore">${esc(line.gestore)}</span>
      </div>
      <p class="line-route">${esc(nomiPercorso(line.percorso))}</p>
      ${rami}
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
    const righe = PLACES.filter((p) => p.key !== rowP.key).map((colP) =>
      `<li><span class="mx-dest">${esc(colP.name)}</span><span class="mx-val">${riassunto(rowP.key, colP.key)}</span></li>`).join('');
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
    route: "Da Fara Gera d'Adda verso Trezzo",
    text: "La T10 ferma a Fara solo nelle corse verso Treviglio: andando verso Trezzo non entra in paese. Da Fara prendi la B812 fino a Vaprio d'Adda, poi la T10 o la Z309 per Trezzo."
  },
  {
    route: "Fara Gera d'Adda ↔ Cassano d'Adda",
    text: "Non c'è nessuna linea diretta. Si passa da Vaprio: B812 fino a Vaprio, poi Z309 fino alla stazione di Cassano, circa 35-40 minuti in tutto."
  },
  {
    route: 'Rientro verso Bergamo nel pomeriggio',
    text: 'Il treno per Bergamo parte al minuto :07 di ogni ora. Diversi bus arrivano a Treviglio fra le 13 e le 16:30 lasciandoti 30-45 minuti di attesa. Nel periodo scolastico qualche corsa della B812 arriva a Bergamo senza cambiare, ma non passa da Vaprio.'
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
  { name: 'SAI Autolinee, orari e schemi di linea', url: 'https://www.saiautolinee.it/orari-e-linee', op: 'SAI / Bergamo Trasporti' },
  { name: 'SAI, schema della linea B812 con le fermate direzione per direzione', url: 'https://www.saiautolinee.it/uploads/lines/B812-6a6ca54baa0c3.webp', op: 'SAI' },
  { name: 'SAI, schema della linea T10 con le fermate direzione per direzione', url: 'https://www.saiautolinee.it/uploads/lines/LINEA-T10-6a992274d6a4c.webp', op: 'SAI' },
  { name: 'Bergamo Trasporti, linee e orari', url: 'https://www.bergamotrasporti.it', op: 'SAI / Bergamo Trasporti' },
  { name: 'Nord Est Trasporti, orari di Z309 e Z311', url: 'https://www.nordesttrasporti.it', op: 'NET' },
  { name: 'Autoguidovie Milano Sud Est, linea z405', url: 'https://milanosudest.autoguidovie.it', op: 'Autoguidovie' },
  { name: 'RFI, quadri orario delle stazioni', url: 'https://www.rfi.it/it/stazioni/pagine-stazioni/servizi-di-qualita/informazioni-al-pubblico/quadri-orario-on-line.html', op: 'RFI' },
  { name: 'RFI, partenze da Treviglio', url: 'https://prm.rfi.it/qo_prm/QO_Partenze_SiPMR.aspx?Id=2712', op: 'RFI' },
  { name: "RFI, partenze da Cassano d'Adda", url: 'https://prm.rfi.it/qo_prm/QO_Partenze_SiPMR.aspx?Id=882&lin=it&dalle=00.00&alle=23.59&ora=00.00', op: 'RFI' },
  { name: 'Trenord, orario ferroviario e circolazione', url: 'https://www.trenord.it/linee-e-orari/circolazione/orario-ferroviario/', op: 'Trenord' },
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
      center: [9.56, 45.57],
      zoom: 10.6,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      LINES.forEach((line) => {
        const coords = line.percorso.map((k) => STOPS[k].coord);
        map.addSource('line-' + line.id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } });
        map.addLayer({
          id: 'layer-' + line.id, type: 'line', source: 'line-' + line.id,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': line.color, 'line-width': 4, 'line-opacity': 0.85 }
        });
        (line.rami || []).forEach((ramo, i) => {
          const id = 'branch-' + line.id + '-' + i;
          map.addSource(id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: ramo.stops.map((k) => STOPS[k].coord) }, properties: {} } });
          map.addLayer({
            id: 'layer-' + id, type: 'line', source: id,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': line.color, 'line-width': 3, 'line-dasharray': [2, 1.6], 'line-opacity': 0.7 }
          });
        });
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
        (line.rami || []).forEach((ramo, i) => {
          const id = 'layer-branch-' + line.id + '-' + i;
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
        });
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
