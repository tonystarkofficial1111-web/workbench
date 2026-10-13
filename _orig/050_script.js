
(function(){
var w=document.getElementById('gamecanvas').parentNode;
function col(id,ids){var c=document.createElement('div');c.id=id;w.appendChild(c);ids.forEach(function(i){var e=document.getElementById(i);if(e)c.appendChild(e)})}
col('bw-right-col',['perf-box','shader-toggle','rain-box','follow-king-btn','bw-instr-btn']);
col('bw-left-col',['mode-toggle','world-status','save-load']);
var t=document.getElementById('tab-world');
function hideBanner(){var h=document.getElementById('wb-inf-hud');if(h&&!(t&&t.classList.contains('active')))h.style.display='none'}
if(t)new MutationObserver(hideBanner).observe(t,{attributes:true,attributeFilter:['class']});
setInterval(hideBanner,250);
})();
