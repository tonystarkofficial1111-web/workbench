
(function(){
function vis(e){var r=e.getBoundingClientRect(),c=getComputedStyle(e);return r.width>1&&r.height>1&&c.display!=='none'&&c.visibility!=='hidden'&&c.opacity!=='0'}
function nm(e){return e.id||('.'+String(e.className).split(' ')[0]+' "'+e.textContent.trim().slice(0,14)+'"')}
function layout(){
 var t=document.getElementById('tab-world'),w=document.getElementById('gamecanvas').parentNode,out=[];
 if(!t||!t.classList.contains('active'))return [['warn','Block World is not open','Open Block World (Classic or Infinite) and run the test again.']];
 var skip={gamecanvas:1,'build-panel':1,'mode-select-overlay':1,'legacy-banner':1,'bw-instr':1},els=[];
 [].forEach.call(w.children,function(c){if(c.id==='bw-right-col'||c.id==='bw-left-col')[].forEach.call(c.children,function(k){els.push(k)});else if(!skip[c.id])els.push(c)});
 var h=document.getElementById('wb-inf-hud');if(h)els.push(h);
 [].forEach.call(w.querySelectorAll('.legacy-build-btn,.legacy-stat'),function(k){els.push(k)});
 els=els.filter(function(e,i){return els.indexOf(e)===i&&vis(e)});
 var bad=[],off=[];
 for(var i=0;i<els.length;i++){var a=els[i].getBoundingClientRect();
  if(a.left<-1||a.top<-1||a.right>innerWidth+1||a.bottom>innerHeight+1)off.push(nm(els[i]));
  for(var j=i+1;j<els.length;j++){if(els[i].contains(els[j])||els[j].contains(els[i]))continue;var b=els[j].getBoundingClientRect(),ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ox>4&&oy>4)bad.push(nm(els[i])+' over '+nm(els[j]))}}
 var sz=innerWidth+'x'+innerHeight;
 out.push([bad.length?'bad':'ok','No overlapping buttons or HUD pieces',bad.length?bad.slice(0,8).join('; '):els.length+' pieces checked at '+sz]);
 out.push([off.length?'warn':'ok','Nothing off screen',off.length?off.slice(0,8).join('; '):'All inside '+sz]);
 return out}
function extra(){var out=[],seen={},dup=[];
 [].forEach.call(document.querySelectorAll('[id]'),function(e){if(seen[e.id]&&dup.indexOf(e.id)<0)dup.push(e.id);seen[e.id]=1});
 out.push([dup.length?'bad':'ok','No duplicate element ids',dup.length?dup.slice(0,10).join(', '):Object.keys(seen).length+' ids, all unique']);
 var er=window.__wbErrs||[];out.push([er.length?'warn':'ok','No page errors logged since load',er.length?er.length+' logged. Latest: '+er.slice(-3).join(' | '):'Clean']);
 var tb=[].slice.call(document.querySelectorAll('.tabbtn')).filter(function(b){return b.dataset.target&&!document.getElementById(b.dataset.target)}).map(function(b){return b.dataset.target});
 out.push([tb.length?'bad':'ok','Every tab button has a panel',tb.length?'Missing: '+tb.join(', '):document.querySelectorAll('.tabbtn').length+' tab buttons checked']);
 var n=0;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);n+=k.length+(localStorage.getItem(k)||'').length}var kb=Math.round(n*2/1024);out.push([kb>4000?'warn':'ok','Browser storage used',kb+' KB of roughly 5,000 KB'+(kb>4000?' - back up and clear old saves soon':'')])}catch(e){out.push(['bad','Browser storage','Not readable: '+e.message])}
 return out}
var dp=document.getElementById('dev-panel');if(!dp)return;
var sec=document.createElement('div');sec.id='wb-layout-test';sec.className='wb44-sec';
var h3=document.createElement('h3');h3.textContent='🧪 Layout & smoke test';sec.appendChild(h3);
var res=document.createElement('div'),b=document.createElement('button');b.type='button';b.textContent='Run layout & smoke test';
b.onclick=function(){res.innerHTML='';layout().concat(extra()).forEach(function(c){var r=document.createElement('div');r.textContent=(c[0]==='ok'?'🟢 ':c[0]==='warn'?'🟡 ':'🔴 ')+c[1];var d=document.createElement('div');d.className='wb44-mu';d.textContent=c[2];r.appendChild(d);res.appendChild(r)})};
sec.appendChild(b);sec.appendChild(res);dp.appendChild(sec);
})();
