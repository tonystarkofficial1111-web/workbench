
(function(){
  'use strict';
  function randomizeArcadeLogoAngles(){
    document.querySelectorAll('#tab-arcade .arcade-logo').forEach(function(el){
      if(!el.dataset.logoRot){ el.dataset.logoRot=(Math.random()*40-20).toFixed(2)+'deg'; }
      el.style.setProperty('--logo-rot',el.dataset.logoRot);
    });
  }
  function setEnv(){
    randomizeArcadeLogoAngles();
    var active=document.querySelector('.tabbtn.active');
    var target=active?active.getAttribute('data-target'):'';
    document.body.classList.remove('wb-tab-start','wb-tab-arcade','wb-tab-ai','wb-tab-data','wb-tab-dev','wb-arcade-games','wb-arcade-cars');
    if(target==='tab-start') document.body.classList.add('wb-tab-start');
    if(target==='tab-arcade'){
      document.body.classList.add('wb-tab-arcade');
      var sub=document.querySelector('#tab-arcade .arcade-subtabs .subtab.active');
      var which=sub?sub.getAttribute('data-sub'):'games';
      document.body.classList.add('wb-arcade-'+(which==='cars'?'cars':'games'));
    }
    if(target==='tab-ai') document.body.classList.add('wb-tab-ai');
    if(target==='tab-data') document.body.classList.add('wb-tab-data');
    if(target==='tab-dev') document.body.classList.add('wb-tab-dev');
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('.tabbtn') || e.target.closest('#tab-arcade .subtab')) window.setTimeout(setEnv,20);
  });
  window.setTimeout(setEnv,80);
  window.addEventListener('load',setEnv);
})();
