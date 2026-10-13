
(function(){
var FP={house:1.6,farm:2.3,mine:1.7,workshop:1.8,market:1.7,armory:1.7,wall:1.1,tower:1.5,torch:.7},CK={house:'houses',farm:'farms',mine:'mines',workshop:'workshops',market:'markets',armory:'armories'};
var cv=document.getElementById('gamecanvas'),pl=null,ghost=null,ring=null,ok=null,pos=null,rot=0;
function pf(){return legacyFactions.find(function(f){return f.isPlayer})}
function say(t){try{showWorldWarning(t,2500)}catch(e){}}
function stat(t){var e=document.getElementById('world-status');if(e)e.textContent=t}
function valid(x,z,t){var f=pf(),r=FP[t],T=getTerritoryById(f.territoryId);
 if(Math.hypot(x-T.center.x,z-T.center.z)>T.radius-r)return false;
 navEnsure();
 for(var i=0;i<5;i++){var a=i*1.2566,d=i?r*.8:0;if(seaOpen(Math.floor(x+Math.cos(a)*d),Math.floor(z+Math.sin(a)*d)))return false}
 if(legacyBuildings.some(function(b){return Math.hypot(b.x-x,b.z-z)<r+(FP[b.type]||2)}))return false;
 var hit=false;legacyFactions.forEach(function(g){var c=g.castle;if(!c)return;var q=c.group?c.group.position:c.mesh?c.mesh.position:c;if(q&&Math.hypot(q.x-x,q.z-z)<r+4.5)hit=true});
 if(hit)return false;
 if(legacyOreNodes.some(function(o){return Math.hypot(o.x-x,o.z-z)<r+.6}))return false;return !(window.wbDefs||[]).some(function(d){return Math.hypot(d.x-x,d.z-z)<r+FP[d.type]});
}
function mk(t){if(window.wbDefMesh&&wbDefMesh[t]){var g=wbDefMesh[t]();g.traverse(function(o){if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.55;o.material.depthWrite=false}});scene.add(g);return g}var f=pf();window.__wbPos={x:0,z:0};var b=createBuilding(f,t);window.__wbPos=null;if(!b)return null;
 legacyBuildings.pop();f.buildings.pop();f[CK[t]]--;
 b.mesh.traverse(function(o){if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.55;o.material.depthWrite=false}});return b.mesh}
function tint(c){if(!ghost)return;ghost.traverse(function(o){if(o.material)o.material.color.setHex(c)});ring.material.color.setHex(c)}
function cancel(){if(ghost)scene.remove(ghost);if(ring)scene.remove(ring);ghost=ring=null;pl=null;ok=null;stat('')}
function gp(e){var r=screenRay(e).ray,p=new THREE.Vector3(),T=getTerritoryById(pf().territoryId),y=getGroundHeight(T.center.x,T.center.z);
 for(var i=0;i<2;i++){if(!r.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-y),p))return null;y=getGroundHeight(p.x,p.z)}return p}
function upd(e){var p=gp(e);if(!p||!ghost)return;pos={x:p.x,z:p.z};var gy=getGroundHeight(p.x,p.z);
 ghost.position.set(p.x,gy,p.z);ghost.rotation.y=rot;ring.position.set(p.x,gy+.06,p.z);var v=valid(p.x,p.z,pl);if(v!==ok){ok=v;tint(v?0x33ff66:0xff3333)}}
function start(t){var f=pf();if(!f)return;if(f.wood<LEGACY_COSTS[t]){say('Need '+LEGACY_COSTS[t]+' wood for a '+t+'.');return}
 cancel();pl=t;ghost=mk(t);ring=new THREE.Mesh(new THREE.CircleGeometry(FP[t],28),new THREE.MeshBasicMaterial({transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));
 ring.rotation.x=-Math.PI/2;scene.add(ring);stat('Placing '+t+': green = free, red = blocked. Click to place, right-click or Esc to cancel.')}
document.addEventListener('click',function(e){if(typeof legacyFactions==='undefined')return;var b=e.target.closest&&e.target.closest('.legacy-build-btn');if(!b||!/^lb-/.test(b.id))return;var t=b.id.slice(3);if(!FP[t])return;e.stopImmediatePropagation();e.preventDefault();start(t)},true);
cv.addEventListener('mousemove',function(e){if(pl)upd(e)});
window.addEventListener('mousedown',function(e){if(!pl||e.target!==cv)return;e.stopImmediatePropagation();e.preventDefault();
 if(e.button!==0){cancel();return}
 upd(e);commit()},true);
function commit(){if(!pl)return;if(!ok){say('Blocked: pick a green spot.');return}
 var f=pf(),c=LEGACY_COSTS[pl],t=pl;if(f.wood<c){say('Need '+c+' wood.');cancel();return}
 f.wood-=c;if(window.wbDefMesh&&wbDefMesh[t])wbAddDef(t,pos.x,pos.z,rot);else{window.__wbPos={x:pos.x,z:pos.z};var nb=createBuilding(f,t);window.__wbPos=null;if(nb&&nb.mesh)nb.mesh.rotation.y=rot}cancel();
 say(t.charAt(0).toUpperCase()+t.slice(1)+' placed!');try{updateLegacyHUD()}catch(x){}}
window.addEventListener('keydown',function(e){if(e.key==='Escape'&&pl)cancel();if((e.key==='r'||e.key==='R')&&pl&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName)){rot+=Math.PI/2;if(ghost)ghost.rotation.y=rot}});
cv.addEventListener('contextmenu',function(e){if(pl)e.preventDefault()});
window.__wbPlace={start:start,commit:commit,cancel:cancel,upd:upd,gp:gp,pf:pf,say:say,stat:stat,active:function(){return pl},rot:function(){rot+=Math.PI/2;if(ghost)ghost.rotation.y=rot}};var bt=document.createElement('button'),md=document.createElement('div');bt.id='bw-instr-btn';bt.type='button';bt.textContent='Instructions';
md.id='bw-instr';md.innerHTML='<div class="c"><h3>Instructions</h3><div class="b"></div><p style="text-align:right;margin:12px 0 0"><button type="button" class="x">Close</button></p></div>';
cv.parentNode.appendChild(bt);document.body.appendChild(md);
bt.onclick=function(){var L=document.getElementById('legacy-hud').classList.contains('show'),h=document.getElementById(L?'legacy-hint':'game-hint');md.querySelector('.b').textContent=h?h.textContent:'';md.style.display='flex'};
md.onclick=function(e){if(e.target===md||e.target.className==='x')md.style.display='none'};
})();
