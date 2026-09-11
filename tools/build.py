import json, re
runs=json.load(open('data/runs.json'))
def canon(l):
    u=l.upper()
    if u.startswith('TREVIGLIO'):
        if 'CASTEL CERRETO' in u: return 'Castel Cerreto','Frazione'
        if 'GEROMINA' in u: return 'Geromina','Via Canonica'
        for k,n in [('DE GASPERI','Stazione FS (V.le De Gasperi)'),('P.LE MAZZINI','Stazione Ovest (P.le Mazzini)'),('PIAZZALE MAZZINI','Stazione Ovest (P.le Mazzini)'),
                    ('POPOLO','Piazza del Popolo'),('MENTANA','Piazza Mentana'),('MONTEGRAPPA','V.le Montegrappa'),('BUONARRO','Via Buonarroti'),
                    ('ISSER','Via Isser (SAME)'),('ITIS','Ospedale / ITIS'),('MERISIO','V.le Merisio (Agraria)')]:
            if k in u: return 'Treviglio',n
    if u.startswith('FARA'):
        if 'LOCATELLI' in u: return 'Fara','Via Locatelli'
        if 'UDINE' in u: return 'Fara','Via Udine'
        if 'BERGAMO' in u: return 'Fara','Via Bergamo (distributore)'
    if u.startswith('VAPRIO'):
        return ('Vaprio','Via Perego (ATM)') if 'PEREGO' in u else ('Vaprio','Via per Grezzago')
    if u.startswith('TREZZO'):
        return ('Trezzo','Via Biffi (edicola)') if 'BIFFI' in u else ('Trezzo','Via Nenni (ITC)')
    if u.startswith('CASSANO'):
        if 'LICEO' in u: return 'Cassano','Liceo (C.so Europa)'
        if 'STAZIONE' in u: return 'Cassano','Stazione FS'
        return 'Cassano','Bv. Colonnella'
    if u.startswith('CANONICA'):
        if 'LODI' in u: return 'Canonica','Via Lodi 40'
        if 'MATTEOTTI' in u: return 'Canonica','Via Matteotti (chiesa)'
        return 'Canonica','Via Bergamo (edicola)'
    if u.startswith('PONTIROLO'):
        return ('Pontirolo','Viale Italia') if 'ITALIA' in u else ('Pontirolo','Via Mazzini')
    if u.startswith('BADALASCO'): return 'Badalasco','Via Veneziana'
    m=re.match(r"([A-Z' ]+?)(?:\s*[-,]\s*|\s+(?=[A-Z][a-z]|F\.S\.))(.*)$",l)
    loc=m.group(1).strip().title() if m else l.split()[0].title()
    return loc, (m.group(2).strip(' -,') if m else '')
stops=[];idx={}
out=[]
for r in runs:
    st=[]
    for lab,t in r['stops']:
        c=canon(lab)
        if c not in idx: idx[c]=len(stops); stops.append(list(c))
        st.append([idx[c],t])
    out.append([r['line'],r['code'],1 if r['ago'] else 0,''.join(n[0] if n!='Y-C' else 'YC' for n in r['notes']) if r['notes'] else '',st])
data={'stops':stops,'runs':out}
s=json.dumps(data,ensure_ascii=False,separators=(',',':'))
open('data/data.json','w').write(s); print(len(s),'bytes',len(stops),'stops')
print(sorted({tuple(x) for x in stops if x[0] not in('Treviglio','Fara','Vaprio','Trezzo','Cassano','Canonica','Pontirolo')}))
