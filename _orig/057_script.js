
(function(){
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function btn(x,f,c){var b=el('button','wb44-btn'+(c?' '+c:''),x);b.type='button';b.onclick=f;return b}
function ld(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function B(){return window.wbBridge||{}}
function tok(t){try{return B().tokens(t)}catch(e){return Math.ceil(String(t||'').length/4)}}
function gist(t,max){t=String(t||'').replace(/```[\s\S]*?```/g,' [code] ').replace(/\s+/g,' ').trim();if(t.length<=max)return t;var cut=t.slice(0,max),p=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('? '),cut.lastIndexOf('! '));if(p>max*.5)return cut.slice(0,p+1);var s=cut.lastIndexOf(' ');return (s>max*.6?cut.slice(0,s):cut)+'…'}
var STOP={}; 'the and for are but not you all any can had her was one our out has his how its may new now old see two way who did get let put say she too use that with have this will your from they know want been were what when which their there about would these other into more some than them then also just like over such only very here make does should could where while after before because between during through'.split(' ').forEach(function(w){STOP[w]=1});
function words(t){return (String(t||'').toLowerCase().match(/[a-z0-9][a-z0-9_-]{1,}/g)||[]).filter(function(w){return w.length>=3&&!STOP[w]}).map(function(w){return w.length>4&&/s$/.test(w)&&!/ss$/.test(w)?w.slice(0,-1):w})}

/* ================= Idea 6: Assistant "My files" ================= */
var FK='wb-myfiles-v1',FSTAT='wb-myfiles-stat',MAXFILE=400000,MAXTOT=1500000,idx=null;
function files(){var a=ld(FK,[]);return Array.isArray(a)?a:[]}
function chunkText(text){
 text=String(text).replace(/\r\n?/g,'\n').replace(/\u0000/g,'');
 var paras=text.split(/\n{2,}/),out=[],cur='',head='';
 function flush(){var c=cur.trim();if(c)out.push((head&&c.charAt(0)!=='#'?'['+head+'] ':'')+c);cur=''}
 paras.forEach(function(p){p=p.trim();if(!p)return;
  var m=p.match(/^#{1,6}\s+(.+)/);if(m){flush();head=m[1].slice(0,60)}
  var parts=p.length>900?(p.match(/[^.!?\n]+[.!?]*\s*/g)||[p]):[p];
  parts.forEach(function(s){if(cur.length+s.length>650)flush();cur+=(cur?'\n':'')+s;if(cur.length>900)flush()})});
 flush();return out}
function buildIdx(){if(idx)return idx;var docs=[],df={},tl=0;
 files().forEach(function(f){f.chunks.forEach(function(c,i){var w=words(c),tf={};w.forEach(function(x){tf[x]=(tf[x]||0)+1});Object.keys(tf).forEach(function(x){df[x]=(df[x]||0)+1});docs.push({file:f.name,n:i+1,text:c,tf:tf,len:w.length||1});tl+=w.length||1})});
 idx={docs:docs,df:df,avg:docs.length?tl/docs.length:1};return idx}
function search(q,limit){var I=buildIdx(),qw=words(q),seen={};qw=qw.filter(function(w){return seen[w]?0:(seen[w]=1)});
 if(!qw.length||!I.docs.length)return [];var N=I.docs.length,res=[];
 I.docs.forEach(function(d){var s=0;qw.forEach(function(w){var f=d.tf[w];if(!f)return;var n=I.df[w]||0,idf=Math.log(1+(N-n+.5)/(n+.5));s+=idf*(f*2.2)/(f+1.2*(.25+.75*d.len/I.avg))});if(s>0)res.push({file:d.file,n:d.n,text:d.text,score:s})});
 res.sort(function(a,b){return b.score-a.score});if(!res.length)return [];
 var top=res[0].score;return res.filter(function(r){return r.score>=top*.4}).slice(0,limit||3)}
function budgetFor(b){var l=null;try{l=B().limit(b)}catch(e){}return l?Math.min(1400,Math.floor(l*.15)):1400}
window.wbFiles={
 list:files,search:search,
 context:function(q,b){window.__wbFilesUsed=[];var hits=search(q,4);if(!hits.length)return '';
  var left=budgetFor(b),used=[],lines=[];
  hits.forEach(function(h){var t=h.text,c=tok(t)+12;if(c>left){if(left<90)return;t=t.slice(0,Math.max(120,(left-12)*4)).trim()+'…';c=left}left-=c;used.push({file:h.file,n:h.n,text:h.text});lines.push((used.length)+'. '+h.file+' (part '+h.n+'): '+t)});
  window.__wbFilesUsed=used;if(!used.length)return '';
  return '\n\n[WORKBENCH MY FILES — passages from files the user added; use them when relevant and name the file you used]\n'+lines.join('\n')+'\n[/WORKBENCH MY FILES]'},
 total:function(){return files().reduce(function(a,f){return a+f.size},0)}};
function addFile(name,text){
 text=String(text);if(text.length>MAXFILE)return 'too big ('+Math.round(text.length/1000)+' KB; limit '+Math.round(MAXFILE/1000)+' KB)';
 if(/\u0000/.test(text.slice(0,2000)))return 'not a text file';
 var ch=chunkText(text);if(!ch.length)return 'empty';
 var a=files().filter(function(f){return f.name!==name});
 var tot=a.reduce(function(s,f){return s+f.size},0)+text.length;if(tot>MAXTOT)return 'would pass the '+Math.round(MAXTOT/1000)+' KB total limit - remove a file first';
 a.unshift({id:'f_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:name,size:text.length,addedAt:Date.now(),chunks:ch});
 if(!sv(FK,a))return 'browser storage is full';
 var st=ld(FSTAT,{added:0});st.added=(st.added||0)+1;sv(FSTAT,st);idx=null;return ''}
(function buildFilesUI(){
 var card=document.getElementById('assistant-memory-card');if(!card)return;
 var d=document.createElement('details');d.id='wb-myfiles-card';
 d.innerHTML='<summary>📁 My files <span id="wb-myfiles-count" class="wb44-mu"></span></summary><div id="wb-myfiles-drop">Drop a .txt or .md file here<br><small>Matching passages are added to your questions automatically, with the source shown. Stays in this browser.</small></div><div id="wb-myfiles-list"></div><small id="wb-myfiles-msg" class="wb44-mu"></small>';
 var hd=card.querySelector('.alm-head');if(hd)hd.insertAdjacentElement('afterend',d);else card.appendChild(d);
 var inp=document.createElement('input');inp.type='file';inp.multiple=true;inp.accept='.txt,.md,.markdown,.csv,.json,.log,text/plain,text/markdown';inp.style.display='none';d.appendChild(inp);
 var drop=d.querySelector('#wb-myfiles-drop'),list=d.querySelector('#wb-myfiles-list'),msg=d.querySelector('#wb-myfiles-msg'),cnt=d.querySelector('#wb-myfiles-count');
 var pick=el('button','wb53-mini','Choose files');pick.type='button';pick.onclick=function(){inp.click()};drop.appendChild(document.createElement('br'));drop.appendChild(pick);
 function draw(){var a=files();var pc=a.reduce(function(s,f){return s+f.chunks.length},0);cnt.textContent=a.length?'· '+a.length+' file'+(a.length>1?'s':'')+' · '+pc+' passage'+(pc===1?'':'s'):'';list.innerHTML='';
  a.forEach(function(f){var r=el('div','wb53-frow'),n=el('span',null,f.name);n.title=f.name;var s=el('small',null,f.chunks.length+' passage'+(f.chunks.length>1?'s':'')+' · '+Math.max(1,Math.round(f.size/1000))+' KB'),x=el('button','wb53-mini','Remove');x.type='button';x.onclick=function(){sv(FK,files().filter(function(z){return z.id!==f.id}));idx=null;draw()};r.appendChild(n);r.appendChild(s);r.appendChild(x);list.appendChild(r)});
  if(a.length>1){var c=el('button','wb53-mini','Remove all');c.type='button';c.style.marginTop='4px';c.onclick=function(){if(confirm('Remove all '+a.length+' files from the Assistant?')){sv(FK,[]);idx=null;draw()}};list.appendChild(c)}}
 function take(fl){var arr=[].slice.call(fl||[]),notes=[],left=arr.length;if(!left)return;
  arr.forEach(function(f){var r=new FileReader();r.onload=function(){var e=addFile(f.name,r.result);notes.push(e?'✗ '+f.name+': '+e:'✓ '+f.name);if(--left===0){msg.textContent=notes.join(' · ');draw()}};r.onerror=function(){notes.push('✗ '+f.name+': could not be read');if(--left===0){msg.textContent=notes.join(' · ');draw()}};r.readAsText(f)})}
 inp.onchange=function(){take(inp.files);inp.value=''};
 ['dragenter','dragover'].forEach(function(n){card.addEventListener(n,function(e){if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],'Files')>=0){e.preventDefault();d.open=true;drop.classList.add('over')}})});
 ['dragleave','drop'].forEach(function(n){card.addEventListener(n,function(){drop.classList.remove('over')})});
 card.addEventListener('drop',function(e){if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length){e.preventDefault();take(e.dataTransfer.files)}});
 draw();window.wbFiles.redraw=draw;
})();
/* show the source under each reply that used a file */
(function(){var prev=window.wbAfterReply;
 window.wbAfterReply=function(re,text){try{if(prev)prev(re,text)}catch(e){}
  try{var u=window.__wbFilesUsed||[];document.querySelectorAll('.wb53-src').forEach(function(x){x.remove()});if(!u.length)return;var r=re.textContent||'';if(!r||r==='...'||/^Something went wrong/.test(r))return;
   var seen={},t=u.map(function(h){return h.file+' (part '+h.n+')'}).filter(function(x){return seen[x]?0:(seen[x]=1)});
   var line=el('small','wb53-src','📁 From your files: '+t.join(' · '));var a=re.nextElementSibling;(a&&a.classList.contains('wb44-mem')?a:re).insertAdjacentElement('afterend',line)}catch(e){}}})();

/* ================= Idea 7: auto-summary of older turns ================= */
var S={lines:[],turns:0,text:''},SCOUNT='wb-summary-count';
function sBudget(limit){return Math.max(160,Math.floor(limit*.12))}
function sRender(flash){var log=document.getElementById('chat-log'),b=document.getElementById('wb-pinned-summary');if(!log)return;
 if(!S.text){if(b)b.remove();return}
 if(!b){b=document.createElement('div');b.id='wb-pinned-summary'}
 b.innerHTML='';b.appendChild(el('b',null,'📌 Pinned summary · '+S.turns+' earlier messages condensed'));
 var p=el('pre',null,S.text);b.appendChild(p);
 var x=el('button','wb53-mini','Forget summary');x.type='button';x.style.marginTop='4px';x.onclick=function(){window.wbSummary.reset();try{B().refreshContext()}catch(e){}};b.appendChild(x);
 if(log.firstChild!==b)log.insertBefore(b,log.firstChild);
 if(flash){b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash')}}
function sFit(limit){var cap=sBudget(limit),lines=S.lines;
 function t(){return tok(lines.join('\n'))}
 if(t()>cap){lines=lines.map(function(l,i){return i>=lines.length-6?l:gist(l,90)})}
 var dropped=0;while(t()>cap&&lines.length>4){lines=lines.slice(1);dropped++}
 if(dropped)lines=['(…'+dropped+' even older lines dropped to keep room)'].concat(lines.filter(function(l){return l.indexOf('(…')!==0}));
 S.lines=lines;S.text=lines.join('\n')}
window.wbSummary={
 tokens:function(){return S.text?tok(this.context()):0},
 context:function(){return S.text?'\n\n[CONVERSATION SUMMARY — earlier messages in this chat, condensed to save room; treat as accurate background]\n'+S.text+'\n[/CONVERSATION SUMMARY]':''},
 reset:function(){S={lines:[],turns:0,text:''};sRender(false)},
 active:function(){return !!S.text},
 compact:function(hist,backend,reserve){
  var limit=null;try{limit=B().limit(backend)}catch(e){}if(!limit||!hist||hist.length<6)return false;
  var used=hist.reduce(function(a,h){return a+tok(h.content)},0)+this.tokens()+(reserve||0);
  if(used<=limit*.75)return false;
  var keep=4;if(hist.slice(-keep).reduce(function(a,h){return a+tok(h.content)},0)>limit*.4)keep=2;
  var cut=hist.length-keep;while(cut<hist.length-1&&hist[cut].role!=='user')cut++;
  if(cut<2)return false;
  var old=hist.splice(0,cut);
  old.forEach(function(h){S.lines.push(h.role==='user'?'You: '+gist(h.content,140):'Assistant: '+gist(h.content,200))});
  S.turns+=old.length;sFit(limit);
  var c=ld(SCOUNT,0)||0;sv(SCOUNT,c+1);
  sRender(true);try{B().refreshContext()}catch(e){}return true}};

/* ================= Idea 8: weak-topic hub ================= */
var WK='wb-weak-v1',WEEK=7*864e5;
function wl(){var o=ld(WK,{items:{},mastered:0});if(!o.items)o.items={};return o}
function wsave(o){var ks=Object.keys(o.items);if(ks.length>300){ks.sort(function(a,b){return (o.items[a].last||0)-(o.items[b].last||0)}).slice(0,ks.length-300).forEach(function(k){delete o.items[k]})}sv(WK,o)}
function wkey(s,q){return s+'|'+String(q).slice(0,200)}
window.wbWeak={
 log:function(src,q,a){if(!q)return;var o=wl(),k=wkey(src,q),it=o.items[k]||{src:src,q:String(q).slice(0,200),miss:[]};it.a=String(a==null?'':a).slice(0,300);it.miss.push(Date.now());it.miss=it.miss.slice(-20);it.streak=0;it.done=0;it.last=Date.now();o.items[k]=it;wsave(o);wRender()},
 ok:function(src,q){var o=wl(),it=o.items[wkey(src,q)];if(!it||it.done)return;it.streak=(it.streak||0)+1;if(it.streak>=2){it.done=Date.now();o.mastered=(o.mastered||0)+1}it.last=Date.now();wsave(o);wRender()},
 focus:function(){var o=wl(),cut=Date.now()-WEEK,a=[];Object.keys(o.items).forEach(function(k){var it=o.items[k];if(it.done)return;var m=it.miss.filter(function(t){return t>=cut}).length;if(m)a.push({k:k,src:it.src,q:it.q,a:it.a,n:m,streak:it.streak||0,last:it.last||0})});a.sort(function(x,y){return y.n-x.n||y.last-x.last});return a},
 mastered:function(){return wl().mastered||0}};
var wBox=el('div'),wArea=el('div');wBox.id='wb-weekly-focus';
function wRender(){var f=window.wbWeak.focus();wBox.innerHTML='';
 wBox.appendChild(el('h3',null,'🎯 Weekly focus'+(f.length?' — '+f.length+' to review':'')));
 if(!f.length){wBox.appendChild(el('p','wb44-mu','Nothing missed this week. Wrong answers from flashcards, the notes quiz, Spanish, Algebra and Type Rush will collect here.'));wBox.appendChild(wArea);return}
 wBox.appendChild(el('p','wb44-mu','Your most-missed items from the last 7 days. Get one right twice in a row (here or in its game) and it leaves the list.'));
 f.slice(0,5).forEach(function(i){var r=el('div','wb53-wrow');r.appendChild(el('span','wb53-chip',i.src));var q=el('b',null,i.q);q.title=i.q;r.appendChild(q);r.appendChild(el('small','wb44-mu','×'+i.n+(i.streak?' · ✓1/2':'')));wBox.appendChild(r)});
 if(f.length>5)wBox.appendChild(el('small','wb44-mu','+ '+(f.length-5)+' more'));
 var row=el('div','wb44-row');row.appendChild(btn('Practice now',function(){practice(f.slice(0,5))}));
 row.appendChild(btn('Clear list',function(){if(!confirm('Clear this week\'s focus list?'))return;var o=wl();Object.keys(o.items).forEach(function(k){o.items[k].miss=[];o.items[k].done=o.items[k].done||Date.now()});sv(WK,o);wRender()},'ghost'));
 wBox.appendChild(row);wBox.appendChild(wArea)}
function practice(q){var i=0,got=0,keep=0;wArea.innerHTML='';
 function next(){wArea.innerHTML='';if(i>=q.length){wArea.appendChild(el('p','wb44-q','Practiced '+q.length+' · got '+got+' · '+keep+' still to work on'));setTimeout(function(){wArea.innerHTML='';wRender()},4500);return}
  var it=q[i],box=el('div','wb44-q',it.q),ans=el('div','wb44-a',it.a||'(no stored answer)');ans.style.display='none';var row=el('div','wb44-row');
  var show=btn('Show answer',function(){ans.style.display='block';row.innerHTML='';
   row.appendChild(btn('Got it ✓',function(){got++;i++;window.wbWeak.ok(it.src,it.q);next()}));
   row.appendChild(btn('Missed ✗',function(){keep++;i++;window.wbWeak.log(it.src,it.q,it.a);next()},'bad'))});
  row.appendChild(show);wArea.appendChild(el('small','wb44-mu','Item '+(i+1)+' of '+q.length+' · '+it.src));wArea.appendChild(box);wArea.appendChild(ans);wArea.appendChild(row)}
 next()}
(function(){var hero=document.querySelector('#tab-start .start-hero');if(!hero)return;var after=document.querySelector('#tab-start .wb44-card')||hero;after.insertAdjacentElement('afterend',wBox);wRender()})();

/* ================= Idea 9: cross-area badges ================= */
var BK='wb-badges-v1',STK='wb-streak-v1';
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dayDiff(a,b){var p=function(s){var x=s.split('-');return new Date(+x[0],+x[1]-1,+x[2],12)};return Math.round((p(b)-p(a))/864e5)}
function streakTick(){var s=ld(STK,{last:'',n:0,best:0}),t=today();if(s.last!==t){var g=s.last?dayDiff(s.last,t):0;s.n=(g===1)?(s.n||0)+1:1;s.last=t;s.best=Math.max(s.best||0,s.n);sv(STK,s)}var e=document.getElementById('as-streak');if(e)e.textContent=s.n;return s}
function cards(){return ld('wb-flashcards',[]).length}
function notes(){return ld('wb-study-notes',[]).length}
function srsReps(){var o=ld('wb-srs-v1',{}),n=0;Object.keys(o).forEach(function(k){n+=o[k].reps||0});return n}
function arcCount(){try{return Object.keys(wbProfile.achievements||{}).length}catch(e){return 0}}
function played(){try{return wbProfile.gamesPlayed||0}catch(e){return 0}}
function owned(){return (ld('wb-shop-v1',{owned:[]}).owned||[]).length}
function f1h(){var h=ld('wb-f1-coach',[]);return Array.isArray(h)?h:[]}
function maxv(k,v){var o=+localStorage.getItem(k)||0;if(v>o){try{localStorage.setItem(k,v)}catch(e){}return v}return o}
function infDay(){var m=+localStorage.getItem('wb-inf-day')||0;try{if(wbInf&&wbInf.on&&typeof legacyDay==='number'){var f=legacyFactions.find(function(x){return x.isPlayer}),c=f&&f.castle;if(!c||c.alive!==false)m=maxv('wb-inf-day',legacyDay-1)}}catch(e){}return m}
function defMax(){var m=+localStorage.getItem('wb-bw-maxdefs')||0;try{if(window.wbDefs)m=maxv('wb-bw-maxdefs',window.wbDefs.length)}catch(e){}return m}
var BADGES=[
 {id:'day10',area:'Block World',icon:'🌄',name:'Day 10 Survivor',desc:'Survive Day 10 in Infinite (the first zombie night)',coins:20,p:function(){return [infDay(),10]}},
 {id:'day15',area:'Block World',icon:'🏰',name:'Day 15 Survivor',desc:'Survive Day 15 in Infinite',coins:30,p:function(){return [infDay(),15]}},
 {id:'day25',area:'Block World',icon:'👑',name:'Day 25 Survivor',desc:'Survive Day 25 in Infinite',coins:60,p:function(){return [infDay(),25]}},
 {id:'wave5',area:'Block World',icon:'⚔️',name:'Night Shift',desc:'Survive wave 5 (best wave on your report card)',coins:15,p:function(){return [+localStorage.getItem('wb-inf-best')||0,5]}},
 {id:'defs5',area:'Block World',icon:'🧱',name:'Fortifier',desc:'Have 5 walls, towers or torches standing at once',coins:10,p:function(){return [defMax(),5]}},
 {id:'cards10',area:'Study',icon:'🗂️',name:'Deck Builder',desc:'Have 10 flashcards',coins:10,p:function(){return [cards(),10]}},
 {id:'notes5',area:'Study',icon:'📝',name:'Note Taker',desc:'Save 5 study notes',coins:10,p:function(){return [notes(),5]}},
 {id:'srs50',area:'Study',icon:'🔁',name:'Spaced Scholar',desc:'Pass 50 spaced-review answers in total',coins:20,p:function(){return [srsReps(),50]}},
 {id:'weak5',area:'Study',icon:'🎯',name:'Fixer-Upper',desc:'Clear 5 items from your Weekly focus list',coins:25,p:function(){return [window.wbWeak.mastered(),5]}},
 {id:'file1',area:'Assistant',icon:'📁',name:'Bookworm',desc:'Add your first file to the Assistant',coins:5,p:function(){return [(ld(FSTAT,{added:0}).added||0),1]}},
 {id:'sum1',area:'Assistant',icon:'📌',name:'Long Memory',desc:'Let the Assistant summarize a long chat',coins:10,p:function(){return [ld(SCOUNT,0)||0,1]}},
 {id:'arc10',area:'Arcade',icon:'🏅',name:'Cabinet Champion',desc:'Unlock 10 Arcade achievements',coins:20,p:function(){return [arcCount(),10]}},
 {id:'play25',area:'Arcade',icon:'🎮',name:'Regular',desc:'Play 25 arcade games',coins:15,p:function(){return [played(),25]}},
 {id:'f1lap5',area:'F1',icon:'🏎️',name:'Coachable',desc:'Finish 5 laps with the corner coach',coins:15,p:function(){return [f1h().length,5]}},
 {id:'f1calm',area:'F1',icon:'🧘',name:'Calm Hands',desc:'Steer within the first third of the warning for a whole lap',coins:25,p:function(){return [f1h().some(function(x){return x<=.34})?1:0,1]}},
 {id:'str3',area:'General',icon:'🔥',name:'3-Day Streak',desc:'Open Workbench 3 days in a row',coins:10,p:function(){return [ld(STK,{}).best||0,3]}},
 {id:'str7',area:'General',icon:'📆',name:'Week Warrior',desc:'Open Workbench 7 days in a row',coins:30,p:function(){return [ld(STK,{}).best||0,7]}},
 {id:'str30',area:'General',icon:'🌟',name:'Month of Mastery',desc:'Open Workbench 30 days in a row',coins:150,p:function(){return [ld(STK,{}).best||0,30]}},
 {id:'shop1',area:'General',icon:'🛍️',name:'First Purchase',desc:'Buy something in the coin shop',coins:5,p:function(){return [owned(),1]}},
 {id:'round',area:'General',icon:'🌐',name:'All-Rounder',desc:'Earn a badge in 4 different areas',coins:40,p:function(){var u=ld(BK,{u:{}}).u||{},a={};BADGES.forEach(function(b){if(u[b.id]&&b.id!=='round')a[b.area]=1});return [Object.keys(a).length,4]}}
];
function bstate(){var o=ld(BK,{u:{},paid:0});if(!o.u)o.u={};return o}
function addCoins(n){try{wbProfile.coins=(wbProfile.coins||0)+n;try{wbSaveProfile()}catch(e){}var c=document.getElementById('coin-count');if(c)c.textContent=wbProfile.coins}catch(e){}}
var toast=document.createElement('div');toast.id='wb-badge-toast';document.body.appendChild(toast);var tq=[],tb=false;
function showToast(h){tq.push(h);if(!tb)nextToast()}
function nextToast(){var h=tq.shift();if(!h){tb=false;toast.style.display='none';return}tb=true;toast.textContent=h;toast.style.display='block';setTimeout(nextToast,3600)}
var drawBadges=function(){};
function evalBadges(){var o=bstate(),fresh=[];
 BADGES.forEach(function(b){if(o.u[b.id])return;var p;try{p=b.p()}catch(e){return}if(p&&p[0]>=p[1]){o.u[b.id]=Date.now();o.paid=(o.paid||0)+b.coins;fresh.push(b)}});
 if(fresh.length){sv(BK,o);fresh.forEach(function(b){addCoins(b.coins)});try{if(window.WB_SOUND)window.WB_SOUND.win()}catch(e){}
  if(fresh.length<=3)fresh.forEach(function(b){showToast('🏆 Badge unlocked: '+b.icon+' '+b.name+' · +'+b.coins+' 🪙')});else showToast('🏆 '+fresh.length+' badges unlocked · +'+fresh.reduce(function(a,b){return a+b.coins},0)+' 🪙');
  evalBadges()}
 drawBadges()}
(function(){var left=document.querySelector('#tab-data .user-left')||document.querySelector('#tab-data .data-wrap');if(!left)return;
 var c=el('div','data-card');c.id='wb-badges-card';c.style.maxWidth='none';var h=el('h3',null,'🏅 Badges'),sum=el('p','wb44-mu',''),grid=el('div');grid.id='wb-badge-grid';c.appendChild(h);c.appendChild(sum);c.appendChild(grid);
 var first=left.querySelector('.data-card');if(first)first.insertAdjacentElement('afterend',c);else left.appendChild(c);
 drawBadges=function(){var o=bstate(),n=0;grid.innerHTML='';var st=ld(STK,{n:0,best:0});
  BADGES.forEach(function(b){var on=!!o.u[b.id];if(on)n++;var p=[0,1];try{p=b.p()}catch(e){}var d=el('div','wb53-badge'+(on?'':' off'));d.title=b.desc+(on?' — unlocked '+new Date(o.u[b.id]).toLocaleDateString():'');
   d.appendChild(el('div','i',b.icon));d.appendChild(el('b',null,b.name));d.appendChild(el('span',null,b.desc));var r=el('div');r.appendChild(el('em',null,on?'✓ +'+b.coins+' 🪙 paid':'Reward 🪙'+b.coins));d.appendChild(r);
   if(!on){var bar=el('div','wb53-bar'),f=document.createElement('i');f.style.width=Math.round(100*Math.min(1,p[0]/p[1]))+'%';bar.appendChild(f);d.appendChild(bar);d.appendChild(el('small','wb44-mu',Math.min(p[0],p[1])+' / '+p[1]))}
   grid.appendChild(d)});
  sum.textContent=n+' / '+BADGES.length+' unlocked · 🪙 '+(o.paid||0)+' earned from badges · 🔥 streak '+(st.n||0)+' day'+((st.n||0)===1?'':'s')+' (best '+(st.best||0)+')'};
})();
streakTick();evalBadges();
setInterval(function(){streakTick();evalBadges()},4000);
document.querySelectorAll('.tabbtn').forEach(function(b){b.addEventListener('click',function(){setTimeout(function(){wRender();evalBadges()},60)})});
window.wbBadges={list:BADGES,state:bstate,eval:evalBadges,streak:function(){return ld(STK,{})}};
})();
