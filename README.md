# Adda Transit — che bus prendo
### Fara Gera d'Adda · Vaprio d'Adda · Canonica d'Adda · Treviglio · Cassano d'Adda

Dove ti trovi, dove vuoi andare: la pagina dice che linea prendere, se serve cambiare e nei
giorni in cui quel bus non passa. Copre i cinque comuni più **Trezzo sull'Adda** e **Gessate M2**.

Sito pubblicato su **https://move.privix.org** via GitHub Pages + GitHub Actions.

Progetto gemello di **[edu.privix.org](https://edu.privix.org)** (repo `orientom`), la guida alla
scelta della scuola superiore: stessa area geografica, stesso criterio editoriale, stessa catena
di pubblicazione.

## A chi parla

A chi il tragitto lo fa davvero, tutti i giorni, in gran parte ragazzi che vanno a scuola.
Si dà del tu, le frasi sono corte, i termini da addetti ai lavori non ci sono: si legge
«diretto, nessun cambio» e «la domenica non passa», non «dorsale» o «fascia scolastica».

## Cosa contiene

- **«Che bus prendo?»**, in cima alla pagina: *dove ti trovi*, *dove vuoi andare*, il pulsante
  per invertirle e la risposta in una schermata. Nessuna tabella da leggere per arrivarci
- **Scelta del giorno**: *da lunedì a sabato* oppure *la domenica*. Non è un'etichetta: la
  risposta viene ricalcolata sulle sole linee che circolano quel giorno, cambio compreso
- **Collegamenti verificati sugli elenchi fermate ufficiali**, direzione per direzione. Se una
  linea in un senso non ferma in un paese, in quel senso non lo collega e la pagina lo dice
- **Avvisi dentro il risultato**, non sepolti in una guida: se la domenica quella tratta non
  è coperta, lo dice lì
- **Il treno in secondo piano**: se scendi a Treviglio o a Cassano trovi quanto aspetti in
  media, ma chiuso e su fondo spento. Questa è una pagina di bus
- **«Le mie tratte»**: le salvi con un tocco, restano in `localStorage` su quel dispositivo,
  dentro try/catch. Nessun server, nessun account
- **Condivisione**: usa la condivisione di sistema dove c'è, altrimenti apre WhatsApp. Il link
  porta la tratta con sé (`?da=fara&a=treviglio`) e all'apertura la pagina la ricarica
- **Avviso del cambio orario** che compare da solo nelle tre settimane prima del 14 settembre
  2026 e nelle due dopo, con il conto alla rovescia dei giorni
- **App installabile**: manifest e service worker, con la pagina che si apre anche senza rete
  (la mappa no, le tile arrivano da internet)
- **Un colore per ogni linea**, identico in mappa, risultati, elenco tratte e coincidenze:
  T10 blu, B812 rossa, Z309 verde, Z311 viola, z405 grigia
- **Mappa** MapLibre con tile OpenFreeMap, caricata solo quando serve: su desktop quando ti
  avvicini scorrendo, su telefono solo se tocchi il pulsante, per non consumare dati
- **Le cinque linee**, con percorso, giorni di servizio, validità dell'orario e gestore
- **Tutte le tratte**: le 42 combinazioni, in liste per luogo di partenza. Andata e ritorno sono voci
  distinte, perché il verso conta
- **Riepilogo senza JavaScript**: un blocco `noscript` con linee, gestori e fonti, così la
  pagina resta leggibile e indicizzabile anche se lo script non parte

## Criterio editoriale

Ogni dato viene dai libretti orario e dai portali ufficiali dei gestori (SAI / Bergamo Trasporti,
NET, Autoguidovie Milano Sud Est) e dai quadri orario RFI e Trenord per la parte ferroviaria.
La pagina non promette orari in tempo reale: dichiara la data di validità di ciò che mostra e
rimanda alle fonti per la verifica prima di partire.

Le frequenze sono qualitative («passa spesso, dal lunedì al sabato») perché è quello che dicono
le fonti: non ci sono intervalli in minuti, e non vengono inventati.

**Niente notifiche push.** Servirebbero un servizio di push e un backend che tiene le
sottoscrizioni, che un sito statico non ha. Al loro posto c'è l'avviso in pagina con il conto
alla rovescia, che compare da solo e non chiede permessi.

## Struttura tecnica

Sito statico, nessun framework, nessun tracker, nessuna pubblicità.

```
index.html             struttura della pagina
style.css              token e layout, mobile-first, tema chiaro e scuro
data.js                fermate, linee con gli elenchi fermate per direzione, orari dei treni
script.js              motore dei collegamenti, strumento, tratte salvate, mappa, liste
sw.js                  service worker: rete per prima, cache come riserva
manifest.webmanifest   dati per l'installazione come app
icon.svg               icona di app e scheda del browser
vendor/                MapLibre GL JS 4.7.1, servito dal repo e non da CDN
```

Le uniche risorse esterne a runtime sono **Google Fonts** e i **tile vettoriali di
OpenFreeMap** (`tiles.openfreemap.org`, senza chiave API). MapLibre è nel repo di proposito:
un CDN che non risponde non deve poter spegnere la mappa.

Regole di interfaccia rispettate in tutta la pagina: testo base 16 pixel, cose da toccare da
48 pixel, hover solo su puntatori che lo supportano, rispetto di `prefers-reduced-motion`,
safe area e `viewport-fit=cover`.

## Manutenzione

Le voci che invecchiano più in fretta, in ordine:

1. **Orari dei bus** — SAI e NET cambiano libretto a metà settembre (invernale e scolastico) e
   a giugno (estivo). I dati in pagina sono l'orario estivo fino al 13/09/2026 più l'orario
   scolastico 2025/26 già pubblicato per la T10. Stanno in `data.js`, in `BUS_ARRIVI_TREVIGLIO`
   e `BUS_ARRIVI_CASSANO`
2. **Orari dei treni** — `TRAINS` in `data.js`, dai quadri orario RFI delle due stazioni
3. **Percorsi delle linee** — `LINES` in `data.js`. Il campo `rotte` porta gli elenchi fermate
   ufficiali, una voce per direzione: è da lì che nascono i collegamenti, quindi va ricopiato
   dallo schema di linea del gestore ogni volta che cambia. I campi `sabato` e `festivi`
   pilotano gli avvisi sulla domenica. La rete è stata riorganizzata il 3 agosto 2026, con la
   linea F diventata B812 e prolungata a Verdellino: riassetti così vanno rifatti a mano
4. **Tratte possibili** — non si scrivono più a mano. `risolvi()` in `script.js` le calcola
   dalle rotte: diretto se una direzione tocca prima la partenza e poi l'arrivo, altrimenti un
   cambio nel primo posto utile fra quelli elencati in `HUBS`. Le note editoriali di singole
   tratte stanno in `NOTE_TRATTE`
5. **Avviso del cambio orario** — la data sta in `script.js`, nella sezione «Avviso del cambio
   orario». Va spostata al cambio successivo
6. **Service worker** — a ogni pubblicazione va alzato `CACHE` in `sw.js`, altrimenti chi ha
   già visitato il sito continua a vedere la versione vecchia

Ultima verifica delle fonti: **10 settembre 2026**, sugli schemi di linea SAI di T10 e B812.

---

feel free to contribute or share
