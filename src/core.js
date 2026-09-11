// ---- core: pure functions, no DOM (testable with node) ----
const START = '2026-09-14';
const HUBS=['Fara','Vaprio','Canonica','Treviglio','Pontirolo','Cassano','Trezzo'];
const MIN_SAME=3, MIN_WALK=8, MAX_WAIT=30, MAX_TRIP=90;
const PLACES = ['Fara','Vaprio','Cassano','Trezzo','Treviglio'];
const ROUTES = {Fara:['Vaprio','Cassano','Trezzo','Treviglio'],Vaprio:['Fara','Cassano'],Cassano:['Fara','Vaprio'],Trezzo:['Fara'],Treviglio:['Fara']};
const PLACE_NAME = {Fara:"Fara Gera d'Adda",Vaprio:"Vaprio d'Adda",Cassano:"Cassano d'Adda",Trezzo:"Trezzo sull'Adda",Treviglio:'Treviglio'};
const BANDS = [[300,600,'5–10'],[600,900,'10–15'],[900,1200,'15–20'],[1200,1440,'20–24']];
const CODE_TXT = {F6:'Feriale lun–sab',F5:'Feriale lun–ven',S6:'Scolastica lun–sab',S5:'Scolastica lun–ven',SSAB:'Scolastica sabato',NS6:'Non scolastica lun–sab',NS5:'Non scolastica lun–ven',NSSAB:'Non scolastica sabato'};
const NOTE_TXT = {Y:'transita da P.za Mentana',W:'diretta Pontirolo–Canonica',C:'prosegue per ITIS e Caravaggio',X:'proviene da ITIS',YC:'transita da P.za Mentana, prosegue per ITIS e Caravaggio',G:'proviene da Groppello'};
// Calendario scolastico Lombardia 2026/27 (lezioni 14/09/2026 – 08/06/2027)
const SCHOOL_FROM = '2026-09-14', SCHOOL_TO = '2027-06-08';
const SCHOOL_OFF = [['2026-12-23','2027-01-05'],['2027-02-08','2027-02-09'],['2027-03-25','2027-03-30']];
// Provincia di Bergamo: sospensioni piu condivise dalle scuole superiori (non obbligatorie per tutte)
const BRIDGES_BG = ['2026-11-02','2026-12-07','2027-03-31'];
const FIXED_HOLIDAYS = ['01-01','01-06','04-25','05-01','06-02','08-15','11-01','12-08','12-25','12-26'];

function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function parseIso(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
function addDays(s,n){const d=parseIso(s);d.setDate(d.getDate()+n);return iso(d);}
function easterMonday(y){ // Meeus/Jones/Butcher
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
  h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
  mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  return addDays(iso(new Date(y,mo-1,da)),1);
}
function dayInfo(s, override){ // override: 'auto' | 'S' | 'NS'
  const d=parseIso(s), dow=d.getDay(); // 0=dom
  const holiday = dow===0 || FIXED_HOLIDAYS.includes(s.slice(5)) || s===easterMonday(d.getFullYear());
  let school = s>=SCHOOL_FROM && s<=SCHOOL_TO && !SCHOOL_OFF.some(([a,b])=>s>=a&&s<=b);
  if(override==='S') school=true; else if(override==='NS') school=false;
  return {date:s,dow,holiday,school,august:d.getMonth()===7,bridge:BRIDGES_BG.includes(s)};
}
function runsOn(code, ago, di){
  if(di.holiday) return false;
  if(di.august && !ago) return false;
  const sat=di.dow===6;
  switch(code){
    case 'F6': return true;           case 'F5': return !sat;
    case 'S6': return di.school;      case 'S5': return di.school && !sat;
    case 'SSAB': return di.school && sat;
    case 'NS6': return !di.school;    case 'NS5': return !di.school && !sat;
    case 'NSSAB': return !di.school && sat;
  }
  return false;
}
function hm(t){return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}

function model(D){
  const stops=D.stops.map(([loc,name])=>({loc,name}));
  const runs=D.runs.map(([line,code,ago,notes,st],id)=>{
    const seq=st.map(([s,t])=>({loc:stops[s].loc,name:stops[s].name,t}));
    const segs=[]; // contiguous stops of the same locality, sorted by time
    for(const x of seq){ const last=segs[segs.length-1]; if(last&&last.loc===x.loc) last.stops.push(x); else segs.push({loc:x.loc,stops:[x]}); }
    for(const g of segs) g.stops.sort((a,b)=>a.t-b.t);
    return {id,line,code,ago:!!ago,notes:notes?notes.match(/YC|./g):[],segs};
  });
  return {stops,runs};
}
// direct leg of a run from A to B: first A segment, first B segment after it
function leg(run,A,B){
  const i=run.segs.findIndex(g=>g.loc===A); if(i<0) return null;
  const j=run.segs.findIndex((g,k)=>k>i&&g.loc===B); if(j<0) return null;
  const d=run.segs[j].stops, dep=run.segs[i].stops[0].t;
  // Treviglio: arrivo al capolinea/stazione (ultima fermata); altrove: prima fermata del paese
  const arr=(B==='Treviglio'?d[d.length-1]:d[0]).t;
  if(arr<=dep) return null;
  return {run,i,j,dep,arr};
}
function journeys(M,A,B,di){
  const act=M.runs.filter(r=>runsOn(r.code,r.ago,di));
  const out=[];
  // direct: merge identical dep/arr (duplicated S5/S6 columns)
  const seen=new Map();
  for(const r of act){ const l=leg(r,A,B); if(!l) continue;
    const k=l.dep+'-'+r.line+'-'+r.segs[l.i].stops[0].name; // stesso bus in colonne S5/S6 diverse
    if(seen.has(k)){ const p=seen.get(k); p.alt.push(r); if(l.arr<p.arr){p.arr=l.arr;p.legs=[l];} continue; }
    const j={dep:l.dep,arr:l.arr,legs:[l],alt:[],x:0}; seen.set(k,j); out.push(j);
  }
  // one change, anywhere except A/B
  for(const r1 of act){
    for(let i=0;i<r1.segs.length;i++){ if(r1.segs[i].loc!==A) continue;
      let best=null;
      for(let x=i+1;x<r1.segs.length;x++){ const X=r1.segs[x].loc; if(X===A||X===B||!HUBS.includes(X)) continue;
        for(const r2 of act){ if(r2===r1) continue;
          for(let y=0;y<r2.segs.length;y++){ if(r2.segs[y].loc!==X) continue;
            const l2=leg(r2,X,B); if(!l2||l2.i!==y) continue;
            // cambio fattibile: stessa fermata >=3', fermata diversa >=8', attesa <=30'
            let tr=null;
            for(const s1 of r1.segs[x].stops) for(const s2 of r2.segs[y].stops){
              const w=s2.t-s1.t, need=s1.name===s2.name?MIN_SAME:MIN_WALK;
              if(w>=need&&w<=MAX_WAIT&&(!tr||w<tr.wait)) tr={off:s1,on:s2,wait:w,loc:X};
            }
            if(!tr) continue;
            const dep=r1.segs[i].stops[0].t, arr=l2.arr;
            if(tr.off.t<=dep||arr<=tr.on.t||arr-dep>MAX_TRIP) continue; // scarta refusi orari
            if(!best||arr<best.arr) best={dep,arr,x:1,alt:[],change:tr,legs:[{run:r1,i,j:x,dep,arr:tr.off.t},{run:r2,i:y,j:l2.j,dep:tr.on.t,arr}]};
          }
        }
      }
      if(best) out.push(best);
      break;
    }
  }
  // soluzioni con cambio: solo se utili (niente diretta vicina, oppure non molto piu lenta)
  const directs=out.filter(j=>j.x===0);
  const dur=directs.map(j=>j.arr-j.dep).sort((a,b)=>a-b), typical=dur.length?dur[dur.length>>1]:0;
  const res=out.filter(J=>{
    if(J.x===0) return true;
    if(out.some(K=>K!==J&&K.dep>=J.dep&&K.arr<=J.arr&&K.x<=J.x&&(K.dep>J.dep||K.arr<J.arr||K.x<J.x))) return false;
    if(typical&&J.arr-J.dep>Math.max(typical*3,typical+30)) return false; // troppo lunga rispetto alla diretta
    const near=directs.some(K=>K.dep>=J.dep-10&&K.dep<=J.dep+60);
    if(!near) return true;
    return J.arr-J.dep<=typical+15 && !directs.some(K=>K.dep>=J.dep&&K.arr<=J.arr+10);
  });
  // dedupe change journeys with same dep/arr
  const u=new Map(); for(const j of res){const k=j.dep+'-'+j.arr+'-'+j.x; if(!u.has(k)||j.x===0) u.set(k,j);}
  return [...u.values()].sort((a,b)=>a.dep-b.dep||a.arr-b.arr);
}
function nextServiceDay(M,A,B,from,override,maxDays=14){
  for(let n=1;n<=maxDays;n++){ const s=addDays(from,n); const di=dayInfo(s,override); const js=journeys(M,A,B,di); if(js.length) return {date:s,j:js[0]}; }
  return null;
}
if(typeof module!=='undefined') module.exports={model,journeys,dayInfo,hm,nextServiceDay,easterMonday,ROUTES,runsOn};
