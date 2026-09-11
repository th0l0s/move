const C=require('../src/core.js'); const D=require('../data/data.json'); const M=C.model(D);
const days=[['2026-09-14','auto','lun scol'],['2026-09-19','auto','sab scol'],['2026-12-28','auto','lun NS'],['2027-08-10','auto','agosto']];
for(const [A,Bs] of Object.entries(C.ROUTES)) for(const B of Bs) for(const [d,o,lab] of days){
  const di=C.dayInfo(d,o); const js=C.journeys(M,A,B,di);
  console.log(`${A}->${B} ${lab}: `+js.map(j=>C.hm(j.dep)+'>'+C.hm(j.arr)+(j.x?`(c:${j.change.loc} ${j.change.wait}')`:'')+'['+j.legs.map(l=>l.run.line).join('+')+']').join(' '));
}
console.log(C.easterMonday(2027), C.dayInfo('2026-12-08','auto'));
