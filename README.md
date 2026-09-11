# Che bus prendo?

Orari bus BTS / S.A.I. Treviglio per le tratte Fara↔Vaprio, Fara↔Cassano, Vaprio↔Cassano, Fara↔Trezzo, Fara↔Treviglio.
Pagina statica in un solo file (`index.html`): nessun backend, nessuna dipendenza a runtime.

- Orario: linee B812 e T10 in vigore dal 14/09/2026, poli scolastici 2026/27.
- Fonti: https://www.saiautolinee.it/orari-e-linee e https://www.bergamotrasporti.it/

## Aggiornare gli orari

1. Sostituire i PDF in `pdf/` con le nuove tabelle ufficiali.
2. `./build.sh`: estrae le tabelle, rigenera `data/data.json`, esegue i test, crea `index.html`.
3. Verificare a campione alcune corse contro il PDF, poi commit.

## Struttura

- `tools/extract.py` estrazione tabelle dai PDF (pdfplumber, coordinate colonne)
- `tools/build.py` normalizzazione fermate e dati compatti
- `src/core.js` logica pura: calendario, periodicità, corse dirette e con cambio
- `src/ui.js`, `src/shell.html` interfaccia
- `tools/test.js` stampa le corse per tratta su giorni campione
