
(function(){
  // Assistant password gate lives inside the Assistant page, like the Developer gate.
  var unlocked=false, pageGate=document.getElementById('assistant-page-gate'), gateForm=document.getElementById('assistant-page-gate-form');
  function openLock(){
    if(unlocked) return true;
    if(pageGate){ pageGate.setAttribute('aria-hidden','false'); }
    setTimeout(function(){ var input=document.getElementById('assistant-password'); if(input) input.focus(); },50);
    return false;
  }
  function unlock(e){
    if(e) e.preventDefault();
    var input=document.getElementById('assistant-password'), v=input ? input.value.trim() : '';
    var err=document.getElementById('assistant-lock-error');
    var expectedAccess=String.fromCharCode(49,50,51);
    if(v===expectedAccess){
      unlocked=true;
      if(pageGate) pageGate.setAttribute('aria-hidden','true');
      if(err) err.textContent='';
      if(input) input.value='';
    }else if(err){
      err.textContent='Incorrect access code.';
    }
  }
  if(gateForm) gateForm.addEventListener('submit',unlock);
  document.querySelectorAll('.tabbtn').forEach(function(b){
    if(b.dataset.target==='tab-ai'){
      b.addEventListener('click',function(){
        if(!unlocked) setTimeout(openLock,0);
      });
    }
  });
  // Brain-dependent address/key availability
  var bs=document.getElementById('backend-select'), homeRow=document.getElementById('home-server-row'), gemRow=document.getElementById('gemini-key-row');
  function updateBrainFields(){ var v=bs&&bs.value; if(homeRow)homeRow.classList.toggle('scratched',v!=='home'); if(gemRow)gemRow.classList.toggle('scratched',v!=='gemini'); }
  if(bs){bs.addEventListener('change',updateBrainFields);updateBrainFields();}
  // Local memory mirror on Assistant side
  function renderAssistantMemory(){var list=document.getElementById('assistant-memory-list'),q=(document.getElementById('assistant-memory-search').value||'').toLowerCase().trim(),count=document.getElementById('assistant-memory-count');if(!list)return;var rows=(typeof aiMemory!=='undefined'?aiMemory:[]).filter(function(m){return !q||((m.title||'')+' '+(m.category||'')+' '+(m.content||'')).toLowerCase().indexOf(q)>=0}).slice(0,8);count.textContent=(typeof aiMemory!=='undefined'?aiMemory.length:0);list.innerHTML=rows.length?rows.map(function(m){return '<div class="alm-item"><b>'+esc(m.title||'Memory')+'</b><small>'+esc(m.category||'Memory')+' · '+esc((m.content||'').slice(0,130))+'</small></div>';}).join(''):'<div class="alm-empty">No local memories yet. Save a rule, decision, or useful project detail.</div>';}
  function esc(x){var d=document.createElement('div');d.textContent=x;return d.innerHTML;}
  document.getElementById('assistant-memory-search').oninput=renderAssistantMemory;
  document.getElementById('assistant-memory-add').onclick=function(){var title=prompt('Memory title');if(!title)return;var content=prompt('What should Workbench remember?');if(content&&typeof addAIMemory==='function')addAIMemory(title,'Project Rule',content,renderAssistantMemory);renderAssistantMemory();};
  document.getElementById('assistant-memory-save-exchange').onclick=function(){if(typeof history!=='undefined'&&history.length>=2&&typeof addAIMemory==='function'){var u=[...history].reverse().find(function(x){return x.role==='user'}),a=[...history].reverse().find(function(x){return x.role==='assistant'});if(u)addAIMemory('Saved conversation exchange','AI / Prompt','User: '+u.content+'\nAssistant: '+(a?a.content:'(no reply)'),renderAssistantMemory);renderAssistantMemory();}};
  document.getElementById('assistant-memory-export').onclick=function(){var blob=new Blob([JSON.stringify({format:'Stark Workbench AI Memory',version:1,memories:aiMemory||[]},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Workbench_AI_Memory.json';a.click();};
  setTimeout(renderAssistantMemory,200);
  // Educational workspace
  var tabs=document.querySelectorAll('.edu-work-tab'), panels=document.querySelectorAll('.edu-work-panel'); tabs.forEach(function(t){t.onclick=function(){tabs.forEach(function(x){x.classList.remove('active')});panels.forEach(function(x){x.classList.remove('active')});t.classList.add('active');document.getElementById('edu-'+t.dataset.eduw).classList.add('active');};});
  var notes=JSON.parse(localStorage.getItem('wb-study-notes')||'[]'), current=-1; function saveNotes(){localStorage.setItem('wb-study-notes',JSON.stringify(notes));renderNotes();updateDash();}
  function renderNotes(){var l=document.getElementById('notes-list'),q=(document.getElementById('notes-search').value||'').toLowerCase();l.innerHTML='';notes.filter(function(n){return !q||(n.title+' '+n.tags+' '+n.body).toLowerCase().includes(q)}).sort(function(a,b){return (b.pinned?1:0)-(a.pinned?1:0)}).forEach(function(n,i){var d=document.createElement('div');d.className='note-row'+(i===current?' active':'');d.innerHTML='<b>'+esc(n.title||'Untitled')+'</b><small>'+esc(n.tags||'No tags')+'</small>';d.onclick=function(){current=notes.indexOf(n);loadNote(n);renderNotes();};l.appendChild(d);});updateDash();}
  function loadNote(n){document.getElementById('note-title').value=n.title||'';document.getElementById('note-tags').value=n.tags||'';document.getElementById('note-pinned').checked=!!n.pinned;document.getElementById('note-body').value=n.body||'';}
  function commitNote(){if(current<0)return;notes[current]={title:document.getElementById('note-title').value,tags:document.getElementById('note-tags').value,body:document.getElementById('note-body').value,pinned:document.getElementById('note-pinned').checked,updatedAt:Date.now()};localStorage.setItem('wb-study-notes',JSON.stringify(notes));document.getElementById('note-save-status').textContent='Saved '+new Date().toLocaleTimeString();renderNotes();}
  document.getElementById('notes-new').onclick=function(){notes.unshift({title:'New Note',tags:'',body:'',pinned:false,updatedAt:Date.now()});current=0;loadNote(notes[0]);saveNotes();}; ['note-title','note-tags','note-body','note-pinned'].forEach(function(id){document.getElementById(id).addEventListener('input',function(){clearTimeout(window.__noteTimer);window.__noteTimer=setTimeout(commitNote,350);});});document.getElementById('notes-search').oninput=renderNotes;
  // Coding studio
  document.getElementById('code-run').onclick=function(){var lang=document.getElementById('code-lang').value,code=document.getElementById('code-editor').value,frame=document.getElementById('code-preview');if(lang==='HTML'){frame.srcdoc=code}else if(lang==='CSS'){frame.srcdoc='<style>'+code+'</style><div>CSS preview</div>'}else if(lang==='JavaScript'){var safe=JSON.stringify(code).replace(/<\//g,'<\\/');frame.srcdoc='<body><pre id=\"o\"></pre><scr'+'ipt>try{document.getElementById(\'o\').textContent=String(eval('+safe+'))}catch(e){document.getElementById(\'o\').textContent=e}<\/scr'+'ipt></body>'}else if(lang==='JSON'){try{frame.srcdoc='<pre>'+esc(JSON.stringify(JSON.parse(code),null,2))+'</pre>'}catch(e){frame.srcdoc='<pre>'+esc(String(e))+'</pre>'}}else{frame.srcdoc='<pre>Python runs here as an editor/preview placeholder. Connect a Python runtime to execute code.</pre>'}};
  document.getElementById('code-lang').onchange=function(){var l=this.value;document.getElementById('code-editor').value=l==='HTML'?'<!doctype html>\n<h1>Hello Workbench</h1>\n<p>Build your page here.</p>':l==='CSS'?'body { font-family: sans-serif; padding: 30px; }':l==='JavaScript'?'2 + 2':l==='JSON'?'[{"name":"Workbench","version":"5.37.0"}]':'print("Hello Workbench")';};document.getElementById('code-lang').onchange();
  // Math tools
  function num(id){return parseFloat(document.getElementById(id).value)||0;}document.getElementById('math-calc-btn').onclick=function(){try{document.getElementById('math-calc-out').textContent=Function('return ('+document.getElementById('math-calc').value+')')()}catch(e){document.getElementById('math-calc-out').textContent='Invalid expression'}};document.getElementById('math-eq-btn').onclick=function(){var m=document.getElementById('math-eq').value.replace(/\s/g,'').match(/^([+-]?\d*\.?\d*)x([+-]\d*\.?\d*)=([+-]?\d*\.?\d*)$/);document.getElementById('math-eq-out').textContent=m?(function(){var a=parseFloat(m[1]||1),b=parseFloat(m[2]||0),c=parseFloat(m[3]);return 'x = '+((c-b)/a).toFixed(6)})():'Use ax+b=c';};function unit(){var v=num('math-unit'),k=document.getElementById('math-unit-kind').value,fac={'mi-km':1.609344,'km-mi':0.6213711922,'lb-kg':0.45359237,'kg-lb':2.2046226218};document.getElementById('math-unit-out').textContent=(v*fac[k]).toFixed(6)}document.getElementById('math-unit-kind').onchange=unit;document.getElementById('math-unit').oninput=unit;document.getElementById('matrix-add').onclick=function(){function p(x){return x.split(';').map(r=>r.split(',').map(Number))}try{var a=p(document.getElementById('matrix-a').value),b=p(document.getElementById('matrix-b').value);document.getElementById('matrix-out').textContent=a.map((r,i)=>r.map((v,j)=>v+b[i][j]).join(',')).join(';')}catch(e){document.getElementById('matrix-out').textContent='Check matrix format'}};document.getElementById('stats-data').oninput=function(){var a=this.value.split(',').map(Number).filter(Number.isFinite);if(!a.length)return;var mean=a.reduce((x,y)=>x+y,0)/a.length,sorted=a.slice().sort((x,y)=>x-y),med=sorted[Math.floor((a.length-1)/2)];document.getElementById('stats-out').textContent='Mean '+mean.toFixed(2)+' · Median '+med+' · Min '+sorted[0]+' · Max '+sorted[sorted.length-1]};document.getElementById('geo-r').oninput=function(){var r=num('geo-r');document.getElementById('geo-out').textContent='Circle area: '+(Math.PI*r*r).toFixed(2)};document.getElementById('algebra-open').onclick=function(){if(typeof launchAlgebra==='function')launchAlgebra();};
  // Flashcards local deck
  var cards=JSON.parse(localStorage.getItem('wb-flashcards')||'[]');function renderCards(){var d=document.getElementById('fc-deck');d.innerHTML=cards.length?cards.map(function(c,i){return '<div class="fc-row"><span>'+esc(c.front)+'</span><small>'+esc(c.back)+'</small><button data-i="'+i+'" class="ghost">Delete</button></div>'}).join(''):'<p style="color:var(--muted)">No cards yet.</p>';d.querySelectorAll('button').forEach(function(b){b.onclick=function(){cards.splice(+b.dataset.i,1);localStorage.setItem('wb-flashcards',JSON.stringify(cards));renderCards();updateDash();}});updateDash();}document.getElementById('fc-add').onclick=function(){var f=document.getElementById('fc-front').value,b=document.getElementById('fc-back').value;if(!f||!b)return;cards.push({front:f,back:b});localStorage.setItem('wb-flashcards',JSON.stringify(cards));document.getElementById('fc-front').value='';document.getElementById('fc-back').value='';renderCards();};document.getElementById('fc-clear').onclick=function(){if(confirm('Clear the local flashcard deck?')){cards=[];localStorage.setItem('wb-flashcards','[]');renderCards();}};
  // Engineering
  document.getElementById('cad-drive').oninput=document.getElementById('cad-driven').oninput=function(){var a=num('cad-drive'),b=num('cad-driven');document.getElementById('cad-ratio').textContent=a&&b?'Ratio '+(b/a).toFixed(3)+':1':'—'};document.getElementById('cad-torque').oninput=document.getElementById('cad-rpm').oninput=function(){document.getElementById('cad-hp').textContent=(num('cad-torque')*num('cad-rpm')/5252).toFixed(1)+' HP'};document.getElementById('cad-rpm2').oninput=document.getElementById('cad-final').oninput=function(){var r=num('cad-rpm2'),f=num('cad-final');document.getElementById('cad-speed').textContent=r&&f?(r/(f*1))*0.00298+' mph':'— mph'};document.getElementById('cad-spring').oninput=document.getElementById('cad-load').oninput=function(){var s=num('cad-spring'),l=num('cad-load');document.getElementById('cad-sag').textContent=s?'Approx. deflection '+(l/s).toFixed(3)+' in':'—'};document.getElementById('cad-tire').oninput=function(){var m=this.value.match(/(\d+)\/(\d+)R(\d+)/i);document.getElementById('cad-tire-out').textContent=m?'Sidewall '+(+m[1]*(+m[2]/100)).toFixed(1)+' mm · '+m[3]+' in wheel':'Use 225/45R17 format'};
  // Basic CAD sketcher
  var cc=document.getElementById('cad-canvas'),cx=cc.getContext('2d'),drawing=false;function grid(){cx.clearRect(0,0,cc.width,cc.height);cx.strokeStyle='#182532';for(var x=0;x<cc.width;x+=26){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,cc.height);cx.stroke()}for(var y=0;y<cc.height;y+=26){cx.beginPath();cx.moveTo(0,y);cx.lineTo(cc.width,y);cx.stroke()}}grid();cc.onpointerdown=function(e){drawing=true;cx.beginPath();cx.moveTo(e.offsetX,e.offsetY)};cc.onpointermove=function(e){if(!drawing)return;cx.lineTo(e.offsetX,e.offsetY);cx.strokeStyle='#5fd4c7';cx.lineWidth=2;cx.stroke()};cc.onpointerup=function(){drawing=false};
  // Dashboard
  function updateDash(){document.getElementById('dash-notes').textContent=notes.length;document.getElementById('dash-cards').textContent=cards.length;var d=JSON.parse(localStorage.getItem('wb-student-dashboard')||'{}');document.getElementById('dash-assignments').textContent=d.assignments||0;document.getElementById('dash-minutes').textContent=d.minutes||0;}renderNotes();renderCards();window.wbEdu={notes:function(){return notes},cards:function(){return cards},esc:esc,addCard:function(f,b){cards.push({front:f,back:b});localStorage.setItem('wb-flashcards',JSON.stringify(cards));renderCards();},addNote:function(t,b){notes.push({title:t,tags:'assistant',body:b,pinned:false,updatedAt:Date.now()});localStorage.setItem('wb-study-notes',JSON.stringify(notes));renderNotes();}};
  // Media Studio / Utilities
  var mediaChoices=document.querySelectorAll('.media-choice'),mediaSelect=document.getElementById('media-select-screen');function showMedia(which){mediaSelect.style.display='none';['video','music','studio','utilities'].forEach(function(x){var e=document.getElementById('media-'+x+'-content');if(e)e.style.display=x===which?'block':'none';});}mediaChoices.forEach(function(b){b.onclick=function(){showMedia(b.dataset.media)}});document.querySelectorAll('.media-back-any').forEach(function(b){b.onclick=function(){['video','music','studio','utilities'].forEach(function(x){var e=document.getElementById('media-'+x+'-content');if(e)e.style.display='none'});mediaSelect.style.display='grid';}});
  var stFile=document.getElementById('studio-file'),stCanvas=document.getElementById('studio-canvas'),stctx=stCanvas.getContext('2d'),stImg=null;stFile.onchange=function(){var f=this.files[0];if(!f)return;var im=new Image();im.onload=function(){stImg=im;stCanvas.width=im.naturalWidth;stCanvas.height=im.naturalHeight;stctx.drawImage(im,0,0)};im.src=URL.createObjectURL(f)};document.getElementById('studio-fit').onclick=function(){if(!stImg)return;var w=num('studio-w'),h=num('studio-h');stCanvas.width=w;stCanvas.height=h;stctx.drawImage(stImg,0,0,w,h)};document.getElementById('studio-export').onclick=function(){var a=document.createElement('a');a.download='workbench-studio.png';a.href=stCanvas.toDataURL('image/png');a.click()};document.getElementById('util-calc-btn').onclick=function(){try{document.getElementById('util-calc-out').textContent=Function('return ('+document.getElementById('util-calc').value+')')()}catch(e){document.getElementById('util-calc-out').textContent='Invalid'}};document.getElementById('util-text').oninput=function(){var v=this.value;document.getElementById('util-text-out').textContent=v.length+' characters · '+(v.trim()?v.trim().split(/\s+/).length:0)+' words'};document.getElementById('util-miles').oninput=function(){document.getElementById('util-km-out').textContent=(num('util-miles')*1.609344).toFixed(3)+' km'};
  // Arcade Block World subtab routes into the existing world section without duplicating its large 3D engine.
  document.querySelectorAll('.arcade-subtabs .subtab').forEach(function(b){if(b.dataset.sub==='world'){b.onclick=function(){document.querySelectorAll('.tabbtn').forEach(function(x){x.classList.toggle('active',x.dataset.target==='tab-world')});document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});document.getElementById('tab-world').classList.add('active');window.dispatchEvent(new Event('game:resize'));var ov=document.getElementById('mode-select-overlay');if(ov)ov.classList.add('show');}}});
  // 5.35.0: direct Block World return + Educational Learning Labs.
  var bwBack=document.getElementById('block-world-back'); if(bwBack){bwBack.onclick=function(){var ov=document.getElementById('mode-select-overlay');if(ov)ov.classList.remove('show');var arcade=document.querySelector('.tabbtn[data-target=\"tab-arcade\"]');if(arcade)arcade.click();var games=document.querySelector('#tab-arcade .subtab[data-sub=\"games\"]');if(games)games.click();};}
  // 5.37.0: Educational is a single cabinet wall. Existing workspaces and the four learning labs share one launcher.
  /* 5.40.5: delegate Educational cabinet clicks from the stable tab container.
     init519() can rebuild the cabinet wall during DOMContentLoaded/load, which
     replaces individual .edu-cab nodes. Direct listeners attached before that
     rebuild were therefore lost. Delegation survives every cabinet rebuild. */
  var eduRoot=document.getElementById('tab-edu');
  function wbLaunchLabSafe(key){
    try{
      var fn=window.WB_LAUNCH_LABS&&window.WB_LAUNCH_LABS[key];
      if(typeof fn!=='function'){ console.error('Workbench lab unavailable:',key); return; }
      fn();
    }catch(err){ console.error('Workbench lab failed to launch:',key,err); }
  }
  if(eduRoot && !eduRoot.__wbEduCabDelegated){
    eduRoot.__wbEduCabDelegated=true;
    eduRoot.addEventListener('click',function(e){
      var el=e.target.closest ? e.target.closest('.edu-cab') : null;
      if(!el || !eduRoot.contains(el)) return;
      var key=el.dataset.eduw;
      if(key){
        var tabs=document.querySelectorAll('.edu-work-tab'),panels=document.querySelectorAll('.edu-work-panel');
        tabs.forEach(function(x){x.classList.toggle('active',x.dataset.eduw===key)});
        panels.forEach(function(x){x.classList.toggle('active',x.id==='edu-'+key)});
        return;
      }
      var lab=el.dataset.lab;
      if(lab){ e.preventDefault(); e.stopPropagation(); wbLaunchLabSafe(lab); }
    });
  }
})();

