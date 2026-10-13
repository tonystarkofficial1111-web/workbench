
(function(){
  function init(){
    var badge=document.getElementById('version-badge'), menu=document.getElementById('screensaver-menu'), en=document.getElementById('ss-enabled'), sel=document.getElementById('ss-delay');
    if(!badge||!menu||!en||!sel)return;
    badge.addEventListener('click',function(e){ if(e.target.closest('#screensaver-menu')) return; badge.classList.toggle('menu-open'); badge.setAttribute('aria-expanded',badge.classList.contains('menu-open')?'true':'false'); menu.setAttribute('aria-hidden',badge.classList.contains('menu-open')?'false':'true'); });
    badge.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();badge.click();} if(e.key==='Escape'){badge.classList.remove('menu-open');badge.setAttribute('aria-expanded','false');menu.setAttribute('aria-hidden','true');} });
    en.addEventListener('change',function(){ if(window.wbScreensaver) window.wbScreensaver.setEnabled(en.checked); });
    var armedBtn=null, armTimer=null;
    function disarm(){ if(armTimer){clearTimeout(armTimer);armTimer=null;} if(armedBtn){ var sp=armedBtn.querySelector('span'), em=armedBtn.querySelector('em'); if(armedBtn._o){ sp.textContent=armedBtn._o.s; em.textContent=armedBtn._o.e; } armedBtn.classList.remove('armed'); armedBtn=null; } }
    function closeMenu(){ badge.classList.remove('menu-open'); badge.setAttribute('aria-expanded','false'); menu.setAttribute('aria-hidden','true'); }
    Array.prototype.forEach.call(menu.querySelectorAll('.ss-clip'),function(btn){ btn.addEventListener('click',function(e){
      e.stopPropagation(); var ss=window.wbScreensaver; if(!ss) return; var name=btn.getAttribute('data-clip');
      if(ss.getClip()!==name){ disarm(); ss.setClip(name); return; }            /* click 1: select */
      if(armedBtn===btn){ disarm(); closeMenu(); ss.preview(); return; }          /* click 3: play now, skipping the timer */
      disarm(); var sp=btn.querySelector('span'), em=btn.querySelector('em');     /* click 2: ask */
      btn._o={s:sp.textContent,e:em.textContent}; sp.textContent='Play Screensaver?'; em.textContent='click to confirm'; btn.classList.add('armed'); armedBtn=btn;
      armTimer=setTimeout(disarm,6000);
    }); });
    document.addEventListener('click',function(e){ if(!badge.contains(e.target)) disarm(); });
    sel.addEventListener('change',function(){ if(window.wbScreensaver) window.wbScreensaver.setDelay(sel.value); });
    document.addEventListener('click',function(e){ if(!badge.contains(e.target)){badge.classList.remove('menu-open');badge.setAttribute('aria-expanded','false');menu.setAttribute('aria-hidden','true');} });
    if(window.wbScreensaver) window.wbScreensaver.sync(); else setTimeout(function(){if(window.wbScreensaver)window.wbScreensaver.sync()},200);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
