#!/bin/sh
# rigenera dati e pagina dai PDF in pdf/ (richiede python3 + pdfplumber; node per i test)
set -e
cd "$(dirname "$0")"
python3 tools/extract.py
python3 tools/build.py
node tools/test.js > /dev/null
python3 tools/bundle.py
echo "index.html aggiornato"
