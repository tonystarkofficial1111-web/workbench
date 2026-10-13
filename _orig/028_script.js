
/* ============================================================
   5.18.0 FEATURE PACK
   - Arcade Games/Educational sub-tabs
   - Type Rush (Nitro-Type-style typing game)
   - Python Lab (work-in-progress card)
   - Connect to the Wi-Fi (WebRTC LAN P2P + share-code fallback)
   - PIXEL DUEL (one two-player local game, converts plf-49)
   - "Play all cabinets" threshold -> 33
   ============================================================ */
(function(){
  "use strict";
  window.__wb518Log = [];

  function L(m){ window.__wb518Log.push(m); }

  /* ---------- Arcade sub-tabs (Games / Block World / CAR filter) ---------- */
  function wbSubInit(){
    var subs = document.querySelectorAll('.arcade-subtabs .subtab');
    if(!subs.length) return;
    subs.forEach(function(b){
      b.addEventListener('click', function(){
        subs.forEach(function(x){ x.classList.remove('active'); });
        b.classList.add('active');
        try{ if(typeof WB_SOUND!=='undefined' && WB_SOUND.click) WB_SOUND.click(); }catch(e){}
      });
    });
  }

  /* ---------- Type Rush typing game ---------- */
  var TYPE_WORDS = ("the quick brown fox jumps over the lazy dog while a curious cat watches from the windowsill neon arcade pixel workbench code debug render canvas keyboard monitor server network pixel rainbow thunder lightning crystal diamond galaxy comet asteroid planet orbit rocket shuttle engine turbine circuit voltage current resistor capacitor transistor logic gate buffer stack queue array object string integer boolean function module import export class method return while loop break continue except finally lambda list tuple dict set sorted reversed map filter reduce sum len range print input open read write close").split(' ');

  var typeState = null;
  function wbTypeReset(){
    var words=[], n=14;
    for(var i=0;i<n;i++){ words.push(TYPE_WORDS[Math.floor(Math.random()*TYPE_WORDS.length)]); }
    typeState = { words:words, idx:0, started:null, done:0, errors:0, keystrokes:0, finished:false };
    wbTypeRender();
    var wpm=document.getElementById('type-wpm'), acc=document.getElementById('type-acc'), dn=document.getElementById('type-done');
    if(wpm) wpm.textContent='0'; if(acc) acc.textContent='100%'; if(dn) dn.textContent='0';
    var inp=document.getElementById('type-input'); if(inp){ inp.value=''; inp.disabled=true; inp.placeholder='Click Start, then type the highlighted word…'; }
  }
  function wbTypeRender(){
    var box=document.getElementById('type-words'); if(!box||!typeState) return;
    var html='';
    typeState.words.forEach(function(w,i){
      var cls='w'; var txt=w;
      if(i<typeState.idx) cls+=' done';
      else if(i===typeState.idx) cls+=' cur';
      html+='<span class="'+cls+'">'+txt+'</span>';
    });
    box.innerHTML=html;
  }
  function wbTypeStart(){
    if(!typeState) wbTypeReset();
    typeState.started = Date.now(); typeState.finished=false;
    var inp=document.getElementById('type-input'); if(inp){ inp.disabled=false; inp.focus(); inp.placeholder='Type the highlighted word…'; }
  }
  function wbTypeInput(e){
    if(!typeState||typeState.finished) return;
    var inp=e.target; var val=inp.value;
    var cur=typeState.words[typeState.idx];
    typeState.keystrokes++;
    // count an error if the typed prefix no longer matches the current word
    if(cur.indexOf(val)!==0 && val.length>0){ typeState.errors++; }
    if(val===cur){
      typeState.idx++; typeState.done++;
      inp.value='';
      if(typeState.idx>=typeState.words.length){ wbTypeFinish(); }
      else wbTypeRender();
      wbTypeStats();
    } else {
      wbTypeRender();
      wbTypeStats();
    }
  }
  function wbTypeStats(){
    var elapsed=(Date.now()-typeState.started)/60000; if(elapsed<=0) elapsed=0.0001;
    var wpm=Math.round((typeState.done*5)/elapsed);
    var acc = typeState.keystrokes>0 ? Math.round(100*(typeState.keystrokes-typeState.errors)/typeState.keystrokes) : 100;
    var w=document.getElementById('type-wpm'), a=document.getElementById('type-acc'), d=document.getElementById('type-done');
    if(w) w.textContent=wpm; if(a) a.textContent=Math.max(0,acc)+'%'; if(d) d.textContent=typeState.done;
  }
  function wbTypeFinish(){
    typeState.finished=true;
    wbTypeStats();
    var wpm=Math.round((typeState.done*5)/((Date.now()-typeState.started)/60000));
    try{
      wbEnsureProfileShape();
      if(!wbProfile.highScores.typeRush) wbProfile.highScores.typeRush={};
      if(wpm > (wbProfile.highScores.typeRush.wpm||0)) wbProfile.highScores.typeRush.wpm=wpm;
      var best=document.getElementById('type-best'); if(best) best.textContent=wbProfile.highScores.typeRush.wpm||0;
      wbTrackGamePlayed('typeRush');
      wbSaveProfile(); wbCheckAchievements();
    }catch(e){ L('type finish err: '+e.message); }
    var inp=document.getElementById('type-input'); if(inp){ inp.disabled=true; inp.placeholder='Done! WPM '+wpm+'. Click Reset to play again.'; }
    try{ if(typeof WB_SOUND!=='undefined' && WB_SOUND.win) WB_SOUND.win(); }catch(e){}
  }
  function wbTypeInit(){
    var start=document.getElementById('type-start'), reset=document.getElementById('type-reset'), inp=document.getElementById('type-input');
    if(!start||!inp) return;
    start.addEventListener('click', function(){ wbTypeStart(); });
    reset.addEventListener('click', function(){ wbTypeReset(); });
    inp.addEventListener('input', wbTypeInput);
    try{ var best=document.getElementById('type-best'); if(best && wbProfile.highScores.typeRush) best.textContent=wbProfile.highScores.typeRush.wpm||0; }catch(e){}
    wbTypeReset();
  }

  /* ---------- Connect to the Wi-Fi (WebRTC + share code) ---------- */
  var wifiPC=null, wifiDC=null, wifiRole=null, wifiPeerLB=[];
  function wifiStatus(msg, kind){
    var el=document.getElementById('wifi-status');
    if(el){ el.textContent=msg; el.className='wm-status'+(kind?' '+kind:''); }
  }
  function wifiLeaderboardRender(){
    var list=document.getElementById('wifi-lb-list'); if(!list) return;
    var rows=[];
    // local
    try{
      var name=(wbProfile&&wbProfile.name)||'You';
      var myBest=0; var hs=wbProfile.highScores||{};
      Object.keys(hs).forEach(function(gk){ Object.keys(hs[gk]||{}).forEach(function(m){ if(hs[gk][m]>myBest) myBest=hs[gk][m]; }); });
      rows.push({name:name+' (you)', score:myBest});
    }catch(e){}
    wifiPeerLB.forEach(function(p){ rows.push(p); });
    rows.sort(function(a,b){ return b.score-a.score; });
    if(!rows.length){ list.innerHTML='<li>No players connected yet.</li>'; return; }
    list.innerHTML = rows.map(function(r,i){ return '<li><b>'+r.name+'</b> — '+r.score+'</li>'; }).join('');
  }
  function wifiShareOut(){
    try{
      var data={ name:(wbProfile&&wbProfile.name)||'Player', highScores:wbProfile.highScores||{} };
      return wbB64.enc(unescape(encodeURIComponent(JSON.stringify(data))));
    }catch(e){ return ''; }
  }
  function wifiShareMerge(code){
    try{
      var data=JSON.parse(decodeURIComponent(escape(wbB64.dec(code.trim()))));
      var merged=0;
      var hs=data.highScores||{};
      Object.keys(hs).forEach(function(gk){
        wbProfile.highScores[gk]=wbProfile.highScores[gk]||{};
        Object.keys(hs[gk]||{}).forEach(function(m){
          if((hs[gk][m]||0)>(wbProfile.highScores[gk][m]||0)){ wbProfile.highScores[gk][m]=hs[gk][m]; merged++; }
        });
      });
      wifiPeerLB = data.name ? [{name:data.name, score:(function(){var b=0;Object.keys(hs).forEach(function(gk){Object.keys(hs[gk]||{}).forEach(function(m){if(hs[gk][m]>b)b=hs[gk][m];});});return b;})()}] : wifiPeerLB;
      wbSaveProfile();
      wifiStatus('Merged '+merged+' score(s) from '+((data.name)||'friend')+'.', 'ok');
      wifiLeaderboardRender();
    }catch(e){ wifiStatus('That code looks invalid. Check it and try again.', 'err'); }
  }
  async function wifiGather(pc){
    return new Promise(function(resolve){
      if(pc.iceGatheringState==='complete') return resolve();
      var check=function(){ if(pc.iceGatheringState==='complete'){ pc.removeEventListener('icegatheringstatechange',check); resolve(); } };
      pc.addEventListener('icegatheringstatechange', check);
      setTimeout(function(){ resolve(); }, 1500); // don't wait forever
    });
  }
  async function wifiHost(){
    try{
      wifiRole='host';
      wifiPC = new RTCPeerConnection({iceServers:[]});
      wifiDC = wifiPC.createDataChannel('leaderboard');
      wifiDC.onopen = function(){ wifiStatus('Connected! Sharing leaderboard.', 'ok'); wifiSendLB(); wifiLeaderboardRender(); };
      wifiDC.onmessage = function(ev){ wifiOnPeerData(ev.data); };
      wifiPC.onconnectionstatechange = function(){ if(wifiPC.connectionState==='disconnected'||wifiPC.connectionState==='failed'){ wifiStatus('Disconnected.', 'err'); } };
      var offer = await wifiPC.createOffer();
      await wifiPC.setLocalDescription(offer);
      await wifiGather(wifiPC);
      var out=document.getElementById('wifi-offer-out');
      if(out) out.value = wbB64.enc(JSON.stringify(wifiPC.localDescription));
      wifiStatus('Copy your code and send it to the other player. Then paste their answer below.', 'ok');
      var ha=document.getElementById('wifi-host-area'); if(ha) ha.style.display='block';
      var ja=document.getElementById('wifi-join-area'); if(ja) ja.style.display='none';
    }catch(e){ wifiStatus('Could not start hosting: '+e.message, 'err'); }
  }
  async function wifiApplyAnswer(){
    try{
      var code=document.getElementById('wifi-answer-in').value.trim();
      if(!code){ wifiStatus('Paste the other player\'s answer code first.', 'err'); return; }
      var ans=JSON.parse(wbB64.dec(code));
      await wifiPC.setRemoteDescription(ans);
      wifiStatus('Answer applied. Waiting for connection…', 'ok');
    }catch(e){ wifiStatus('Invalid answer code: '+e.message, 'err'); }
  }
  async function wifiJoin(){
    try{
      wifiRole='join';
      var ha=document.getElementById('wifi-host-area'); if(ha) ha.style.display='none';
      var ja=document.getElementById('wifi-join-area'); if(ja) ja.style.display='block';
      wifiStatus('Paste the host\'s code below, then generate your answer.', 'ok');
    }catch(e){}
  }
  async function wifiMakeAnswer(){
    try{
      var code=document.getElementById('wifi-offer-in').value.trim();
      if(!code){ wifiStatus('Paste the host\'s code first.', 'err'); return; }
      wifiPC = new RTCPeerConnection({iceServers:[]});
      wifiPC.ondatachannel = function(e){ wifiDC=e.channel; wifiDC.onopen=function(){ wifiStatus('Connected! Sharing leaderboard.', 'ok'); wifiSendLB(); wifiLeaderboardRender(); }; wifiDC.onmessage=function(ev){ wifiOnPeerData(ev.data); }; };
      wifiPC.onconnectionstatechange = function(){ if(wifiPC.connectionState==='disconnected'||wifiPC.connectionState==='failed'){ wifiStatus('Disconnected.', 'err'); } };
      var offer=JSON.parse(wbB64.dec(code));
      await wifiPC.setRemoteDescription(offer);
      var ans=await wifiPC.createAnswer();
      await wifiPC.setLocalDescription(ans);
      await wifiGather(wifiPC);
      var out=document.getElementById('wifi-answer-out');
      if(out) out.value=wbB64.enc(JSON.stringify(wifiPC.localDescription));
      wifiStatus('Copy your answer and send it back to the host.', 'ok');
    }catch(e){ wifiStatus('Invalid host code: '+e.message, 'err'); }
  }
  function wifiSendLB(){
    if(wifiDC && wifiDC.readyState==='open'){ try{ wifiDC.send(JSON.stringify({type:'lb', code:wifiShareOut()})); }catch(e){} }
  }
  function wifiOnPeerData(data){
    try{
      var msg=JSON.parse(data);
      if(msg.type==='lb'){
        var d=JSON.parse(decodeURIComponent(escape(wbB64.dec(msg.code))));
        var hs=d.highScores||{}; var b=0;
        Object.keys(hs).forEach(function(gk){ Object.keys(hs[gk]||{}).forEach(function(m){ if(hs[gk][m]>b) b=hs[gk][m]; }); });
        wifiPeerLB=[{name:(d.name||'Friend'), score:b}];
        wifiLeaderboardRender();
        wifiStatus('Received '+((d.name)||'friend')+'\'s leaderboard.', 'ok');
      }
    }catch(e){}
  }
  function wifiInit(){
    var open=document.getElementById('wifi-open'), modal=document.getElementById('wifi-modal');
    if(!open||!modal) return;
    open.addEventListener('click', function(){ modal.classList.add('on'); wifiLeaderboardRender(); });
    var close=document.getElementById('wifi-close'); if(close) close.addEventListener('click', function(){ modal.classList.remove('on'); });
    modal.addEventListener('click', function(e){ if(e.target===modal) modal.classList.remove('on'); });
    var host=document.getElementById('wifi-host'); if(host) host.addEventListener('click', wifiHost);
    var join=document.getElementById('wifi-join'); if(join) join.addEventListener('click', wifiJoin);
    var aa=document.getElementById('wifi-apply-answer'); if(aa) aa.addEventListener('click', wifiApplyAnswer);
    var ma=document.getElementById('wifi-make-answer'); if(ma) ma.addEventListener('click', wifiMakeAnswer);
    // tabs
    var tabs=document.querySelectorAll('#wifi-tabs button');
    tabs.forEach(function(t){ t.addEventListener('click', function(){ tabs.forEach(function(x){ x.classList.remove('active'); }); t.classList.add('active'); var p=t.getAttribute('data-wmtab'); document.getElementById('wm-panel-connect').classList.toggle('on', p==='connect'); document.getElementById('wm-panel-share').classList.toggle('on', p==='share'); }); });
    // share code
    var so=document.getElementById('wifi-share-out'); if(so) so.value=wifiShareOut();
    var cs=document.getElementById('wifi-copy-share'); if(cs) cs.addEventListener('click', function(){ var v=document.getElementById('wifi-share-out'); v.select(); try{document.execCommand('copy');}catch(e){} wifiStatus('Copied your leaderboard code.', 'ok'); });
    var ms=document.getElementById('wifi-merge-share'); if(ms) ms.addEventListener('click', function(){ var v=document.getElementById('wifi-share-in').value; wifiShareMerge(v); });
  }

  /* ---------- PIXEL DUEL (two-player local game) ---------- */
  var DUEL = { active:false, raf:null, keys:{}, canvas:null, ctx:null };
  function wbDuelRenderBubble(){
    var slot=document.getElementById('plf-49-slot'); if(!slot) return;
    slot.dataset.gameKey='pixelDuel'; slot.dataset.name='PIXEL DUEL'; slot.dataset.category='fast';
    slot.innerHTML =
      '<div class="ac-bubble" id="pixelDuel-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">PIXEL DUEL</div>' +
          '<div class="ac-sub">2 players &middot; same keyboard</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="17" cy="8" r="6" fill="var(--cat-accent)"/><rect x="10" y="16" width="14" height="20" rx="4" fill="var(--cat-accent)"/></svg></div>' +
          '<div class="ac-tap">TAP TO PLAY</div>' +
          '<div class="ac-desc"><b>PIXEL DUEL</b>Two players, one keyboard. P1: W/S + Space. P2: ↑/↓ + Enter. First to 5 hits wins.</div>' +
        '</div>' +
      '</div>';
    var btn=document.getElementById('pixelDuel-btn');
    if(btn) btn.addEventListener('click', function(){ try{ if(typeof WB_SOUND!=='undefined'&&WB_SOUND.launch) WB_SOUND.launch(); }catch(e){} wbDuelLaunch(); });
    // favorite button (self-contained since 5.17.0 decorator is IIFE-scoped)
    var fav=document.createElement('div'); fav.className='ac-fav'; fav.setAttribute('role','button'); fav.setAttribute('aria-label','Favorite PIXEL DUEL'); fav.textContent='☆'; fav.title='Favorite';
    fav.addEventListener('click', function(e){ e.stopPropagation(); try{ if(!wbProfile.favorites) wbProfile.favorites=[]; var i=wbProfile.favorites.indexOf('plf-49-slot'); if(i>=0){wbProfile.favorites.splice(i,1);fav.classList.remove('on');fav.textContent='☆';}else{wbProfile.favorites.push('plf-49-slot');fav.classList.add('on');fav.textContent='★';} wbSaveProfile(); }catch(err){} });
    try{ if(wbProfile.favorites&&wbProfile.favorites.indexOf('plf-49-slot')>=0){ fav.classList.add('on'); fav.textContent='★'; } }catch(e){}
    slot.appendChild(fav);
  }
  function wbDuelLaunch(){
    var overlay=document.getElementById('ac-overlay'); if(!overlay) return;
    overlay.classList.add('on');
    try{ if(overlay.requestFullscreen) overlay.requestFullscreen().catch(function(){}); }catch(e){}
    overlay.innerHTML='';
    var shell=document.createElement('div'); shell.className='duel-shell';
    shell.innerHTML =
      '<h3>PIXEL DUEL</h3>' +
      '<p class="duel-sub">P1 (cyan): W / S to move, Space to fire &nbsp;•&nbsp; P2 (amber): ↑ / ↓ to move, Enter to fire</p>' +
      '<div class="duel-scores"><div class="ds p1"><b id="duel-p1">0</b><span>Player 1</span></div><div class="ds"><b id="duel-timer">First to 5</b><span style="font-size:11px;color:var(--muted)">Goal</span></div><div class="ds p2"><b id="duel-p2">0</b><span>Player 2</span></div></div>' +
      '<div class="duel-canvas-wrap"><canvas id="duel-canvas" width="800" height="450"></canvas></div>' +
      '<div class="duel-controls"><button class="type-btn" id="duel-start">Start</button> <button class="type-btn ghost" id="duel-close">Close</button></div>';
    overlay.appendChild(shell);
    document.getElementById('duel-close').addEventListener('click', wbDuelClose);
    document.getElementById('duel-start').addEventListener('click', wbDuelStart);
    DUEL.canvas=document.getElementById('duel-canvas'); DUEL.ctx=DUEL.canvas.getContext('2d');
    wbDuelDraw(); // initial frame
  }
  function wbDuelClose(){
    DUEL.active=false; if(DUEL.raf){ cancelAnimationFrame(DUEL.raf); DUEL.raf=null; }
    var overlay=document.getElementById('ac-overlay'); if(overlay){ overlay.classList.remove('on'); overlay.innerHTML=''; }
    try{ if(document.fullscreenElement) document.exitFullscreen().catch(function(){}); }catch(e){}
  }
  var duelState=null;
  function wbDuelStart(){
    duelState={ p1:{x:50,y:200,vy:0,score:0,cool:0}, p2:{x:724,y:200,vy:0,score:0,cool:0}, bullets:[], winner:null };
    document.getElementById('duel-p1').textContent='0'; document.getElementById('duel-p2').textContent='0';
    document.getElementById('duel-timer').textContent='FIGHT';
    DUEL.active=true;
    if(DUEL.raf) cancelAnimationFrame(DUEL.raf);
    wbDuelLoop();
  }
  function wbDuelLoop(){
    if(!DUEL.active) return;
    var s=duelState, c=DUEL.canvas, ctx=DUEL.ctx; if(!s||!c||!ctx) return;
    var keys=DUEL.keys;
    // movement
    s.p1.vy=0; s.p2.vy=0;
    if(keys['w']||keys['W']) s.p1.vy=-5; if(keys['s']||keys['S']) s.p1.vy=5;
    if(keys['ArrowUp']) s.p2.vy=-5; if(keys['ArrowDown']) s.p2.vy=5;
    s.p1.y=Math.max(10,Math.min(c.height-36,s.p1.y+s.p1.vy));
    s.p2.y=Math.max(10,Math.min(c.height-36,s.p2.y+s.p2.vy));
    // fire
    if(s.p1.cool>0) s.p1.cool--; if(s.p2.cool>0) s.p2.cool--;
    if(keys[' ']&&s.p1.cool===0){ s.bullets.push({x:76,y:s.p1.y+13,vx:8,from:1}); s.p1.cool=18; }
    if(keys['Enter']&&s.p2.cool===0){ s.bullets.push({x:724,y:s.p2.y+13,vx:-8,from:2}); s.p2.cool=18; }
    // bullets
    for(var i=s.bullets.length-1;i>=0;i--){
      var b=s.bullets[i]; b.x+=b.vx;
      // hit detection
      if(b.from===1){ if(b.x> s.p2.x && b.x< s.p2.x+26 && b.y> s.p2.y && b.y< s.p2.y+26){ s.p1.score++; s.bullets.splice(i,1); wbDuelScore(); continue; } }
      else { if(b.x> s.p1.x && b.x< s.p1.x+26 && b.y> s.p1.y && b.y< s.p1.y+26){ s.p2.score++; s.bullets.splice(i,1); wbDuelScore(); continue; } }
      if(b.x<0||b.x>c.width) s.bullets.splice(i,1);
    }
    wbDuelDraw();
    if(!s.winner) DUEL.raf=requestAnimationFrame(wbDuelLoop);
  }
  function wbDuelScore(){
    var s=duelState; if(!s) return;
    var p1=document.getElementById('duel-p1'), p2=document.getElementById('duel-p2');
    if(p1) p1.textContent=s.p1.score; if(p2) p2.textContent=s.p2.score;
    try{ if(typeof WB_SOUND!=='undefined'&&WB_SOUND.coin) WB_SOUND.coin(); }catch(e){}
    if(s.p1.score>=5||s.p2.score>=5){
      s.winner = s.p1.score>=5?1:2;
      DUEL.active=false; if(DUEL.raf){ cancelAnimationFrame(DUEL.raf); DUEL.raf=null; }
      var t=document.getElementById('duel-timer'); if(t) t.textContent='P'+s.winner+' WINS!';
      try{ wbTrackGamePlayed('pixelDuel'); wbRecordGameScore('pixelDuel','duel',Math.max(s.p1.score,s.p2.score)); wbSaveProfile(); wbCheckAchievements(); }catch(e){ L('duel save err: '+e.message); }
    }
  }
  function wbDuelDraw(){
    var c=DUEL.canvas, ctx=DUEL.ctx; if(!c||!ctx) return;
    var s=duelState;
    ctx.fillStyle='#070a10'; ctx.fillRect(0,0,c.width,c.height);
    // midline
    ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.setLineDash([8,10]); ctx.beginPath(); ctx.moveTo(c.width/2,0); ctx.lineTo(c.width/2,c.height); ctx.stroke(); ctx.setLineDash([]);
    if(!s){ ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='18px sans-serif'; ctx.textAlign='center'; ctx.fillText('Press Start', c.width/2, c.height/2); return; }
    // bullets
    ctx.fillStyle='#fff';
    s.bullets.forEach(function(b){ ctx.fillRect(b.x-3,b.y-3,6,6); });
    // tanks
    function tank(p,color){ ctx.fillStyle=color; ctx.fillRect(p.x,p.y,26,26); ctx.fillStyle='#fff'; ctx.fillRect(p.x+(p.vx>0?22:p.vx<0?-2:0),p.y+10,8,6); }
    // P1 faces right, P2 faces left
    ctx.fillStyle='#5fd4c7'; ctx.fillRect(s.p1.x,s.p1.y,26,26); ctx.fillStyle='#070a10'; ctx.fillRect(s.p1.x+26,s.p1.y+10,6,6);
    ctx.fillStyle='#e0a458'; ctx.fillRect(s.p2.x,s.p2.y,26,26); ctx.fillStyle='#070a10'; ctx.fillRect(s.p2.x-6,s.p2.y+10,6,6);
  }
  function wbDuelKeys(down){
    return function(e){
      if(!DUEL.active) return;
      if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','s','S'].indexOf(e.key)>=0){ e.preventDefault(); }
      if(e.key==='Escape'){ wbDuelClose(); return; }
      DUEL.keys[e.key]=down;
    };
  }

  /* ---------- Registry override + achievements ---------- */
  function wbOverride518(){
    try{
      var reg = window.WB_GAME_REGISTRY;
      if(reg){
        reg.forEach(function(g){
          if(g.slot==='plf-49-slot'){ g.name='PIXEL DUEL'; g.key='pixelDuel'; g.placeholder=false; g.prototype=true; g.cat='fast'; g.desc='Two players, one keyboard. P1: W/S + Space. P2: arrows + Enter. First to 5.'; }
        });
      }
    }catch(e){ L('override err: '+e.message); }
    try{
      wbAchievements.forEach(function(a){
        if(a.id==='all_games'||a.id==='all_games_9'){ a.desc=a.desc.replace(/\d+/,'33'); a.test=function(s){ return s.gamesPlayedByType && Object.keys(s.gamesPlayedByType).length>=33; }; a.progress=function(s){ return Math.min(1,(s.gamesPlayedByType?Object.keys(s.gamesPlayedByType).length:0)/33); }; }
      });
    }catch(e){ L('ach err: '+e.message); }
  }

  /* ---------- Init ---------- */
  function wbInit518(){
    try{ wbOverride518(); }catch(e){ L('override failed: '+e.message); }
    try{ wbSubInit(); }catch(e){ L('sub err: '+e.message); }
    try{ wbTypeInit(); }catch(e){ L('type err: '+e.message); }
    try{ wifiInit(); }catch(e){ L('wifi err: '+e.message); }
    try{ wbDuelRenderBubble(); }catch(e){ L('duel bubble err: '+e.message); }
    // global duel key listeners
    document.addEventListener('keydown', wbDuelKeys(true));
    document.addEventListener('keyup', wbDuelKeys(false));
    L('init done');
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', wbInit518); }
  else { wbInit518(); }
  window.addEventListener('load', function(){ try{ wbInit518(); }catch(e){} });

})();

