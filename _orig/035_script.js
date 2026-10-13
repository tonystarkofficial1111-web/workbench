
(function(){
  'use strict';

  /* ---- Tour state and selectors ---- */
  var wbTourKey = 'wb_tour_done';
  var wbTourRoot = document.getElementById('wb-tour-root');
  if(!wbTourRoot) return;

  var wbTourSpotlight = wbTourRoot.querySelector('.wb-tour-spotlight');
  var wbTourCard = wbTourRoot.querySelector('.wb-tour-card');
  var wbTourCaption = wbTourRoot.querySelector('.wb-tour-caption');
  var wbTourTitle = wbTourRoot.querySelector('.wb-tour-title');
  var wbTourTip = wbTourRoot.querySelector('.wb-tour-tip');
  var wbTourStep = wbTourRoot.querySelector('.wb-tour-step');
  var wbTourNext = wbTourRoot.querySelector('.wb-tour-next');
  var wbTourBack = wbTourRoot.querySelector('.wb-tour-back');
  var wbTourSkip = wbTourRoot.querySelector('.wb-tour-skip');
  var wbTourIndex = 0;
  var wbTourActive = false;
  var wbTourMoving = false;

  /* ---- Exact tour sequence ---- */
  var wbTourSteps = [
    {click:'.tabbtn[data-target="tab-start"]', target:'.start-hero', title:'Welcome to Workbench! \uD83D\uDC4B',
      caption:'We are really glad you are here. Workbench is one friendly place for school tools, media, and arcade games. This quick tour shows what each area does and how to use it. It takes about a minute, and you can skip any time.',
      tip:'Use Next, or the left and right arrow keys.'},
    {target:'.tabs', title:'Your tabs',
      caption:'These tabs along the top are how you get around. Click or tap one to open that area, and come back to Start whenever you like.',
      tip:'Tap any tab to jump straight there.'},
    {target:'.start-grid', title:'Start cards',
      caption:'Each card is a shortcut to part of Workbench. Hover over a card to flip it and read more, then click or tap it to jump right in.',
      tip:'Try it: hover over a card.'},
    {click:'.tabbtn[data-target="tab-edu"]', target:'.edu-cabinet-wall', title:'Educational',
      caption:'Your study corner: Study Notes, Coding Studio, Math Lab, Memory Deck, Engineering, Student Desk, Python Lab, Spanish, and Algebra. Click a cabinet to select it, and a bright blue ring circles your pick while its workspace opens right below. Everything saves privately in your browser.',
      tip:'Try it: click any cabinet.'},
    {target:'.edu-cab[data-lab="type"]', title:'Type Rush',
      caption:'Build typing speed and accuracy. Press Start, type each phrase as it appears, and watch your WPM and accuracy update live. Switch on the Finger Guide to see which finger presses each key.',
      tip:'Try it: click Type Rush, then press Start.'},
    {click:'.tabbtn[data-target="tab-videos"]', target:'#media-select-screen', title:'Media',
      caption:'Pick a card to open it. Video lets you import your own videos and watch them in a built-in player, Studio has image tools, and Utility Bay has handy everyday tools like a QR generator and unit converter. The Music player is coming soon.',
      tip:'Use the Back button inside a section to return to this menu.'},
    {click:'.tabbtn[data-target="tab-arcade"]', target:'.arcade-head', title:'Arcade',
      caption:'This is your game library. Browse shelves of games, click a tile to see what it is, then press Play. Winning earns you points.',
      tip:'Try it: click any game tile.'},
    {target:'#wb-lib-nav', title:'Find your game',
      caption:'Switch between collections like Favorites, Recently played, and the Patience, Fast, and Skill games. Use the search bar to find a game by name, tap a tile star to save a favorite, and pick Casual, Normal, or Hardcore before you play. Block World, a build-and-mine sandbox, lives in the Arcade too.',
      tip:'Try it: click a collection, then press Play.'},
    {click:'.tabbtn[data-target="tab-data"]', target:'.data-intro', title:'User / Saves',
      caption:'Your personal corner. Set a display name and picture, check your scores and the leaderboard, unlock banners with points, and export or import your progress to back it up or move to another device.',
      tip:'Try it: type a display name.'},
    {click:'.tabbtn[data-target="tab-start"]', target:'#wb-tour-launch', title:'You are all set! \uD83C\uDF89',
      caption:'That is the tour. Explore at your own pace and have fun. If you ever want a refresher, press Take the tour here on the Start tab.',
      tip:''}
  ];

  /* ---- Safe localStorage helpers ---- */
  function wbTourGetDone(){
    try{return localStorage.getItem(wbTourKey)==='1';}catch(e){return false;}
  }
  function wbTourSetDone(){
    try{localStorage.setItem(wbTourKey,'1');}catch(e){}
  }

  /* ---- Target lookup and tab activation ---- */
  function wbTourFindTarget(step){
    try{return document.querySelector(step.target);}catch(e){return null;}
  }

  function wbTourClickTarget(target){
    if(!target) return;
    /* The .tabs wrapper is not itself actionable; click the current Start tab.
       The Start hero/grid are informational containers, so their own click is
       still fired as requested without forcing an unrelated workspace open. */
    if(target.matches && target.matches('.tabs')){
      var activeTab = target.querySelector('.tabbtn.active') || target.querySelector('.tabbtn[data-target="tab-start"]') || target.querySelector('.tabbtn');
      if(activeTab) activeTab.click();
      else target.click();
      return;
    }
    target.click();
  }

  function wbTourWait(ms){
    return new Promise(function(resolve){setTimeout(resolve,ms);});
  }

  /* ---- Keep the tour target aligned with scrolling/resizing ---- */
  function wbTourPosition(){
    if(!wbTourActive) return;
    var target = wbTourFindTarget(wbTourSteps[wbTourIndex]);
    if(!target) return;
    var r = target.getBoundingClientRect();
    var pad = 5;
    var left = Math.max(4,r.left-pad);
    var top = Math.max(4,r.top-pad);
    var width = Math.max(20,r.width+pad*2);
    var height = Math.max(20,r.height+pad*2);
    wbTourSpotlight.style.left=left+'px';
    wbTourSpotlight.style.top=top+'px';
    wbTourSpotlight.style.width=width+'px';
    wbTourSpotlight.style.height=height+'px';

    var cardWidth = Math.min(340,window.innerWidth-32);
    var cardHeight = wbTourCard.offsetHeight || 150;
    var gap = 16;
    var cardLeft = r.left + (r.width-cardWidth)/2;
    cardLeft = Math.max(12,Math.min(cardLeft,window.innerWidth-cardWidth-12));

    /* Top half -> below target. Bottom half -> above target. */
    var cardTop;
    if(r.top + r.height/2 < window.innerHeight/2){
      cardTop = r.bottom + gap;
    }else{
      cardTop = r.top - cardHeight - gap;
    }
    cardTop = Math.max(12,Math.min(cardTop,window.innerHeight-cardHeight-12));
    wbTourCard.style.left=cardLeft+'px';
    wbTourCard.style.top=cardTop+'px';
  }

  /* ---- Render a step after its target has opened/settled ---- */
  async function wbTourRender(index){
    if(!wbTourActive || wbTourMoving) return;
    wbTourMoving=true;
    wbTourIndex=Math.max(0,Math.min(index,wbTourSteps.length-1));
    var step=wbTourSteps[wbTourIndex];
    var target=wbTourFindTarget(step);
    if(!target){
      wbTourMoving=false;
      return;
    }

    if(step.click){ var pre=document.querySelector(step.click); if(pre) pre.click(); }
    await wbTourWait(250);

    target=wbTourFindTarget(step);
    if(!target){wbTourMoving=false;return;}
    target.scrollIntoView({block:'nearest',inline:'nearest'});
    await wbTourWait(20);

    wbTourStep.textContent=(wbTourIndex+1)+' / '+wbTourSteps.length;
    wbTourCaption.textContent=step.caption;
    if(wbTourTitle) wbTourTitle.textContent=step.title||'';
    if(wbTourTip) wbTourTip.textContent=step.tip||'';
    wbTourNext.textContent=wbTourIndex===wbTourSteps.length-1?'Let\u2019s go':'Next';
    wbTourBack.disabled=wbTourIndex===0;
    wbTourBack.style.opacity=wbTourIndex===0?'.45':'1';
    wbTourBack.style.cursor=wbTourIndex===0?'default':'pointer';
    wbTourPosition();
    wbTourMoving=false;
  }

  /* ---- Close/complete behavior ---- */
  function wbTourFinish(markDone){
    wbTourActive=false;
    wbTourRoot.hidden=true;
    wbTourRoot.setAttribute('aria-hidden','true');
    if(markDone) wbTourSetDone();
  }

  /* ---- Public relaunch API ---- */
  window.startTour=function(){
    wbTourActive=true;
    wbTourIndex=0;
    wbTourRoot.hidden=false;
    wbTourRoot.setAttribute('aria-hidden','false');
    wbTourRender(0);
  };

  /* ---- Tour controls ---- */
  wbTourNext.addEventListener('click',function(){
    if(!wbTourActive || wbTourMoving) return;
    if(wbTourIndex>=wbTourSteps.length-1){wbTourFinish(true);return;}
    wbTourRender(wbTourIndex+1);
  });
  wbTourBack.addEventListener('click',function(){
    if(!wbTourActive || wbTourMoving || wbTourIndex<=0) return;
    wbTourRender(wbTourIndex-1);
  });
  wbTourSkip.addEventListener('click',function(){wbTourFinish(true);});

  /* ---- Keyboard controls ---- */
  document.addEventListener('keydown',function(e){
    if(!wbTourActive) return;
    if(e.key==='ArrowRight'){
      e.preventDefault();
      wbTourNext.click();
    }else if(e.key==='ArrowLeft'){
      e.preventDefault();
      wbTourBack.click();
    }else if(e.key==='Escape'){
      e.preventDefault();
      wbTourFinish(true);
    }
  },true);

  /* ---- Position maintenance ---- */
  window.addEventListener('resize',wbTourPosition);
  window.addEventListener('scroll',wbTourPosition,true);

  /* ---- Add the small Start-tab relaunch button ---- */
  function wbTourInstallLaunchButton(){
    if(document.getElementById('wb-tour-launch')) return;
    var hero=document.querySelector('.start-hero');
    if(!hero) return;
    var btn=document.createElement('button');
    btn.id='wb-tour-launch';
    btn.type='button';
    btn.textContent='Take the tour';
    btn.addEventListener('click',function(){window.startTour();});
    hero.appendChild(btn);
  }

  /* ---- First-load trigger ---- */
  wbTourInstallLaunchButton();
  if(!wbTourGetDone()){
    setTimeout(function(){window.startTour();},350);
  }
})();
