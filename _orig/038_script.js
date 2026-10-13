
(function(){
  var cv=document.getElementById('wb-trail-bg'); if(!cv) return;
  var tab=document.getElementById('tab-start'), ctx=cv.getContext('2d');
  var CELL=36, TRAIL=46, STEP=95, N=4;
  var W=0,H=0,cols=0,rows=0,dpr=1;
  var DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
  var snakes=[];
  function size(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    W=tab.clientWidth; H=tab.clientHeight;
    if(!W||!H) return;
    cv.width=W*dpr; cv.height=H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cols=Math.ceil(W/CELL); rows=Math.ceil(H/CELL);
  }
  function spawn(){
    var x=Math.floor(Math.random()*cols), y=Math.floor(Math.random()*rows);
    return {path:[[x,y]],dir:Math.floor(Math.random()*4),acc:Math.random()*STEP,fade:0};
  }
  function inb(x,y){return x>=0&&y>=0&&x<cols&&y<rows;}
  function advance(sn){
    var h=sn.path[sn.path.length-1], opts=[];
    var d=sn.dir;
    // prefer straight, otherwise turn left/right (never reverse)
    var cand=[[d,.55],[(d+1)%4,.225],[(d+3)%4,.225]];
    cand=cand.filter(function(c){var v=DIRS[c[0]];return inb(h[0]+v[0],h[1]+v[1]);});
    if(!cand.length){sn.dying=true;return;}
    var tot=cand.reduce(function(a,c){return a+c[1]},0), r=Math.random()*tot, pick=cand[0][0];
    for(var i=0;i<cand.length;i++){ r-=cand[i][1]; if(r<=0){pick=cand[i][0];break;} }
    sn.dir=pick; var v=DIRS[pick];
    sn.path.push([h[0]+v[0],h[1]+v[1]]);
    if(sn.path.length>TRAIL) sn.path.shift();
  }
  function init(){ size(); snakes=[]; for(var i=0;i<N;i++) snakes.push(spawn()); }
  var last=performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    var dt=Math.min(now-last,100); last=now;
    if(!tab.offsetParent||document.hidden) return;
    if(tab.clientWidth!==W||tab.clientHeight!==H||!cols) init();
    ctx.clearRect(0,0,W,H);
    // faint dev-tools style grid
    ctx.strokeStyle='rgba(120,170,255,.045)'; ctx.lineWidth=1; ctx.beginPath();
    for(var gx=0;gx<=W;gx+=CELL){ctx.moveTo(gx+.5,0);ctx.lineTo(gx+.5,H);}
    for(var gy=0;gy<=H;gy+=CELL){ctx.moveTo(0,gy+.5);ctx.lineTo(W,gy+.5);}
    ctx.stroke();
    var pulse=.65+.35*Math.sin(now/650); // glow dims up and down
    for(var si=0;si<snakes.length;si++){
      var sn=snakes[si];
      sn.acc+=dt;
      while(sn.acc>=STEP){sn.acc-=STEP; if(!sn.dying) advance(sn); else sn.path.shift();}
      if(sn.path.length<2&&sn.dying){snakes[si]=spawn();continue;}
      var p=sn.path, n=p.length, t=sn.dying?0:sn.acc/STEP;
      // lit cells (the section the line passes through)
      for(var i=0;i<n;i++){
        var k=Math.pow((i+1)/n,1.7);
        var cx=p[i][0]*CELL, cy=p[i][1]*CELL;
        ctx.fillStyle='rgba(47,139,255,'+(.2*k*pulse).toFixed(3)+')';
        ctx.fillRect(cx+1,cy+1,CELL-1,CELL-1);
        ctx.strokeStyle='rgba(90,170,255,'+(.55*k*pulse).toFixed(3)+')';
        ctx.strokeRect(cx+1.5,cy+1.5,CELL-2,CELL-2);
      }
      // the line itself, with a fading trail and pulsing glow
      var pts=p.map(function(c){return [c[0]*CELL+CELL/2,c[1]*CELL+CELL/2];});
      if(!sn.dying&&n>=1){
        var hd=pts[n-1], v=DIRS[sn.dir];
        pts.push([hd[0]+v[0]*CELL*t,hd[1]+v[1]*CELL*t]);
      }
      ctx.lineCap='round'; ctx.lineJoin='round';
      for(var j=1;j<pts.length;j++){
        var kk=Math.pow(j/pts.length,1.5);
        var a=pts[j-1], b=pts[j];
        ctx.beginPath();
        ctx.moveTo(a[0],a[1]);
        if(j<pts.length-1){ // rounded corners
          var c=pts[j+1], mx=(b[0]+c[0])/2, my=(b[1]+c[1])/2;
          var sx=(a[0]+b[0])/2, sy=(a[1]+b[1])/2;
          ctx.moveTo(sx,sy); ctx.quadraticCurveTo(b[0],b[1],mx,my);
        } else ctx.lineTo(b[0],b[1]);
        ctx.shadowColor='rgba(40,140,255,'+(.95*pulse).toFixed(3)+')';
        ctx.shadowBlur=(8+16*pulse)*kk+2;
        ctx.strokeStyle='rgba(95,185,255,'+(.15+.85*kk).toFixed(3)+')';
        ctx.lineWidth=1.5+2*kk;
        ctx.stroke();
      }
      ctx.shadowBlur=0;
    }
  }
  if(window.ResizeObserver) new ResizeObserver(function(){cols=0;}).observe(tab);
  init();
  requestAnimationFrame(frame);
})();
