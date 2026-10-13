
(function(){
/* ---- Idea 4: slash commands ---- */
var form=document.getElementById('chat-form')||document.querySelector('#chat-input')&&document.querySelector('#chat-input').form,inp=document.getElementById('chat-input');
function lastReply(){try{return window.wbBridge.lastReply()}catch(e){}return ''}
function addMessage(r,t){return window.wbBridge.addMessage(r,t)}
var CMDS={
 quiz:function(a){return 'Write a 5-question multiple-choice quiz about '+(a||'what we have been discussing')+'. Label options A-D and give the answer key at the end.'},
 explain:function(a){return 'Explain '+(a||'the last answer')+' in simple terms with one concrete example.'},
 summarize:function(a){var t=a||lastReply();return t?'Summarize the following in 3 short bullet points:\n\n'+t:null}
};
function local(raw,name,arg){try{addMessage('user',raw)}catch(e){}
 var m;if(name==='help')m='Commands: /quiz [topic], /explain [topic], /summarize [text], /note [text] (saves to Study Notes; with no text it saves the last reply).';
 else{var t=arg||lastReply();if(!t||!window.wbEdu)m='Nothing to save yet.';else{window.wbEdu.addNote((arg||'Assistant note').slice(0,60),t);m='Saved to Study Notes ✓'}}
 try{addMessage('system',m)}catch(e){}}
document.addEventListener('submit',function(e){if(!inp||e.target!==inp.form)return;
 var raw=inp.value.trim(),mm=raw.match(/^\/(\w+)\s*([\s\S]*)$/);if(!mm)return;var n=mm[1].toLowerCase(),a=mm[2].trim();
 if(n==='help'||n==='note'){e.preventDefault();e.stopImmediatePropagation();inp.value='';local(raw,n,a);return}
 if(CMDS[n]){var p=CMDS[n](a);if(p===null){e.preventDefault();e.stopImmediatePropagation();inp.value='';try{addMessage('user',raw);addMessage('system','Nothing to summarize yet — add some text after /summarize.')}catch(x){}return}inp.value=p}},true);
if(inp)inp.placeholder='Ask something — or type /help';
/* ---- Idea 5: daily challenge ---- */
var KEYS=["bladeSlice", "bubbleSort", "bulletStorm", "chainReactor", "circuitSnake", "colorMixer", "crystalGarden", "dotConnect", "fishingHole", "gravityFlip", "hybridCircuit", "hybridMeteor", "hybridPrecision", "idleFarm", "laserDodge", "memoryMatch", "meteorCommand", "neonBreaker", "neonPong", "ninjaDash", "orbCatcher", "patternMemory", "pixelDuel", "pixelRunner", "platformJumper", "protoAimTrainer", "protoReaction", "protoTapRush", "rocketDash", "slidingPuzzle", "stackSurge", "starfallDefender", "towerBuilder"],DK='wb-daily-v1';
function ld(){try{return JSON.parse(localStorage.getItem(DK))||{}}catch(e){return {}}}
function ds(d){d=d||new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function reg(){return(window.WB_GAME_REGISTRY||[]).filter(function(g){return g.key&&!g.placeholder&&KEYS.indexOf(g.key)>=0&&document.getElementById(g.slot)})}
function pick(day){var r=reg();if(!r.length)return null;var h=0;for(var i=0;i<day.length;i++)h=(h*31+day.charCodeAt(i))>>>0;return r[h%r.length]}
function streak(db){var n=0,d=new Date();if(!(db[ds(d)]&&db[ds(d)].best>0))d.setDate(d.getDate()-1);while(db[ds(d)]&&db[ds(d)].best>0){n++;d.setDate(d.getDate()-1)}return n}
var card=document.createElement('div');card.className='wb44-card wb45-daily';var tb=document.getElementById('arcade-toolbar');if(tb)tb.insertAdjacentElement('beforebegin',card);
function render(){var day=ds(),g=pick(day);if(!g){card.style.display='none';return}var db=ld(),t=db[day]||{game:g.key,best:0},past=Object.keys(db).filter(function(k){return k!==day&&db[k].best>0}).sort().reverse().slice(0,5);
 var all=Object.keys(db).reduce(function(m,k){return Math.max(m,db[k].best||0)},0);
 card.innerHTML='';var b=document.createElement('div');b.style.flex='1';
 b.innerHTML='<strong>⭐ Daily challenge: </strong>';b.appendChild(document.createTextNode(g.name+' — best today '+(t.best||'—')+' · streak '+streak(db)+' 🔥 · best daily ever '+(all||'—')));
 if(past.length){var s=document.createElement('div');s.className='wb44-mu';s.textContent='Recent: '+past.map(function(k){var gg=(window.WB_GAME_REGISTRY||[]).filter(function(x){return x.key===db[k].game})[0];return k.slice(5)+' '+(gg?gg.name:db[k].game)+' '+db[k].best}).join(' · ');b.appendChild(s)}
 card.appendChild(b);var p=document.createElement('button');p.type='button';p.className='wb44-btn';p.textContent='Play';p.onclick=function(){var sl=document.getElementById(g.slot),bb=sl&&sl.querySelector('.ac-bubble');if(bb)bb.click()};card.appendChild(p);
 reg().forEach(function(x){var sl=document.getElementById(x.slot);if(!sl)return;var o=sl.querySelector('.wb45-tag');if(x.key!==g.key){if(o)o.remove();return}if(!o){o=document.createElement('span');o.className='wb45-tag';sl.appendChild(o)}o.textContent='⭐ DAILY · best '+(t.best||'—')+' · 🔥'+streak(db)})}
var orig=window.wbRecordGameScore;
if(typeof orig==='function')window.wbRecordGameScore=function(k,m,s){var r=orig.apply(this,arguments);try{var day=ds(),g=pick(day);if(g&&k===g.key&&s>0){var db=ld(),t=db[day]||{game:k,best:0};if(s>t.best)t.best=s;db[day]=t;localStorage.setItem(DK,JSON.stringify(db));render()}}catch(e){}return r};
render();document.querySelectorAll('.tabbtn').forEach(function(b){b.addEventListener('click',function(){setTimeout(render,80)})});
})();
