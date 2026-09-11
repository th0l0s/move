// ---- UI ----
const FEATURES={mappa:false}; // mappa disattivata: impostare true per riattivare lo schema linea
const M=model(DATA);
const DOW=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
const MON=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=s=>{const d=parseIso(s);return DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()];};
const dur=m=>m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
const todayIso=()=>iso(new Date());

let st={A:'Fara',B:'Vaprio',date:todayIso(),ov:'auto',band:null,open:null,notice:''};
try{const s=JSON.parse(localStorage.getItem('busadda:v1')||'{}'); if(ROUTES[s.A]&&ROUTES[s.A].includes(s.B)){st.A=s.A;st.B=s.B;} if(['auto','S','NS'].includes(s.ov)) st.ov=s.ov;}catch(e){}
if(st.date<START){st.date=START;st.notice='Questi orari partono da lunedì 14 settembre: ti mostro quel giorno.';}
const save=()=>{try{localStorage.setItem('busadda:v1',JSON.stringify({A:st.A,B:st.B,ov:st.ov}));}catch(e){}};

function fillSelects(){
  const a=$('#from'), b=$('#to');
  a.innerHTML=PLACES.map(p=>`<option value="${p}"${p===st.A?' selected':''}>${p}</option>`).join('');
  b.innerHTML=ROUTES[st.A].map(p=>`<option value="${p}"${p===st.B?' selected':''}>${p}</option>`).join('');
}
const bandOf=t=>BANDS.findIndex(([a,b])=>t>=a&&t<b);
const isToday=()=>st.date===todayIso();
const lineTxt=j=>[...new Set(j.legs.map(l=>l.run.line))].join(' + ');

function render(){
  fillSelects();
  const di=dayInfo(st.date,st.ov);
  const js=journeys(M,st.A,st.B,di);
  const now=isToday()?nowMin():-1;
  if(st.band===null){ const nx=now>=0?js.find(j=>j.dep>=now):null; st.band = nx ? bandOf(nx.dep) : -1; }
  // giorno
  const kind = di.holiday ? (di.dow===0?'domenica, nessun servizio':'festivo, nessun servizio')
    : (di.school?'giorno scolastico':'giorno non scolastico')+(di.august?', agosto: solo corse estive':'');
  $('#dayline').innerHTML=`<strong>${esc(fmtDate(st.date))}</strong> <span>${esc(kind)}</span>`;
  $('#notice').textContent=st.notice; $('#notice').hidden=!st.notice;
  $('#bridge').hidden=!(di.bridge&&!di.holiday&&st.ov==='auto');
  $('#date').value=st.date;
  document.querySelectorAll('#ov button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===st.ov));
  renderHero(js,di,now);
  // fasce
  const counts=BANDS.map(([a,b])=>js.filter(j=>j.dep>=a&&j.dep<b).length);
  $('#bands').innerHTML=[['Tutte',-1,js.length],...BANDS.map((b,i)=>[b[2],i,counts[i]])]
    .map(([t,i,n])=>`<button role="tab" aria-selected="${st.band===i}" data-b="${i}" ${n||st.band===i?'':'class="empty"'}>${t}<small>${n}</small></button>`).join('');
  // lista
  const list=st.band<0?js:js.filter(j=>bandOf(j.dep)===st.band);
  const nextIdx=now<0?-1:js.findIndex(j=>j.dep>=now);
  $('#hint').hidden=!(js.length&&js.every(j=>j.x));
  if(!js.length){ $('#list').innerHTML=emptyDay(di); bindEmpty(); return; }
  if(!list.length){
    const before=[...js].reverse().find(j=>j.dep<BANDS[st.band][0]), after=js.find(j=>j.dep>=BANDS[st.band][1]);
    $('#list').innerHTML=`<p class="none">Nessun bus in questa fascia.${before?` Prima: <b>${hm(before.dep)}</b>.`:''}${after?` Dopo: <b>${hm(after.dep)}</b>.`:''}</p>`;
    return;
  }
  $('#list').innerHTML=list.map(j=>{
    const k=js.indexOf(j), gone=now>=0&&j.dep<now, key=j.dep+'-'+j.arr+'-'+j.x;
    const o=j.legs[0].run.segs[j.legs[0].i].stops[0];
    const open=st.open===key;
    return `<li class="${gone?'gone':''}${k===nextIdx?' next':''}">
      <button class="row" aria-expanded="${open}" data-k="${key}">
        <span class="t dep">${hm(j.dep)}</span>
        <span class="mid"><span class="bar"></span><span class="d">${dur(j.arr-j.dep)}</span></span>
        <span class="t arr">${hm(j.arr)}</span>
        <span class="meta"><span class="ln">${esc(lineTxt(j))}</span>${j.x?`<span class="chg">cambio a ${esc(j.change.loc)}</span>`:''}<span class="from">da ${esc(o.name)}</span></span>
      </button>${open?detail(j,di):''}</li>`;
  }).join('');
  bindList();
}

function renderHero(js,di,now){
  const h=$('#hero');
  if(!js.length){h.hidden=true;return;}
  h.hidden=false;
  let j,label,sub='';
  if(now>=0){
    j=js.find(x=>x.dep>=now);
    if(!j){
      const n=nextServiceDay(M,st.A,st.B,st.date,st.ov);
      h.innerHTML=`<p class="k">Per oggi le corse sono finite</p>${n?`<p class="big">${hm(n.j.dep)}</p><p class="s">primo bus ${esc(fmtDate(n.date))}</p><button class="link" data-go="${n.date}">Mostra ${esc(fmtDate(n.date))}</button>`:''}`;
      bindGo(h);return;
    }
    const w=j.dep-now; label='Prossimo bus'; sub= w===0?'parte adesso':'tra '+dur(w);
    if(js[js.length-1]===j) sub+=', ultimo della giornata';
  } else { j=js[0]; label='Primo bus del giorno'; sub='ultimo alle '+hm(js[js.length-1].dep); }
  const o=j.legs[0].run.segs[j.legs[0].i].stops[0];
  h.innerHTML=`<p class="k">${label}</p>
    <p class="big">${hm(j.dep)}<span class="to">→ ${hm(j.arr)}</span></p>
    <p class="s">${esc(sub)}</p>
    <p class="s2">${esc(lineTxt(j))} da ${esc(o.name)}${j.x?`, cambio a ${esc(j.change.loc)}`:''}</p>`;
}

function segStops(run,i,j){ // fermate dall'origine alla destinazione, ordinate per tempo dentro ogni paese
  const out=[]; for(let k=i;k<=j;k++) for(const s of run.segs[k].stops) out.push({...s,edge:k===i||k===j});
  return out;
}
function legHtml(l){
  const r=l.run;
  const stops=segStops(r,l.i,l.j);
  const tags=[CODE_TXT[r.code]||r.code, ...(r.ago?['anche ad agosto']:[]), ...r.notes.map(n=>NOTE_TXT[n]).filter(Boolean)];
  return `<div class="leg"><p class="legh"><b>${esc(r.line)}</b> ${esc(tags.join(', '))}</p><ol class="tl">${
    stops.map(s=>`<li class="${s.edge?'edge':''}"><time>${hm(s.t)}</time><span>${esc(s.loc)} <em>${esc(s.name)}</em></span></li>`).join('')}</ol></div>`;
}
function detail(j,di){
  let body=legHtml(j.legs[0]);
  if(j.x){
    const c=j.change;
    body+=`<p class="change">Cambio a ${esc(c.loc)}: scendi a <b>${esc(c.off.name)}</b> (${hm(c.off.t)}), riparti da <b>${esc(c.on.name)}</b> alle ${hm(c.on.t)}. Attesa ${c.wait} min${c.off.name!==c.on.name?', a piedi tra due fermate':''}.</p>`+legHtml(j.legs[1]);
  }
  // ritorno
  const back=journeys(M,st.B,st.A,di).filter(r=>r.dep>=j.arr+10);
  const backHtml=back.length
    ? `<p class="backh">Ritorno da ${esc(PLACE_NAME[st.B])}</p><div class="chips">${back.slice(0,4).map(r=>`<button data-back="${r.dep}-${r.arr}-${r.x}">${hm(r.dep)}${r.x?'*':''}</button>`).join('')}${back.length>4?`<span class="last">ultimo ${hm(back[back.length-1].dep)}</span>`:''}</div>${back.slice(0,4).some(r=>r.x)?'<p class="fine">* con cambio</p>':''}`
    : `<p class="backh warn">Nessun ritorno per ${esc(PLACE_NAME[st.A])} dopo l'arrivo, in questo giorno.</p>`;
  return `<div class="detail">${body}${backHtml}</div>`;
}
function emptyDay(di){
  const n=nextServiceDay(M,st.A,st.B,st.date,st.ov,30);
  const why=di.holiday?'Nessun servizio la domenica e nei festivi.':`Nessuna corsa ${esc(PLACE_NAME[st.A])} → ${esc(PLACE_NAME[st.B])} in un ${di.school?'giorno scolastico':'giorno non scolastico'} ${di.dow===6?'di sabato':''}.`;
  return `<p class="none">${why}${n?` Prima corsa utile: <b>${esc(fmtDate(n.date))} alle ${hm(n.j.dep)}</b>. <button class="link" data-go="${n.date}">Vai a quel giorno</button>`:''}</p>`;
}
function bindGo(root){root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{st.date=b.dataset.go;st.band=-1;st.open=null;st.notice='';render();});}
function bindEmpty(){bindGo($('#list'));}
function bindList(){
  document.querySelectorAll('#list .row').forEach(b=>b.onclick=()=>{st.open=st.open===b.dataset.k?null:b.dataset.k;render();
    const el=document.querySelector(`#list .row[data-k="${st.open}"]`); if(el) el.scrollIntoView({block:'nearest'});});
  document.querySelectorAll('#list [data-back]').forEach(b=>b.onclick=()=>{
    [st.A,st.B]=[st.B,st.A]; st.open=b.dataset.back; st.band=-1; save(); render();
    const el=document.querySelector(`#list .row[data-k="${st.open}"]`); if(el) el.scrollIntoView({block:'center'});});
}

$('#from').onchange=e=>{st.A=e.target.value; if(!ROUTES[st.A].includes(st.B)) st.B=ROUTES[st.A][0]; st.open=null; st.band=null; save(); render();};
$('#to').onchange=e=>{st.B=e.target.value; st.open=null; st.band=null; save(); render();};
$('#swap').onclick=()=>{[st.A,st.B]=[st.B,st.A]; st.open=null; st.band=null; save(); render();};
$('#date').onchange=e=>{ if(!e.target.value) return; st.date=e.target.value; st.band=null; st.open=null; st.notice=st.date<START?'Attenzione: prima del 14 settembre vale l\'orario precedente, non incluso qui.':''; render();};
$('#today').onclick=()=>{st.date=todayIso(); st.band=null; st.open=null; st.notice=st.date<START?'Oggi vale ancora l\'orario precedente: questi orari partono dal 14 settembre.':''; render();};
$('#ov').onclick=e=>{const v=e.target.closest('button')?.dataset.v; if(!v) return; st.ov=v; st.open=null; save(); render();};
$('#bands').onclick=e=>{const b=e.target.closest('button'); if(!b) return; st.band=+b.dataset.b; st.open=null; render();};
if(FEATURES.mappa){ const m=$('#mappa'); m.hidden=false; m.innerHTML='<p class="none">Schema linea: Treviglio, Badalasco, Fara, Canonica, Vaprio, Trezzo; Cassano via Fara.</p>'; }
render();
setInterval(()=>{ const a=document.activeElement; if(isToday()&&!document.hidden&&!(a&&/SELECT|INPUT/.test(a.tagName))) render(); },30000);
