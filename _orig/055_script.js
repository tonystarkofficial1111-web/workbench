
(function(){
if(typeof killLegacyUnit==='undefined')return;   /* 5.59.0: runs outside the game and cannot see its variables; the defeat screen with run stats now lives inside the game */
function inf(){try{return !!wbInf.on}catch(e){return false}}
var fast=false,cur=0,rep={kills:0,lost0:0},best=+localStorage.getItem('wb-inf-best')||0,card=document.createElement('div'),tm=0;
card.id='bw-wave-card';document.body.appendChild(card);
function coin(n){try{wbProfile.coins=(wbProfile.coins||0)+n;try{wbSaveProfile()}catch(e){}var c=document.getElementById('coin-count');if(c)c.textContent=wbProfile.coins}catch(e){}}
function pf(){return legacyFactions.find(function(f){return f.isPlayer})}
var _k=killLegacyUnit;killLegacyUnit=function(u){if(u&&u.zombie&&inf())rep.kills++;return _k.apply(this,arguments)};
function report(w,won){var c=pf()&&pf().castle,hp=c?Math.max(0,Math.round(100*c.health/(c.maxHealth||c.health||1))):0,co=won?Math.min(25,2+2*w):0,nb=won&&w>best;
 if(nb){best=w;try{localStorage.setItem('wb-inf-best',w)}catch(e){}}if(co)coin(co);
 card.innerHTML='<h3>'+(won?'🌅 Wave '+w+' survived':'💀 Wave '+w+': kingdom overrun')+'</h3>Zombies defeated: <b>'+rep.kills+'</b><br>Walls lost: <b>'+Math.max(0,(window.wbLost||0)-rep.lost0)+'</b><br>Castle health: <b>'+hp+'%</b>'+(won?'<br>Dawn bonus: <b>+'+(10+5*w)+' wood</b><br>Coins earned: <b>+'+co+'</b>':'')+'<br>Best wave: <b>'+best+'</b>'+(nb?' 🎉 new best!':'')+'<p style="text-align:right;margin:8px 0 0"><button type="button">Close</button></p>';
 card.style.display='block';card.querySelector('button').onclick=function(){card.style.display='none'};clearTimeout(tm);tm=setTimeout(function(){card.style.display='none'},15000)}
function watch(){var q=wbInf.q;
 if(q&&q.wave!==cur){cur=q.wave;rep={kills:0,lost0:window.wbLost||0}}
 else if(cur&&!q){report(cur,true);cur=0}
 else if(cur){var c=pf()&&pf().castle;if(c&&!c.alive){report(cur,false);cur=0}}}
var _u=updateLegacy;updateLegacy=function(dt,st){var n=(inf()&&fast)?2:1;for(var i=0;i<n;i++){_u(dt,st);try{if(inf())watch()}catch(e){console.error(e)}}};
var _x=exitLegacyMode;exitLegacyMode=function(){fast=false;cur=0;var b=document.getElementById('lb-speed');if(b)b.textContent='⏩ 1x';card.style.display='none';return _x.apply(this,arguments)};
var row=document.querySelector('.legacy-build-row');
if(row){var b=document.createElement('button');b.type='button';b.id='lb-speed';b.className='legacy-build-btn wb-def-btn';b.textContent='⏩ 1x';b.style.display='none';b.onclick=function(){fast=!fast;b.textContent=fast?'⏩ 2x ON':'⏩ 1x'};row.appendChild(b)}
})();
