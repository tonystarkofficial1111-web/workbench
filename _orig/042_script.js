
(function(){
var SK='wb-srs-v1',DAY=864e5;
function ld(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function cards(){return ld('wb-flashcards',[])}
function cid(c){return c.front+'\u0001'+c.back}
function eod(){var d=new Date();d.setHours(23,59,59,999);return d.getTime()}
function dueList(){var s=ld(SK,{}),e=eod();return cards().filter(function(c){var r=s[cid(c)];return !r||r.due<=e}).sort(function(a,b){return ((s[cid(a)]||{due:0}).due)-((s[cid(b)]||{due:0}).due)})}
function rate(c,q){var s=ld(SK,{}),k=cid(c),r=s[k]||{ivl:0,ease:2.5,reps:0,lapses:0};
 if(q==='again'){try{window.wbWeak&&window.wbWeak.log('Flashcards',c.front,c.back)}catch(e){}r.lapses++;r.ease=Math.max(1.3,r.ease-.2);r.ivl=0;r.reps=0;r.due=Date.now()+6e5}
 else{try{window.wbWeak&&window.wbWeak.ok('Flashcards',c.front)}catch(e){}r.reps++;if(q==='easy'){r.ivl=Math.max(4,Math.round(Math.max(r.ivl,1)*r.ease*1.5));r.ease+=.1}else{r.ivl=r.ivl<1?1:Math.max(r.ivl+1,Math.round(r.ivl*r.ease))}r.due=Date.now()+r.ivl*DAY}
 s[k]=r;try{localStorage.setItem(SK,JSON.stringify(s))}catch(e){}}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function btn(x,f,c){var b=el('button','wb44-btn'+(c?' '+c:''),x);b.type='button';b.onclick=f;return b}
var startBox=el('div','wb44-card'),startTxt=el('span'),hero=document.querySelector('#tab-start .start-hero');
startBox.appendChild(startTxt);
startBox.appendChild(btn('Review now',function(){var t=document.querySelector('.tabbtn[data-target="tab-edu"]');if(t)t.click();setTimeout(function(){var c=document.querySelector('.edu-cab[data-eduw="memory"]')||document.querySelector('.edu-work-tab[data-eduw="memory"]');if(c)c.click();var s=document.getElementById('wb44-go');if(s)s.click()},120)}));
if(hero)hero.insertAdjacentElement('afterend',startBox);
var sec=el('div','wb44-sec'),head=el('h3',null,''),area=el('div'),quiz=el('div','wb44-sec');
var panel=document.getElementById('edu-memory');
function refresh(){var n=dueList().length;startTxt.textContent='📚 Flashcards due today: '+n;head.textContent='🔁 Spaced review — '+n+' due today';if(go)go.disabled=!n}
var go=btn('Start review',startReview);go.id='wb44-go';
sec.appendChild(head);sec.appendChild(el('p','wb44-mu','Missed cards return in 10 minutes; cards you know are pushed days out.'));sec.appendChild(go);sec.appendChild(area);
function startReview(){var q=dueList(),again={};area.innerHTML='';function next(){area.innerHTML='';if(!q.length){area.appendChild(el('p','wb44-mu','✅ All caught up for today.'));refresh();return}
 var c=q.shift(),box=el('div','wb44-q',c.front),ans=el('div','wb44-a',c.back);ans.style.display='none';
 var row=el('div','wb44-row');
 var show=btn('Show answer',function(){ans.style.display='block';row.innerHTML='';
  row.appendChild(btn('Again',function(){rate(c,'again');if(!again[cid(c)]){again[cid(c)]=1;q.push(c)}next()},'bad'));
  row.appendChild(btn('Good',function(){rate(c,'good');next()}));
  row.appendChild(btn('Easy',function(){rate(c,'easy');next()}))});
 row.appendChild(show);area.appendChild(el('small','wb44-mu',q.length+' left after this'));area.appendChild(box);area.appendChild(ans);area.appendChild(row)}
 next()}
var STOP='about which their there these those would could should because between during through where while after before other another being having without within against'.split(' ');
function pool(){var out=[];(window.wbEdu?window.wbEdu.notes():[]).forEach(function(n){((n.title?n.title+'. ':'')+(n.body||'')).split(/[.!?]+\s+|\n+/).forEach(function(s){s=s.replace(/^[\s\-*#>\d.)]+/,'').trim();if(s.length<30||s.length>220||s.split(/\s+/).length<5)return;var w=(s.match(/[A-Za-z][A-Za-z'-]{4,}/g)||[]).filter(function(x){return STOP.indexOf(x.toLowerCase())<0});if(!w.length)return;w.sort(function(a,b){return b.length-a.length});out.push({s:s,a:w[0]})})});return out}
function shuf(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
var qa=el('div');quiz.appendChild(el('h3',null,'📝 Quiz from your study notes'));quiz.appendChild(el('p','wb44-mu','Builds fill-in-the-blank questions from your saved notes. Wrong answers are added to your flashcards.'));
quiz.appendChild(btn('Make a 5-question quiz',startQuiz));quiz.appendChild(qa);
function startQuiz(){var p=pool(),seen={},ans=[];p.forEach(function(x){var k=x.a.toLowerCase();if(!seen[k]){seen[k]=1;ans.push(x.a)}});
 qa.innerHTML='';if(p.length<2||ans.length<4){qa.appendChild(el('p','wb44-mu','Not enough note text yet — write a few full sentences in Study Notes first.'));return}
 var used={},qs=[];shuf(p).forEach(function(x){var k=x.a.toLowerCase();if(qs.length<5&&!used[k]){used[k]=1;qs.push(x)}});
 var i=0,score=0;function show(){qa.innerHTML='';if(i>=qs.length){qa.appendChild(el('p','wb44-q','Score: '+score+' / '+qs.length));return}
  var x=qs[i],q=x.s.replace(new RegExp('\\b'+x.a+'\\b'),'_____'),ds=shuf(ans.filter(function(a){return a.toLowerCase()!==x.a.toLowerCase()})).slice(0,3),opts=shuf(ds.concat([x.a]));
  qa.appendChild(el('small','wb44-mu','Question '+(i+1)+' of '+qs.length));qa.appendChild(el('div','wb44-q',q));var fb=el('p','wb44-mu','');
  opts.forEach(function(o){var b=btn(o,function(){var all=qa.querySelectorAll('.wb44-opt');all.forEach(function(z){z.disabled=true;if(z.textContent===x.a)z.classList.add('ok')});
   if(o===x.a){score++;fb.textContent='✅ Correct';try{window.wbWeak&&window.wbWeak.ok('Notes quiz',q)}catch(e){}}else{try{window.wbWeak&&window.wbWeak.log('Notes quiz',q,x.a)}catch(e){}b.classList.add('bad');var f='Fill in the blank: '+q,dup=cards().some(function(c){return c.front===f});if(!dup&&window.wbEdu)window.wbEdu.addCard(f,x.a);fb.textContent='❌ It was “'+x.a+'”. Added to your flashcards.'}
   qa.appendChild(btn(i+1<qs.length?'Next':'Finish',function(){i++;show()}))},'wb44-opt');qa.appendChild(b)});qa.appendChild(fb)}
 show()}
if(panel){panel.appendChild(sec);panel.appendChild(quiz)}
var deck=document.getElementById('fc-deck');if(deck)new MutationObserver(refresh).observe(deck,{childList:true});
document.querySelectorAll('.tabbtn').forEach(function(b){b.addEventListener('click',function(){setTimeout(refresh,50)})});
refresh();
/* Assistant: show memories used + offer to save the exchange */
window.wbAfterReply=function(re,text){try{var r=re.textContent||'';if(!r||r==='...'||/^Something went wrong/.test(r))return;
 document.querySelectorAll('.wb44-suggest').forEach(function(x){x.remove()});
 var u=(window.__wbMemUsed||[]).map(function(m){return m.title||'Untitled'}),line=el('div','wb44-mem',u.length?'🧠 Memories used ('+u.length+'): '+u.join(' · '):'🧠 No saved memories matched this reply');re.insertAdjacentElement('afterend',line);
 if(r.length<60)return;var s=el('div','wb44-suggest');s.appendChild(el('span',null,'Save this exchange? '));
 function done(m){s.textContent=m}
 s.appendChild(btn('Project Rule',function(){done(window.wbBridge&&window.wbBridge.addMemory(text.slice(0,60),'Project Rule','User: '+text+'\nAssistant: '+r,function(){s.textContent='Saved as a Project Rule ✓'},function(){s.textContent='Not saved (code not entered)'})?'Enter the code to save…':'Could not save')}));
 s.appendChild(btn('Note',function(){if(window.wbEdu){window.wbEdu.addNote(text.slice(0,60),r);done('Saved to Study Notes ✓')}}));
 s.appendChild(btn('Dismiss',function(){s.remove()},'ghost'));line.insertAdjacentElement('afterend',s)}catch(e){}};
})();
