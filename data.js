// Dati geografici, linee bus e orari treni — Bassa Bergamasca / Adda (Fara Gera d'Adda, Vaprio d'Adda,
// Canonica d'Adda, Treviglio, Cassano d'Adda). Fonti: SAI/Bergamo Trasporti, NET (Nord Est Trasporti),
// Autoguidovie Milano Sud Est, RFI (quadri orario ufficiali stazioni), Trenord.

const STOPS = {
  fara: { name: "Fara Gera d'Adda", sub: "Via Locatelli / Via Udine", coord: [9.5333, 45.55], kind: "comune" },
  vaprio: { name: "Vaprio d'Adda", sub: "Via Perego (ATM)", coord: [9.5297, 45.577], kind: "comune" },
  canonica: { name: "Canonica d'Adda", sub: "Via Lodi 40 / Via Matteotti", coord: [9.5389, 45.5753], kind: "comune" },
  treviglio: { name: "Treviglio", sub: "V.le De Gasperi — Stazione FS", coord: [9.5928, 45.5195], kind: "stazione" },
  cassano: { name: "Cassano d'Adda", sub: "Stazione FS", coord: [9.523, 45.524], kind: "stazione" },
  trezzo: { name: "Trezzo sull'Adda", sub: "Via Nenni / Via Biffi", coord: [9.521, 45.608], kind: "comune" },
  pontirolo: { name: "Pontirolo Nuovo", sub: "Viale Italia", coord: [9.5672, 45.5692], kind: "comune" },
  badalasco: { name: "Badalasco", sub: "fraz. Treviglio — Via Veneziana", coord: [9.552, 45.534], kind: "frazione" },
  colonnella: { name: "Bivio Colonnella", sub: "fraz. Cassano d'Adda", coord: [9.531, 45.529], kind: "frazione" },
  groppello: { name: "Groppello d'Adda", sub: "fraz. Cassano d'Adda", coord: [9.5231, 45.5433], kind: "frazione" },
  verdellino: { name: "Verdellino", sub: "capolinea — interscambio E-BRT Bergamo", coord: [9.608, 45.601], kind: "comune" },
  ciserano: { name: "Ciserano", sub: "", coord: [9.6011, 45.5879], kind: "comune" },
  pozzo: { name: "Pozzo d'Adda", sub: "", coord: [9.5004, 45.5757], kind: "comune" },
  gessate: { name: "Gessate", sub: "Metro M2 (capolinea)", coord: [9.4378, 45.5484], kind: "metro" },
  inzago: { name: "Inzago", sub: "", coord: [9.4822, 45.5411], kind: "comune" },
};

// Linee bus: id, nome, gestore, colore, stops (chiavi STOPS in ordine), descrizione, validità, giorni
const LINES = [
  {
    id: "t10",
    code: "T10",
    name: "Trezzo – Vaprio – Canonica – Fara – Treviglio (+ ramo Cassano)",
    gestore: "SAI / Bergamo Trasporti",
    color: "#0f5da3",
    stops: ["trezzo", "vaprio", "canonica", "fara", "badalasco", "treviglio"],
    branch: ["fara", "badalasco", "colonnella", "cassano"],
    branchLabel: "ramo Treviglio–Badalasco–Fara–Cassano (corse limitate)",
    validita: "Estivo dal 03/08/2026 · Scolastico 2025/26 in vigore dal 12/09/2025 (nuovo orario atteso a metà settembre 2026)",
    giorni: "Lun–Sab (nessuna corsa festiva)",
    note: "Linea principale per collegare tutti e 5 i comuni della richiesta in un'unica dorsale.",
  },
  {
    id: "b812",
    code: "B812 (ex linea F)",
    name: "Treviglio – Badalasco – Fara – Canonica – Vaprio – Pontirolo – Ciserano – Verdellino",
    gestore: "SAI / Bergamo Trasporti",
    color: "#e07a1f",
    stops: ["treviglio", "badalasco", "fara", "canonica", "vaprio", "pontirolo", "ciserano", "verdellino"],
    validita: "Riorganizzata il 3/08/2026 — orario estivo fino al 13/09/2026, poi scolastico dal 14/09/2026",
    giorni: "Lun–Sab (nessuna corsa festiva indicata)",
    note: "Storica linea \"F\": oggi prosegue fino a Verdellino, interscambio con il nuovo E-BRT per Bergamo. È la linea più frequente fra Fara, Canonica, Vaprio e Treviglio.",
  },
  {
    id: "z309",
    code: "Z309",
    name: "Cassano FS – Groppello – Vaprio – Trezzo (alcune corse per Inzago)",
    gestore: "NET (Nord Est Trasporti)",
    color: "#2f8f4e",
    stops: ["cassano", "groppello", "vaprio", "trezzo"],
    branch: ["vaprio", "inzago"],
    branchLabel: "alcune corse proseguono su Inzago",
    validita: "Estivo 09/06–16/09/2026, poi invernale dal 14/09/2026",
    giorni: "Lun–Ven e Sabato (no festivi)",
    note: "Unico collegamento diretto e frequente fra Vaprio e la stazione FS di Cassano d'Adda.",
  },
  {
    id: "z311",
    code: "Z311",
    name: "Vaprio – Pozzo d'Adda – Gessate M2",
    gestore: "NET (Nord Est Trasporti)",
    color: "#7a4fb0",
    stops: ["vaprio", "pozzo", "gessate"],
    validita: "Estivo 09/06–16/09, poi invernale dal 14/09/2026",
    giorni: "Tutti i giorni, anche festivi",
    note: "Attiva anche la domenica: è l'unico bus della zona insieme alla z405 a garantire servizio festivo.",
  },
  {
    id: "z405",
    code: "z405",
    name: "Gessate M2 – Cassano FS – Treviglio FS",
    gestore: "Autoguidovie Milano Sud Est",
    color: "#c23b5a",
    stops: ["gessate", "cassano", "treviglio"],
    validita: "Variante estiva valida; orari scolastici invernali a parte",
    giorni: "Tutti i giorni, anche domenica",
    note: "Collega Cassano e Treviglio alla metro M2, ed è attiva anche la domenica quando T10/B812/Z309 non garantiscono corse.",
  },
];

// Orari ufficiali treni regionali — fonte RFI (quadri orario, validi 14/06–12/12/2026) e Trenord.
// Feriale tipo (lun-ven). Sabato/festivi differiscono: vedi note nella guida.
const TRAINS = {
  treviglio_milano: ["05:25","05:40","06:05","06:10","06:33","06:40","06:43","06:52","06:55","07:05","07:10","07:22","07:25","07:27","07:33","07:40","07:43","07:52","07:55","08:05","08:10","08:13","08:25","08:26","08:35","08:40","08:48","08:55","09:05","09:10","09:35","09:40","10:05","10:10","10:35","10:40","11:05","11:10","11:40","12:05","12:10","12:40","13:05","13:10","13:35","13:40","13:55","14:05","14:10","14:35","14:40","15:05","15:10","15:35","15:40","16:05","16:10","16:35","16:40","16:55","17:05","17:10","17:35","17:40","17:55","18:05","18:10","18:25","18:31","18:40","18:55","19:05","19:10","19:25","19:35","19:40","19:55","20:05","20:10","20:11","20:25","20:35","20:40","21:05","21:10","21:40","22:05","22:10","22:35","22:40","23:05","23:10","23:40"],
  treviglio_bergamo: ["05:37","06:07","06:37","07:07","08:07","09:07","10:07","11:07","12:07","13:07","14:07","15:07","16:07","17:07","18:07","19:07","20:07","22:07"],
  treviglio_brescia: ["06:26","06:56","07:26","07:56","08:26","08:56","09:26","09:56","10:56","11:56","12:26","12:56","13:56","14:26","14:56","15:26","15:56","16:26","16:56","17:26","17:43","17:56","18:19","18:26","18:43","18:56","19:19","19:26","19:56","20:26","20:56","21:26","21:56"],
  cassano_milano: ["05:31","05:47","06:17","06:47","07:02","07:17","07:32","07:47","08:02","08:17","08:32","08:47","09:02","09:17","09:47","10:17","10:47","11:17","11:47","12:17","12:47","13:17","13:47","14:17","14:47","15:17","15:47","16:17","16:47","17:17","17:47","18:02","18:17","18:32","18:47","19:02","19:17","19:32","19:47","20:02","20:17","20:32","20:47"],
  cassano_treviglio: ["06:11","06:41","07:11","07:26","07:41","07:56","08:11","08:26","08:41","08:56","09:11","09:41","10:11","10:41","11:11","11:41","12:11","12:41","13:11","13:41","14:11","14:41","15:11","15:41","16:11","16:41","17:11","17:41","17:56","18:11","18:26","18:41","18:56","19:11","19:26","19:41","19:56","20:11","20:26","20:41","20:56"],
};

// Bus in arrivo a TREVIGLIO FS (linee T10 + B812, direzione Fara/Vaprio/Canonica -> Treviglio)
const BUS_ARRIVI_TREVIGLIO = [
  { linea: "B812 (ex F) — estivo", ora: "06:14" }, { linea: "B812 (ex F) — estivo", ora: "06:56" },
  { linea: "B812 (ex F) — estivo", ora: "08:05" }, { linea: "B812 (ex F) — estivo", ora: "08:55" },
  { linea: "B812 (ex F) — estivo", ora: "10:10" }, { linea: "B812 (ex F) — estivo", ora: "10:50" },
  { linea: "B812 (ex F) — estivo", ora: "12:35" }, { linea: "B812 (ex F) — estivo", ora: "13:05" },
  { linea: "B812 (ex F) — estivo", ora: "14:25" }, { linea: "B812 (ex F) — estivo", ora: "15:05" },
  { linea: "B812 (ex F) — estivo", ora: "16:25" }, { linea: "B812 (ex F) — estivo", ora: "18:25" },
  { linea: "B812 (ex F) — estivo", ora: "19:20" }, { linea: "B812 (ex F) — estivo", ora: "20:20" },
  { linea: "T10 (da Vaprio)", ora: "07:25" }, { linea: "T10 (da Vaprio)", ora: "08:28" },
  { linea: "T10 (da Vaprio)", ora: "09:10" }, { linea: "T10 (da Vaprio)", ora: "09:30" },
  { linea: "T10 (da Vaprio)", ora: "10:05" }, { linea: "T10 (da Vaprio)", ora: "11:05" },
  { linea: "T10 (da Vaprio)", ora: "13:43" }, { linea: "T10 (da Vaprio)", ora: "14:48" },
  { linea: "T10 (da Vaprio)", ora: "15:20" }, { linea: "T10 (da Vaprio)", ora: "15:53" },
  { linea: "T10 (da Vaprio)", ora: "16:43" }, { linea: "T10 (da Vaprio)", ora: "17:10" },
  { linea: "T10 (da Vaprio)", ora: "17:38" }, { linea: "T10 (da Vaprio)", ora: "18:20" },
  { linea: "T10 (da Vaprio)", ora: "19:20" }, { linea: "T10 (da Vaprio)", ora: "20:20" },
];

// Bus in arrivo a CASSANO D'ADDA FS (linea Z309, direzione Trezzo/Vaprio -> Cassano)
const BUS_ARRIVI_CASSANO = [
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "08:00" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "08:50" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "09:40" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "10:40" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "11:40" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "12:40" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "13:30" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "13:55" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "14:30" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "14:45" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "15:05" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "15:45" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "16:45" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "17:40" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "18:40" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "19:10" },
  { linea: "Z309 (da Trezzo/Vaprio)", ora: "19:40" }, { linea: "Z309 (da Trezzo/Vaprio)", ora: "20:10" },
];

// ===== Rete bus del quadrangolo (Fara / Vaprio / Canonica / Treviglio / Cassano) + estensioni (Trezzo, Gessate) =====
// PLACES: i nodi selezionabili nel "trova il bus giusto" e nella matrice delle combinazioni.
// "group" serve solo per etichettare visivamente il tipo di nodo.
const PLACES = [
  { key: "fara", name: "Fara Gera d'Adda", group: "quadrangolo" },
  { key: "vaprio", name: "Vaprio d'Adda", group: "quadrangolo" },
  { key: "canonica", name: "Canonica d'Adda", group: "corridoio" },
  { key: "treviglio", name: "Treviglio", group: "quadrangolo" },
  { key: "cassano", name: "Cassano d'Adda", group: "quadrangolo" },
  { key: "trezzo", name: "Trezzo sull'Adda", group: "estensione" },
  { key: "gessate", name: "Gessate (M2)", group: "estensione" },
];

// CONNECTIONS: per ogni coppia di luoghi, quale/i linea/e serve/servono la tratta.
// type: "direct" (collegamento diretto e regolare), "limited" (diretto ma con pochissime corse,
// meglio considerare l'alternativa), "change" (serve un cambio bus).
// Chiave nel formato "chiave1-chiave2": la ricerca è comunque bidirezionale (vedi getConnection in script.js).
const CONNECTIONS = {
  "fara-vaprio": { type: "direct", lines: ["t10", "b812"], freq: "molto frequente, lun-sab", note: "Passa anche da Canonica d'Adda." },
  "fara-canonica": { type: "direct", lines: ["t10", "b812"], freq: "molto frequente, lun-sab" },
  "fara-treviglio": { type: "direct", lines: ["t10", "b812"], freq: "molto frequente, lun-sab" },
  "fara-trezzo": { type: "direct", lines: ["t10"], freq: "regolare, lun-sab", note: "Passa da Vaprio e Canonica." },
  "fara-cassano": {
    type: "limited", lines: ["t10"],
    freq: "solo poche corse dirette al giorno (ramo T10 via Badalasco / Bivio Colonnella)",
    alt: { via: "vaprio", legs: [["b812", "t10"], ["z309"]], desc: "Alternativa più affidabile: cambio a Vaprio — B812 o T10 fino a Vaprio, poi Z309 fino a Cassano FS (circa 35-40 minuti totali)." }
  },
  "fara-gessate": { type: "change", via: "vaprio", legs: [["b812", "t10"], ["z311"]], desc: "Cambio a Vaprio: B812 o T10 fino a Vaprio, poi Z311 fino a Gessate M2." },

  "vaprio-canonica": { type: "direct", lines: ["t10", "b812"], freq: "molto frequente, lun-sab" },
  "vaprio-treviglio": { type: "direct", lines: ["t10", "b812"], freq: "molto frequente, lun-sab" },
  "vaprio-cassano": { type: "direct", lines: ["z309"], freq: "regolare, lun-ven e sabato, nessuna corsa festiva" },
  "vaprio-trezzo": { type: "direct", lines: ["t10", "z309"], freq: "regolare, lun-sab (Z309 anche il sabato)" },
  "vaprio-gessate": { type: "direct", lines: ["z311"], freq: "molto frequente, tutti i giorni anche festivi" },

  "canonica-treviglio": { type: "direct", lines: ["t10", "b812"], freq: "molto frequente, lun-sab" },
  "canonica-cassano": { type: "change", via: "vaprio", legs: [["b812", "t10"], ["z309"]], desc: "Cambio a Vaprio: B812 o T10 fino a Vaprio, poi Z309 fino a Cassano FS." },
  "canonica-trezzo": { type: "direct", lines: ["t10"], freq: "regolare, lun-sab" },
  "canonica-gessate": { type: "change", via: "vaprio", legs: [["b812", "t10"], ["z311"]], desc: "Cambio a Vaprio: B812 o T10 fino a Vaprio, poi Z311 fino a Gessate M2." },

  "treviglio-cassano": { type: "direct", lines: ["z405"], freq: "frequente, tutti i giorni anche domenica", note: "Alternativa: ramo T10 via Badalasco/Fara/Bivio Colonnella, corse molto limitate." },
  "treviglio-trezzo": { type: "direct", lines: ["t10"], freq: "regolare, lun-sab" },
  "treviglio-gessate": { type: "direct", lines: ["z405"], freq: "frequente, tutti i giorni anche domenica" },

  "cassano-trezzo": { type: "direct", lines: ["z309"], freq: "regolare, lun-ven e sabato, nessuna corsa festiva" },
  "cassano-gessate": { type: "direct", lines: ["z405"], freq: "frequente, tutti i giorni anche domenica" },

  "trezzo-gessate": { type: "change", via: "vaprio", legs: [["z309"], ["z311"]], desc: "Cambio a Vaprio: Z309 fino a Vaprio, poi Z311 fino a Gessate M2. Alternativa: cambio a Cassano (Z309 + z405)." },
};
