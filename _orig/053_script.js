
(function(){
var P=window.__wbPlace;if(!P||typeof legacyFactions==='undefined')return;   /* 5.59.0: this older script runs outside the game and cannot see its variables; the defenses and building previews now live inside the game */
var cv=document.getElementById('gamecanvas'),w=cv.parentNode,defs=window.wbDefs=[],dm=false,tg=null,dmRing=null,FPK={house:1,farm:1,mine:1,workshop:1,market:1,armory:1};
function inf(){try{return !!wbInf.on}catch(e){return false}}
LEGACY_COSTS.wall=15;LEGACY_COSTS.tower=60;LEGACY_COSTS.torch=10;
function M(c,e){return new THREE.MeshLambertMaterial(e?{color:c,emissive:e}:{color:c})}
function bx(a,b,c,col,x,y,z){var m=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),M(col));m.position.set(x,y,z);return m}
window.wbDefMesh={
 wall:function(){var g=new THREE.Group();g.add(bx(2.2,1.6,.6,0x8a8f98,0,.8,0));g.add(bx(2.2,.25,.8,0x6f747c,0,1.7,0));return g},
 tower:function(){var g=new THREE.Group();g.add(bx(1.6,3.2,1.6,0x7a6a55,0,1.6,0));g.add(bx(2.2,.5,2.2,0x5a4a38,0,3.45,0));g.add(bx(.5,.8,.5,0xd9b44a,0,4.1,0));return g},
 torch:function(){var g=new THREE.Group();g.add(bx(.18,1.5,.18,0x6a4a2a,0,.75,0));var f=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),M(0xffaa33,0xff7700));f.position.y=1.7;g.add(f);return g}};
window.wbAddDef=function(t,x,z,r){var g=wbDefMesh[t]();g.position.set(x,getGroundHeight(x,z),z);g.rotation.y=r||0;scene.add(g);defs.push({type:t,x:x,z:z,mesh:g,hp:140,cd:0})};
function rm(d){scene.remove(d.mesh);var i=defs.indexOf(d);if(i>=0)defs.splice(i,1)}
function shot(d,z){var y=getGroundHeight(d.x,d.z)+4,l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(d.x,y,d.z),new THREE.Vector3(z.x,1,z.z)]),new THREE.LineBasicMaterial({color:0xffe066}));scene.add(l);setTimeout(function(){scene.remove(l);l.geometry.dispose();l.material.dispose()},120)}
function defTick(dt){var zs=wbInf.z,f=P.pf();
 defs.slice().forEach(function(d){
  if(d.type==='tower'){d.cd-=dt;if(d.cd<=0){var best=null,bd=14;zs.forEach(function(z){if(!z.alive)return;var k=Math.hypot(z.x-d.x,z.z-d.z);if(k<bd){bd=k;best=z}});if(best){d.cd=1.4;damageLegacyTarget({attackPower:12,x:d.x,z:d.z,faction:f},best);shot(d,best)}}}
  else if(d.type==='wall'){zs.forEach(function(z){if(!z.alive)return;var dx=z.x-d.x,dz=z.z-d.z,k=Math.hypot(dx,dz);if(k<1.5){if(k>.01){z.x=d.x+dx/k*1.5;z.z=d.z+dz/k*1.5;if(z.mesh){z.mesh.position.x=z.x;z.mesh.position.z=z.z}}d.hp-=6*dt}});if(d.hp<=0){window.wbLost=(window.wbLost||0)+1;rm(d)}}})}
var _u=updateLegacy;updateLegacy=function(dt,st){_u(dt,st);try{if(inf())defTick(Math.min(dt,.1))}catch(e){console.error(e)}};
var _usm=updateSoldierMovement;updateSoldierMovement=function(u,dt){if(u.zombie&&defs.some(function(d){return d.type==='torch'&&Math.hypot(d.x-u.x,d.z-u.z)<7}))dt*=.5;return _usm(u,dt)};
var _x=exitLegacyMode;exitLegacyMode=function(){defs.slice().forEach(rm);endDm();P.cancel();return _x.apply(this,arguments)};
/* demolish */
function targets(){var f=P.pf(),T=getTerritoryById(f.territoryId),a=defs.map(function(d){return{d:d,x:d.x,z:d.z,t:d.type}});
 legacyBuildings.forEach(function(b){if(FPK[b.type]&&Math.hypot(b.x-T.center.x,b.z-T.center.z)<=T.radius)a.push({b:b,x:b.x,z:b.z,t:b.type})});return a}
function hover(e){var p=P.gp(e);tg=null;if(p){var bd=2.8;targets().forEach(function(c){var k=Math.hypot(c.x-p.x,c.z-p.z);if(k<bd){bd=k;tg=c}})}
 if(tg){dmRing.visible=true;dmRing.position.set(tg.x,getGroundHeight(tg.x,tg.z)+.08,tg.z);P.stat('Demolish '+tg.t+': click for +'+Math.floor((LEGACY_COSTS[tg.t]||0)/2)+' wood. Right-click or Esc to stop.')}
 else{dmRing.visible=false;P.stat('Demolish: point at one of your buildings. Right-click or Esc to stop.')}}
function startDm(){if(!inf())return;P.cancel();dm=true;if(!dmRing){dmRing=new THREE.Mesh(new THREE.CircleGeometry(2,28),new THREE.MeshBasicMaterial({color:0xff3333,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));dmRing.rotation.x=-Math.PI/2;scene.add(dmRing)}dmRing.visible=false;P.stat('Demolish: point at one of your buildings. Right-click or Esc to stop.')}
function endDm(){if(!dm)return;dm=false;tg=null;if(dmRing)dmRing.visible=false;P.stat('')}
function demolish(c){var f=P.pf(),r=Math.floor((LEGACY_COSTS[c.t]||0)/2);
 if(c.d)rm(c.d);else{var b=c.b;scene.remove(b.mesh);var i=legacyBuildings.indexOf(b);if(i>=0)legacyBuildings.splice(i,1);i=f.buildings.indexOf(b);if(i>=0)f.buildings.splice(i,1);var k=b.type==='armory'?'armories':b.type+'s';if(f[k])f[k]--}
 f.wood+=r;P.say('Removed '+c.t+', +'+r+' wood');try{updateLegacyHUD()}catch(x){}tg=null;dmRing.visible=false}
cv.addEventListener('mousemove',function(e){if(dm)hover(e)});
window.addEventListener('mousedown',function(e){if(!dm||e.target!==cv)return;e.stopImmediatePropagation();e.preventDefault();if(e.button!==0){endDm();return}hover(e);if(tg)demolish(tg)},true);
window.addEventListener('keydown',function(e){if(e.key==='Escape')endDm()});
/* buttons */
var row=document.querySelector('.legacy-build-row');
if(row){[['wall','🧱 Wall','15w'],['tower','🗼 Tower','60w'],['torch','🔥 Torch','10w'],['demolish','🔨 Demolish','50% back']].forEach(function(d){var b=document.createElement('button');b.type='button';b.id='lb-'+d[0];b.className='legacy-build-btn wb-def-btn';b.innerHTML=d[1]+' <span class="lb-cost">'+d[2]+'</span>';b.style.display='none';if(d[0]==='demolish')b.onclick=startDm;row.appendChild(b)});
 setInterval(function(){[].forEach.call(row.querySelectorAll('.wb-def-btn'),function(b){b.style.display=inf()?'':'none'})},400)}
/* touch */
if(!matchMedia('(pointer:coarse)').matches)return;
var tc=document.createElement('div');tc.id='bw-touch';
tc.innerHTML='<div id="bw-joy"><i></i></div><div id="bw-tbtns"><button type="button" data-k="KeyQ">⟲</button><button type="button" data-k="KeyE">⟳</button><button type="button" data-z="-5">＋</button><button type="button" data-z="5">－</button></div>';
w.appendChild(tc);
var joy=document.getElementById('bw-joy'),kn=joy.firstChild,pid=null;
function setK(x,y){keys.KeyA=x<-.35;keys.KeyD=x>.35;keys.KeyW=y<-.35;keys.KeyS=y>.35}
function jm(e){var r=joy.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2),m=Math.hypot(x,y);if(m>1){x/=m;y/=m}kn.style.transform='translate('+x*34+'px,'+y*34+'px)';setK(x,y)}
joy.addEventListener('pointerdown',function(e){pid=e.pointerId;joy.setPointerCapture(pid);jm(e)});
joy.addEventListener('pointermove',function(e){if(e.pointerId===pid)jm(e)});
['pointerup','pointercancel'].forEach(function(n){joy.addEventListener(n,function(){pid=null;kn.style.transform='';setK(0,0)})});
[].forEach.call(tc.querySelectorAll('[data-k]'),function(b){var k=b.dataset.k;b.addEventListener('pointerdown',function(){keys[k]=true});['pointerup','pointercancel','pointerleave'].forEach(function(n){b.addEventListener(n,function(){keys[k]=false})})});
[].forEach.call(tc.querySelectorAll('[data-z]'),function(b){b.addEventListener('click',function(){camDistance=Math.max(10,Math.min(95,camDistance+(+b.dataset.z)))})});
['touchstart','touchmove'].forEach(function(n){cv.addEventListener(n,function(e){if(!P.active())return;var t=e.touches[0];P.upd({clientX:t.clientX,clientY:t.clientY});e.preventDefault()},{passive:false})});
var bar=document.createElement('div');bar.id='bw-place-bar';bar.innerHTML='<button type="button" data-a="place">✅ Place</button><button type="button" data-a="rot">↻</button><button type="button" data-a="x">✖</button>';
(document.getElementById('bw-left-col')||w).appendChild(bar);
bar.onclick=function(e){var a=e.target.dataset&&e.target.dataset.a;if(a==='place')P.commit();else if(a==='rot')P.rot();else if(a==='x'){P.cancel();endDm()}};
setInterval(function(){var ov=document.getElementById('mode-select-overlay');tc.style.display=ov&&getComputedStyle(ov).display!=='none'?'none':'flex';bar.style.display=(P.active()||dm)?'flex':'none';bar.firstChild.style.display=dm?'none':''},300);
})();
