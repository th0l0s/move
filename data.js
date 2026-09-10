// Dati geografici, linee bus e orari treni — Bassa Bergamasca / Adda (Fara Gera d'Adda, Vaprio d'Adda,
// Canonica d'Adda, Treviglio, Cassano d'Adda). Fonti: SAI/Bergamo Trasporti, NET (Nord Est Trasporti),
// Autoguidovie Milano Sud Est, RFI (quadri orario ufficiali stazioni), Trenord.
//
// Le sequenze dentro "rotte" sono trascritte dagli ELENCHI FERMATE ufficiali, direzione per direzione:
// schemi di linea SAI per T10 e B812, libretti NET per Z309 e Z311, Autoguidovie per la z405.
// Da queste sequenze lo script ricava da solo quali tratte esistono: nessuna coppia scritta a mano.
// Una linea che in una direzione non ferma in un paese, in quella direzione non lo collega: e' il caso
// della T10, che ferma a Fara Gera d'Adda solo nelle corse verso Treviglio.

const STOPS = {
  fara: { name: "Fara Gera d'Adda", sub: "Via Locatelli · Via Bergamo · Via Crespi", coord: [9.5333, 45.55], kind: "comune" },
  vaprio: { name: "Vaprio d'Adda", sub: "Via Perego 42/44 (ATM) · via Per Grezzago", coord: [9.5297, 45.577], kind: "comune" },
  canonica: { name: "Canonica d'Adda", sub: "Via Lodi 40 (municipio) · Via Matteotti (chiesa)", coord: [9.5389, 45.5753], kind: "comune" },
  treviglio: { name: "Treviglio", sub: "V.le De Gasperi — Stazione FS", coord: [9.5928, 45.5195], kind: "stazione" },
  cassano: { name: "Cassano d'Adda", sub: "Stazione FS", coord: [9.523, 45.524], kind: "stazione" },
  trezzo: { name: "Trezzo sull'Adda", sub: "Via Nenni (ITC) · Via Biffi · Concesa", coord: [9.521, 45.608], kind: "comune" },
  pontirolo: { name: "Pontirolo Nuovo", sub: "Viale Italia (municipio) · Via Mazzini", coord: [9.5672, 45.5692], kind: "comune" },
  badalasco: { name: "Badalasco", sub: "fraz. Fara Gera d'Adda — Via Veneziana", coord: [9.552, 45.534], kind: "frazione" },
  castelcerreto: { name: "Castel Cerreto", sub: "fraz. Treviglio", coord: [9.5828, 45.5457], kind: "frazione" },
  geromina: { name: "Geromina", sub: "fraz. Treviglio — Via Canonica", coord: [9.5806, 45.5321], kind: "frazione" },
  colonnella: { name: "Bivio Colonnella", sub: "fraz. Cassano d'Adda", coord: [9.531, 45.529], kind: "frazione" },
  groppello: { name: "Groppello d'Adda", sub: "fraz. Cassano d'Adda — Via Cimbardi", coord: [9.5231, 45.5433], kind: "frazione" },
  ciserano: { name: "Ciserano", sub: "Via Boltiere · Circonvallazione Sud", coord: [9.5989, 45.5872], kind: "comune" },
  zingonia: { name: "Zingonia", sub: "corso Europa", coord: [9.601, 45.594], kind: "frazione" },
  verdellino: { name: "Verdellino", sub: "Via Gramsci — interscambio E-BRT per Bergamo", coord: [9.606, 45.5985], kind: "comune" },
  verdello: { name: "Verdello", sub: "Via Don Giavazzi", coord: [9.6247, 45.607], kind: "comune" },
  levate: { name: "Levate", sub: "Via Santuario · Via Europa", coord: [9.6262, 45.6318], kind: "comune" },
  stezzano: { name: "Stezzano", sub: "Circonvallazione Ovest", coord: [9.6395, 45.6607], kind: "comune" },
  bergamo: { name: "Bergamo", sub: "Autolinee, pensilina 11", coord: [9.674, 45.6906], kind: "stazione" },
  pozzo: { name: "Pozzo d'Adda", sub: "", coord: [9.5004, 45.5757], kind: "comune" },
  gessate: { name: "Gessate", sub: "Metro M2 (capolinea)", coord: [9.4378, 45.5484], kind: "metro" },
  inzago: { name: "Inzago", sub: "SS11 Via Verdi", coord: [9.4822, 45.5411], kind: "comune" },
};

// Linee bus.
//   percorso  = tratto principale: serve a disegnare la mappa e a raccontare la linea
//   rami      = tratti serviti da poche corse o solo in una direzione, disegnati tratteggiati
//   rotte     = elenchi fermate ufficiali, una voce per direzione. Da qui nascono i collegamenti.
//               limitata: poche corse — solo: "scolastico" = solo nel periodo scolastico
const LINES = [
  {
    id: "t10",
    code: "T10",
    name: "Treviglio – Pontirolo – Canonica – Vaprio – Trezzo",
    gestore: "SAI / Bergamo Trasporti",
    color: "#0f5da3",
    freq: "Passa regolarmente, dal lunedì al sabato",
    percorso: ["trezzo", "vaprio", "canonica", "pontirolo", "castelcerreto", "geromina", "treviglio"],
    rami: [
      { stops: ["canonica", "fara"], label: "deviazione per Fara Gera d'Adda, solo nelle corse verso Treviglio" },
      { stops: ["fara", "badalasco", "treviglio"], label: "passaggi da Badalasco, poche corse" },
      { stops: ["treviglio", "colonnella", "cassano"], label: "passaggi per Cassano d'Adda, poche corse" },
    ],
    rotte: [
      { dir: "verso Trezzo", stops: ["treviglio", "geromina", "castelcerreto", "pontirolo", "canonica", "vaprio", "trezzo"] },
      { dir: "verso Treviglio", stops: ["trezzo", "vaprio", "canonica", "fara", "canonica", "pontirolo", "castelcerreto", "geromina", "treviglio"] },
      { dir: "ramo di Badalasco", limitata: true, stops: ["fara", "badalasco", "treviglio"] },
      { dir: "ramo di Badalasco", limitata: true, stops: ["treviglio", "badalasco", "fara"] },
      { dir: "ramo di Cassano", limitata: true, stops: ["treviglio", "colonnella", "cassano"] },
      { dir: "ramo di Cassano", limitata: true, stops: ["cassano", "colonnella", "treviglio"] },
    ],
    validita: "Schema di linea SAI in vigore; orario scolastico dal 14/09/2026",
    giorni: "Lun–Sab (nessuna corsa festiva)",
    sabato: true, festivi: false,
    note: "Andando verso Trezzo non ferma a Fara Gera d'Adda: le fermate di Fara ci sono solo nelle corse verso Treviglio. Da Fara verso Trezzo prendi la B812 fino a Vaprio.",
  },
  {
    id: "b812",
    code: "B812",
    alias: "ex linea F",
    name: "Treviglio – Badalasco – Fara – Canonica – Vaprio – Pontirolo – Ciserano – Verdellino",
    gestore: "SAI / Bergamo Trasporti",
    color: "#c0392b",
    freq: "Passa spesso, dal lunedì al sabato",
    percorso: ["treviglio", "badalasco", "fara", "canonica", "vaprio", "canonica", "pontirolo", "ciserano", "zingonia", "verdellino"],
    rami: [
      { stops: ["verdellino", "verdello", "levate", "stezzano", "bergamo"], label: "nel periodo scolastico alcune corse proseguono da e per Bergamo, senza passare da Vaprio" },
    ],
    rotte: [
      { dir: "verso Verdellino", stops: ["treviglio", "badalasco", "fara", "canonica", "vaprio", "canonica", "pontirolo", "ciserano", "zingonia", "verdellino"] },
      { dir: "verso Treviglio", stops: ["verdellino", "zingonia", "ciserano", "pontirolo", "canonica", "vaprio", "canonica", "fara", "badalasco", "treviglio"] },
      { dir: "verso Bergamo", solo: "scolastico", stops: ["treviglio", "badalasco", "fara", "canonica", "pontirolo", "ciserano", "zingonia", "verdellino", "verdello", "levate", "stezzano", "bergamo"] },
      { dir: "da Bergamo verso Treviglio", solo: "scolastico", stops: ["bergamo", "stezzano", "levate", "verdello", "verdellino", "zingonia", "ciserano", "pontirolo", "canonica", "fara", "badalasco", "treviglio"] },
    ],
    validita: "Nuova linea in vigore dal 03/08/2026, orario scolastico dal 14/09/2026",
    giorni: "Lun–Sab (nessuna corsa festiva indicata)",
    sabato: true, festivi: false,
    note: "Storica linea \"F\". Ferma a Fara, Canonica e Vaprio in tutte e due le direzioni: a Vaprio entra ed esce passando da Canonica. È la linea più utile fra Fara, Canonica, Vaprio e Treviglio.",
  },
  {
    id: "z309",
    code: "Z309",
    name: "Cassano FS – Groppello – Vaprio – Trezzo (alcune corse da e per Inzago)",
    gestore: "NET (Nord Est Trasporti)",
    color: "#2f8f4e",
    freq: "Passa regolarmente, dal lunedì al sabato",
    percorso: ["cassano", "groppello", "vaprio", "trezzo"],
    rami: [
      { stops: ["inzago", "cassano"], label: "alcune corse partono da Inzago, sulla SS11" },
    ],
    rotte: [
      { dir: "verso Trezzo", stops: ["cassano", "groppello", "vaprio", "trezzo"] },
      { dir: "verso Cassano", stops: ["trezzo", "vaprio", "groppello", "cassano"] },
      { dir: "prolungamento di Inzago", limitata: true, stops: ["inzago", "cassano"] },
      { dir: "prolungamento di Inzago", limitata: true, stops: ["cassano", "inzago"] },
    ],
    validita: "Orario estivo dal 09/06/2026, sostituito dall'invernale il 14/09/2026",
    giorni: "Lun–Ven e Sabato (no festivi)",
    sabato: true, festivi: false,
    note: "Unico collegamento diretto e frequente fra Vaprio e la stazione FS di Cassano d'Adda.",
  },
  {
    id: "z311",
    code: "Z311",
    name: "Vaprio – Pozzo d'Adda – Gessate M2",
    gestore: "NET (Nord Est Trasporti)",
    color: "#7a4fb0",
    freq: "Passa spesso, tutti i giorni",
    percorso: ["vaprio", "pozzo", "gessate"],
    rotte: [
      { dir: "verso Gessate", stops: ["vaprio", "pozzo", "gessate"] },
      { dir: "verso Vaprio", stops: ["gessate", "pozzo", "vaprio"] },
    ],
    validita: "Orario estivo dal 09/06/2026, sostituito dall'invernale il 14/09/2026",
    giorni: "Tutti i giorni, anche festivi",
    sabato: true, festivi: true,
    note: "Attiva anche la domenica: è l'unico bus della zona insieme alla z405 a garantire servizio festivo.",
  },
  {
    id: "z405",
    code: "z405",
    name: "Gessate M2 – Cassano FS – Treviglio FS",
    gestore: "Autoguidovie Milano Sud Est",
    color: "#5b6577",
    freq: "Passa spesso, tutti i giorni",
    percorso: ["gessate", "cassano", "treviglio"],
    rotte: [
      { dir: "verso Treviglio", stops: ["gessate", "cassano", "treviglio"] },
      { dir: "verso Gessate", stops: ["treviglio", "cassano", "gessate"] },
    ],
    validita: "Variante estiva valida; orari scolastici invernali a parte",
    giorni: "Tutti i giorni, anche domenica",
    sabato: true, festivi: true,
    note: "Collega Cassano e Treviglio alla metro M2, ed è attiva anche la domenica quando T10, B812 e Z309 non hanno corse.",
  },
];

// I luoghi che si possono scegliere nelle due tendine.
const PLACES = [
  { key: "fara", name: "Fara Gera d'Adda" },
  { key: "vaprio", name: "Vaprio d'Adda" },
  { key: "canonica", name: "Canonica d'Adda" },
  { key: "treviglio", name: "Treviglio" },
  { key: "cassano", name: "Cassano d'Adda" },
  { key: "trezzo", name: "Trezzo sull'Adda" },
  { key: "gessate", name: "Gessate (M2)" },
];

// Dove conviene cambiare, in ordine di preferenza: vince il primo posto che regge tutte e due le gambe.
const HUBS = ["vaprio", "canonica", "treviglio", "cassano", "pontirolo", "trezzo", "gessate", "badalasco", "groppello"];

// Note scritte a mano per singola tratta. Il resto lo calcola lo script dalle rotte ufficiali.
const NOTE_TRATTE = {
  "fara-vaprio": "La B812 passa anche da Canonica d'Adda.",
  "fara-cassano": "Sono circa 35-40 minuti in tutto, cambio compreso.",
};

// Orari ufficiali treni regionali — fonte RFI (quadri orario, validi 14/06–12/12/2026) e Trenord.
// Feriale tipo (lun-ven). Sabato/festivi differiscono: vedi note nella guida.
const TRAINS = {
  treviglio_milano: ["05:25","05:40","06:05","06:10","06:33","06:40","06:43","06:52","06:55","07:05","07:10","07:22","07:25","07:27","07:33","07:40","07:43","07:52","07:55","08:05","08:10","08:13","08:25","08:26","08:35","08:40","08:48","08:55","09:05","09:10","09:35","09:40","10:05","10:10","10:35","10:40","11:05","11:10","11:40","12:05","12:10","12:40","13:05","13:10","13:35","13:40","13:55","14:05","14:10","14:35","14:40","15:05","15:10","15:35","15:40","16:05","16:10","16:35","16:40","16:55","17:05","17:10","17:35","17:40","17:55","18:05","18:10","18:25","18:31","18:40","18:55","19:05","19:10","19:25","19:35","19:40","19:55","20:05","20:10","20:11","20:25","20:35","20:40","21:05","21:10","21:40","22:05","22:10","22:35","22:40","23:05","23:10","23:40"],
  treviglio_bergamo: ["05:37","06:07","06:37","07:07","08:07","09:07","10:07","11:07","12:07","13:07","14:07","15:07","16:07","17:07","18:07","19:07","20:07","22:07"],
  treviglio_brescia: ["06:26","06:56","07:26","07:56","08:26","08:56","09:26","09:56","10:56","11:56","12:26","12:56","13:56","14:26","14:56","15:26","15:56","16:26","16:56","17:26","17:43","17:56","18:19","18:26","18:43","18:56","19:19","19:26","19:56","20:26","20:56","21:26","21:56"],
  cassano_milano: ["05:31","05:47","06:17","06:47","07:02","07:17","07:32","07:47","08:02","08:17","08:32","08:47","09:02","09:17","09:47","10:17","10:47","11:17","11:47","12:17","12:47","13:17","13:47","14:17","14:47","15:17","15:47","16:17","16:47","17:17","17:47","18:02","18:17","18:32","18:47","19:02","19:17","19:32","19:47","20:02","20:17","20:32","20:47"],
  cassano_treviglio: ["06:11","06:41","07:11","07:26","07:41","07:56","08:11","08:26","08:41","08:56","09:11","09:41","10:11","10:41","11:11","11:41","12:11","12:41","13:11","13:41","14:11","14:41","15:11","15:41","16:11","16:41","17:11","17:41","17:56","18:11","18:26","18:41","18:56","19:11","19:26","19:41","19:56","20:11","20:26","20:41","20:56"],
};

// Bus in arrivo a TREVIGLIO FS: B812 (orario estivo) e T10 in arrivo da Vaprio.
const BUS_ARRIVI_TREVIGLIO = [
  { line: "b812", ora: "06:14" }, { line: "b812", ora: "06:56" },
  { line: "b812", ora: "08:05" }, { line: "b812", ora: "08:55" },
  { line: "b812", ora: "10:10" }, { line: "b812", ora: "10:50" },
  { line: "b812", ora: "12:35" }, { line: "b812", ora: "13:05" },
  { line: "b812", ora: "14:25" }, { line: "b812", ora: "15:05" },
  { line: "b812", ora: "16:25" }, { line: "b812", ora: "18:25" },
  { line: "b812", ora: "19:20" }, { line: "b812", ora: "20:20" },
  { line: "t10", ora: "07:25" }, { line: "t10", ora: "08:28" },
  { line: "t10", ora: "09:10" }, { line: "t10", ora: "09:30" },
  { line: "t10", ora: "10:05" }, { line: "t10", ora: "11:05" },
  { line: "t10", ora: "13:43" }, { line: "t10", ora: "14:48" },
  { line: "t10", ora: "15:20" }, { line: "t10", ora: "15:53" },
  { line: "t10", ora: "16:43" }, { line: "t10", ora: "17:10" },
  { line: "t10", ora: "17:38" }, { line: "t10", ora: "18:20" },
  { line: "t10", ora: "19:20" }, { line: "t10", ora: "20:20" },
];

// Bus in arrivo a CASSANO D'ADDA FS: Z309 da Trezzo e Vaprio.
const BUS_ARRIVI_CASSANO = [
  { line: "z309", ora: "08:00" }, { line: "z309", ora: "08:50" },
  { line: "z309", ora: "09:40" }, { line: "z309", ora: "10:40" },
  { line: "z309", ora: "11:40" }, { line: "z309", ora: "12:40" },
  { line: "z309", ora: "13:30" }, { line: "z309", ora: "13:55" },
  { line: "z309", ora: "14:30" }, { line: "z309", ora: "14:45" },
  { line: "z309", ora: "15:05" }, { line: "z309", ora: "15:45" },
  { line: "z309", ora: "16:45" }, { line: "z309", ora: "17:40" },
  { line: "z309", ora: "18:40" }, { line: "z309", ora: "19:10" },
  { line: "z309", ora: "19:40" }, { line: "z309", ora: "20:10" },
];
