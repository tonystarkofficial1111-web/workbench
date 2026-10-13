
(function(){
function B(){return window.wbBridge||{}}
function ver(){try{return B().version()}catch(e){return ''}}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function btn(x,f,c){var b=el('button','wb44-btn'+(c?' '+c:''),x);b.type='button';b.onclick=f;return b}
/* ---- Idea 10: rule checker ---- */
var IDS=['wb-layout-test','tab-start','tab-edu','tab-videos','tab-arcade','tab-ai','tab-data','tab-dev','mode-select-overlay','legacy-hud','fc-add','fc-deck','notes-list','chat-form','ai-memory-list','coin-count','version-badge-number','dev-changelog-list','arcade-toolbar','wb-myfiles-card','wb-weekly-focus','wb-badges-card'];
var FNS=['wbRecordGameScore','wbSaveProfile','wbDefaultProfile'];
function checks(){var v=ver(),cl=[],out=[];try{cl=B().changelog()}catch(e){}
 function add(s,n,d){out.push([s,n,d])}
 var bd=document.getElementById('version-badge-number');add(bd&&bd.textContent===v?'ok':'bad','Badge matches APP_VERSION','Badge '+(bd?bd.textContent:'missing')+' / APP_VERSION '+v);
 var ag=document.getElementById('assistant-page-gate');if(ag){var pv=ag.getAttribute('aria-hidden');ag.setAttribute('aria-hidden','true');var hid=getComputedStyle(ag).display==='none';if(pv===null)ag.removeAttribute('aria-hidden');else ag.setAttribute('aria-hidden',pv);add(hid?'ok':'bad','Assistant lock page hides when unlocked',hid?'Hidden correctly':'Lock page still displays when unlocked')}
 add(cl.some(function(e){return e.v===v})?'ok':'bad','Changelog has an entry for '+v,cl.length+' entries');
 add(cl[0]&&cl[0].v===v?'ok':'bad','Newest changelog entry is the current version','Newest: '+(cl[0]&&cl[0].v));
 add(/^\d+\.\d+\.\d$/.test(v)?'ok':'bad','Patch number stays 0-9 (rollover rule)',v);
 var fn=decodeURIComponent((location.pathname.split('/').pop()||'')),m=fn.match(/Workbench[_ -](\d+)[_.-](\d+)[_.-](\d+)/i);
 add(!m?'warn':(m.slice(1).join('.')===v?'ok':'bad'),'Filename matches version',m?fn:'Cannot verify "'+(fn||'(no file name)')+'" — expected Workbench_'+v.replace(/\./g,'_')+'.html');
 var miss=IDS.filter(function(i){return !document.getElementById(i)}).concat(FNS.filter(function(f){return typeof window[f]!=='function'&&typeof (function(){try{return eval(f)}catch(e){}})()!=='function'}));
 add(miss.length?'bad':'ok','No tracked feature missing',miss.length?'Missing: '+miss.join(', '):IDS.length+FNS.length+' tracked items present');
 var prev=+localStorage.getItem('wb-rc-clen')||0;add(cl.length>=prev?'ok':'bad','Changelog not shortened',cl.length+' now / '+prev+' before');if(cl.length>prev)try{localStorage.setItem('wb-rc-clen',cl.length)}catch(e){}
 return out}
var dp=document.getElementById('dev-panel');
if(dp){var rs=el('div','wb44-sec');rs.appendChild(el('h3',null,'✅ Rule checker'));var ro=el('div');rs.appendChild(btn('Run rule check',function(){ro.innerHTML='';checks().forEach(function(c){var r=el('div',null,(c[0]==='ok'?'🟢 ':c[0]==='warn'?'🟡 ':'🔴 ')+c[1]);r.appendChild(el('div','wb44-mu',c[2]));ro.appendChild(r)})}));rs.appendChild(ro);dp.appendChild(rs)}
/* ---- Idea 9: full backup + 10-minute reminder ---- */
var LB='wb-last-backup',loaded=Date.now(),lastPrompt=0;
function lastB(){return +localStorage.getItem(LB)||0}
function backup(){var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);o[k]=localStorage.getItem(k)}
 var b=new Blob([JSON.stringify({format:'Stark Workbench Full Backup',version:1,appVersion:ver(),savedAt:new Date().toISOString(),storage:o})],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download='workbench-full-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();
 try{localStorage.setItem(LB,Date.now())}catch(e){}st.textContent='Last backup: just now';hideBar()}
function restore(f){var r=new FileReader();r.onload=function(){try{var d=JSON.parse(r.result);if(d.format!=='Stark Workbench Full Backup'||!d.storage)throw 0;if(!confirm('Restore '+Object.keys(d.storage).length+' saved items? Matching items on this device will be overwritten.'))return;Object.keys(d.storage).forEach(function(k){localStorage.setItem(k,d.storage[k])});location.reload()}catch(e){alert('That is not a Workbench full backup file.')}};r.readAsText(f)}
var st=el('span','wb44-mu',lastB()?'Last backup: '+new Date(lastB()).toLocaleString():'No backup yet'),bs=el('div','wb44-sec'),fi=document.createElement('input');
bs.appendChild(el('h3',null,'💾 Full backup'));bs.appendChild(el('p','wb44-mu','Everything lives in this browser. One cleared cache loses it, so back up often (you will be reminded every 10 minutes).'));
bs.appendChild(btn('Back up everything',backup));fi.type='file';fi.accept='.json';fi.style.display='none';fi.onchange=function(){if(fi.files[0])restore(fi.files[0])};bs.appendChild(btn('Restore from backup',function(){fi.click()},'ghost'));bs.appendChild(fi);bs.appendChild(document.createElement('br'));bs.appendChild(st);
var td=document.getElementById('tab-data');if(td)td.appendChild(bs);
var bar=el('div','wb44-bar');bar.style.display='none';var bt=el('span');bar.appendChild(bt);bar.appendChild(btn('Back up everything',backup));bar.appendChild(btn('Remind me later',function(){lastPrompt=Date.now();hideBar()},'ghost'));document.body.appendChild(bar);
function hideBar(){bar.style.display='none'}
setInterval(function(){var base=Math.max(lastB(),loaded,lastPrompt);if(Date.now()-base>=6e5){var m=Math.round((Date.now()-Math.max(lastB(),loaded))/6e4);bt.textContent='💾 '+(lastB()?m+' min since your last backup.':'No backup yet this session ('+m+' min).')+' ';bar.style.display='flex';lastPrompt=Date.now()}},15000);
/* ---- Idea 6: coin shop ---- */
var SK='wb-shop-v1',ITEMS=[
 {id:'th-noir',kind:'theme',name:'Neon Noir theme',price:150,val:'noir'},{id:'th-crimson',kind:'theme',name:'Crimson Dusk theme',price:150,val:'crimson'},{id:'th-arctic',kind:'theme',name:'Arctic theme',price:150,val:'arctic'},
 {id:'ac-gold',kind:'accent',name:'Gold accent',price:80,val:'#ffd34d'},{id:'ac-magenta',kind:'accent',name:'Magenta accent',price:80,val:'#ff4fd8'},{id:'ac-lime',kind:'accent',name:'Lime accent',price:80,val:'#9dff3d'}];
function sv(){try{return JSON.parse(localStorage.getItem(SK))||{owned:[]}}catch(e){return {owned:[]}}}
function put(s){try{localStorage.setItem(SK,JSON.stringify(s))}catch(e){}}
function coins(){return(typeof wbProfile!=='undefined'&&wbProfile.coins)||0}
function apply(){var s=sv(),r=document.documentElement;if(s.theme)r.setAttribute('data-theme',s.theme);if(s.accent)r.style.setProperty('--cyan',s.accent);else if(s.accentOff)r.style.removeProperty('--cyan')}
var shop=el('div','wb44-sec'),list=el('div'),msg=el('p','wb44-mu','');shop.appendChild(el('h3',null,'🪙 Coin shop'));shop.appendChild(el('p','wb44-mu','Spend the coins you earn in the Arcade. Livery and cover-art frame unlocks are coming in a later update.'));shop.appendChild(list);shop.appendChild(msg);
function draw(){var s=sv();list.innerHTML='';ITEMS.forEach(function(it){var row=el('div','wb44-row');row.style.alignItems='center';row.appendChild(el('span',null,it.name+' '));var own=s.owned.indexOf(it.id)>=0,on=(it.kind==='theme'?s.theme===it.val:s.accent===it.val);
 row.appendChild(own?btn(on?'Equipped ✓':'Equip',function(){var q=sv();if(it.kind==='theme')q.theme=it.val;else{q.accent=it.val}put(q);apply();draw()}):btn('Buy · 🪙'+it.price,function(){if(coins()<it.price){msg.textContent='Not enough coins — you have '+coins()+'.';return}wbProfile.coins=coins()-it.price;try{wbSaveProfile()}catch(e){}var c=document.getElementById('coin-count');if(c)c.textContent=wbProfile.coins;var q=sv();q.owned.push(it.id);put(q);msg.textContent='Bought '+it.name+'.';draw()}));list.appendChild(row)});
 var rb=btn('Reset shop colors',function(){var q=sv();delete q.theme;delete q.accent;q.accentOff=1;put(q);document.documentElement.setAttribute('data-theme','default');document.documentElement.style.removeProperty('--cyan');draw()},'ghost');list.appendChild(rb)}
if(td)td.appendChild(shop);draw();apply();
})();
