
/* ============================================================
   5.16.1 — Nav glow, dynamic active-tab text (inverted bg),
   custom accent color picker, and 30 placeholder game cabinets.
   ============================================================ */

/* ---- Dynamic active-tab text: mathematical inverse of page background ---- */
function wbInvertColor(rgb){
  var m = rgb.match(/\d+/g);
  if(m && m.length >= 3){
    var r = 255 - parseInt(m[0], 10);
    var g = 255 - parseInt(m[1], 10);
    var b = 255 - parseInt(m[2], 10);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  return '#ffffff';
}
function wbUpdateActiveTabColor(){
  var bg = getComputedStyle(document.body).backgroundColor;
  document.documentElement.style.setProperty('--wb-active-tab-fg', wbInvertColor(bg));
}

/* ---- Custom accent color picker (overrides --amber across the UI) ---- */
(function(){
  var KEY = 'wb-accent-color';
  var root = document.documentElement;
  var input = document.getElementById('wb-accent-color');
  var resetBtn = document.getElementById('wb-accent-reset');
  var hexLabel = document.getElementById('wb-accent-hex');

  function colorToHex(color){
    color = (color || '').trim();
    if(/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
    var m = color.match(/\d+/g);
    if(m && m.length >= 3){
      return '#' + [0,1,2].map(function(i){
        return Math.max(0, Math.min(255, parseInt(m[i],10))).toString(16).padStart(2,'0');
      }).join('');
    }
    return '#e0a458';
  }
  function syncAccentControl(hex){
    hex = colorToHex(hex || getComputedStyle(root).getPropertyValue('--amber'));
    if(input) input.value = hex;
    if(hexLabel) hexLabel.textContent = hex;
  }
  function apply(hex){
    if(!hex){
      root.style.removeProperty('--amber');
      syncAccentControl();
    } else {
      root.style.setProperty('--amber', hex);
      syncAccentControl(hex);
    }
    wbUpdateActiveTabColor();
  }
  function load(){
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch(e){}
    if(saved && /^#[0-9a-fA-F]{6}$/.test(saved)){
      apply(saved);
    } else {
      syncAccentControl();
      wbUpdateActiveTabColor();
    }
  }
  if(input){
    input.addEventListener('input', function(){
      var v = input.value;
      apply(v);
      try { localStorage.setItem(KEY, v); } catch(e){}
    });
  }
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      try { localStorage.removeItem(KEY); } catch(e){}
      apply(null);
    });
  }
  // Re-sync active-tab color and accent control whenever the theme changes
  // (themes re-set --bg/--amber). If the user has no custom accent saved,
  // the picker follows the theme's own --amber.
  var picker = document.getElementById('theme-picker');
  if(picker){
    picker.addEventListener('click', function(){
      setTimeout(function(){
        var saved = null;
        try { saved = localStorage.getItem(KEY); } catch(e){}
        if(saved && /^#[0-9a-fA-F]{6}$/.test(saved)){
          apply(saved);
        } else {
          apply(null);
        }
        wbUpdateActiveTabColor();
      }, 60);
    });
  }
  load();
})();

/* ---- Refresh active-tab contrast whenever the selected tab changes ---- */
document.querySelectorAll('.tabbtn').forEach(function(btn){
  btn.addEventListener('click', function(){ setTimeout(wbUpdateActiveTabColor, 30); });
});

/* ---- 30 placeholder game cabinets (10 per category) ---- */
var WB_PLACEHOLDER_GAMES = [
  // ----- Patience (10) -----
  { slot:'plp-30', name:'SOLITAIRE SPIRES', desc:'Stack cards in descending order across four medieval towers. A calm, classic patience challenge.' },
  { slot:'plp-31', name:'ZEN GARDEN', desc:'Rake patterns in the sand and arrange stones to match a target layout. Soothing and slow.' },
  { slot:'plp-32', name:'TOWER OF HANOI', desc:'Move stacked rings to the far peg one at a time. Never place a larger ring on a smaller one.' },
  { slot:'plp-33', name:'SLIDE PUZZLE', desc:'Slide numbered tiles into order on a 4x4 grid. Plan every move ahead.' },
  { slot:'plp-34', name:'MINE SWEEPER', desc:'Flag every hidden mine using numeric clues. Pure logic, no timer pressure.' },
  { slot:'plp-35', name:'MAZE WEAVER', desc:'Trace a path through a procedurally woven labyrinth. Take your time finding the exit.' },
  { slot:'plp-36', name:'DOMINO CASCADE', desc:'Place dominoes so a single push topples them all in sequence. Satisfying chain reactions.' },
  { slot:'plp-37', name:'COLOR SORT', desc:'Pour colored liquids between tubes until each holds a single color. Easy to learn, hard to master.' },
  { slot:'plp-38', name:'NONOGRAM', desc:'Reveal a hidden pixel picture using row and column number clues.' },
  { slot:'plp-39', name:'JIGSAW RELAX', desc:'Drag puzzle pieces into place to complete a calm landscape image.' },
  // ----- Fast-Paced (10) -----
  { slot:'plf-40', name:'COMET CHASE', desc:'Dodge incoming comets while collecting stardust. Speed ramps up every few seconds.' },
  { slot:'plf-41', name:'LASER DASH', desc:'Sprint down a corridor weaving between sweeping laser beams.' },
  { slot:'plf-42', name:'TURBO TAP', desc:'Tap as many targets as possible before the timer hits zero. Reflexes only.' },
  { slot:'plf-43', name:'ASTEROID RUN', desc:'Pilot a ship through a dense asteroid belt. One hit and you are dust.' },
  { slot:'plf-44', name:'BLADE FALL', desc:'Sidestep falling blades while grabbing coins. The drop rate never stops rising.' },
  { slot:'plf-45', name:'NEON JUMP', desc:'Leap between disappearing platforms that fade the instant you land.' },
  { slot:'plf-46', name:'VOLLEY BLITZ', desc:'Keep the ball off your side in a frantic single-button volley rally.' },
  { slot:'plf-47', name:'SPIKE SURGE', desc:'Dodge rising spikes from every wall. Survive as long as you can.' },
  { slot:'plf-48', name:'DASH CLASH', desc:'Charge a dash to burst through barriers before they crush you.' },
  { slot:'plf-49', name:'ORBIT RUSH', desc:'Orbit a star and fling yourself between gravity wells at breakneck speed.' },
  // ----- Skill (10) -----
  { slot:'pls-50', name:'GLADIATOR ARENA', desc:'Trade blows with wave after wave of arena fighters. Time your blocks and counters.' },
  { slot:'pls-51', name:'TANK BARRAGE', desc:'Maneuver a tank across a warzone, destroying enemy armor and turrets.' },
  { slot:'pls-52', name:'SNIPER ALLEY', desc:'Line up long-range shots against moving targets under a tight clock.' },
  { slot:'pls-53', name:'DRIFT KING', desc:'Drift around hairpin turns to rack up style points before the lap ends.' },
  { slot:'pls-54', name:'MECHA BRAWL', desc:'Pilot a mech in close-quarters combat against rival machines.' },
  { slot:'pls-55', name:'ARROW STORM', desc:'Loose arrows at advancing hordes from the castle wall.' },
  { slot:'pls-56', name:'GRID RACER', desc:'Navigate a vector racing track and beat the ghost lap time.' },
  { slot:'pls-57', name:'CHESS DUEL', desc:'Outwit an adaptive AI opponent in a classic chess match.' },
  { slot:'pls-58', name:'BOMBER RAID', desc:'Lay bombs strategically to trap foes in a maze arena.' },
  { slot:'pls-59', name:'STAR PILOT', desc:'Dogfight enemy fighters across a scrolling starfield. Manage shields and weapons.' }
];

(function(){
  function renderPlaceholder(g){
    var slot = document.getElementById(g.slot + '-slot');
    if(!slot) return;
    slot.innerHTML =
      '<div class="ac-bubble">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">' + g.name + '</div>' +
          '<div class="ac-sub">coming soon &middot; placeholder</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="17" cy="8" r="6" fill="var(--cat-accent)"/><rect x="10" y="16" width="14" height="20" rx="4" fill="var(--cat-accent)"/></svg></div>' +
          '<div class="ac-tap">COMING SOON</div>' +
          '<div class="ac-desc"><b>' + g.name + '</b>' + g.desc + '</div>' +
        '</div>' +
      '</div>';
  }
  for(var i = 0; i < WB_PLACEHOLDER_GAMES.length; i++){
    renderPlaceholder(WB_PLACEHOLDER_GAMES[i]);
  }
})();

/* Re-run active-tab contrast once everything (incl. theme init) has settled. */
window.addEventListener('load', wbUpdateActiveTabColor);
setTimeout(wbUpdateActiveTabColor, 400);
