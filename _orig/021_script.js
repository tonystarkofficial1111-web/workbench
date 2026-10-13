
document.querySelectorAll('.tabbtn').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.tabbtn').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function(s){ s.classList.remove('active'); });
    btn.classList.add('active');
    var target = document.getElementById(btn.dataset.target);
    target.classList.add('active');
    if(btn.dataset.target === 'tab-world'){
      window.dispatchEvent(new Event('game:resize'));
      var overlay = document.getElementById('mode-select-overlay');
      if(overlay) overlay.classList.add('show');
      window.dispatchEvent(new Event('world:check-resume'));
    } else if(document.pointerLockElement){
      document.exitPointerLock();
    }
  });
});

// ---- 5.40.0: Layout toggle (horizontal/vertical tabs) ----
(function(){
  var body = document.body;
  var toggleBtn = document.getElementById('layout-toggle-btn');
  var layoutMode = 'horizontal';
  try { layoutMode = localStorage.getItem('wb-layout-mode') || 'horizontal'; } catch(e){}
  if(layoutMode !== 'vertical' && layoutMode !== 'horizontal') layoutMode = 'horizontal';
  function applyLayout(mode){
    layoutMode = mode === 'vertical' ? 'vertical' : 'horizontal';
    body.classList.toggle('layout-vertical', layoutMode === 'vertical');
    body.dataset.layout = layoutMode;
    if(toggleBtn){
      toggleBtn.textContent = layoutMode === 'vertical' ? 'Switch to Horizontal' : 'Switch to Vertical';
      toggleBtn.classList.toggle('active', layoutMode === 'vertical');
      toggleBtn.setAttribute('aria-pressed', layoutMode === 'vertical' ? 'true' : 'false');
    }
    try { localStorage.setItem('wb-layout-mode', layoutMode); } catch(e){}
    var lpH = document.getElementById('lp-horizontal');
    var lpV = document.getElementById('lp-vertical');
    if(lpH) lpH.style.borderColor = layoutMode === 'horizontal' ? 'var(--amber)' : 'var(--line)';
    if(lpV) lpV.style.borderColor = layoutMode === 'vertical' ? 'var(--amber)' : 'var(--line)';
  }
  applyLayout(layoutMode);
  if(toggleBtn) toggleBtn.addEventListener('click', function(){
    applyLayout(layoutMode === 'vertical' ? 'horizontal' : 'vertical');
  });
})();

// ---- 5.13.0: Start tab card navigation ----
document.querySelectorAll('.start-card[data-goto]').forEach(function(card){
  card.addEventListener('click', function(){
    var target = card.getAttribute('data-goto');
    var btn = document.querySelector('.tabbtn[data-target="' + target + '"]');
    if(btn) btn.click();
  });
});

// ---- 5.13.0: Developer Options live controls ----
(function(){
  function initDevControls(){
    var panel = document.getElementById('dev-controls-panel');
    if(!panel) return;

    // UI Scale
    var scaleSlider = document.getElementById('dev-ui-scale');
    var scaleVal = document.getElementById('dev-ui-scale-val');
    if(scaleSlider){
      scaleSlider.addEventListener('input', function(){
        var v = scaleSlider.value;
        scaleVal.textContent = v + '%';
        document.documentElement.style.fontSize = (v / 100 * 16) + 'px';
      });
    }

    // Accent Color
    var accentPicker = document.getElementById('dev-accent-color');
    if(accentPicker){
      accentPicker.addEventListener('input', function(){
        var c = accentPicker.value;
        document.documentElement.style.setProperty('--amber', c);
        document.documentElement.style.setProperty('--accent', c);
      });
    }

    // Fog Density
    var fogSlider = document.getElementById('dev-fog-density');
    var fogVal = document.getElementById('dev-fog-density-val');
    if(fogSlider){
      fogSlider.addEventListener('input', function(){
        fogVal.textContent = fogSlider.value + '%';
        window.dispatchEvent(new CustomEvent('dev:fog-density', { detail: { value: parseFloat(fogSlider.value) / 100 } }));
      });
    }

    // Reach Distance
    var reachSlider = document.getElementById('dev-reach');
    var reachVal = document.getElementById('dev-reach-val');
    if(reachSlider){
      reachSlider.addEventListener('input', function(){
        reachVal.textContent = reachSlider.value;
        window.dispatchEvent(new CustomEvent('dev:reach', { detail: { value: parseInt(reachSlider.value) } }));
      });
    }

    // Debug Overlay toggle
    var debugToggle = document.getElementById('dev-debug-toggle');
    if(debugToggle){
      debugToggle.addEventListener('click', function(){
        debugToggle.classList.toggle('on');
        var on = debugToggle.classList.contains('on');
        window.dispatchEvent(new CustomEvent('dev:debug-overlay', { detail: { on: on } }));
      });
    }

    // Reduced Motion toggle
    var motionToggle = document.getElementById('dev-motion-toggle');
    if(motionToggle){
      motionToggle.addEventListener('click', function(){
        motionToggle.classList.toggle('on');
        var on = motionToggle.classList.contains('on');
        document.documentElement.style.setProperty('--motion-duration', on ? '0s' : '0.3s');
        window.dispatchEvent(new CustomEvent('dev:reduced-motion', { detail: { on: on } }));
      });
    }

    // Reset
    var resetBtn = document.getElementById('dev-reset-controls');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        if(scaleSlider){ scaleSlider.value = 100; scaleSlider.dispatchEvent(new Event('input')); }
        if(accentPicker){ accentPicker.value = '#e0a458'; accentPicker.dispatchEvent(new Event('input')); }
        if(fogSlider){ fogSlider.value = 30; fogSlider.dispatchEvent(new Event('input')); }
        if(reachSlider){ reachSlider.value = 6; reachSlider.dispatchEvent(new Event('input')); }
        if(debugToggle){ debugToggle.classList.remove('on'); debugToggle.dispatchEvent(new Event('click')); debugToggle.classList.remove('on'); }
        if(motionToggle){ motionToggle.classList.remove('on'); motionToggle.dispatchEvent(new Event('click')); motionToggle.classList.remove('on'); }
      });
    }
  }

  // Check periodically since the dev panel is behind a password gate
  var devCheckInterval = setInterval(function(){
    var panel = document.getElementById('dev-controls-panel');
    if(panel && panel.offsetParent !== null){
      initDevControls();
      clearInterval(devCheckInterval);
    }
  }, 1000);
  // Also try on any dev-unlock event
  document.addEventListener('submit', function(e){
    if(e.target && e.target.id === 'dev-form'){
      setTimeout(function(){
        initDevControls();
        clearInterval(devCheckInterval);
      }, 500);
    }
  });
})();

// ---- 5.15.0: Arcade sidebar stats ----
function wbRenderArcadeSidebars(){
  wbEnsureProfileShape();
  // Left sidebar is static content, right sidebar is dynamic
  var totalPlayed = wbProfile.gamesPlayed || 0;
  var cabinetsTried = wbProfile.gamesPlayedByType ? Object.keys(wbProfile.gamesPlayedByType).length : 0;
  var arcadeTime = wbProfile.secondsOnPage || 0;

  var el;
  if((el = document.getElementById('as-total-played'))) el.textContent = totalPlayed;
  if((el = document.getElementById('as-cabinets-tried'))) el.textContent = cabinetsTried + '/59';
  if((el = document.getElementById('as-arcade-time'))) el.textContent = Math.floor(arcadeTime) + 's';

  // Achievements count
  var achCount = 0;
  if(wbProfile.achievements){ for(var k in wbProfile.achievements) if(wbProfile.achievements[k]) achCount++; }
  if(wbProfile.specialAchievements){ for(var k in wbProfile.specialAchievements) if(wbProfile.specialAchievements[k]) achCount++; }
  if((el = document.getElementById('as-ach-count'))) el.textContent = achCount;

  // Top 3 scores
  var allScores = [];
  if(wbProfile.highScores){
    for(var gk in wbProfile.highScores){
      for(var mk in wbProfile.highScores[gk]){
        var sc = wbProfile.highScores[gk][mk];
        if(sc && sc > 0){
          var gname = gk;
          var gameNamesMap = {
            neonBreaker:'Neon Breaker', starfallDefender:'Starfall Defender', circuitSnake:'Circuit Snake',
            neonPong:'Neon Pong', meteorCommand:'Meteor Command', stackSurge:'Stack Surge',
            botDefense:'Bot Defense', rooftopRumble:'Rooftop Rumble', circuitRacer:'Neon Sprint',
            crystalGarden:'Crystal Garden', memoryMatch:'Memory Match', colorMixer:'Color Mixer',
            fishingHole:'Fishing Hole', dotConnect:'Dot Connect', slidingPuzzle:'Slide Puzzle',
            patternMemory:'Pattern Memory', towerBuilder:'Tower Builder', bubbleSort:'Bubble Sort',
            idleFarm:'Idle Farm', laserDodge:'Laser Dodge', ninjaDash:'Ninja Dash',
            orbCatcher:'Orb Catcher', bladeSlice:'Blade Slice', gravityFlip:'Gravity Flip',
            bulletStorm:'Bullet Storm', platformJumper:'Platform Jumper', pixelRunner:'Pixel Runner',
            chainReactor:'Chain Reactor', rocketDash:'Rocket Dash'
          };
          if(gameNamesMap[gk]) gname = gameNamesMap[gk];
          allScores.push({ game: gname, score: sc });
        }
      }
    }
  }
  allScores.sort(function(a,b){ return b.score - a.score; });
  var top3 = allScores.slice(0, 3);
  var medals = ['as-top', 'as-top2', 'as-top3'];
  for(var i = 0; i < 3; i++){
    var gEl = document.getElementById(medals[i] + '-game');
    var sEl = document.getElementById(medals[i] + '-score');
    if(gEl && sEl){
      if(top3[i]){ gEl.textContent = top3[i].game; sEl.textContent = top3[i].score; }
      else { gEl.textContent = '—'; sEl.textContent = '0'; }
    }
  }

  // Quick stats in User/Saves
  if((el = document.getElementById('qs-games-played'))) el.textContent = totalPlayed;
  if((el = document.getElementById('qs-cabinets'))) el.textContent = cabinetsTried;
  if((el = document.getElementById('qs-achievements'))) el.textContent = achCount;
}

// Run after page loads and when switching to arcade tab
setTimeout(wbRenderArcadeSidebars, 500);
setInterval(wbRenderArcadeSidebars, 3000); // Refresh every 3s for live updates

// Also refresh when arcade tab is clicked
document.querySelectorAll('.tabbtn').forEach(function(btn){
  var origHandler = btn.onclick;
  btn.addEventListener('click', function(){
    setTimeout(wbRenderArcadeSidebars, 100);
  });
});

// Mode selection button handlers
document.querySelectorAll('[data-mode]').forEach(function(btn){
  btn.addEventListener('click', function(){
    var overlay = document.getElementById('mode-select-overlay');
    if(overlay) overlay.classList.remove('show');
    window.dispatchEvent(new CustomEvent('world:mode-selected', { detail: { mode: btn.dataset.mode } }));
  });
});

// Resume button — just hides the modal
var resumeBtn = document.getElementById('mode-resume-btn');
if(resumeBtn){
  resumeBtn.addEventListener('click', function(){
    var overlay = document.getElementById('mode-select-overlay');
    if(overlay) overlay.classList.remove('show');
  });
}
