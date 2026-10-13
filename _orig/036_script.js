
(function(){
  var selKey=null;
  function keyOf(el){ return el.getAttribute('data-eduw')||el.getAttribute('data-lab')||''; }
  function apply(){
    var r=document.getElementById('tab-edu'); if(!r) return;
    var cabs=r.querySelectorAll('.edu-cab'); if(!cabs.length||!selKey) return;
    var title='';
    Array.prototype.forEach.call(cabs,function(c){
      var on=keyOf(c)===selKey; c.classList.toggle('edu-selected',on); c.setAttribute('aria-pressed',on?'true':'false');
      if(on){ var t=c.querySelector('.edu-cab-title'); title=t?t.textContent:''; }
    });
    var hint=r.querySelector('.edu-cabinet-hint b');
    if(hint&&title){ var txt='Selected: '+title; if(hint.textContent!==txt) hint.textContent=txt; }
  }
  document.addEventListener('click',function(e){
    var c=e.target&&e.target.closest?e.target.closest('#tab-edu .edu-cab'):null; if(!c) return;
    var k=keyOf(c); if(!k) return; selKey=k; apply();
  },true);
  function init(){
    if(!selKey){ var t=document.querySelector('#tab-edu .edu-work-tab.active'); selKey=t?t.getAttribute('data-eduw'):null; }
    apply();
    var r=document.getElementById('tab-edu');
    if(r&&window.MutationObserver){ new MutationObserver(function(){ if(selKey&&!r.querySelector('.edu-cab.edu-selected')) apply(); }).observe(r,{childList:true,subtree:true}); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,600); setTimeout(apply,2000);
})();
