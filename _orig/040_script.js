
(function(){
  var b=document.getElementById('assistant-gate-back');
  if(!b) return;
  b.addEventListener('click',function(){
    var t=document.querySelector('.tabbtn[data-target="tab-start"]');
    if(t) t.click();
  });
})();
