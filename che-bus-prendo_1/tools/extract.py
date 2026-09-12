import pdfplumber, glob, re, json
TIME=re.compile(r'^(\d{1,2})[:.](\d{2})$')
CODEFR={'S','NS','F','5','6','S5','S6','NS5','NS6','F5','F6','SAB','Sab','SSab','Ssab','SSAB'}
NOTES={'AGO','Y','W','X','C'}

def rows_of(words, tol=1.8):
    rows=[]
    for w in sorted(words,key=lambda w:w['top']):
        if rows and abs(rows[-1][0]-w['top'])<tol: rows[-1][1].append(w)
        else: rows.append([w['top'],[w]])
    return [(t,sorted(ws,key=lambda w:w['x0'])) for t,ws in rows]

def norm_code(s):
    s=s.replace(' ','').upper()
    return {'SSAB':'SSAB'}.get(s,s)

def table(pdfglob, page, xmin, xmax, ymin, ymax, label_max, time_min, head_top, notes_top, line, tol, extra_notes=None):
    p=pdfplumber.open(glob.glob(pdfglob)[0]).pages[page]
    ws=[w for w in p.extract_words() if xmin<=w['x0']<xmax and ymin<=w['top']<ymax]
    def keep(w):
        if w['x0']<time_min or TIME.match(w['text']) or w['text']=='|': return True
        return any(abs(w['top']-t)<1.5 for t in (head_top, notes_top) if t is not None)
    ws=[w for w in ws if keep(w)]
    rows=rows_of(ws)
    head=[r for r in rows if abs(r[0]-head_top)<1.5][0][1]
    frs=[w for w in head if w['x0']>=time_min and w['text'] in CODEFR]
    cols=[]
    for w in frs:
        if cols and w['x0']-cols[-1]['x1']<3 and not (cols[-1]['text'][-1] in '56' or cols[-1]['text'].upper().endswith('SAB')):
            cols[-1]={'x0':cols[-1]['x0'],'x1':w['x1'],'text':cols[-1]['text']+w['text']}
        else: cols.append(dict(x0=w['x0'],x1=w['x1'],text=w['text']))
    cols=[dict(c=(c['x0']+c['x1'])/2,code=norm_code(c['text']),notes=[],stops=[]) for c in cols]
    def nearest(x):
        best=min(cols,key=lambda c:abs(c['c']-x))
        return best if abs(best['c']-x)<=tol else None
    nr=[r for r in rows if notes_top is not None and abs(r[0]-notes_top)<1.5]
    if nr:
        toks=[w for w in nr[0][1] if w['x0']>=time_min]
        i=0
        while i<len(toks):
            t=toks[i]['text']; x=(toks[i]['x0']+toks[i]['x1'])/2
            if t=='Y' and i+2<len(toks) and toks[i+1]['text']=='-' and toks[i+2]['text']=='C':
                x=(toks[i]['x0']+toks[i+2]['x1'])/2; t='Y-C'; i+=2
            if t in NOTES or t=='Y-C':
                c=nearest(x)
                if c: c['notes'].append(t)
            i+=1
    unassigned=[]
    for top,rw in rows:
        if top<=max(head_top,notes_top or 0)+1: continue
        label=' '.join(w['text'] for w in rw if w['x0']<label_max and not TIME.match(w['text']) and w['text'] not in ('|','I'))
        times=[w for w in rw if w['x0']>=time_min and TIME.match(w['text'])]
        if not times: continue
        if not label: unassigned.append((top,[w['text'] for w in times])); continue
        for w in times:
            c=nearest((w['x0']+w['x1'])/2)
            if not c: unassigned.append((label,w['text'])); continue
            h,m=TIME.match(w['text']).groups()
            c['stops'].append([label,int(h)*60+int(m)])
    out=[]
    for i,c in enumerate(cols):
        if len(c['stops'])<2: continue
        notes=list(c['notes'])
        if extra_notes and i in extra_notes: notes+=extra_notes[i]
        out.append(dict(line=line,code=c['code'],ago='AGO' in notes,notes=[n for n in notes if n!='AGO'],stops=c['stops']))
    return out, unassigned, [ (round(c['c']),c['code']) for c in cols]

B='pdf/LINEA-B812*'; T='pdf/LINEA-T10*'
specs=[
 (B,0,0,1029,130,346,170,170,141.1,135.7,'B812',10,None),
 (B,0,0,1029,349,556,170,170,357.1,351.7,'B812',10,None),
 (T,0,0,520,180,362,150,150,190.2,182.5,'T10',7,None),
 (T,0,0,520,368,515,150,150,378.1,370.5,'T10',7,None),
 (T,0,520,1000,210,322,662,662,224.5,None,'T10',7,{1:['B812'],3:['B812']}),
 (T,0,520,1000,376,500,662,662,385.8,378.1,'T10',7,{6:['G'],7:['G']}),
]
runs=[]
for s in specs:
    r,u,cols=table(*s)
    print(s[10],len(cols),'cols',cols)
    if u: print('  UNASSIGNED',u)
    runs+=r
# right-ritorno notes: 'linea B812' above cols 2 and 4 -> line B812
for r in runs:
    if 'B812' in r['notes']:
        r['line']='B812'; r['notes'].remove('B812')
json.dump(runs,open('data/runs.json','w'),ensure_ascii=False,indent=0)
print(len(runs),'runs')
