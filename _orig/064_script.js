
/* 5.57.0 Performance monitor: FPS / memory readout, and automatic quality steps when the device struggles. */
(function(){
  var KEY='wb-perf-v1', cfg={on:false,auto:true,overlay:true};
  try{ var sv=JSON.parse(localStorage.getItem(KEY)||'{}'); Object.keys(cfg).forEach(function(k){ if(typeof sv[k]==='boolean') cfg[k]=sv[k]; }); }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(cfg)); }catch(e){} }
  function $(id){ return document.getElementById(id); }
  function Q(){ return window.__wbQuality||null; }
  var NAMES=['Full','Reduced','Lite'];
  var level=0, userShaders=false, drops=0, lastChange=0, lastRaise=0, needGood=20;
  var low=0, memHi=0, good=0, warm=0, raf=0, running=false;
  var frames=0, sum=0, worst=0, winStart=0, last=0, fps=0, avgMs=0, worstMs=0;

  var st=document.createElement('style');
  st.textContent='#wb-perf-hud{position:fixed;left:8px;bottom:8px;z-index:99990;pointer-events:none;display:none;font:600 11px/1.3 ui-monospace,Consolas,monospace;background:rgba(8,12,18,.78);color:#dfe8ee;border:1px solid rgba(95,212,199,.35);border-radius:7px;padding:5px 8px;white-space:nowrap}'
    +'#wb-perf-hud.on{display:block}#wb-perf-hud b.g{color:#6ee7a0}#wb-perf-hud b.a{color:#ffc247}#wb-perf-hud b.r{color:#ff6b6b}'
    +'#wb-perf-note{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:99991;pointer-events:none;background:rgba(8,12,18,.9);color:#eef3f5;border:1px solid rgba(255,194,71,.5);border-radius:8px;padding:7px 12px;font:600 12px/1.3 system-ui,sans-serif;display:none}'
    +'html.wb-lite body::before,html.wb-lite body::after,html.wb-lite .tab::before,html.wb-lite .tab::after,html.wb-lite #tab-ai::after,html.wb-lite #tab-dev::before{animation:none!important}'
    +'html.wb-lite *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';
  document.head.appendChild(st);
  var hud=document.createElement('div'); hud.id='wb-perf-hud'; hud.setAttribute('aria-hidden','true'); document.body.appendChild(hud);
  var noteEl=document.createElement('div'); noteEl.id='wb-perf-note'; noteEl.setAttribute('role','status'); document.body.appendChild(noteEl);
  var noteT=0;
  function note(msg){ noteEl.textContent=msg; noteEl.style.display='block'; clearTimeout(noteT); noteT=setTimeout(function(){ noteEl.style.display='none'; },5000); }

  function heap(){ var m=window.performance&&performance.memory; return (m&&m.jsHeapSizeLimit)?{used:m.usedJSHeapSize/1048576,limit:m.jsHeapSizeLimit/1048576}:null; }
  function speed(){ var q=Q(); try{ return q&&q.speed?q.speed():1; }catch(e){ return 1; } }
  function cls(f){ return f>=50?'g':(f>=30?'a':'r'); }

  function applyLevel(){
    var q=Q();
    document.documentElement.classList.toggle('wb-lite',level>0);
    if(!q) return;
    try{
      if(level===0){ q.setShaders(userShaders); }
      else{ q.setShaders(false); if(level===2) q.setPixelRatio(0.75); }
    }catch(e){ console.error(e); }
  }
  function setLevel(n,auto){
    n=Math.max(0,Math.min(2,n)); if(n===level) return;
    var q=Q(); if(level===0&&n>0&&q){ try{ userShaders=q.shaders(); }catch(e){} }
    var up=n>level; level=n; lastChange=Date.now(); applyLevel();
    if(auto){
      if(up){ drops++; if(Date.now()-lastRaise<60000) needGood=Math.min(needGood*2,160); note('\u26a1 Quality lowered to '+NAMES[level]+' to keep things smooth'); }
      else{ lastRaise=Date.now(); note('\u26a1 Quality back to '+NAMES[level]); }
    }
    paint();
  }

  function evaluate(){
    if(warm>0){ warm--; return; }
    if(!cfg.auto){ low=good=memHi=0; return; }
    var h=heap(), hr=h?h.used/h.limit:0, now=Date.now();
    low=fps<24?low+1:0;
    memHi=hr>0.85?memHi+1:0;
    good=(fps>=50&&hr<0.7)?good+1:0;
    if((low>=3||memHi>=2)&&level<2&&now-lastChange>8000){ setLevel(level+1,true); low=memHi=good=0; }
    else if(good>=needGood&&level>0&&now-lastChange>8000){ setLevel(level-1,true); good=0; }
  }

  function paint(){
    var h=heap(), sp=speed();
    var hs=h?Math.round(h.used)+' / '+Math.round(h.limit)+' MB':'n/a';
    if(running&&cfg.overlay){
      hud.classList.add('on');
      hud.innerHTML='FPS <b class="'+cls(fps)+'">'+fps+'</b> \u00b7 '+avgMs.toFixed(1)+' ms \u00b7 '+(h?Math.round(h.used)+' MB':'mem n/a')+' \u00b7 Q: '+NAMES[level]+(sp>1?' \u00b7 '+sp+'x':'');
    }else hud.classList.remove('on');
    var set=function(id,v){ var e=$(id); if(e) e.textContent=v; };
    set('perf-state',running?'ON':'OFF');
    set('perf-fps',running?String(fps):'\u2014');
    set('perf-ms',running?avgMs.toFixed(1)+' / '+worstMs.toFixed(0)+' ms':'\u2014');
    set('perf-heap',hs); set('perf-level',NAMES[level]); set('perf-speed',sp+'x'); set('perf-drops',String(drops));
    set('perf-toggle','Monitor: '+(cfg.on?'On':'Off'));
    set('perf-auto','Auto quality: '+(cfg.auto?'On':'Off'));
    set('perf-overlay','On-screen readout: '+(cfg.overlay?'On':'Off'));
    document.querySelectorAll('[data-perf-level]').forEach(function(b){ b.classList.toggle('on',+b.getAttribute('data-perf-level')===level); });
  }

  function frame(t){
    raf=requestAnimationFrame(frame);
    if(document.hidden){ last=0; frames=0; sum=0; worst=0; winStart=0; return; }
    if(last){ var d=t-last; sum+=d; if(d>worst) worst=d; frames++; }
    last=t;
    if(!winStart) winStart=t;
    if(t-winStart>=1000&&frames>0){
      fps=Math.round(frames*1000/(t-winStart)); avgMs=sum/frames; worstMs=worst;
      frames=0; sum=0; worst=0; winStart=t;
      evaluate(); paint();
    }
  }
  function start(){ if(running) return; running=true; warm=3; low=good=memHi=0; last=0; winStart=0; frames=0; raf=requestAnimationFrame(frame); paint(); }
  function stop(){ if(!running) return; running=false; cancelAnimationFrame(raf); setLevel(0,false); paint(); }

  function wire(){
    var t=$('perf-toggle'); if(!t) return;
    t.onclick=function(){ cfg.on=!cfg.on; save(); if(cfg.on) start(); else stop(); paint(); };
    $('perf-auto').onclick=function(){ cfg.auto=!cfg.auto; save(); low=good=memHi=0; paint(); };
    $('perf-overlay').onclick=function(){ cfg.overlay=!cfg.overlay; save(); paint(); };
    document.querySelectorAll('[data-perf-level]').forEach(function(b){ b.onclick=function(){ setLevel(+b.getAttribute('data-perf-level'),false); }; });
    var sb=$('shader-toggle');                                   // if the player flips Shaders by hand while quality is lowered, remember their choice
    if(sb) sb.addEventListener('click',function(){ setTimeout(function(){ var q=Q(); if(level>0&&q){ try{ userShaders=q.shaders(); }catch(e){} } },0); });
    paint();
    if(cfg.on) start();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire); else wire();
  window.wbPerf={ level:function(){ return level; }, fps:function(){ return fps; } };
})();
