# Adda Transit — i bus della Bassa Adda
### Fara Gera d'Adda · Vaprio d'Adda · Canonica d'Adda · Treviglio · Cassano d'Adda

Mappa e matrice interattiva dei collegamenti bus fra i cinque comuni, con le
estensioni verso **Trezzo sull'Adda** e **Gessate M2**. Scegli due luoghi qualsiasi e la pagina
dice quale linea prendere, oppure dove cambiare quando il diretto non c'è.

Sito pubblicato su **https://move.privix.org** via GitHub Pages + GitHub Actions.

Progetto gemello di **[edu.privix.org](https://edu.privix.org)** (repo `orientom`), la guida alla
scelta della scuola superiore: stessa area geografica, stesso criterio editoriale, stessa catena
di pubblicazione. Quella guida copre gli abbonamenti e le tariffe per studenti, questa copre le
linee e le coincidenze.

## Cosa contiene

- **Mappa interattiva** (MapLibre GL + tile OpenFreeMap) con le cinque linee accendibili dalla
  legenda e le fermate cliccabili. I tracciati seguono la sequenza ufficiale delle fermate, non
  la geometria stradale: sono schematici e la pagina lo dichiara
- **Schede delle cinque linee**: T10 e B812 (ex «F») di SAI / Bergamo Trasporti, Z309 e Z311 di
  NET, z405 di Autoguidovie Milano Sud Est — con gestore, percorso, validità dell'orario e giorni
- **«Trova il bus giusto»**: scegli partenza e arrivo fra sette luoghi e ottieni la linea diretta,
  oppure il nodo di interscambio e le due tratte da fare
- **Matrice di tutte le combinazioni**: 21 coppie, con il codice della linea diretta o
  l'indicazione del cambio. L'asterisco marca i diretti che esistono ma con pochissime corse
- **«Verso i treni»**: confronto fra gli arrivi dei bus a Treviglio FS e a Cassano d'Adda FS e i
  treni regionali in partenza, con l'attesa calcolata e colorata (comoda ≤10', media 11–20',
  lunga >20')
- **Guida pratica in cinque passi** e quattro promemoria operativi (data di validità, app,
  biglietto prima di salire, rete ridotta nei festivi)
- **Tratte critiche**: dove il sistema bus+treno è più fragile in fascia scolastica
- **Fonti**: i portali ufficiali da cui vengono i dati, per il controllo puntuale
- **Uso da telefono**: menu a scomparsa sotto i 780 pixel, aree toccabili da 44 pixel,
  campi a 16 pixel per non far zoomare iOS, ombre e suggerimento di scorrimento sulle tabelle
  larghe, rispetto di `prefers-reduced-motion` e delle safe area
- **Matrice leggibile da telefono**: sotto i 640 pixel la griglia 7×7 lascia il posto a una
  lista per luogo di partenza, con le stesse informazioni
- **Riepilogo senza JavaScript**: un blocco `noscript` elenca le cinque linee, i gestori e le
  fonti, così la pagina resta leggibile e indicizzabile anche se lo script non parte

## Criterio editoriale

Ogni dato viene dai libretti orario e dai portali ufficiali dei gestori (SAI / Bergamo Trasporti,
NET, Autoguidovie Milano Sud Est) e dai quadri orario RFI e Trenord per la parte ferroviaria.
La pagina non promette orari in tempo reale: dichiara la data di validità di ciò che mostra e
rimanda alle fonti per la verifica prima di partire.

## Struttura tecnica

Sito statico, nessun framework, nessun tracker, nessuna pubblicità.

```
index.html    struttura della pagina
style.css     design token e layout, con tema chiaro/scuro
data.js       fermate, linee, orari dei treni, matrice delle connessioni
script.js     mappa, calcolatore delle tratte, tabelle, render delle sezioni
vendor/       MapLibre GL JS 4.7.1, servito dal repo e non da CDN
```

Le uniche risorse esterne a runtime sono **Google Fonts** e i **tile vettoriali di
OpenFreeMap** (`tiles.openfreemap.org`, senza chiave API). MapLibre è nel repo di proposito:
un CDN che non risponde non deve poter spegnere la mappa.

## Manutenzione

Le voci che invecchiano più in fretta, in ordine:

1. **Orari dei bus** — SAI e NET cambiano libretto a metà settembre (invernale/scolastico) e a
   giugno (estivo). I dati in pagina sono l'orario estivo fino al 13/09/2026 più l'orario
   scolastico 2025/26 già pubblicato per la T10. Stanno in `data.js`, in `BUS_ARRIVI_TREVIGLIO`
   e `BUS_ARRIVI_CASSANO`
2. **Orari dei treni** — `TRAINS` in `data.js`, dai quadri orario RFI delle due stazioni
3. **Percorsi delle linee** — `LINES` in `data.js`. La rete è stata riorganizzata il 3 agosto
   2026, con la linea F diventata B812 e prolungata a Verdellino: riassetti così vanno rifatti
   a mano
4. **Matrice delle connessioni** — `CONNECTIONS` in `data.js`, da rivedere quando cambia un
   percorso

Ultima verifica delle fonti: **9 settembre 2026**.

---

feel free to contribute or share
