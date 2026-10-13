
/* ============================================================
   5.17.0 FEATURE PACK
   Registry, decorators, search/filter, favorites, recents,
   high-score chips, keyboard nav, coins, weekly challenge,
   3 prototype games, demo mode, sound, experimental theme
   editor, contrast checker, perf/LOC dashboard, achievements.
   ============================================================ */
(function(){

  /* ---- Defensive fullscreen fix (prevents unhandled rejections
         in restricted environments, e.g. school iframes) ---- */
  try {
    var origFS = Element.prototype.requestFullscreen;
    if(origFS){
      Element.prototype.requestFullscreen = function(){
        try {
          var p = origFS.apply(this, arguments);
          if(p && typeof p.catch === 'function'){ p.catch(function(){}); }
          return p;
        } catch(e){ return Promise.reject(e); }
      };
    }
  } catch(e){}

  /* ---- Active-system counters (for dev dashboard) ---- */
  window.__wbRaf = 0; window.__wbTimers = 0; window.__wbDemoOn = false;
  try {
    var oRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = function(cb){
      window.__wbRaf++;
      return oRaf.call(window, function(t){ window.__wbRaf = Math.max(0, window.__wbRaf-1); return cb(t); });
    };
    var oSi = window.setInterval, oCi = window.clearInterval;
    window.setInterval = function(){ window.__wbTimers++; return oSi.apply(window, arguments); };
    window.clearInterval = function(id){ window.__wbTimers = Math.max(0, window.__wbTimers-1); return oCi.apply(window, arguments); };
  } catch(e){}

  /* ---- Sound system (Web Audio beeps) ---- */
  var WB_SOUND = (function(){
    var ctx = null, muted = (function(){ try{return localStorage.getItem('wb-muted')==='1';}catch(e){return false;} })();
    function ensure(){ if(!ctx){ try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ ctx=null; } } return ctx; }
    function beep(freq, dur, type, gain){
      if(muted) return; var c = ensure(); if(!c) return;
      try {
        var o = c.createOscillator(), g = c.createGain();
        o.type = type||'sine'; o.frequency.value = freq||440;
        g.gain.value = gain||0.06;
        o.connect(g); g.connect(c.destination);
        var t = c.currentTime;
        g.gain.setValueAtTime(gain||0.06, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+(dur||0.12));
        o.start(t); o.stop(t+(dur||0.12));
      } catch(e){}
    }
    return {
      isMuted:function(){ return muted; },
      toggle:function(){ muted=!muted; try{localStorage.setItem('wb-muted', muted?'1':'0');}catch(e){} if(!muted) beep(660,0.1,'square',0.05); return muted; },
      click:function(){ beep(420,0.06,'square',0.04); },
      hover:function(){ beep(520,0.04,'sine',0.025); },
      launch:function(){ beep(300,0.08,'sawtooth',0.05); setTimeout(function(){beep(500,0.08,'sawtooth',0.05);},70); },
      coin:function(){ beep(880,0.07,'square',0.05); setTimeout(function(){beep(1100,0.07,'square',0.05);},70); },
      win:function(){ beep(660,0.1,'square',0.05); setTimeout(function(){beep(880,0.1,'square',0.05);},100); setTimeout(function(){beep(1100,0.16,'square',0.05);},210); }
    };
  })();

  /* ---- Profile helpers for new fields ---- */
  function wbCoins(){ try{ return wbProfile.coins = wbProfile.coins||0; }catch(e){ return 0; } }
  function wbAddCoins(n){ try{ wbProfile.coins = (wbProfile.coins||0)+n; wbSaveProfile(); }catch(e){} wbRenderCoins(); WB_SOUND.coin(); }
  function wbFavs(){ try{ if(!wbProfile.favorites) wbProfile.favorites = []; return wbProfile.favorites; }catch(e){ return []; } }
  function wbRecents(){ try{ if(!wbProfile.recents) wbProfile.recents = []; return wbProfile.recents; }catch(e){ return []; } }
  function wbPersist(){ try{ wbSaveProfile(); }catch(e){} }

  function wbGetHighScore(key){
    try {
      if(!key || !wbProfile.highScores || !wbProfile.highScores[key]) return 0;
      var best=0, m=wbProfile.highScores[key];
      for(var k in m){ if(m[k]>best) best=m[k]; }
      return best;
    } catch(e){ return 0; }
  }

  /* ---- Game registry ---- */
  var WB_REAL_GAMES = [
    {slot:'ac-slot-1', key:'rooftopRumble', name:'Rooftop Rumble', cat:'skill'},
    {slot:'rc-slot-2', key:'circuitRacer', name:'Neon Sprint', cat:'skill'},
    {slot:'bb-slot-3', key:'neonBreaker', name:'Neon Breaker', cat:'skill'},
    {slot:'sf-slot-4', key:'starfallDefender', name:'Starfall Defender', cat:'skill'},
    {slot:'sn-slot-5', key:'circuitSnake', name:'Circuit Snake', cat:'skill'},
    {slot:'pg-slot-6', key:'neonPong', name:'Neon Pong', cat:'skill'},
    {slot:'mc-slot-7', key:'meteorCommand', name:'Meteor Command', cat:'skill'},
    {slot:'ss-slot-8', key:'stackSurge', name:'Stack Surge', cat:'skill'},
    {slot:'bd-slot-9', key:'botDefense', name:'Bot Defense', cat:'skill'},
    {slot:'cg-slot-10', key:'crystalGarden', name:'Crystal Garden', cat:'patience'},
    {slot:'mm-slot-11', key:'memoryMatch', name:'Memory Match', cat:'patience'},
    {slot:'cm-slot-12', key:'colorMixer', name:'Color Mixer', cat:'patience'},
    {slot:'fh-slot-13', key:'fishingHole', name:'Fishing Hole', cat:'patience'},
    {slot:'dc-slot-14', key:'dotConnect', name:'Dot Connect', cat:'patience'},
    {slot:'sp-slot-15', key:'slidingPuzzle', name:'Slide Puzzle', cat:'patience'},
    {slot:'pm-slot-16', key:'patternMemory', name:'Pattern Memory', cat:'patience'},
    {slot:'tb-slot-17', key:'towerBuilder', name:'Tower Builder', cat:'patience'},
    {slot:'bs-slot-18', key:'bubbleSort', name:'Bubble Sort', cat:'patience'},
    {slot:'if-slot-19', key:'idleFarm', name:'Idle Farm', cat:'patience'},
    {slot:'ld-slot-20', key:'laserDodge', name:'Laser Dodge', cat:'fast'},
    {slot:'nd-slot-21', key:'ninjaDash', name:'Ninja Dash', cat:'fast'},
    {slot:'oc-slot-22', key:'orbCatcher', name:'Orb Catcher', cat:'fast'},
    {slot:'bs2-slot-23', key:'bladeSlice', name:'Blade Slice', cat:'fast'},
    {slot:'gf-slot-24', key:'gravityFlip', name:'Gravity Flip', cat:'fast'},
    {slot:'bt-slot-25', key:'bulletStorm', name:'Bullet Storm', cat:'fast'},
    {slot:'pj-slot-26', key:'platformJumper', name:'Platform Jumper', cat:'fast'},
    {slot:'pr-slot-27', key:'pixelRunner', name:'Pixel Runner', cat:'fast'},
    {slot:'cr-slot-28', key:'chainReactor', name:'Chain Reactor', cat:'fast'},
    {slot:'rd-slot-29', key:'rocketDash', name:'Rocket Dash', cat:'fast'}
  ];

  function wbCatFromSlot(slot){
    if(slot.indexOf('plp')===0) return 'patience';
    if(slot.indexOf('plf')===0) return 'fast';
    return 'skill';
  }

  var WB_HYBRIDS = {
    hybridPrecision: {slot:'plp-30-slot', name:'PRECISION LAB', cat:'patience', desc:'Reaction + moving-target accuracy. Five reaction checks followed by a precision round.'},
    hybridMeteor: {slot:'plf-40-slot', name:'METEOR BREAKER', cat:'fast', desc:'Break incoming meteors, then survive the debris field. A combined aim-and-dodge challenge.'},
    hybridCircuit: {slot:'pls-50-slot', name:'CIRCUIT OPS', cat:'skill', desc:'Build a short route by solving signal gates, then race the completed circuit against the clock.'}
  };
  var WB_GAME_REGISTRY = WB_REAL_GAMES.concat(
    Object.keys(WB_HYBRIDS).map(function(k){ var h=WB_HYBRIDS[k]; return {slot:h.slot,key:k,name:h.name,cat:h.cat,prototype:true,hybrid:true,placeholder:false,desc:h.desc}; }),
    (window.WB_PLACEHOLDER_GAMES||[]).map(function(g){
      return {slot:g.slot+'-slot', key:null, name:g.name, cat:wbCatFromSlot(g.slot), placeholder:true, desc:g.desc};
    })
  );
  // Convert 3 placeholders into playable prototypes
  WB_GAME_REGISTRY.forEach(function(g){
    if(g.slot==='plp-30-slot'){ g.name='REACTION TEST'; g.key='protoReaction'; g.placeholder=false; g.prototype=true; g.cat='patience'; g.desc='Wait for green, then click as fast as you can. 5 rounds — lower reaction time wins.'; }
    if(g.slot==='plf-40-slot'){ g.name='TAP RUSH'; g.key='protoTapRush'; g.placeholder=false; g.prototype=true; g.cat='fast'; g.desc='Tap as many targets as you can in 15 seconds. Pure speed.'; }
    if(g.slot==='pls-50-slot'){ g.name='AIM TRAINER'; g.key='protoAimTrainer'; g.placeholder=false; g.prototype=true; g.cat='skill'; g.desc='Click the bouncing target as many times as possible in 20 seconds.'; }
  });

  /* ---- Unique neon art generator (deterministic from name) ---- */
  function wbArtSvg(name){
    var h=0; for(var i=0;i<name.length;i++){ h=(h*31+name.charCodeAt(i))>>>0; }
    var hue=h%360, shape=h%3;
    var c1='hsl('+hue+',80%,55%)', c2='hsl('+((hue+60)%360)+',80%,45%)';
    var inner='';
    if(shape===0){ inner='<circle cx="50" cy="50" r="28" fill="none" stroke="'+c1+'" stroke-width="4"/><circle cx="50" cy="50" r="14" fill="'+c2+'"/>'; }
    else if(shape===1){ inner='<rect x="24" y="24" width="52" height="52" rx="10" fill="none" stroke="'+c1+'" stroke-width="4"/><rect x="38" y="38" width="24" height="24" fill="'+c2+'"/>'; }
    else { inner='<polygon points="50,18 80,72 20,72" fill="none" stroke="'+c1+'" stroke-width="4"/><circle cx="50" cy="54" r="12" fill="'+c2+'"/>'; }
    return '<svg class="ac-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+inner+'</svg>';
  }

  /* ---- Prototype games ---- */
  var WB_PROTOS = {
    protoReaction: { slot:'plp-30-slot', name:'REACTION TEST', desc:'Wait for green, then click as fast as you can. 5 rounds — lower reaction time wins.' },
    protoTapRush: { slot:'plf-40-slot', name:'TAP RUSH', desc:'Tap as many targets as you can in 15 seconds. Pure speed.' },
    protoAimTrainer: { slot:'pls-50-slot', name:'AIM TRAINER', desc:'Click the bouncing target as many times as possible in 20 seconds.' }
  };

  function wbProtoBubble(g){
    var slot = document.getElementById(g.slot);
    if(!slot) return;
    var bid = g.key + '-proto-btn';
    slot.innerHTML =
      '<div class="ac-bubble" id="'+bid+'">' +
        wbArtSvg(g.name) +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">'+g.name+'</div>' +
          '<div class="ac-sub">prototype &middot; playable</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="17" cy="8" r="6" fill="var(--cat-accent)"/><rect x="10" y="16" width="14" height="20" rx="4" fill="var(--cat-accent)"/></svg></div>' +
          '<div class="ac-tap">TAP TO PLAY</div>' +
          '<div class="ac-desc"><b>'+g.name+'</b>'+g.desc+'</div>' +
        '</div>' +
      '</div>';
    var btn = document.getElementById(bid);
    if(btn) btn.addEventListener('click', function(){ WB_SOUND.launch(); wbLaunchProto(g.key); });
  }

  function wbLaunchProto(key){
    var overlay = document.getElementById('ac-overlay');
    var cfg = WB_PROTOS[key];
    if(!overlay || !cfg) return;
    overlay.classList.add('on');
    try{ if(overlay.requestFullscreen) overlay.requestFullscreen().catch(function(){}); }catch(e){}
    var close = function(){ overlay.classList.remove('on'); overlay.innerHTML=''; try{ if(document.fullscreenElement) document.exitFullscreen().catch(function(){}); }catch(e){} };
    var shell = document.createElement('div');
    shell.className='proto-shell';
    shell.innerHTML = '<h3>'+cfg.name+'</h3><p class="proto-sub">'+cfg.desc+'</p><div class="proto-score" id="proto-score"></div><div class="proto-box idle" id="proto-box"></div><button class="proto-btn" id="proto-start">Start</button> <button class="proto-btn ghost" id="proto-close">Close</button>';
    overlay.innerHTML=''; overlay.appendChild(shell);
    document.getElementById('proto-close').addEventListener('click', close);
    var box = document.getElementById('proto-box');
    var scoreEl = document.getElementById('proto-score');
    var startBtn = document.getElementById('proto-start');

    if(key==='protoReaction'){
      var round=0, times=[], waiting=false, goAt=0, to=null;
      function nextRound(){
        if(round>=5){ finish(); return; }
        round++; waiting=true;
        box.className='proto-box wait'; box.textContent='Wait for green…';
        scoreEl.textContent='Round '+round+'/5';
        var delay = 800+Math.random()*1800;
        to = setTimeout(function(){ waiting=false; box.className='proto-box go'; box.textContent='CLICK!'; goAt=performance.now(); }, delay);
      }
      function onClick(){
        if(waiting){ // too early
          waiting=false; if(to) clearTimeout(to);
          box.className='proto-box idle'; box.textContent='Too early! +500ms penalty';
          times.push(500); WB_SOUND.click();
          setTimeout(nextRound, 700); return;
        }
        if(box.classList.contains('go')){
          var ms = Math.round(performance.now()-goAt);
          times.push(ms); WB_SOUND.win();
          box.className='proto-box idle'; box.textContent=ms+' ms';
          setTimeout(nextRound, 700);
        }
      }
      function finish(){
        var avg = Math.round(times.reduce(function(a,b){return a+b;},0)/times.length);
        var score = Math.max(0, 1000-avg);
        box.className='proto-box idle'; box.textContent='Avg '+avg+' ms';
        scoreEl.textContent='Score: '+score;
        startBtn.textContent='Play again'; startBtn.style.display='';
        wbRecordGameScore('protoReaction','reaction',score);
        wbTrackGamePlayed('protoReaction'); wbAddCoins(3);
        WB_SOUND.win();
      }
      startBtn.addEventListener('click', function(){ round=0; times=[]; startBtn.style.display='none'; nextRound(); });
      box.addEventListener('click', onClick);
    }
    else if(key==='protoTapRush'){
      var hits=0, left=15, iv=null, running=false;
      function spawn(){
        var w=box.clientWidth-42, h=box.clientHeight-42;
        var t=document.createElement('div'); t.className='proto-target';
        t.style.left=Math.max(0,Math.random()*w)+'px'; t.style.top=Math.max(0,Math.random()*h)+'px';
        t.addEventListener('click', function(e){ e.stopPropagation(); hits++; WB_SOUND.click(); scoreEl.textContent='Hits: '+hits+' · '+left+'s'; t.remove(); if(running) spawn(); });
        box.appendChild(t);
      }
      function start(){
        hits=0; left=15; running=true; box.innerHTML=''; startBtn.style.display='none';
        scoreEl.textContent='Hits: 0 · 15s';
        spawn();
        iv=setInterval(function(){ left--; scoreEl.textContent='Hits: '+hits+' · '+left+'s'; if(left<=0){ running=false; clearInterval(iv); finish(); } },1000);
      }
      function finish(){ box.innerHTML=''; box.className='proto-box idle'; box.textContent=hits+' hits'; scoreEl.textContent='Score: '+hits; startBtn.textContent='Play again'; startBtn.style.display=''; wbRecordGameScore('protoTapRush','tap',hits); wbTrackGamePlayed('protoTapRush'); wbAddCoins(3); WB_SOUND.win(); }
      startBtn.addEventListener('click', start);
    }
    else if(key==='protoAimTrainer'){
      var hits2=0, left2=20, iv2=null, mv=null, running2=false, target=null;
      var dx=3, dy=3, x=100, y=80;
      function makeTarget(){ target=document.createElement('div'); target.className='proto-target'; target.style.left=x+'px'; target.style.top=y+'px'; target.addEventListener('click', function(e){ e.stopPropagation(); hits2++; WB_SOUND.click(); scoreEl.textContent='Hits: '+hits2+' · '+left2+'s'; }); box.appendChild(target); }
      function move(){ if(!target) return; var w=box.clientWidth-42, h=box.clientHeight-42; x+=dx; y+=dy; if(x<=0||x>=w) dx=-dx; if(y<=0||y>=h) dy=-dy; x=Math.max(0,Math.min(w,x)); y=Math.max(0,Math.min(h,y)); target.style.left=x+'px'; target.style.top=y+'px'; }
      function start2(){ hits2=0; left2=20; running2=true; x=100; y=80; dx=3; dy=3; box.innerHTML=''; startBtn.style.display='none'; scoreEl.textContent='Hits: 0 · 20s'; makeTarget(); mv=setInterval(move,1000/45); iv2=setInterval(function(){ left2--; scoreEl.textContent='Hits: '+hits2+' · '+left2+'s'; if(left2<=0){ running2=false; clearInterval(iv2); clearInterval(mv); finish2(); } },1000); }
      function finish2(){ if(target) target.remove(); target=null; box.className='proto-box idle'; box.textContent=hits2+' hits'; scoreEl.textContent='Score: '+hits2; startBtn.textContent='Play again'; startBtn.style.display=''; wbRecordGameScore('protoAimTrainer','aim',hits2); wbTrackGamePlayed('protoAimTrainer'); wbAddCoins(3); WB_SOUND.win(); }
      startBtn.addEventListener('click', start2);
    }
  }


  /* ---- 5.40.0: Hybrid arcade cabinets ----
     These replace several thin/duplicate concepts with multi-stage games.
     Rooftop Rumble is deliberately excluded and remains untouched. */
  var WB_HYBRID_HIDDEN = {
    neonBreaker:true, starfallDefender:true, meteorCommand:true,
    memoryMatch:true, patternMemory:true, towerBuilder:true, bubbleSort:true
  };
  function wbHybridBubble(g){
    var slot=document.getElementById(g.slot); if(!slot)return;
    slot.innerHTML='<div class="ac-bubble hybrid-bubble"><div class="ac-glow"></div><div class="ac-bubble-inner"><div class="ac-title">'+g.name+'</div><div class="ac-sub">HYBRID · MULTI-STAGE</div><div class="ac-vs"><div style="font-size:28px;font-weight:800;color:var(--cat-accent);">+</div></div><div class="ac-tap">TAP TO PLAY</div><div class="ac-desc"><b>'+g.name+'</b>'+g.desc+'</div></div></div>';
    var b=slot.querySelector('.ac-bubble'); if(b)b.addEventListener('click',function(){WB_SOUND.launch();wbLaunchHybrid(g);});
  }
  function wbLaunchHybrid(cfg){
    var overlay=document.getElementById('ac-overlay'); if(!overlay)return;
    overlay.classList.add('on'); try{if(overlay.requestFullscreen)overlay.requestFullscreen().catch(function(){});}catch(e){}
    var close=function(){overlay.classList.remove('on');overlay.innerHTML='';try{if(document.fullscreenElement)document.exitFullscreen().catch(function(){});}catch(e){}};
    var shell=document.createElement('div');shell.className='proto-shell';
    shell.innerHTML='<h3>'+cfg.name+'</h3><p class="proto-sub">'+cfg.desc+'</p><div class="proto-score" id="hy-score">Stage 1</div><div class="proto-box idle" id="hy-box">Press Start</div><button class="proto-btn" id="hy-start">Start</button> <button class="proto-btn ghost" id="hy-close">Close</button>';
    overlay.innerHTML='';overlay.appendChild(shell);
    document.getElementById('hy-close').onclick=close;
    var box=document.getElementById('hy-box'),score=document.getElementById('hy-score'),start=document.getElementById('hy-start');
    if(cfg.name==='PRECISION LAB'){
      var stage=0,hits=0,go=0,timer=null;
      function next(){stage++;if(stage<=5){box.className='proto-box wait';box.textContent='WAIT…';score.textContent='Reaction '+stage+'/5';timer=setTimeout(function(){box.className='proto-box go';box.textContent='CLICK';go=performance.now();},700+Math.random()*1300);}else{box.className='proto-box idle';box.innerHTML='<div class="proto-target" style="position:relative;margin:auto"></div>';score.textContent='Precision round';var target=box.firstChild;var left=10,iv=setInterval(function(){left--;score.textContent='Precision: '+left+'s · Hits '+hits;if(left<=0){clearInterval(iv);finish();}},1000);var mv=setInterval(function(){if(!target){clearInterval(mv);return;}target.style.transform='translate('+((Math.random()*120)-60)+'px,'+((Math.random()*70)-35)+'px)';},450);target.onclick=function(){hits++;WB_SOUND.click();};}}
      function finish(){var final=Math.max(0,1500-hits*40);box.className='proto-box idle';box.textContent='Score '+final;score.textContent='Complete';start.style.display='';start.textContent='Play again';wbRecordGameScore('hybridPrecision','hybrid',final);wbTrackGamePlayed('hybridPrecision');wbAddCoins(3);WB_SOUND.win();}
      box.onclick=function(){if(stage<=5&&box.classList.contains('go')){var ms=performance.now()-go;hits+=Math.max(1,Math.round(700-ms/10));box.className='proto-box idle';box.textContent=Math.round(ms)+' ms';setTimeout(next,450);}};
      start.onclick=function(){stage=0;hits=0;start.style.display='none';next();};
    } else if(cfg.name==='METEOR BREAKER'){
      var running=false,hits=0,left=25,iv,spawn;
      function add(){var t=document.createElement('div');t.className='proto-target';t.style.left=Math.random()*Math.max(1,box.clientWidth-44)+'px';t.style.top='-30px';box.appendChild(t);var y=-30;var mv=setInterval(function(){if(!t.isConnected){clearInterval(mv);return;}y+=4;t.style.top=y+'px';if(y>box.clientHeight){clearInterval(mv);t.remove();}},40);t.onclick=function(e){e.stopPropagation();clearInterval(mv);t.remove();hits++;WB_SOUND.click();};}
      function finish(){running=false;clearInterval(iv);clearInterval(spawn);box.innerHTML='';box.className='proto-box idle';box.textContent='Destroyed '+hits+' meteors';score.textContent='Score: '+hits;start.style.display='';start.textContent='Play again';wbRecordGameScore('hybridMeteor','hybrid',hits);wbTrackGamePlayed('hybridMeteor');wbAddCoins(3);WB_SOUND.win();}
      start.onclick=function(){running=true;hits=0;left=25;box.innerHTML='';start.style.display='none';score.textContent='25s · Destroy meteors';spawn=setInterval(add,650);iv=setInterval(function(){left--;score.textContent=left+'s · Destroyed '+hits;if(left<=0)finish();},1000);};
    } else {
      var step=0,points=0;
      function draw(){score.textContent='Gate '+(step+1)+'/4 · Score '+points;box.className='proto-box idle';box.innerHTML='<button class="proto-btn" data-g="0">A</button> <button class="proto-btn" data-g="1">B</button> <button class="proto-btn" data-g="2">C</button>';var good=Math.floor(Math.random()*3);box.querySelectorAll('[data-g]').forEach(function(b){b.onclick=function(){if(+b.dataset.g===good){points+=100;step++;if(step>=4){box.textContent='Circuit complete · '+points;start.style.display='';start.textContent='Race again';wbRecordGameScore('hybridCircuit','hybrid',points);wbTrackGamePlayed('hybridCircuit');wbAddCoins(3);WB_SOUND.win();}else draw();}else{points=Math.max(0,points-40);WB_SOUND.click();}};});}
      start.onclick=function(){step=0;points=0;start.style.display='none';draw();};
    }
  }
  Object.keys(WB_HYBRIDS).forEach(function(k){wbHybridBubble(WB_HYBRIDS[k]);});

  /* ---- Cabinet decorators ---- */
  var sessionCoins = {}; // debounce coin awards per game per session
  function wbDecorateAll(){
    WB_GAME_REGISTRY.forEach(function(g){
     try {
      var slot = document.getElementById(g.slot);
      if(!slot || slot.dataset.wbDecorated) return;
      if(!g.cat) g.cat = wbCatFromSlot(g.slot);
      slot.dataset.wbDecorated = '1';
      slot.dataset.gameKey = g.key||'';
      slot.dataset.name = g.name;
      slot.dataset.category = g.cat;
      slot.tabIndex = 0;
      slot.setAttribute('role','button');
      slot.setAttribute('aria-label', g.name + ' — ' + (g.placeholder?'coming soon':'playable') + ' cabinet');

      // category chip
      var chip=document.createElement('div'); chip.className='ac-chip'; chip.textContent=(g.cat||'').toUpperCase();
      slot.appendChild(chip);

      // favorite button
      var fav=document.createElement('div'); fav.className='ac-fav'; fav.setAttribute('role','button'); fav.setAttribute('aria-label','Favorite '+g.name); fav.textContent='☆'; fav.title='Favorite';
      fav.addEventListener('click', function(e){ e.stopPropagation(); wbToggleFav(g.slot, fav); });
      fav.addEventListener('mouseenter', function(){ WB_SOUND.hover(); });
      slot.appendChild(fav);

      // score chip
      if(g.key){
        var sc = wbGetHighScore(g.key);
        if(sc>0){
          var s=document.createElement('div'); s.className='ac-score-chip'; s.textContent='★ '+sc; slot.appendChild(s);
        }
      }

      // favorited state
      if(wbFavs().indexOf(g.slot)>=0){ fav.classList.add('on'); fav.textContent='★'; }

      // hover sound + launch coin for playable real games
      var bubble = slot.querySelector('.ac-bubble');
      if(bubble){
        bubble.addEventListener('mouseenter', function(){ WB_SOUND.hover(); });
        if(g.key && !g.prototype){
          // award 1 coin on launch, once per game per session
          bubble.addEventListener('click', function(){
            if(!sessionCoins[g.key]){ sessionCoins[g.key]=true; wbAddCoins(1); }
          });
        }
      }
     } catch(e){ /* skip this cabinet on error */ }
    });
  }

  function wbToggleFav(slotId, btn){
    var f = wbFavs();
    var i = f.indexOf(slotId);
    if(i>=0){ f.splice(i,1); btn.classList.remove('on'); btn.textContent='☆'; }
    else { f.push(slotId); btn.classList.add('on'); btn.textContent='★'; WB_SOUND.win(); }
    try{ wbProfile.favorites=f; }catch(e){}
    wbPersist();
    wbRenderRecents();
    wbApplyFilter();
  }

  /* ---- Search / filter ---- */
  var WB_HIDDEN_MERGED = { neonBreaker:true, starfallDefender:true, meteorCommand:true, memoryMatch:true, patternMemory:true, towerBuilder:true, bubbleSort:true };
  var curFilter='all', curSearch='';
  function wbApplyFilter(){
    var q = curSearch.trim().toLowerCase();
    var visible=0;
    WB_GAME_REGISTRY.forEach(function(g){
     try {
      var slot=document.getElementById(g.slot);
      if(!slot) return;
      if(!g.cat) g.cat = wbCatFromSlot(g.slot);
      var show=true;
      if(g.key && WB_HIDDEN_MERGED[g.key]) show=false;
      if(curFilter==='favorites'){ show = wbFavs().indexOf(g.slot)>=0; }
      else if(curFilter!=='all'){ show = g.cat===curFilter; }
      if(show && q){ show = (g.name.toLowerCase().indexOf(q)>=0) || (g.cat.indexOf(q)>=0); }
      slot.hidden = !show;
      if(show) visible++;
     } catch(e){}
    });
    var cnt=document.getElementById('arcade-count');
    if(cnt) cnt.textContent = visible+' / '+WB_GAME_REGISTRY.length+' cabinets';
  }

  /* ---- Recents ---- */
  function wbRenderRecents(){
    var wrap=document.getElementById('arcade-recents');
    var row=document.getElementById('recents-row');
    if(!wrap||!row) return;
    var r=wbRecents().slice(0,8);
    if(!r.length){ wrap.style.display='none'; return; }
    wrap.style.display='block'; row.innerHTML='';
    r.forEach(function(slotId){
      var g = WB_GAME_REGISTRY.filter(function(x){return x.slot===slotId;})[0];
      if(!g) return;
      var p=document.createElement('div'); p.className='recent-pill'; p.textContent=g.name;
      p.addEventListener('click', function(){ var s=document.getElementById(g.slot); if(s){ s.scrollIntoView({behavior:'smooth',block:'center'}); s.focus(); } });
      row.appendChild(p);
    });
  }
  function wbPushRecent(slotId){
    var r=wbRecents();
    var i=r.indexOf(slotId); if(i>=0) r.splice(i,1);
    r.unshift(slotId); r=r.slice(0,12);
    try{ wbProfile.recents=r; }catch(e){}
    wbPersist(); wbRenderRecents();
  }

  /* ---- Coins display ---- */
  function wbRenderCoins(){
    var el=document.getElementById('coin-count'); if(el) el.textContent = wbCoins();
  }

  /* ---- Keyboard navigation ---- */
  function wbVisibleCabinets(){
    return WB_GAME_REGISTRY.map(function(g){ return document.getElementById(g.slot); }).filter(function(s){ return s && !s.hidden; });
  }
  var wbFocusIdx=0;
  document.addEventListener('keydown', function(e){
    // only when arcade tab active and no overlay open and not typing
    var arcadeOn = document.getElementById('tab-arcade') && document.getElementById('tab-arcade').classList.contains('active');
    var overlayOn = document.getElementById('ac-overlay') && document.getElementById('ac-overlay').classList.contains('on');
    var typing = /input|textarea|select/i.test(document.activeElement ? document.activeElement.tagName : '');
    if(!arcadeOn || overlayOn) return;
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){
      if(typing) return;
      e.preventDefault();
      var list = wbVisibleCabinets();
      if(!list.length) return;
      wbFocusIdx = Math.max(0, Math.min(list.length-1, wbFocusIdx));
      list[wbFocusIdx].focus();
      list[wbFocusIdx].scrollIntoView({behavior:'smooth',block:'center'});
    } else if(e.key==='Enter' && !typing){
      var el=document.activeElement;
      if(el && el.classList && el.classList.contains('ac-slot')){
        var b=el.querySelector('.ac-bubble'); if(b){ WB_SOUND.launch(); b.click(); wbPushRecent(el.id); }
      }
    } else if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
      if(typing) return;
      // move between top tabs
      var tabs=Array.prototype.slice.call(document.querySelectorAll('.tabbtn'));
      var cur = document.querySelector('.tabbtn.active'); var ci = tabs.indexOf(cur);
      if(ci<0) return;
      var ni = e.key==='ArrowRight' ? (ci+1)%tabs.length : (ci-1+tabs.length)%tabs.length;
      tabs[ni].click(); WB_SOUND.click();
    }
  });

  /* ---- Difficulty selector (global score multiplier) ---- */
  (function(){
    var toolbar=document.querySelector('.arcade-toolbar');
    if(!toolbar) return;
    var wrap=document.createElement('div'); wrap.className='arcade-filter';
    var sel=document.createElement('select'); sel.id='wb-difficulty';
    sel.style.cssText='padding:7px 10px;border-radius:20px;border:2px solid var(--line);background:var(--panel-2);color:var(--text);font-size:12px;font-family:inherit;cursor:pointer;';
    [['Casual','1.0x'],['Normal','1.25x'],['Hardcore','1.6x']].forEach(function(d){ var o=document.createElement('option'); o.value=d[0]; o.textContent='⚡ '+d[0]+' ('+d[1]+')'; sel.appendChild(o); });
    try{ sel.value = (wbProfile.difficulty)||'Casual'; }catch(e){}
    sel.addEventListener('change', function(){ try{ wbProfile.difficulty=sel.value; }catch(e){} wbPersist(); WB_SOUND.click(); });
    wrap.appendChild(sel); toolbar.appendChild(wrap);
  })();
  function wbDifficultyMult(){
    try{ var d=wbProfile.difficulty; if(d==='Normal') return 1.25; if(d==='Hardcore') return 1.6; }catch(e){}
    return 1.0;
  }

  /* ---- Demo / attract mode ---- */
  var demoTimer=null, demoCycle=null, lastInteract=Date.now();
  function wbDemoStart(){
    if(window.__wbDemoOn) return; window.__wbDemoOn=true;
    var banner=document.getElementById('demo-banner');
    if(banner) banner.classList.add('on');
    var idx=0;
    demoCycle=setInterval(function(){
      var list=wbVisibleCabinets(); if(!list.length) return;
      list.forEach(function(s){ s.classList.remove('demo-spot'); });
      idx = (idx+1)%list.length;
      list[idx].classList.add('demo-spot');
    }, 2200);
  }
  function wbDemoStop(){
    window.__wbDemoOn=false;
    var banner=document.getElementById('demo-banner'); if(banner) banner.classList.remove('on');
    if(demoCycle){ clearInterval(demoCycle); demoCycle=null; }
    document.querySelectorAll('.ac-slot.demo-spot').forEach(function(s){ s.classList.remove('demo-spot'); });
  }
  function wbDemoReset(){ lastInteract=Date.now(); if(window.__wbDemoOn) wbDemoStop(); }
  ['click','keydown','mousemove','touchstart','scroll'].forEach(function(ev){
    document.addEventListener(ev, wbDemoReset, {passive:true});
  });
  demoTimer=setInterval(function(){
    var arcadeOn=document.getElementById('tab-arcade')&&document.getElementById('tab-arcade').classList.contains('active');
    var overlayOn=document.getElementById('ac-overlay')&&document.getElementById('ac-overlay').classList.contains('on');
    if(!arcadeOn||overlayOn){ if(window.__wbDemoOn) wbDemoStop(); return; }
    if(!window.__wbDemoOn && Date.now()-lastInteract>25000){ wbDemoStart(); }
  }, 1000);

  /* ---- Experimental theme editor ---- */
  function wbHexFromVar(v){ var c=getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return wbRgbToHex(c); }
  function wbRgbToHex(c){
    c=(c||'').trim(); var m=c.match(/\d+/g);
    if(m&&m.length>=3){ return '#'+[0,1,2].map(function(i){return Math.max(0,Math.min(255,parseInt(m[i],10))).toString(16).padStart(2,'0');}).join(''); }
    if(/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    return '#12161d';
  }
  (function(){
    var inputs=document.querySelectorAll('#exp-bg,#exp-panel,#exp-text,#exp-line,#exp-accent,#exp-cyan');
    inputs.forEach(function(inp){
      var v=inp.getAttribute('data-var'); if(!v) return;
      inp.value=wbHexFromVar(v);
      inp.addEventListener('input', function(){ document.documentElement.style.setProperty(v, inp.value); wbUpdateContrast(); });
    });
    var exp=document.getElementById('exp-theme-export'), rst=document.getElementById('exp-theme-reset'), ta=document.getElementById('exp-theme-json');
    if(exp) exp.addEventListener('click', function(){
      var o={}; ['--bg','--panel','--text','--line','--amber','--cyan'].forEach(function(v){ o[v]=wbHexFromVar(v); });
      if(ta) ta.value=JSON.stringify(o,null,2); WB_SOUND.click();
    });
    if(rst) rst.addEventListener('click', function(){
      ['--bg','--panel','--text','--line','--amber','--cyan'].forEach(function(v){ document.documentElement.style.removeProperty(v); });
      inputs.forEach(function(inp){ var v=inp.getAttribute('data-var'); if(v) inp.value=wbHexFromVar(v); });
      wbUpdateContrast(); WB_SOUND.click();
    });
  })();

  /* ---- Contrast checker ---- */
  function wbRelLum(hex){
    hex=(hex||'').replace('#',''); if(hex.length<6) return 0;
    var r=parseInt(hex.slice(0,2),16)/255, g=parseInt(hex.slice(2,4),16)/255, b=parseInt(hex.slice(4,6),16)/255;
    function f(c){ return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); }
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
  }
  function wbUpdateContrast(){
    var fg=wbHexFromVar('--amber'), bg=wbHexFromVar('--bg');
    var l1=wbRelLum(fg), l2=wbRelLum(bg);
    var ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    var r=document.getElementById('contrast-result'), aa=document.getElementById('contrast-aa'), aal=document.getElementById('contrast-aa-large');
    if(r) r.textContent=ratio.toFixed(2)+':1';
    function cls(ok){ return ok?'contrast-pass':'contrast-fail'; }
    if(aa){ aa.textContent = ratio>=4.5?'PASS':'FAIL'; aa.className='contrast-result '+cls(ratio>=4.5); }
    if(aal){ aal.textContent = ratio>=3?'PASS':'FAIL'; aal.className='contrast-result '+cls(ratio>=3); }
  }

  /* ---- Perf / LOC dashboard ---- */
  function wbCountLines(){
    var total=document.documentElement.outerHTML.split('\n').length;
    var sl=0, st=0;
    document.querySelectorAll('script:not([src])').forEach(function(s){ sl+=(s.textContent||'').split('\n').length; });
    document.querySelectorAll('style').forEach(function(s){ st+=(s.textContent||'').split('\n').length; });
    return {total:total, script:sl, style:st};
  }
  function wbUpdateDashboard(){
    var loc=wbCountLines();
    var set=function(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; };
    set('dev-loc-total', loc.total.toLocaleString());
    set('dev-loc-script', loc.script.toLocaleString());
    set('dev-loc-style', loc.style.toLocaleString());
    set('dev-raf-count', window.__wbRaf||0);
    set('dev-timer-count', window.__wbTimers||0);
    set('dev-overlay-open', (document.getElementById('ac-overlay')&&document.getElementById('ac-overlay').classList.contains('on'))?'YES':'no');
    set('dev-demo-on', window.__wbDemoOn?'YES':'no');
    var at=document.querySelector('.tabbtn.active'); set('dev-active-tab', at?at.textContent.trim():'—');
    set('dev-cabinets', document.querySelectorAll('.ac-slot').length);
  }
  setInterval(wbUpdateDashboard, 1000);

  /* ---- Weekly challenge ---- */
  (function(){
    var cards=document.querySelectorAll('.arcade-side-right .arcade-side-card, .arcade-side-card');
    var target=null;
    cards.forEach(function(c){ var h=c.querySelector('h3'); if(h&&/Daily Challenge/i.test(h.textContent)) target=c; });
    if(!target) return;
    var wk=document.createElement('div'); wk.className='as-challenge'; wk.style.marginTop='8px';
    var seed=new Date().getFullYear()*100+Math.floor(new Date().getMonth()/1);
    var challenges=['Win 3 different skill games','Earn 30 coins today','Play 1 game from each category','Beat your high score twice','Try all 3 prototype games'];
    var pick=challenges[seed%challenges.length];
    wk.innerHTML='<b>📊 Weekly:</b> '+pick;
    target.appendChild(wk);
  })();

  /* ---- Tutorial toggle ---- */
  (function(){
    var tg=document.getElementById('tut-toggle'), st=document.getElementById('tutorial-steps');
    if(tg&&st){ tg.addEventListener('click', function(){ st.classList.toggle('open'); tg.textContent = st.classList.contains('open')?'▼ Hide the quick-start guide':'▶ Show the quick-start guide'; WB_SOUND.click(); }); }
  })();

  /* ---- Sound toggle ---- */
  (function(){
    var btn=document.getElementById('sound-toggle');
    if(!btn) return;
    function render(){ btn.textContent = WB_SOUND.isMuted()?'🔇':'🔊'; btn.classList.toggle('muted', WB_SOUND.isMuted()); }
    render();
    btn.addEventListener('click', function(){ var m=WB_SOUND.toggle(); render(); if(!m){ /* played a beep already */ } });
    // wire sounds to filters + tabs
    document.querySelectorAll('.filter-chip').forEach(function(c){ c.addEventListener('click', function(){ WB_SOUND.click(); }); });
    document.querySelectorAll('.tabbtn').forEach(function(t){ t.addEventListener('click', function(){ WB_SOUND.click(); }); });
  })();

  /* ---- Achievements: new entries + threshold update ---- */
  try {
    wbAchievements.push(
      { id:'proto_trio', icon:'🧪', name:'Prototype Tester', desc:'Play all 3 prototype games', test:function(s){ return ['protoReaction','protoTapRush','protoAimTrainer'].every(function(k){ return s.gamesPlayedByType&&s.gamesPlayedByType[k]; }); }, progress:function(s){ var n=['protoReaction','protoTapRush','protoAimTrainer'].filter(function(k){return s.gamesPlayedByType&&s.gamesPlayedByType[k];}).length; return n/3; } },
      { id:'first_favorite', icon:'⭐', name:'Curator', desc:'Favorite your first cabinet', test:function(s){ return !!(s.favorites&&s.favorites.length); }, progress:function(s){ return (s.favorites&&s.favorites.length)?1:0; } },
      { id:'coin_50', icon:'🪙', name:'Coin Collector', desc:'Earn 50 coins total', test:function(s){ return (s.coins||0)>=50; }, progress:function(s){ return Math.min(1,(s.coins||0)/50); } },
      { id:'searcher', icon:'🔍', name:'Seeker', desc:'Use the arcade search bar', test:function(s){ return !!s.usedSearch; }, progress:function(s){ return s.usedSearch?1:0; } }
    );
    // "play all cabinets" threshold now reflects playable count: 29 real + 3 prototypes = 32
    wbAchievements.forEach(function(a){
      if(a.id==='all_games'||a.id==='all_games_9'){ a.desc=a.desc.replace(/29/g,'32'); a.test=function(s){ return s.gamesPlayedByType&&Object.keys(s.gamesPlayedByType).length>=32; }; a.progress=function(s){ return Math.min(1,(s.gamesPlayedByType?Object.keys(s.gamesPlayedByType).length:0)/32); }; }
    });
  } catch(e){}

  /* ---- Wire search input + filter chips ---- */
  (function(){
    var inp=document.getElementById('arcade-search-input');
    if(inp){
      inp.addEventListener('input', function(){ curSearch=inp.value; wbApplyFilter(); try{ wbProfile.usedSearch=true; }catch(e){} wbPersist(); });
    }
    var chips=document.querySelectorAll('#arcade-filter .filter-chip');
    chips.forEach(function(c){ c.addEventListener('click', function(){ chips.forEach(function(x){ x.classList.remove('active'); }); c.classList.add('active'); curFilter=c.getAttribute('data-filter'); wbApplyFilter(); WB_SOUND.click(); }); });
  })();

  /* ---- Init ---- */
  window.WB_GAME_REGISTRY = WB_GAME_REGISTRY;
  window.__wbInitLog = [];
  function wbInit517(){
    try {
      Object.keys(WB_PROTOS).forEach(function(k){ var g=WB_GAME_REGISTRY.filter(function(x){return x.key===k;})[0]; if(g) wbProtoBubble(g); });
      window.__wbInitLog.push('protos done');
    } catch(e){ window.__wbInitLog.push('proto ERR: '+e.message); }
    try { wbDecorateAll(); window.__wbInitLog.push('decorate done: '+document.querySelectorAll('.ac-slot[data-wb-decorated]').length); } catch(e){ window.__wbInitLog.push('decorate ERR: '+e.message); }
    try { wbApplyFilter(); window.__wbInitLog.push('filter done'); } catch(e){ window.__wbInitLog.push('filter ERR: '+e.message); }
    try { wbRenderRecents(); window.__wbInitLog.push('recents done'); } catch(e){ window.__wbInitLog.push('recents ERR: '+e.message); }
    try { wbRenderCoins(); window.__wbInitLog.push('coins done'); } catch(e){ window.__wbInitLog.push('coins ERR: '+e.message); }
    try { wbUpdateContrast(); window.__wbInitLog.push('contrast done'); } catch(e){ window.__wbInitLog.push('contrast ERR: '+e.message); }
    try { wbUpdateDashboard(); window.__wbInitLog.push('dash done'); } catch(e){ window.__wbInitLog.push('dash ERR: '+e.message); }
    setTimeout(function(){ try{ wbDecorateAll(); wbApplyFilter(); wbRenderCoins(); window.__wbInitLog.push('redecorate1: '+document.querySelectorAll('.ac-slot[data-wb-decorated]').length); }catch(e){ window.__wbInitLog.push('redec1 ERR: '+e.message); } }, 1200);
    setTimeout(function(){ try{ wbDecorateAll(); wbRenderCoins(); window.__wbInitLog.push('redecorate2: '+document.querySelectorAll('.ac-slot[data-wb-decorated]').length); }catch(e){ window.__wbInitLog.push('redec2 ERR: '+e.message); } }, 3500);
    setTimeout(function(){ try{ wbDecorateAll(); wbApplyFilter(); window.__wbInitLog.push('redecorate3: '+document.querySelectorAll('.ac-slot[data-wb-decorated]').length); }catch(e){ window.__wbInitLog.push('redec3 ERR: '+e.message); } }, 6000);
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', wbInit517); }
  else { wbInit517(); }
  window.addEventListener('load', function(){ wbInit517(); setTimeout(wbUpdateContrast, 300); });

})();

