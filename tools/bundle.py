# assembla index.html (file unico, nessuna dipendenza) da src/ e data/
core=open('src/core.js').read().replace("if(typeof module!=='undefined') module.exports={model,journeys,dayInfo,hm,nextServiceDay,easterMonday,ROUTES,runsOn};","")
html=open('src/shell.html').read().replace('/*DATA*/',open('data/data.json').read()).replace('/*CORE*/',core).replace('/*UI*/',open('src/ui.js').read())
open('index.html','w').write(html)
