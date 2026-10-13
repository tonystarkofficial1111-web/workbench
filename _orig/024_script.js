
/* ---- Player profile: login / progress export & import ----
   Lives in this same classic <script> block as the arcade cabinet below
   (not a <script type="module">) specifically so the two can share plain
   top-level bindings directly — no window.* bridging needed, the same
   reason the world/AI modules above had to use window.* to talk to each other. */
function wbDefaultProfile(){
  return {
    version: 2,
    name: 'Guest',
    bio: '',
    avatar: '',
    createdAt: Date.now(),
    secondsOnPage: 0,
    gamesPlayed: 0,
    firstGamePlayedAt: null,
    achievements: {},
    arcade: { rooftopRumble: { wins:0, losses:0, draws:0, kos:0, fights:0 }, circuitRacer: { wins:0, losses:0, draws:0, kos:0, fights:0 }, neonBreaker: { wins:0, losses:0, draws:0, kos:0, fights:0 }, starfallDefender: { wins:0, losses:0, draws:0, kos:0, fights:0 }, circuitSnake: { wins:0, losses:0, draws:0, kos:0, fights:0 }, neonPong: { wins:0, losses:0, draws:0, kos:0, fights:0 }, meteorCommand: { wins:0, losses:0, draws:0, kos:0, fights:0 }, stackSurge: { wins:0, losses:0, draws:0, kos:0, fights:0 }, botDefense: { wins:0, losses:0, draws:0, kos:0, fights:0 }, crystalGarden: { wins:0, losses:0, draws:0, kos:0, fights:0 }, memoryMatch: { wins:0, losses:0, draws:0, kos:0, fights:0 }, colorMixer: { wins:0, losses:0, draws:0, kos:0, fights:0 }, fishingHole: { wins:0, losses:0, draws:0, kos:0, fights:0 }, dotConnect: { wins:0, losses:0, draws:0, kos:0, fights:0 }, slidingPuzzle: { wins:0, losses:0, draws:0, kos:0, fights:0 }, patternMemory: { wins:0, losses:0, draws:0, kos:0, fights:0 }, towerBuilder: { wins:0, losses:0, draws:0, kos:0, fights:0 }, bubbleSort: { wins:0, losses:0, draws:0, kos:0, fights:0 }, idleFarm: { wins:0, losses:0, draws:0, kos:0, fights:0 }, laserDodge: { wins:0, losses:0, draws:0, kos:0, fights:0 }, ninjaDash: { wins:0, losses:0, draws:0, kos:0, fights:0 }, orbCatcher: { wins:0, losses:0, draws:0, kos:0, fights:0 }, bladeSlice: { wins:0, losses:0, draws:0, kos:0, fights:0 }, gravityFlip: { wins:0, losses:0, draws:0, kos:0, fights:0 }, bulletStorm: { wins:0, losses:0, draws:0, kos:0, fights:0 }, platformJumper: { wins:0, losses:0, draws:0, kos:0, fights:0 }, pixelRunner: { wins:0, losses:0, draws:0, kos:0, fights:0 }, chainReactor: { wins:0, losses:0, draws:0, kos:0, fights:0 }, rocketDash: { wins:0, losses:0, draws:0, kos:0, fights:0 } }
  };
}
let wbProfile = (function(){
  try {
    var saved = localStorage.getItem('wb_profile');
    if(saved){
      var parsed = JSON.parse(saved);
      if(parsed && typeof parsed === 'object' && parsed.arcade && parsed.arcade.rooftopRumble){
        return parsed;
      }
    }
  } catch(e){}
  return wbDefaultProfile();
})();

function wbSaveProfile(){
  try { localStorage.setItem('wb_profile', JSON.stringify(wbProfile)); } catch(e){}
}

function wbKoRatioText(rec){
  if(!rec || rec.wins === 0) return '—';
  return rec.kos + '/' + rec.wins + ' (' + Math.round((rec.kos / rec.wins) * 100) + '%)';
}

function wbRenderArcadeRecord(){
  var rec = wbProfile.arcade.rooftopRumble;
  var w = document.getElementById('ac-rec-wins');
  var l = document.getElementById('ac-rec-losses');
  var d = document.getElementById('ac-rec-draws');
  var k = document.getElementById('ac-rec-koratio');
  if(w) w.textContent = rec.wins;
  if(l) l.textContent = rec.losses;
  if(d) d.textContent = rec.draws;
  if(k) k.textContent = wbKoRatioText(rec);
  var rc = wbProfile.arcade.circuitRacer;
  var rw = document.getElementById('rc-rec-wins');
  var rl = document.getElementById('rc-rec-losses');
  if(rw) rw.textContent = rc ? rc.wins : 0;
  if(rl) rl.textContent = rc ? rc.losses : 0;
  var bb = wbProfile.arcade.neonBreaker || { fights:0 };
  var sf = wbProfile.arcade.starfallDefender || { fights:0 };
  var sn = wbProfile.arcade.circuitSnake || { fights:0 };
  var bbEl = document.getElementById('bb-rec-fights');
  var sfEl = document.getElementById('sf-rec-fights');
  var snEl = document.getElementById('sn-rec-fights');
  if(bbEl) bbEl.textContent = bb.fights;
  if(sfEl) sfEl.textContent = sf.fights;
  if(snEl) snEl.textContent = sn.fights;
  var pg = wbProfile.arcade.neonPong || { fights:0 };
  var mc = wbProfile.arcade.meteorCommand || { fights:0 };
  var ss = wbProfile.arcade.stackSurge || { fights:0 };
  var zc = wbProfile.arcade.botDefense || { fights:0 };
  var pgEl = document.getElementById('pg-rec-fights');
  var mcEl = document.getElementById('mc-rec-fights');
  var ssEl = document.getElementById('ss-rec-fights');
  if(pgEl) pgEl.textContent = pg.fights;
  if(mcEl) mcEl.textContent = mc.fights;
  if(ssEl) ssEl.textContent = ss.fights;
  var zcEl = document.getElementById('bd-rec-fights');
  if(zcEl) zcEl.textContent = zc.fights;
}

function wbRenderLoginPanel(){
  var nameEl = document.getElementById('login-current-name');
  var sumEl = document.getElementById('login-current-summary');
  var nameInput = document.getElementById('login-name-input');
  if(nameEl) nameEl.textContent = wbProfile.name || 'Guest';
  if(nameInput && document.activeElement !== nameInput) nameInput.value = wbProfile.name === 'Guest' ? '' : wbProfile.name;
  if(sumEl){
    var rec = wbProfile.arcade.rooftopRumble;
    var rc = wbProfile.arcade.circuitRacer || { wins:0, losses:0, fights:0 };
    var rrText = rec.fights === 0 ? 'no fights' : (rec.wins + 'W \u2013 ' + rec.losses + 'L \u2013 ' + rec.draws + 'D \u00b7 KO ' + wbKoRatioText(rec));
    var rcText = rc.fights === 0 ? 'no races' : (rc.wins + 'W \u2013 ' + rc.losses + 'L');
    var bb = wbProfile.arcade.neonBreaker || { fights:0 };
    var sf = wbProfile.arcade.starfallDefender || { fights:0 };
    var sn = wbProfile.arcade.circuitSnake || { fights:0 };
    var pg = wbProfile.arcade.neonPong || { fights:0 };
    var mc = wbProfile.arcade.meteorCommand || { fights:0 };
    var ss = wbProfile.arcade.stackSurge || { fights:0 };
    var zc = wbProfile.arcade.botDefense || { fights:0 };
    sumEl.textContent = 'Rooftop: ' + rrText + ' \u00b7 Sprint: ' + rcText + ' \u00b7 Breaker: ' + bb.fights + ' \u00b7 Defender: ' + sf.fights + ' \u00b7 Snake: ' + sn.fights + ' \u00b7 Pong: ' + pg.fights + ' \u00b7 Meteor: ' + mc.fights + ' \u00b7 Stack: ' + ss.fights + ' \u00b7 Zombies: ' + zc.fights;
  }
}

// Called by the arcade cabinet below whenever a fight ends. 'result' is from
// P1's seat specifically (the WASD/JK side) since progress is one profile,
// not per-player — in local 2P matches the P2 side isn't tracked.
function wbRecordFightResult(cabinetKey, result, isKO){
  var rec = wbProfile.arcade[cabinetKey];
  if(!rec){ rec = wbProfile.arcade[cabinetKey] = { wins:0, losses:0, draws:0, kos:0, fights:0 }; }
  rec.fights++;
  if(result === 'win'){ rec.wins++; if(isKO) rec.kos++; }
  else if(result === 'loss'){ rec.losses++; }
  else { rec.draws++; }
  wbRenderArcadeRecord();
  wbRenderLoginPanel();
  wbCheckAchievements();
  wbSaveProfile();
}

/* ---- Scoring system ---- */
var wbScoreRules = {
  // difficulty multipliers
  multipliers: { easy:0.5, simple:0.5, normal:1, hard:2, extreme:3, survival:2, speed:1.5, zen:0.5, walls:1.5 },
  // game balance factors (some games are easier to score high on)
  balance: {
    neonBreaker: 1, starfallDefender: 1, circuitSnake: 1,
    neonPong: 1, meteorCommand: 0.5, stackSurge: 1,
    rooftopRumble: 1, circuitRacer: 1, botDefense: 1, crystalGarden: 1, memoryMatch: 1, colorMixer: 1, fishingHole: 1, dotConnect: 1, slidingPuzzle: 1, patternMemory: 1, towerBuilder: 1, bubbleSort: 1, idleFarm: 1, laserDodge: 1, ninjaDash: 1, orbCatcher: 1, bladeSlice: 1, gravityFlip: 1, bulletStorm: 1, platformJumper: 1, pixelRunner: 1, chainReactor: 1, rocketDash: 1
  },
  // what raw score means per game
  rawLabel: {
    neonBreaker: 'bricks broken', starfallDefender: 'in-game score', circuitSnake: 'tiles eaten',
    neonPong: 'points scored', meteorCommand: 'in-game score', stackSurge: 'height reached',
    rooftopRumble: 'wins x 100', circuitRacer: 'wins x 100', botDefense: 'survival score', crystalGarden: 'score', memoryMatch: 'score', colorMixer: 'score', fishingHole: 'score', dotConnect: 'score', slidingPuzzle: 'score', patternMemory: 'score', towerBuilder: 'score', bubbleSort: 'score', idleFarm: 'score', laserDodge: 'score', ninjaDash: 'score', orbCatcher: 'score', bladeSlice: 'score', gravityFlip: 'score', bulletStorm: 'score', platformJumper: 'score', pixelRunner: 'score', chainReactor: 'score', rocketDash: 'score'
  }
};

function wbDefaultHighScores(){
  return {
    neonBreaker: { normal:0, hard:0, extreme:0 },
    starfallDefender: { normal:0, hard:0, survival:0 },
    circuitSnake: { normal:0, walls:0, speed:0 },
    neonPong: { easy:0, normal:0, hard:0 },
    meteorCommand: { normal:0, hard:0, survival:0 },
    stackSurge: { normal:0, speed:0, zen:0 },
    botDefense: { easy:0, normal:0, hard:0 },
    crystalGarden: { easy:0, normal:0, hard:0 },
    memoryMatch: { easy:0, normal:0, hard:0 },
    colorMixer: { easy:0, normal:0, hard:0 },
    fishingHole: { easy:0, normal:0, hard:0 },
    dotConnect: { easy:0, normal:0, hard:0 },
    slidingPuzzle: { easy:0, normal:0, hard:0 },
    patternMemory: { easy:0, normal:0, hard:0 },
    towerBuilder: { easy:0, normal:0, hard:0 },
    bubbleSort: { easy:0, normal:0, hard:0 },
    idleFarm: { easy:0, normal:0, hard:0 },
    laserDodge: { easy:0, normal:0, hard:0 },
    ninjaDash: { easy:0, normal:0, hard:0 },
    orbCatcher: { easy:0, normal:0, hard:0 },
    bladeSlice: { easy:0, normal:0, hard:0 },
    gravityFlip: { easy:0, normal:0, hard:0 },
    bulletStorm: { easy:0, normal:0, hard:0 },
    platformJumper: { easy:0, normal:0, hard:0 },
    pixelRunner: { easy:0, normal:0, hard:0 },
    chainReactor: { easy:0, normal:0, hard:0 },
    rocketDash: { easy:0, normal:0, hard:0 }
  };
}

function wbEnsureProfileShape(){
  if(!wbProfile.highScores) wbProfile.highScores = wbDefaultHighScores();
  if(!wbProfile.theme) wbProfile.theme = 'default';
  if(!wbProfile.bio) wbProfile.bio = '';
  if(!wbProfile.avatar) wbProfile.avatar = '';
  if(typeof wbProfile.secondsOnPage !== 'number') wbProfile.secondsOnPage = 0;
  if(typeof wbProfile.gamesPlayed !== 'number') wbProfile.gamesPlayed = 0;
  if(!wbProfile.achievements) wbProfile.achievements = {};
  // Backfill arcade records for new games on old saves
  if(!wbProfile.arcade) wbProfile.arcade = {};
  if(!wbProfile.arcade.botDefense) wbProfile.arcade.botDefense = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.botDefense) wbProfile.highScores.botDefense = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.crystalGarden) wbProfile.arcade.crystalGarden = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.crystalGarden) wbProfile.highScores.crystalGarden = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.memoryMatch) wbProfile.arcade.memoryMatch = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.memoryMatch) wbProfile.highScores.memoryMatch = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.colorMixer) wbProfile.arcade.colorMixer = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.colorMixer) wbProfile.highScores.colorMixer = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.fishingHole) wbProfile.arcade.fishingHole = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.fishingHole) wbProfile.highScores.fishingHole = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.dotConnect) wbProfile.arcade.dotConnect = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.dotConnect) wbProfile.highScores.dotConnect = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.slidingPuzzle) wbProfile.arcade.slidingPuzzle = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.slidingPuzzle) wbProfile.highScores.slidingPuzzle = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.patternMemory) wbProfile.arcade.patternMemory = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.patternMemory) wbProfile.highScores.patternMemory = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.towerBuilder) wbProfile.arcade.towerBuilder = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.towerBuilder) wbProfile.highScores.towerBuilder = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.bubbleSort) wbProfile.arcade.bubbleSort = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.bubbleSort) wbProfile.highScores.bubbleSort = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.idleFarm) wbProfile.arcade.idleFarm = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.idleFarm) wbProfile.highScores.idleFarm = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.laserDodge) wbProfile.arcade.laserDodge = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.laserDodge) wbProfile.highScores.laserDodge = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.ninjaDash) wbProfile.arcade.ninjaDash = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.ninjaDash) wbProfile.highScores.ninjaDash = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.orbCatcher) wbProfile.arcade.orbCatcher = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.orbCatcher) wbProfile.highScores.orbCatcher = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.bladeSlice) wbProfile.arcade.bladeSlice = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.bladeSlice) wbProfile.highScores.bladeSlice = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.gravityFlip) wbProfile.arcade.gravityFlip = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.gravityFlip) wbProfile.highScores.gravityFlip = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.bulletStorm) wbProfile.arcade.bulletStorm = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.bulletStorm) wbProfile.highScores.bulletStorm = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.platformJumper) wbProfile.arcade.platformJumper = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.platformJumper) wbProfile.highScores.platformJumper = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.pixelRunner) wbProfile.arcade.pixelRunner = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.pixelRunner) wbProfile.highScores.pixelRunner = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.chainReactor) wbProfile.arcade.chainReactor = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.chainReactor) wbProfile.highScores.chainReactor = { easy:0, normal:0, hard:0 };
  if(!wbProfile.arcade.rocketDash) wbProfile.arcade.rocketDash = { wins:0, losses:0, draws:0, kos:0, fights:0 };
  if(!wbProfile.highScores.rocketDash) wbProfile.highScores.rocketDash = { easy:0, normal:0, hard:0 };

  if(!wbProfile.specialAchievements) wbProfile.specialAchievements = {};
}

function wbRecordGameScore(gameKey, mode, rawScore){
  wbEnsureProfileShape();
  if(!wbProfile.highScores[gameKey]) wbProfile.highScores[gameKey] = {};
  var prev = wbProfile.highScores[gameKey][mode] || 0;
  if(rawScore > prev){
    wbProfile.highScores[gameKey][mode] = rawScore;
  }
  wbRenderLeaderboard();
  wbRenderUserScores();
  wbCheckAchievements();
  wbSaveProfile();
}

function wbCalcWeightedScore(gameKey, mode, rawScore){
  var mult = wbScoreRules.multipliers[mode] || 1;
  var bal = wbScoreRules.balance[gameKey] || 1;
  return Math.round(rawScore * mult * bal);
}

function wbRenderUserScores(){
  var container = document.getElementById('user-scores-list');
  if(!container) return;
  wbEnsureProfileShape();
  var games = [
    { key:'rooftopRumble', name:'Rooftop Rumble', sub:'wins/losses' },
    { key:'circuitRacer', name:'Neon Sprint', sub:'wins/losses' },
    { key:'neonBreaker', name:'Neon Breaker', sub:'bricks' },
    { key:'starfallDefender', name:'Starfall Defender', sub:'score' },
    { key:'circuitSnake', name:'Circuit Snake', sub:'tiles' },
    { key:'neonPong', name:'Neon Pong', sub:'wins' },
    { key:'meteorCommand', name:'Meteor Command', sub:'score' },
    { key:'stackSurge', name:'Stack Surge', sub:'height' }
  ];
  var html = '';
  for(var i=0; i<games.length; i++){
    var g = games[i];
    var rec = wbProfile.arcade[g.key];
    var fights = rec ? rec.fights : 0;
    var wins = rec ? rec.wins : 0;
    var losses = rec ? rec.losses : 0;
    html += '<div class="user-score-row">';
    html += '<div><div class="us-label">' + g.name + '</div><div class="us-sub">' + g.sub + '</div></div>';
    html += '<div class="us-val">' + wins + 'W / ' + losses + 'L</div>';
    html += '</div>';
  }
  container.innerHTML = html;
}

function wbRenderLeaderboard(){
  var container = document.getElementById('leaderboard-container');
  if(!container) return;
  wbEnsureProfileShape();
  var entries = [];
  var gameNames = {
    neonBreaker:'Neon Breaker', starfallDefender:'Starfall Defender', circuitSnake:'Circuit Snake',
    neonPong:'Neon Pong', meteorCommand:'Meteor Command', stackSurge:'Stack Surge',
    botDefense:'Bot Defense',
    rooftopRumble:'Rooftop Rumble', circuitRacer:'Neon Sprint', crystalGarden:'Crystal Garden', memoryMatch:'Memory Match', colorMixer:'Color Mixer', fishingHole:'Fishing Hole', dotConnect:'Dot Connect', slidingPuzzle:'Slide Puzzle', patternMemory:'Pattern Memory', towerBuilder:'Tower Builder', bubbleSort:'Bubble Sort', idleFarm:'Idle Farm', laserDodge:'Laser Dodge', ninjaDash:'Ninja Dash', orbCatcher:'Orb Catcher', bladeSlice:'Blade Slice', gravityFlip:'Gravity Flip', bulletStorm:'Bullet Storm', platformJumper:'Platform Jumper', pixelRunner:'Pixel Runner', chainReactor:'Chain Reactor', rocketDash:'Rocket Dash'
  };
  // Collect all high scores with weighted values
  var hs = wbProfile.highScores;
  for(var gameKey in hs){
    if(!hs.hasOwnProperty(gameKey)) continue;
    for(var mode in hs[gameKey]){
      if(!hs[gameKey].hasOwnProperty(mode)) continue;
      var raw = hs[gameKey][mode];
      if(raw <= 0) continue;
      var weighted = wbCalcWeightedScore(gameKey, mode, raw);
      entries.push({ game:gameNames[gameKey]||gameKey, mode:mode, raw:raw, weighted:weighted, gameKey:gameKey });
    }
  }
  // Also add win-based scores for Rooftop Rumble and Neon Sprint
  var rr = wbProfile.arcade.rooftopRumble;
  if(rr && rr.wins > 0){
    entries.push({ game:'Rooftop Rumble', mode:'default', raw:rr.wins*100, weighted:rr.wins*100, gameKey:'rooftopRumble' });
  }
  var cr = wbProfile.arcade.circuitRacer;
  if(cr && cr.wins > 0){
    entries.push({ game:'Neon Sprint', mode:'default', raw:cr.wins*100, weighted:cr.wins*100, gameKey:'circuitRacer' });
  }
  // Sort by weighted score descending
  entries.sort(function(a,b){ return b.weighted - a.weighted; });
  if(entries.length === 0){
    container.innerHTML = '<p style="color:var(--muted);font-size:13px">No scores yet. Play some games!</p>';
    return;
  }
  var html = '<table class="lb-table"><thead><tr><th>#</th><th>Game</th><th>Mode</th><th>Score</th></tr></thead><tbody>';
  for(var i=0; i<entries.length; i++){
    var e = entries[i];
    html += '<tr><td class="lb-rank">' + (i+1) + '</td><td class="lb-game">' + e.game + '</td><td class="lb-mode">' + e.mode + '</td><td class="lb-score">' + e.weighted + '</td></tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

function wbRenderScoreExplainer(){
  var container = document.getElementById('score-explainer');
  if(!container) return;
  var html = '';
  html += '<h4>Formula</h4>';
  html += '<div class="formula">General Score = Raw Score × Difficulty Multiplier × Game Balance</div>';
  html += '<h4>Difficulty Multipliers</h4>';
  html += '<div>easy/simple: 0.5x &middot; normal: 1x &middot; wrap: 1.5x &middot; speed: 1.5x &middot; hard: 2x &middot; survival: 2x &middot; extreme: 3x &middot; zen: 0.5x</div>';
  html += '<h4>Game Balance</h4>';
  html += '<div>Most games: 1x &middot; Meteor Command: 0.5x (less skill-based)</div>';
  html += '<h4>Examples</h4>';
  html += '<span class="example"><strong>Snake on Hard:</strong> 50 tiles × 2.0 (hard) × 1.0 (balance) = <strong>100 points</strong></span>';
  html += '<span class="example"><strong>Meteor on Normal:</strong> 100 score × 1.0 (normal) × 0.5 (balance) = <strong>50 points</strong></span>';
  html += '<span class="example"><strong>Breaker on Extreme:</strong> 80 bricks × 3.0 (extreme) × 1.0 (balance) = <strong>240 points</strong></span>';
  container.innerHTML = html;
}

function wbInitTheme(){
  wbEnsureProfileShape();
  var saved = wbProfile.theme || 'default';
  if(saved !== 'default'){
    document.documentElement.setAttribute('data-theme', saved);
  }
  var picker = document.getElementById('theme-picker');
  if(!picker) return;
  var chips = picker.querySelectorAll('.theme-chip');
  for(var i=0; i<chips.length; i++){
    chips[i].addEventListener('click', function(){
      var theme = this.getAttribute('data-theme');
      // Check time-lock for special themes
      var requiredTime = parseInt(this.getAttribute('data-required-time') || '0');
      if(requiredTime > 0 && (wbProfile.secondsOnPage || 0) < requiredTime){
        var minsNeeded = Math.ceil((requiredTime - (wbProfile.secondsOnPage || 0)) / 60);
        this.title = 'Locked — need ' + minsNeeded + ' more minutes in arcade';
        return; // Don't apply locked theme
      }
      // Update active state
      for(var j=0; j<chips.length; j++) chips[j].classList.remove('active');
      this.classList.add('active');
      // Apply theme
      if(theme === 'default'){
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
      // Save to profile
      wbProfile.theme = theme;
      wbCheckAchievements();
      wbSaveProfile();
    });
    if(chips[i].getAttribute('data-theme') === saved){
      for(var j=0; j<chips.length; j++) chips[j].classList.remove('active');
      chips[i].classList.add('active');
    }
  }
}

function wbInitMediaSelect(){
  var selectScreen = document.getElementById('media-select-screen');
  var videoContent = document.getElementById('media-video-content');
  var musicContent = document.getElementById('media-music-content');
  if(!selectScreen) return;
  var choices = selectScreen.querySelectorAll('.media-choice');
  for(var i=0; i<choices.length; i++){
    choices[i].addEventListener('click', function(){
      var media = this.getAttribute('data-media');
      selectScreen.style.display = 'none';
      if(media === 'video'){
        videoContent.style.display = 'block';
      } else if(media === 'music'){
        musicContent.style.display = 'block';
      }
    });
  }
  // Back buttons
  var backBtn = document.getElementById('media-back-btn');
  if(backBtn){
    backBtn.addEventListener('click', function(){
      videoContent.style.display = 'none';
      selectScreen.style.display = 'flex';
    });
  }
  var backBtn2 = document.getElementById('media-back-btn-2');
  if(backBtn2){
    backBtn2.addEventListener('click', function(){
      musicContent.style.display = 'none';
      selectScreen.style.display = 'flex';
    });
  }
}

function wbExportProfile(){
  wbProfile.updatedAt = Date.now();
  var data = JSON.stringify(wbProfile, null, 2);
  var blob = new Blob([data], { type:'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var safeName = (wbProfile.name || 'guest').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'guest';
  a.download = 'workbench-progress-' + safeName + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

function wbShowLoginStatus(msg, ok){
  var el = document.getElementById('login-status');
  if(!el) return;
  el.textContent = msg;
  el.className = 'login-status ' + (ok ? 'ok' : 'err');
}

(function wbWireLoginTab(){
  var fileInput = document.getElementById('login-file-input');
  var exportBtn = document.getElementById('login-export-btn');
  var resetBtn = document.getElementById('login-reset-btn');
  var nameInput = document.getElementById('login-name-input');

  if(nameInput) nameInput.addEventListener('input', function(){
    wbProfile.name = nameInput.value.trim() || 'Guest';
    var nameEl = document.getElementById('login-current-name');
    if(nameEl) nameEl.textContent = wbProfile.name;
    wbCheckAchievements();
    wbSaveProfile();
  });

  if(fileInput) fileInput.addEventListener('change', function(){
    var file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if(!file) return;
    if(file.size > 262144){ wbShowLoginStatus('That file is too large to be a progress file.', false); return; }
    var reader = new FileReader();
    reader.onload = function(){
      var parsed;
      try{ parsed = JSON.parse(reader.result); }
      catch(e){ wbShowLoginStatus('Could not read that file \u2014 not valid progress data.', false); return; }
      if(!parsed || typeof parsed !== 'object' || !parsed.arcade || !parsed.arcade.rooftopRumble){
        wbShowLoginStatus('That file doesn\u2019t look like a Workbench progress export.', false);
        return;
      }
      var rr = parsed.arcade.rooftopRumble;
      var cr = parsed.arcade.circuitRacer || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      var clean = wbDefaultProfile();
      clean.name = (typeof parsed.name === 'string' && parsed.name.trim()) ? parsed.name.trim().slice(0,24) : 'Guest';
      clean.createdAt = (typeof parsed.createdAt === 'number') ? parsed.createdAt : Date.now();
      clean.arcade.rooftopRumble = {
        wins: Math.max(0, parseInt(rr.wins,10) || 0),
        losses: Math.max(0, parseInt(rr.losses,10) || 0),
        draws: Math.max(0, parseInt(rr.draws,10) || 0),
        kos: Math.max(0, parseInt(rr.kos,10) || 0),
        fights: Math.max(0, parseInt(rr.fights,10) || 0)
      };
      clean.arcade.circuitRacer = {
        wins: Math.max(0, parseInt(cr.wins,10) || 0),
        losses: Math.max(0, parseInt(cr.losses,10) || 0),
        draws: Math.max(0, parseInt(cr.draws,10) || 0),
        kos: Math.max(0, parseInt(cr.kos,10) || 0),
        fights: Math.max(0, parseInt(cr.fights,10) || 0)
      };
      var nb = parsed.arcade.neonBreaker || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      clean.arcade.neonBreaker = {
        wins: Math.max(0, parseInt(nb.wins,10) || 0),
        losses: Math.max(0, parseInt(nb.losses,10) || 0),
        draws: Math.max(0, parseInt(nb.draws,10) || 0),
        kos: Math.max(0, parseInt(nb.kos,10) || 0),
        fights: Math.max(0, parseInt(nb.fights,10) || 0)
      };
      var sd = parsed.arcade.starfallDefender || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      clean.arcade.starfallDefender = {
        wins: Math.max(0, parseInt(sd.wins,10) || 0),
        losses: Math.max(0, parseInt(sd.losses,10) || 0),
        draws: Math.max(0, parseInt(sd.draws,10) || 0),
        kos: Math.max(0, parseInt(sd.kos,10) || 0),
        fights: Math.max(0, parseInt(sd.fights,10) || 0)
      };
      var cs = parsed.arcade.circuitSnake || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      clean.arcade.circuitSnake = {
        wins: Math.max(0, parseInt(cs.wins,10) || 0),
        losses: Math.max(0, parseInt(cs.losses,10) || 0),
        draws: Math.max(0, parseInt(cs.draws,10) || 0),
        kos: Math.max(0, parseInt(cs.kos,10) || 0),
        fights: Math.max(0, parseInt(cs.fights,10) || 0)
      };
      var np = parsed.arcade.neonPong || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      clean.arcade.neonPong = {
        wins: Math.max(0, parseInt(np.wins,10) || 0),
        losses: Math.max(0, parseInt(np.losses,10) || 0),
        draws: Math.max(0, parseInt(np.draws,10) || 0),
        kos: Math.max(0, parseInt(np.kos,10) || 0),
        fights: Math.max(0, parseInt(np.fights,10) || 0)
      };
      var mt = parsed.arcade.meteorCommand || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      clean.arcade.meteorCommand = {
        wins: Math.max(0, parseInt(mt.wins,10) || 0),
        losses: Math.max(0, parseInt(mt.losses,10) || 0),
        draws: Math.max(0, parseInt(mt.draws,10) || 0),
        kos: Math.max(0, parseInt(mt.kos,10) || 0),
        fights: Math.max(0, parseInt(mt.fights,10) || 0)
      };
      var su = parsed.arcade.stackSurge || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      clean.arcade.stackSurge = {
        wins: Math.max(0, parseInt(su.wins,10) || 0),
        losses: Math.max(0, parseInt(su.losses,10) || 0),
        draws: Math.max(0, parseInt(su.draws,10) || 0),
        kos: Math.max(0, parseInt(su.kos,10) || 0),
        fights: Math.max(0, parseInt(su.fights,10) || 0)
      };
      var zc = parsed.arcade.botDefense || { wins:0, losses:0, draws:0, kos:0, fights:0 };
      clean.arcade.botDefense = {
        wins: Math.max(0, parseInt(zc.wins,10) || 0),
        losses: Math.max(0, parseInt(zc.losses,10) || 0),
        draws: Math.max(0, parseInt(zc.draws,10) || 0),
        kos: Math.max(0, parseInt(zc.kos,10) || 0),
        fights: Math.max(0, parseInt(zc.fights,10) || 0)
      };
      // Restore high scores if present
      if(parsed.arcade.highScores || parsed.highScores){
        var importedHS = parsed.arcade.highScores || parsed.highScores;
        var defaultHS = wbDefaultHighScores();
        clean.highScores = {};
        for(var hk in defaultHS){
          clean.highScores[hk] = {};
          for(var hm in defaultHS[hk]){
            clean.highScores[hk][hm] = (importedHS[hk] && importedHS[hk][hm]) ? Math.max(0, parseInt(importedHS[hk][hm],10) || 0) : 0;
          }
        }
      } else {
        clean.highScores = wbDefaultHighScores();
      }
      // Restore theme if present
      if(parsed.theme){
        clean.theme = parsed.theme;
      } else {
        clean.theme = 'default';
      }
      wbProfile = clean;
      wbSaveProfile();
      wbEnsureProfileShape();
      wbRenderArcadeRecord();
      wbRenderLoginPanel();
      wbRenderUserScores();
      wbRenderLeaderboard();
      wbRenderAchievements();
      wbRenderProfilePic();
      wbCheckAchievements();
      wbInitTheme();
      wbShowLoginStatus('Logged in \u2014 welcome back, ' + wbProfile.name + '. Record restored.', true);
    };
    reader.onerror = function(){ wbShowLoginStatus('Could not read that file.', false); };
    reader.readAsText(file);
  });

  if(exportBtn) exportBtn.addEventListener('click', function(){
    wbExportProfile();
    wbShowLoginStatus('Progress exported \u2014 check your downloads.', true);
  });

  if(resetBtn) resetBtn.addEventListener('click', function(){
    wbProfile = wbDefaultProfile();
    wbSaveProfile();
    wbEnsureProfileShape();
    wbRenderArcadeRecord();
    wbRenderLoginPanel();
    wbRenderUserScores();
    wbRenderLeaderboard();
    wbRenderAchievements();
    wbRenderProfilePic();
    var ttEl = document.getElementById('time-tracker-value');
    if(ttEl) ttEl.textContent = wbFormatTime(0);
    wbShowLoginStatus('Starting fresh as Guest.', true);
  });
})();

wbEnsureProfileShape();
wbRenderArcadeRecord();
wbRenderLoginPanel();
wbRenderUserScores();
wbRenderLeaderboard();
wbRenderScoreExplainer();
wbInitTheme();
wbInitMediaSelect();

/* ---- Achievements system ---- */
var wbAchievements = [
  { id:'first_game', icon:'🎮', name:'First Steps', desc:'Play your first arcade game', test:function(s){ return s.gamesPlayed >= 1; }, progress:function(s){ return Math.min(1, s.gamesPlayed/1); } },
  { id:'five_games', icon:'🎯', name:'Getting Warm', desc:'Play 5 arcade games', test:function(s){ return s.gamesPlayed >= 5; }, progress:function(s){ return Math.min(1, s.gamesPlayed/5); } },
  { id:'twenty_games', icon:'🔥', name:'Arcade Regular', desc:'Play 20 arcade games', test:function(s){ return s.gamesPlayed >= 20; }, progress:function(s){ return Math.min(1, s.gamesPlayed/20); } },
  { id:'fifty_games', icon:'💎', name:'Arcade Legend', desc:'Play 50 arcade games', test:function(s){ return s.gamesPlayed >= 50; }, progress:function(s){ return Math.min(1, s.gamesPlayed/50); } },
  { id:'all_games', icon:'🎪', name:'Sampling the Menu', desc:'Play all 29 different cabinets', test:function(s){ return s.gamesPlayedByType && Object.keys(s.gamesPlayedByType).length >= 29; }, progress:function(s){ return Math.min(1, (s.gamesPlayedByType?Object.keys(s.gamesPlayedByType).length:0)/29); } },
  { id:'time_1min', icon:'⏱️', name:'Settled In', desc:'Spend 1 minute in the arcade', test:function(s){ return s.secondsOnPage >= 60; }, progress:function(s){ return Math.min(1, s.secondsOnPage/60); } },
  { id:'time_10min', icon:'📚', name:'Bookworm', desc:'Spend 10 minutes in the arcade', test:function(s){ return s.secondsOnPage >= 600; }, progress:function(s){ return Math.min(1, s.secondsOnPage/600); } },
  { id:'time_1hr', icon:'🧘', name:'Dedicated', desc:'Spend 1 hour in the arcade', test:function(s){ return s.secondsOnPage >= 3600; }, progress:function(s){ return Math.min(1, s.secondsOnPage/3600); } },
  { id:'time_5hr', icon:'🪑', name:'Marathon Runner', desc:'Spend 5 hours in the arcade', test:function(s){ return s.secondsOnPage >= 18000; }, progress:function(s){ return Math.min(1, s.secondsOnPage/18000); } },
  { id:'first_win', icon:'🏆', name:'First Victory', desc:'Win your first game', test:function(s){ return s.totalWins >= 1; }, progress:function(s){ return Math.min(1, s.totalWins/1); } },
  { id:'ten_wins', icon:'🥇', name:'Champion', desc:'Win 10 games total', test:function(s){ return s.totalWins >= 10; }, progress:function(s){ return Math.min(1, s.totalWins/10); } },
  { id:'twentyfive_wins', icon:'👑', name:'Arcade King', desc:'Win 25 games total', test:function(s){ return s.totalWins >= 25; }, progress:function(s){ return Math.min(1, s.totalWins/25); } },
  { id:'score_100', icon:'💯', name:'Centurion', desc:'Score 100+ points in a single game', test:function(s){ return s.bestSingleScore >= 100; }, progress:function(s){ return Math.min(1, s.bestSingleScore/100); } },
  { id:'score_500', icon:'🌟', name:'High Roller', desc:'Score 500+ points in a single game', test:function(s){ return s.bestSingleScore >= 500; }, progress:function(s){ return Math.min(1, s.bestSingleScore/500); } },
  { id:'score_1000', icon:'⚡', name:'Score Master', desc:'Score 1000+ points in a single game', test:function(s){ return s.bestSingleScore >= 1000; }, progress:function(s){ return Math.min(1, s.bestSingleScore/1000); } },
  { id:'breaker_clear', icon:'🧱', name:'Wall Breaker', desc:'Clear all bricks in Neon Breaker', test:function(s){ return s.specialAchievements && s.specialAchievements.breakerClear; }, progress:function(s){ return (s.specialAchievements && s.specialAchievements.breakerClear) ? 1 : 0; } },
  { id:'snake_20', icon:'🐍', name:'Long Snake', desc:'Reach length 20 in Circuit Snake', test:function(s){ return s.specialAchievements && s.specialAchievements.snake20; }, progress:function(s){ return (s.specialAchievements && s.specialAchievements.snake20) ? 1 : 0; } },
  { id:'pong_shutout', icon:'🏓', name:'Flawless Victory', desc:'Win Neon Pong 7-0', test:function(s){ return s.specialAchievements && s.specialAchievements.pongShutout; }, progress:function(s){ return (s.specialAchievements && s.specialAchievements.pongShutout) ? 1 : 0; } },
  { id:'profile_pic', icon:'📷', name:'Picture Perfect', desc:'Upload a profile picture', test:function(s){ return !!s.avatar; }, progress:function(s){ return s.avatar ? 1 : 0; } },
  { id:'named', icon:'✏️', name:'Identity', desc:'Set a custom display name', test:function(s){ return s.name && s.name !== 'Guest'; }, progress:function(s){ return (s.name && s.name !== 'Guest') ? 1 : 0; } },
  { id:'themed', icon:'🎨', name:'Stylist', desc:'Change your color theme', test:function(s){ return s.theme && s.theme !== 'default'; }, progress:function(s){ return (s.theme && s.theme !== 'default') ? 1 : 0; } },
  { id:'zombie_survivor', icon:'🧟', name:'Zombie Survivor', desc:'Survive 60 seconds in Bot Defense', test:function(s){ return s.specialAchievements && s.specialAchievements.zombieSurvivor; }, progress:function(s){ return (s.specialAchievements && s.specialAchievements.zombieSurvivor) ? 1 : 0; } },
  { id:'zombie_slayer', icon:'💀', name:'Zombie Slayer', desc:'Kill 50 zombies in one game', test:function(s){ return s.specialAchievements && s.specialAchievements.zombieSlayer; }, progress:function(s){ return (s.specialAchievements && s.specialAchievements.zombieSlayer) ? 1 : 0; } },
  { id:'zombie_master', icon:'⚔️', name:'Zombie Master', desc:'Survive 120 seconds in Bot Defense', test:function(s){ return s.specialAchievements && s.specialAchievements.zombieMaster; }, progress:function(s){ return (s.specialAchievements && s.specialAchievements.zombieMaster) ? 1 : 0; } },
  { id:'time_2hr', icon:'🌙', name:'Night Owl', desc:'Spend 2 hours in the arcade', test:function(s){ return s.secondsOnPage >= 7200; }, progress:function(s){ return Math.min(1, s.secondsOnPage/7200); } },
  { id:'time_10hr', icon:'🏰', name:'Castle Dweller', desc:'Spend 10 hours in the arcade', test:function(s){ return s.secondsOnPage >= 36000; }, progress:function(s){ return Math.min(1, s.secondsOnPage/36000); } },
  { id:'score_2000', icon:'💫', name:'Score God', desc:'Score 2000+ points in a single game', test:function(s){ return s.bestSingleScore >= 2000; }, progress:function(s){ return Math.min(1, s.bestSingleScore/2000); } },
  { id:'fifty_wins', icon:'💎', name:'Unstoppable', desc:'Win 50 games total', test:function(s){ return s.totalWins >= 50; }, progress:function(s){ return Math.min(1, s.totalWins/50); } },
  { id:'all_games_9', icon:'🎰', name:'Full House', desc:'Play all 29 different cabinets', test:function(s){ return s.gamesPlayedByType && Object.keys(s.gamesPlayedByType).length >= 29; }, progress:function(s){ return Math.min(1, (s.gamesPlayedByType?Object.keys(s.gamesPlayedByType).length:0)/29); } },
  { id:'half_achievements', icon:'🏅', name:'Completionist', desc:'Unlock half of all achievements', test:function(s){ return s.unlockedCount >= Math.ceil(wbAchievements.length/2); }, progress:function(s){ return Math.min(1, s.unlockedCount/Math.ceil(wbAchievements.length/2)); } },
  { id:'all_achievements', icon:'💎', name:'Perfectionist', desc:'Unlock all achievements', test:function(s){ return s.unlockedCount >= wbAchievements.length - 1; }, progress:function(s){ return Math.min(1, s.unlockedCount/(wbAchievements.length-1)); } }
];

function wbGetAchievementState(){
  wbEnsureProfileShape();
  var s = {
    gamesPlayed: wbProfile.gamesPlayed || 0,
    secondsOnPage: wbProfile.secondsOnPage || 0,
    totalWins: 0,
    bestSingleScore: 0,
    avatar: wbProfile.avatar,
    name: wbProfile.name,
    theme: wbProfile.theme,
    gamesPlayedByType: wbProfile.gamesPlayedByType || {},
    specialAchievements: wbProfile.specialAchievements || {},
    unlockedCount: 0
  };
  for(var k in wbProfile.arcade){
    if(wbProfile.arcade.hasOwnProperty(k)){
      s.totalWins += (wbProfile.arcade[k].wins || 0);
    }
  }
  if(wbProfile.highScores){
    for(var gk in wbProfile.highScores){
      if(!wbProfile.highScores.hasOwnProperty(gk)) continue;
      for(var mk in wbProfile.highScores[gk]){
        if(!wbProfile.highScores[gk].hasOwnProperty(mk)) continue;
        var sc = wbProfile.highScores[gk][mk];
        if(sc > s.bestSingleScore) s.bestSingleScore = sc;
      }
    }
  }
  for(var i=0;i<wbAchievements.length;i++){
    var ach = wbAchievements[i];
    if(wbProfile.achievements[ach.id]) s.unlockedCount++;
  }
  return s;
}

function wbCheckAchievements(){
  wbEnsureProfileShape();
  var s = wbGetAchievementState();
  for(var i=0;i<wbAchievements.length;i++){
    var ach = wbAchievements[i];
    if(!wbProfile.achievements[ach.id] && ach.test(s)){
      wbProfile.achievements[ach.id] = Date.now();
      wbSaveProfile();
      wbShowAchievementToast(ach);
    }
  }
  wbRenderAchievements();
}

function wbShowAchievementToast(ach){
  var toast = document.getElementById('achievement-toast');
  var icon = document.getElementById('at-icon');
  var name = document.getElementById('at-name');
  var desc = document.getElementById('at-desc');
  if(!toast) return;
  if(icon) icon.textContent = ach.icon;
  if(name) name.textContent = ach.name;
  if(desc) desc.textContent = ach.desc;
  toast.classList.add('show');
  setTimeout(function(){ toast.classList.remove('show'); }, 3500);
}

function wbRenderAchievements(){
  var grid = document.getElementById('achievements-grid');
  var summary = document.getElementById('ach-summary');
  if(!grid) return;
  var s = wbGetAchievementState();
  var html = '';
  var unlocked = 0;
  for(var i=0;i<wbAchievements.length;i++){
    var ach = wbAchievements[i];
    var isUnlocked = !!wbProfile.achievements[ach.id];
    if(isUnlocked) unlocked++;
    var progress = ach.progress ? ach.progress(s) : (isUnlocked?1:0);
    var pct = Math.round(progress*100);
    html += '<div class="ach-card ' + (isUnlocked?'unlocked':'locked') + '">';
    html += '<div class="ach-icon">' + ach.icon + '</div>';
    html += '<div class="ach-name">' + ach.name + '</div>';
    html += '<div class="ach-desc">' + ach.desc + '</div>';
    if(isUnlocked){
      var d = new Date(wbProfile.achievements[ach.id]);
      html += '<div class="ach-date">' + (d.getMonth()+1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2) + '</div>';
    } else if(pct > 0 && pct < 100){
      html += '<div class="ach-progress"><div class="ach-progress-fill" style="width:' + pct + '%"></div></div>';
    }
    html += '</div>';
  }
  grid.innerHTML = html;
  if(summary) summary.textContent = unlocked + ' / ' + wbAchievements.length + ' unlocked';
}

/* ---- Game tracking hook ---- */
function wbTrackGamePlayed(gameKey){
  wbEnsureProfileShape();
  wbProfile.gamesPlayed = (wbProfile.gamesPlayed || 0) + 1;
  if(!wbProfile.firstGamePlayedAt) wbProfile.firstGamePlayedAt = Date.now();
  if(!wbProfile.gamesPlayedByType) wbProfile.gamesPlayedByType = {};
  wbProfile.gamesPlayedByType[gameKey] = (wbProfile.gamesPlayedByType[gameKey] || 0) + 1;
  wbCheckAchievements();
  wbSaveProfile();
}

function wbTrackSpecialAchievement(key){
  wbEnsureProfileShape();
  if(!wbProfile.specialAchievements) wbProfile.specialAchievements = {};
  wbProfile.specialAchievements[key] = true;
  wbCheckAchievements();
  wbSaveProfile();
}

/* ---- Time tracking ---- */
var wbTimeTrackerInterval = null;
function wbFormatTime(seconds){
  if(seconds < 60) return seconds + 's';
  if(seconds < 3600) return Math.floor(seconds/60) + 'm ' + (seconds%60) + 's';
  var h = Math.floor(seconds/3600);
  var m = Math.floor((seconds%3600)/60);
  return h + 'h ' + m + 'm';
}
function wbInitTimeTracker(){
  wbEnsureProfileShape();
  var el = document.getElementById('time-tracker-value');
  var dayEl = document.getElementById('day-tracker-value');
  var bannerEl = document.getElementById('banner-unlocks');
  if(el) el.textContent = wbFormatTime(wbProfile.secondsOnPage || 0);
  if(dayEl) dayEl.textContent = 'Day ' + (window.__workbenchDay || 1);
  // Update banner unlocks
  if(bannerEl){
    var totalPoints = (wbProfile.totalPoints || 0);
    var banners = [
      { threshold:0, name:'Default Banner', unlocked:true },
      { threshold:100, name:'Bronze Banner', unlocked: totalPoints >= 100 },
      { threshold:300, name:'Silver Banner', unlocked: totalPoints >= 300 },
      { threshold:600, name:'Gold Banner', unlocked: totalPoints >= 600 },
      { threshold:1000, name:'Platinum Banner', unlocked: totalPoints >= 1000 }
    ];
    bannerEl.innerHTML = banners.map(function(b){
      return (b.unlocked ? '✅' : '🔒') + ' ' + b.name + ' (' + b.threshold + ' pts)';
    }).join('<br>');
  }
  if(wbTimeTrackerInterval) clearInterval(wbTimeTrackerInterval);
  wbTimeTrackerInterval = setInterval(function(){
    wbProfile.secondsOnPage = (wbProfile.secondsOnPage || 0) + 1;
    if(el) el.textContent = wbFormatTime(wbProfile.secondsOnPage);
    if(dayEl) dayEl.textContent = 'Day ' + (window.__workbenchDay || 1);
    // Update total points from scores
    var totalPts = 0;
    if(wbProfile.highScores){
      for(var gk in wbProfile.highScores){
        if(!wbProfile.highScores.hasOwnProperty(gk)) continue;
        for(var mk in wbProfile.highScores[gk]){
          if(!wbProfile.highScores[gk].hasOwnProperty(mk)) continue;
          totalPts += wbProfile.highScores[gk][mk];
        }
      }
    }
    wbProfile.totalPoints = totalPts;
    // Update banner unlocks display
    if(bannerEl){
      var banners = [
        { threshold:0, name:'Default Banner', unlocked:true },
        { threshold:100, name:'Bronze Banner', unlocked: totalPts >= 100 },
        { threshold:300, name:'Silver Banner', unlocked: totalPts >= 300 },
        { threshold:600, name:'Gold Banner', unlocked: totalPts >= 600 },
        { threshold:1000, name:'Platinum Banner', unlocked: totalPts >= 1000 }
      ];
      bannerEl.innerHTML = banners.map(function(b){
        return (b.unlocked ? '✅' : '🔒') + ' ' + b.name + ' (' + b.threshold + ' pts)';
      }).join('<br>');
    }
    if(wbProfile.secondsOnPage % 5 === 0){ wbCheckAchievements(); wbSaveProfile(); }
  }, 1000);
  window.addEventListener('beforeunload', function(){
    wbEnsureProfileShape();
  });
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'hidden') wbEnsureProfileShape();
  });
}

/* ---- Profile picture handling ---- */
function wbInitProfilePic(){
  var input = document.getElementById('profile-pic-input');
  var removeBtn = document.getElementById('profile-pic-remove');
  if(input) input.addEventListener('change', function(){
    var file = input.files && input.files[0];
    input.value = '';
    if(!file) return;
    if(!file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function(){
      var img = new Image();
      img.onload = function(){
        var canvas = document.createElement('canvas');
        var size = 256;
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var min = Math.min(img.width, img.height);
        var sx = (img.width - min) / 2;
        var sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        wbProfile.avatar = canvas.toDataURL('image/jpeg', 0.85);
        wbRenderProfilePic();
        wbCheckAchievements();
        wbSaveProfile();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  if(removeBtn) removeBtn.addEventListener('click', function(){
    wbProfile.avatar = '';
    wbRenderProfilePic();
    wbCheckAchievements();
    wbSaveProfile();
  });
  wbRenderProfilePic();
}

function wbRenderProfilePic(){
  var wrap = document.getElementById('profile-pic-wrap');
  var removeBtn = document.getElementById('profile-pic-remove');
  if(!wrap) return;
  if(wbProfile.avatar){
    wrap.innerHTML = '<img src="' + wbProfile.avatar + '" alt="Profile">';
    if(removeBtn) removeBtn.style.display = 'block';
  } else {
    wrap.innerHTML = '<div class="pp-placeholder">👤</div>';
    if(removeBtn) removeBtn.style.display = 'none';
  }
}

/* ---- Share card generation ---- */
function wbGenerateShareCard(){
  var canvas = document.getElementById('share-card-canvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 480, H = 640;
  canvas.width = W; canvas.height = H;
  // Background gradient
  var grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#12161d');
  grad.addColorStop(0.5, '#1b212b');
  grad.addColorStop(1, '#12161d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Decorative glow
  var glowGrad = ctx.createRadialGradient(W*0.7, 80, 20, W*0.7, 80, 200);
  glowGrad.addColorStop(0, 'rgba(224,164,88,0.2)');
  glowGrad.addColorStop(1, 'rgba(224,164,88,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, 200);
  // Border
  ctx.strokeStyle = '#e0a458';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, W-16, H-16);
  // Banner ribbon at top
  var totalPts = 0;
  if(wbProfile.highScores){
    for(var gk in wbProfile.highScores){
      if(!wbProfile.highScores.hasOwnProperty(gk)) continue;
      for(var mk in wbProfile.highScores[gk]){
        if(!wbProfile.highScores[gk].hasOwnProperty(mk)) continue;
        totalPts += wbProfile.highScores[gk][mk];
      }
    }
  }
  var bannerName = 'Default';
  var bannerColor = '#5fd4c7';
  if(totalPts >= 1000){ bannerName = 'PLATINUM'; bannerColor = '#e5e4e2'; }
  else if(totalPts >= 600){ bannerName = 'GOLD'; bannerColor = '#ffd700'; }
  else if(totalPts >= 300){ bannerName = 'SILVER'; bannerColor = '#c0c0c0'; }
  else if(totalPts >= 100){ bannerName = 'BRONZE'; bannerColor = '#cd7f32'; }
  // Draw banner ribbon
  ctx.fillStyle = bannerColor;
  ctx.beginPath();
  ctx.moveTo(30, 85); ctx.lineTo(W-30, 85); ctx.lineTo(W-40, 100); ctx.lineTo(W/2+20, 100);
  ctx.lineTo(W/2, 115); ctx.lineTo(W/2-20, 100); ctx.lineTo(40, 100); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#12161d';
  ctx.font = 'bold 11px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(bannerName + ' BANNER', W/2, 98);
  // Header
  ctx.fillStyle = '#e8e6df';
  ctx.font = 'bold 28px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ARCADE PROFILE', W/2, 50);
  ctx.fillStyle = '#8b93a1';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Stark Enterprises Workbench', W/2, 72);
  // Profile picture
  var picX = W/2, picY = 145, picR = 55;
  if(wbProfile.avatar){
    var img = new Image();
    img.onload = function(){
      ctx.save();
      ctx.beginPath();
      ctx.arc(picX, picY, picR, 0, Math.PI*2);
      ctx.clip();
      ctx.drawImage(img, picX-picR, picY-picR, picR*2, picR*2);
      ctx.restore();
      ctx.strokeStyle = '#e0a458';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(picX, picY, picR, 0, Math.PI*2);
      ctx.stroke();
      wbDrawShareCardText(ctx, W, H, picY);
    };
    img.src = wbProfile.avatar;
  } else {
    // Draw placeholder circle
    ctx.fillStyle = '#232a35';
    ctx.beginPath();
    ctx.arc(picX, picY, picR, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#e0a458';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#8b93a1';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', picX, picY);
    ctx.textBaseline = 'alphabetic';
    wbDrawShareCardText(ctx, W, H, picY);
  }
}

function wbDrawShareCardText(ctx, W, H, picY){
  // Name
  ctx.fillStyle = '#e8e6df';
  ctx.font = 'bold 24px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(wbProfile.name || 'Guest', W/2, picY + 85);
  // Bio
  if(wbProfile.bio){
    ctx.fillStyle = '#8b93a1';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(wbProfile.bio, W/2, picY + 105);
  }
  // Divider line
  ctx.strokeStyle = '#2e3846';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, picY + 125);
  ctx.lineTo(W-40, picY + 125);
  ctx.stroke();
  // Stats
  var s = wbGetAchievementState();
  var statsY = picY + 155;
  var stats = [
    ['Games Played', s.gamesPlayed],
    ['Total Wins', s.totalWins],
    ['Best Score', s.bestSingleScore],
    ['Time Spent', wbFormatTime(s.secondsOnPage)]
  ];
  ctx.textAlign = 'left';
  for(var i=0;i<stats.length;i++){
    var y = statsY + i*32;
    ctx.fillStyle = '#8b93a1';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText(stats[i][0], 50, y);
    ctx.fillStyle = '#5fd4c7';
    ctx.font = 'bold 16px Space Grotesk, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(stats[i][1]), W-50, y);
    ctx.textAlign = 'left';
  }
  // Achievements
  var achY = statsY + stats.length*32 + 20;
  ctx.strokeStyle = '#2e3846';
  ctx.beginPath();
  ctx.moveTo(40, achY-10);
  ctx.lineTo(W-40, achY-10);
  ctx.stroke();
  ctx.fillStyle = '#e0a458';
  ctx.font = 'bold 14px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Achievements: ' + s.unlockedCount + ' / ' + wbAchievements.length, W/2, achY+10);
  // Top 3 leaderboard entries
  var lbY = achY + 35;
  ctx.fillStyle = '#8b93a1';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'left';
  var entries = [];
  if(wbProfile.highScores){
    var gameNames = { neonBreaker:'Neon Breaker', starfallDefender:'Starfall Defender', circuitSnake:'Circuit Snake', neonPong:'Neon Pong', meteorCommand:'Meteor Command', stackSurge:'Stack Surge', rooftopRumble:'Rooftop Rumble', circuitRacer:'Neon Sprint', botDefense:'Bot Defense', crystalGarden:'Crystal Garden', memoryMatch:'Memory Match', colorMixer:'Color Mixer', fishingHole:'Fishing Hole', dotConnect:'Dot Connect', slidingPuzzle:'Slide Puzzle', patternMemory:'Pattern Memory', towerBuilder:'Tower Builder', bubbleSort:'Bubble Sort', idleFarm:'Idle Farm', laserDodge:'Laser Dodge', ninjaDash:'Ninja Dash', orbCatcher:'Orb Catcher', bladeSlice:'Blade Slice', gravityFlip:'Gravity Flip', bulletStorm:'Bullet Storm', platformJumper:'Platform Jumper', pixelRunner:'Pixel Runner', chainReactor:'Chain Reactor', rocketDash:'Rocket Dash' };
    for(var gk in wbProfile.highScores){
      if(!wbProfile.highScores.hasOwnProperty(gk)) continue;
      for(var mk in wbProfile.highScores[gk]){
        if(!wbProfile.highScores[gk].hasOwnProperty(mk)) continue;
        var raw = wbProfile.highScores[gk][mk];
        if(raw > 0) entries.push({ game:gameNames[gk]||gk, mode:mk, score:raw });
      }
    }
  }
  entries.sort(function(a,b){ return b.score - a.score; });
  var topN = Math.min(3, entries.length);
  ctx.fillStyle = '#e0a458';
  ctx.font = 'bold 13px Space Grotesk, sans-serif';
  ctx.fillText('Top Scores', 50, lbY);
  for(var j=0;j<topN;j++){
    var e = entries[j];
    var ly = lbY + 22 + j*20;
    ctx.fillStyle = '#e8e6df';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((j+1) + '. ' + e.game + ' (' + e.mode + ')', 50, ly);
    ctx.fillStyle = '#5fd4c7';
    ctx.textAlign = 'right';
    ctx.fillText(String(e.score), W-50, ly);
  }
  ctx.textAlign = 'left';
  // Footer
  ctx.fillStyle = '#8b93a1';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generated ' + new Date().toLocaleDateString(), W/2, H-25);
}

function wbInitShareCard(){
  // Use event delegation so listeners work even if buttons are re-rendered
  document.addEventListener('click', function(e){
    var t = e.target;
    if(!t) return;
    if(t.id === 'share-card-btn'){
      wbGenerateShareCard();
      var m = document.getElementById('share-card-modal');
      if(m) m.classList.add('on');
    }
    if(t.id === 'share-card-close'){
      var mc = document.getElementById('share-card-modal');
      if(mc) mc.classList.remove('on');
    }
    if(t.id === 'share-card-download'){
      var dlCanvas = document.getElementById('share-card-canvas');
      if(!dlCanvas) return;
      dlCanvas.toBlob(function(blob){
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var safeName = (wbProfile.name || 'guest').toLowerCase().replace(/[^a-z0-9_-]+/g,'-') || 'guest';
        a.download = 'arcade-card-' + safeName + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
      }, 'image/png');
    }
    if(t.id === 'share-card-copy'){
      var s = wbGetAchievementState();
      var totalPts = 0;
      if(wbProfile.highScores){
        for(var gk in wbProfile.highScores){
          if(!wbProfile.highScores.hasOwnProperty(gk)) continue;
          for(var mk in wbProfile.highScores[gk]){
            if(!wbProfile.highScores[gk].hasOwnProperty(mk)) continue;
            totalPts += wbProfile.highScores[gk][mk];
          }
        }
      }
      var bn = 'Default';
      if(totalPts >= 1000) bn = 'Platinum';
      else if(totalPts >= 600) bn = 'Gold';
      else if(totalPts >= 300) bn = 'Silver';
      else if(totalPts >= 100) bn = 'Bronze';
      var text = '\uD83C\uDFAE Arcade Profile: ' + (wbProfile.name||'Guest') + '\n' +
        'Games Played: ' + s.gamesPlayed + '\n' +
        'Total Wins: ' + s.totalWins + '\n' +
        'Best Score: ' + s.bestSingleScore + '\n' +
        'Time Spent: ' + wbFormatTime(s.secondsOnPage) + '\n' +
        'Achievements: ' + s.unlockedCount + ' / ' + wbAchievements.length + '\n' +
        'Banner: ' + bn + '\n' +
        'Game Day: ' + (window.__workbenchDay || 1) + '\n' +
        '— Generated by Workbench Arcade';
      if(navigator.clipboard){
        navigator.clipboard.writeText(text).then(function(){});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); }catch(e){}
        document.body.removeChild(ta);
      }
    }
    if(t.id === 'share-card-web-share'){
      var webCanvas = document.getElementById('share-card-canvas');
      if(!webCanvas || !navigator.share) return;
      webCanvas.toBlob(function(blob){
        var file = new File([blob], 'arcade-card.png', { type:'image/png' });
        if(navigator.canShare && navigator.canShare({ files:[file] })){
          navigator.share({ files:[file], title:'My Arcade Profile', text:'Check out my arcade stats!' }).catch(function(){});
        } else {
          navigator.share({ title:'My Arcade Profile', text:'I\'ve played ' + (wbProfile.gamesPlayed||0) + ' arcade games!' }).catch(function(){});
        }
      }, 'image/png');
    }
  });
}

/* ---- Initialize new features ---- */
wbInitTimeTracker();
wbInitProfilePic();
wbInitShareCard();
wbRenderAchievements();
wbCheckAchievements();

/* ---- Arcade cabinet #1: Rooftop Rumble ---- */
(function(){
  var acSlot1 = document.getElementById('ac-slot-1');
  var acOverlay = document.getElementById('ac-overlay');
  var acRaf = null;
  var acKeys = {};
  var acMode = null; // 'pvp' | 'easy' | 'hard'
  var acImpactCB = null; // set fresh each fight; used by acTryHit to spawn fx

  function acOnKeyDown(e){ acKeys[e.key.toLowerCase()] = true; }
  function acOnKeyUp(e){ acKeys[e.key.toLowerCase()] = false; }

  function acRenderTile(){
    acSlot1.innerHTML =
      '<div class="ac-bubble" id="ac-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">ROOFTOP RUMBLE</div>' +
          '<div class="ac-sub">fighting &middot; articulated combat</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><circle cx="17" cy="8" r="6" fill="#5fd4c7"/><rect x="10" y="16" width="14" height="20" rx="4" fill="#5fd4c7"/></svg>' +
            '<svg viewBox="0 0 34 44"><circle cx="17" cy="8" r="6" fill="#ff5a5a"/><rect x="10" y="16" width="14" height="20" rx="4" fill="#ff5a5a"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Classic 2D fighter. Battle a friend or CPU in a rooftop duel. First to 3 KOs wins!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('ac-bubble-btn').addEventListener('click', acOpen, { once:true });
  }

  function acRequestFullscreen(){
    var el = acOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }

  function acExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function acOpen(){
    acOverlay.classList.add('on');
    acRequestFullscreen();
    acShowLoading();
    setTimeout(acShowModeSelect, 550);
  }

  function acShowLoading(){
    acOverlay.innerHTML =
      '<div class="ac-loading">' +
        '<div class="ac-spinner"></div>' +
        '<div class="ac-loading-text">LOADING ROOFTOP RUMBLE&hellip;</div>' +
      '</div>';
  }

  function acShowModeSelect(){
    acOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="ac-mode-close" title="close">&times;</div>' +
        '<h2>ROOFTOP RUMBLE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="pvp"><strong>2 Players</strong><span>same keyboard</span></button>' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Vs CPU &middot; Easy</strong><span>slow reactions</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Vs CPU &middot; Hard</strong><span>fast, blocks a lot</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>P1</b>: A / D move &middot; W jump &middot; S block &middot; J punch &middot; K kick' +
        '<br><b>P2</b>: &larr;/&rarr; move &middot; &uarr; jump &middot; &darr; block &middot; 1 punch &middot; 2 kick</p>' +
        '<p class="ac-hint" id="ac-modal-record" style="margin-top:10px"></p>' +
      '</div>';
    document.getElementById('ac-mode-close').addEventListener('click', acClose);
    var recordEl = document.getElementById('ac-modal-record');
    if(recordEl){
      var rec = wbProfile.arcade.rooftopRumble;
      recordEl.innerHTML = '<b>Your record:</b> ' + rec.wins + 'W\u2013' + rec.losses + 'L\u2013' + rec.draws + 'D &middot; KO ratio ' + wbKoRatioText(rec);
    }
    var btns = acOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){
        acMode = this.getAttribute('data-mode');
        acBoot();
      });
    }
  }

  function acBoot(){
    wbTrackGamePlayed('rooftopRumble');
    acOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="ac-close-btn" title="unload">&times;</div>' +
        '<div class="ac-info-panel">Rooftop Rumble · A/D move · W jump · S block · J punch · K kick · P pause · Reduce opponent HP to 0 before time runs out</div>' +
        '<button class="ac-pause-btn" id="ac-pause-btn" title="Pause">⏸</button>' +
        '<div class="ac-pause-overlay" id="ac-pause-overlay"><div class="ac-pause-title">Paused</div><button class="ac-resume-btn" id="ac-resume-btn">Resume</button></div>' +
        '<div class="ac-hud">' +
          '<div class="ac-hp-block"><div class="ac-hp-name">P1</div><div class="ac-hp-bar-bg"><div class="ac-hp-bar" id="ac-hp1" style="width:100%"></div></div></div>' +
          '<div class="ac-clock" id="ac-clock">60</div>' +
          '<div class="ac-hp-block p2"><div class="ac-hp-name" id="ac-p2-name">P2</div><div class="ac-hp-bar-bg"><div class="ac-hp-bar" id="ac-hp2" style="width:100%"></div></div></div>' +
        '</div>' +
        '<div class="ac-canvas-wrap"><canvas id="ac-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="ac-status">FIGHT!</div>' +
        '<div class="ac-touch-controls" id="ac-touch-controls">' +
          '<div class="ac-touch-row">' +
            '<button class="ac-tbtn" data-key="a">&#9664;</button>' +
            '<button class="ac-tbtn" data-key="d">&#9654;</button>' +
            '<button class="ac-tbtn" data-key="w">JUMP</button>' +
            '<button class="ac-tbtn" data-key="s">BLOCK</button>' +
          '</div>' +
          '<div class="ac-touch-row">' +
            '<button class="ac-tbtn ac-tbtn-punch" data-key="j">PUNCH</button>' +
            '<button class="ac-tbtn ac-tbtn-kick" data-key="k">KICK</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('ac-close-btn').addEventListener('click', acClose);
    document.getElementById('ac-p2-name').textContent = acMode==='pvp' ? 'P2' : ('CPU · ' + acMode.toUpperCase());
    // Wire touch control buttons to acKeys
    var acTBtns = document.querySelectorAll('#ac-touch-controls .ac-tbtn');
    for(var acTi=0; acTi<acTBtns.length; acTi++){
      (function(btn){
        var k = btn.getAttribute('data-key');
        btn.addEventListener('touchstart', function(e){ e.preventDefault(); acKeys[k] = true; }, { passive:false });
        btn.addEventListener('touchend', function(e){ e.preventDefault(); acKeys[k] = false; }, { passive:false });
      })(acTBtns[acTi]);
    }
    acStartFight();
  }

  function acClose(){
    if(acRaf) cancelAnimationFrame(acRaf);
    acRaf = null;
    window.removeEventListener('keydown', acOnKeyDown);
    window.removeEventListener('keyup', acOnKeyUp);
    acKeys = {};
    acMode = null;
    acImpactCB = null;
    acExitFullscreen();
    acOverlay.classList.remove('on');
    acOverlay.innerHTML = '';
    acRenderTile();
  }

  function acLerp(a,b,t){ return a+(b-a)*t; }

  function acMakeFighter(x, facing, color, colorDark){
    return {
      x:x, y:0, vx:0, vy:0, facing:facing, color:color, colorDark:colorDark,
      hp:100, onGround:true, state:'idle', stateT:0, hasHit:false,
      pose:{ torso:0, headTilt:0, lShoulder:0.15, lElbow:0.25, rShoulder:-0.15, rElbow:0.25,
             lHip:0.08, lKnee:0.12, rHip:-0.08, rKnee:0.12, bob:0, sway:0 },
      // hanging cloth (bandana tail, waist sash) — each its own light damped
      // pendulum, see acUpdateCloth, so they swing behind motion instead of
      // sitting in one fixed drawn shape
      cloth:{ tail:{a:0,v:0}, sash:{a:0,v:0} },
      walkPhase:0, cooldown:0, hitFlash:0,
      breath:Math.random()*Math.PI*2, breathVal:0, fatigue:0, fatigueEff:0,
      sweatPhase:Math.random()*3,
      // --- Mortal Kombat-style damage system: damage tracks HP lost (0–1),
      // bloodDecals accumulate as {lx,ly,r} in local fighter space (capped at 14),
      // bruiseSeed gives deterministic bruise placement per fighter ---
      damage:0, bloodDecals:[], bruiseSeed:Math.random()*1000
    };
  }

  var CHEST_Y = -70; // local Y of chest/impact point, matches pose rig below

  function acTryHit(attacker, opp, dmg, isKick){
    var reach = isKick ? 78 : 60;
    var dist = Math.abs(opp.x - attacker.x);
    var facingRight = attacker.facing===1 ? opp.x>attacker.x : opp.x<attacker.x;
    if(dist < reach && facingRight){
      var blocked = opp.state==='block';
      if(blocked){
        opp.hp = Math.max(0, opp.hp - dmg*0.15);
      } else {
        opp.hp = Math.max(0, opp.hp - dmg);
        opp.state='hit'; opp.stateT=0; opp.hitFlash=0.15;
        opp.vx += (opp.x>attacker.x? 1:-1) * 40;
        // --- add a blood decal at the impact point in local fighter space ---
        if(opp.bloodDecals.length < 14){
          var localX = (CHEST_Y + opp.y - opp.y) * 0.3;
          var localY = (CHEST_Y + opp.y) * 0.8 - 20;
          opp.bloodDecals.push({
            lx: localX + (Math.random()-0.5)*24,
            ly: localY + (Math.random()-0.5)*18,
            r: 3 + Math.random()*4,
            drip: Math.random() < 0.5
          });
        }
      }
      if(acImpactCB) acImpactCB(opp.x, CHEST_Y + opp.y, isKick, blocked);
    }
  }

  function acUpdateFighter(f, opp, input, dt, halfW){
    f.stateT += dt;
    if(f.cooldown>0) f.cooldown -= dt;
    if(f.hitFlash>0) f.hitFlash -= dt;
    var speed = 130, moving = false;

    if(f.state==='idle' || f.state==='walk'){
      if(input.block){ f.state='block'; f.stateT=0; }
      else if(input.punch && f.cooldown<=0){ f.state='punch'; f.stateT=0; f.cooldown=0.55; }
      else if(input.kick && f.cooldown<=0){ f.state='kick'; f.stateT=0; f.cooldown=0.7; }
      else if(input.jump && f.onGround){ f.vy=-320; f.onGround=false; f.state='jump'; f.stateT=0; }
      else if(input.left || input.right){ f.vx=(input.left?-1:1)*speed; f.state='walk'; moving=true; }
      else { f.vx=0; f.state='idle'; }
    } else if(f.state==='block'){
      if(!input.block){ f.state='idle'; f.stateT=0; }
      f.vx = 0;
    } else if(f.state==='punch'){
      f.vx *= 0.8;
      if(f.stateT > 0.28){ f.state='idle'; f.stateT=0; }
      if(f.stateT>0.10 && f.stateT<0.18 && !f.hasHit){ acTryHit(f, opp, 5, false); f.hasHit=true; }
    } else if(f.state==='kick'){
      f.vx *= 0.8;
      if(f.stateT > 0.4){ f.state='idle'; f.stateT=0; }
      if(f.stateT>0.14 && f.stateT<0.24 && !f.hasHit){ acTryHit(f, opp, 9, true); f.hasHit=true; }
    } else if(f.state==='jump'){
      if(f.onGround){ f.state='idle'; f.stateT=0; }
      if(input.left) f.vx=-100; else if(input.right) f.vx=100; else f.vx*=0.95;
    } else if(f.state==='hit'){
      f.vx *= 0.85;
      if(f.stateT > 0.3){ f.state='idle'; f.stateT=0; }
    }

    if(f.state!=='punch' && f.state!=='kick') f.hasHit = false;

    f.vy += 900*dt;
    f.x += f.vx*dt;
    f.y += f.vy*dt;
    if(f.y >= 0){ f.y=0; f.vy=0; f.onGround=true; }
    f.x = Math.max(-halfW, Math.min(halfW, f.x));

    if(f.state==='idle'||f.state==='walk') f.facing = (opp.x > f.x) ? 1 : -1;
    f.walkPhase += moving ? dt*10 : dt*2;

    // --- exertion drives breathing + sweat: actions and damage build fatigue,
    // fatigue slowly recovers, and low HP keeps the floor elevated (winded/hurting) ---
    var exert = 0;
    if(f.state==='punch' || f.state==='kick') exert = 1.4;
    else if(f.state==='hit') exert = 2.0;
    else if(f.state==='walk') exert = 0.5;
    f.fatigue = Math.max(0, Math.min(1, f.fatigue + exert*dt*0.35 - dt*0.05));
    var lowHpBoost = (1 - f.hp/100) * 0.4;
    f.fatigueEff = Math.min(1, f.fatigue*0.75 + lowHpBoost);
    f.breath += dt * (2.1 + f.fatigueEff*5.2);
    f.breathVal = Math.sin(f.breath);
    f.sweatPhase += dt * (0.35 + f.fatigueEff*1.15);

    // --- damage value drives bruising, blood drip, torn gear ---
    f.damage = 1 - f.hp/100;
    // gravity-feed blood decals downward over time (visual drip effect)
    for(var bi=0; bi<f.bloodDecals.length; bi++){
      if(f.bloodDecals[bi].drip) f.bloodDecals[bi].ly += 6*dt;
    }

    acComputePose(f);

    // hanging cloth chases a target angle instead of snapping to it — trails
    // behind horizontal motion (converted to local/facing space) plus a share
    // of torso lean, so it swings rather than staying one fixed drawn shape
    var localVx = f.vx * f.facing;
    var clothDrive = -localVx*0.0032 + f.pose.torso*0.55;
    if(f.state==='hit') clothDrive += 0.5;
    acUpdateCloth(f.cloth.tail, clothDrive, dt, 85, 7);
    acUpdateCloth(f.cloth.sash, clothDrive*0.7 + 0.05, dt, 45, 6);
  }

  // a light damped spring: chases `target` rather than snapping to it, which
  // reads as a hanging weight (tail/sash) trailing behind the body's motion
  function acUpdateCloth(state, target, dt, stiffness, damping){
    var accel = (target - state.a)*stiffness - state.v*damping;
    state.v += accel*dt;
    state.a += state.v*dt;
    return state.a;
  }

  function acComputePose(f){
    var p = f.pose;
    var target = { torso:0, headTilt:0, lShoulder:0.15, lElbow:0.25, rShoulder:-0.15, rElbow:0.25,
                    lHip:0.08, lKnee:0.12, rHip:-0.08, rKnee:0.12, bob:0, sway:0 };

    if(f.state==='walk'){
      var s = Math.sin(f.walkPhase);
      // knee flexion is phase-shifted from hip swing (real knees bend hardest
      // partway through swing-through, not at the exact moment the hip is
      // most extended) — this alone is most of what stops a walk reading as
      // a rigid scissor/sticker and starts reading as a step
      var kL = Math.sin(f.walkPhase - 0.9), kR = Math.sin(f.walkPhase + Math.PI - 0.9);
      target.lHip=0.5*s; target.rHip=-0.5*s;
      target.lKnee=0.16+0.55*Math.max(0,kL); target.rKnee=0.16+0.55*Math.max(0,kR);
      target.lShoulder=-0.22*s; target.rShoulder=0.22*s;
      target.lElbow=0.25+0.16*Math.max(0,s); target.rElbow=0.25+0.16*Math.max(0,-s);
      target.torso=0.035*s; target.headTilt=-0.04*s;
      // vertical bob: center of mass rises as legs pass under the body and
      // dips at double-support (legs spread), so it bounces twice per stride
      target.bob = -2.4*(1-Math.abs(s));
      // hip sway: weight shifts side to side once per full stride
      target.sway = 1.6*s;
    } else if(f.state==='jump'){
      target.lHip=0.5; target.rHip=0.5; target.lKnee=0.8; target.rKnee=0.8;
      target.lShoulder=-0.6; target.rShoulder=-0.6; target.torso=-0.05;
    } else if(f.state==='block'){
      target.lShoulder=-0.9; target.rShoulder=-1.1; target.lElbow=1.6; target.rElbow=1.7;
      target.torso=-0.1; target.headTilt=-0.1; target.lHip=0.15; target.rHip=-0.05; target.lKnee=0.3; target.rKnee=0.15;
    } else if(f.state==='punch'){
      var t1 = Math.min(1, f.stateT/0.28), ext1 = Math.sin(t1*Math.PI);
      target.rShoulder=acLerp(-0.15,-1.5,ext1); target.rElbow=acLerp(0.25,0.05,ext1);
      target.lShoulder=-0.4; target.lElbow=1.2; target.torso=acLerp(0,0.25,ext1);
      target.lHip=0.2; target.rHip=-0.05; target.lKnee=0.2; target.rKnee=0.15;
    } else if(f.state==='kick'){
      var t2 = Math.min(1, f.stateT/0.4), ext2 = Math.sin(t2*Math.PI);
      target.rHip=acLerp(-0.1,-1.5,ext2); target.rKnee=acLerp(0.15,0.1,ext2);
      target.lHip=0.3; target.lKnee=0.6; target.torso=acLerp(0,-0.25,ext2);
      target.lShoulder=0.6; target.rShoulder=-0.8; target.lElbow=0.9; target.rElbow=0.9;
    } else if(f.state==='hit'){
      target.torso=-0.3; target.headTilt=-0.25; target.lShoulder=0.4; target.rShoulder=-0.6;
      target.lHip=0.05; target.rHip=-0.15;
    } else {
      target.torso = Math.sin(f.walkPhase*0.5)*0.02;
    }

    var ease = Math.min(1, 14*0.016);
    for(var k in target){ p[k] = acLerp(p[k], target[k], ease); }
  }

  // --- CPU brain: re-decides on a timer (slower for easy, faster for hard) ---
  var acCpu = { timer:0, decision:{} };

  function acCpuThink(f, opp, difficulty, dt){
    acCpu.timer -= dt;
    var reactionTime = difficulty==='hard' ? 0.12 : 0.32;
    var aggression = difficulty==='hard' ? 0.75 : 0.35;
    var blockChance = difficulty==='hard' ? 0.55 : 0.15;

    if(acCpu.timer <= 0){
      acCpu.timer = reactionTime;
      var dist = Math.abs(opp.x - f.x);
      var d = { left:false, right:false, jump:false, block:false, punch:false, kick:false };

      if((opp.state==='punch' || opp.state==='kick') && Math.random() < blockChance && dist < 90){
        d.block = true;
      } else if(dist > 80){
        if(opp.x > f.x) d.right = true; else d.left = true;
        if(Math.random() < 0.05) d.jump = true;
      } else if(dist < 40){
        if(Math.random() < aggression) d.kick = true; else d.punch = true;
      } else {
        if(Math.random() < aggression) d.punch = true;
        else { if(opp.x > f.x) d.right = true; else d.left = true; }
      }
      acCpu.decision = d;
    }
    return acCpu.decision;
  }

  // ---------- DETAILED RENDERING ----------

  // a small tileable noise swatch (pores + a few faint creases), built once
  // and reused as a repeating pattern — cheap per-frame cost since it's a
  // single fill() rather than per-pixel drawing
  var acGrainPattern = null;
  function acGetGrainPattern(){
    if(acGrainPattern) return acGrainPattern;
    var tile = document.createElement('canvas');
    tile.width = 40; tile.height = 40;
    var tctx = tile.getContext('2d');
    for(var i=0;i<130;i++){
      var x = Math.random()*40, y = Math.random()*40, r = 0.25+Math.random()*0.55;
      tctx.beginPath(); tctx.arc(x,y,r,0,Math.PI*2);
      tctx.fillStyle = Math.random()<0.6
        ? 'rgba(0,0,0,'+(0.08+Math.random()*0.10)+')'
        : 'rgba(255,255,255,'+(0.05+Math.random()*0.08)+')';
      tctx.fill();
    }
    for(var j=0;j<8;j++){
      var x1=Math.random()*40, y1=Math.random()*40;
      tctx.strokeStyle = 'rgba(0,0,0,0.06)'; tctx.lineWidth = 0.6;
      tctx.beginPath(); tctx.moveTo(x1,y1); tctx.lineTo(x1+Math.random()*7-3.5, y1+Math.random()*7-3.5); tctx.stroke();
    }
    acGrainPattern = tctx.createPattern(tile, 'repeat');
    return acGrainPattern;
  }
  // fills the CURRENT PATH with the grain pattern — call right after a shape's
  // own fill()/stroke(), before beginPath() clears that shape's path, so the
  // texture lands only on the skin area just drawn
  function acApplySkinGrain(ctx, amt){
    ctx.save();
    ctx.globalAlpha = amt==null ? 0.2 : amt;
    ctx.fillStyle = acGetGrainPattern();
    ctx.fill();
    ctx.restore();
  }

  function acShade(hex, amt){
    var n = parseInt(hex.slice(1),16);
    var r=(n>>16)+amt, g=(n>>8&255)+amt, b=(n&255)+amt;
    r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  function acLimb(ctx, x1,y1,x2,y2, w1,w2, base, dark, light, grain){
    var angle = Math.atan2(y2-y1, x2-x1), perp = angle+Math.PI/2;
    var c = Math.cos(perp), s = Math.sin(perp);
    ctx.beginPath();
    ctx.moveTo(x1+c*w1/2, y1+s*w1/2);
    ctx.lineTo(x2+c*w2/2, y2+s*w2/2);
    ctx.lineTo(x2-c*w2/2, y2-s*w2/2);
    ctx.lineTo(x1-c*w1/2, y1-s*w1/2);
    ctx.closePath();
    var mx=(x1+x2)/2, my=(y1+y2)/2, gw=Math.max(w1,w2);
    var g = ctx.createLinearGradient(mx-c*gw/2, my-s*gw/2, mx+c*gw/2, my+s*gw/2);
    g.addColorStop(0, dark); g.addColorStop(0.4, base); g.addColorStop(0.58, light); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
    if(grain) acApplySkinGrain(ctx, 0.16);
    // muscle crease catching the light
    ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x1+c*w1*0.16, y1+s*w1*0.16); ctx.lineTo(x2+c*w2*0.16, y2+s*w2*0.16); ctx.stroke();
  }

  function acBulge(ctx, x1,y1,x2,y2, w){
    var mx=x1+(x2-x1)*0.42, my=y1+(y2-y1)*0.42;
    var g = ctx.createRadialGradient(mx,my,0, mx,my,w*0.65);
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(mx,my,w*0.65,0,Math.PI*2); ctx.fill(); ctx.restore();
  }

  // soft glossy highlight, opacity scales with wetness — used for sweat sheen
  function acSheen(ctx, x, y, r, wet, floor){
    var a = Math.min(0.6, (wet-floor)*0.9);
    if(a<=0.02) return;
    var g = ctx.createRadialGradient(x-r*0.2,y-r*0.2,0, x,y,r);
    g.addColorStop(0, 'rgba(255,255,255,'+a+')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  // a bead of sweat sliding along a segment, looping on sweatPhase; fades in/out at the ends
  function acDrip(ctx, x1,y1,x2,y2, wet, floor, sweatPhase){
    var w = Math.min(1, (wet-floor)/0.4);
    if(w<=0.03) return;
    var t = sweatPhase % 1;
    var a = t<0.15 ? t/0.15 : (t>0.85 ? Math.max(0,(1-t)/0.15) : 1);
    a *= w;
    if(a<=0.03) return;
    var dx = x1+(x2-x1)*t, dy = y1+(y2-y1)*t;
    ctx.save(); ctx.globalAlpha = a*0.85;
    ctx.fillStyle = 'rgba(225,241,255,.95)';
    ctx.beginPath(); ctx.ellipse(dx,dy,1.4,2.6, Math.atan2(y2-y1,x2-x1), 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function acJoint(ctx, x,y,r, base, dark, light){
    var g = ctx.createRadialGradient(x-r*0.3,y-r*0.3,r*0.1, x,y,r);
    g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle = g; ctx.fill();
  }

  function acDrawFist(ctx, x, y, dirx, diry, base, dark, light){
    var ang = Math.atan2(diry, dirx);
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
    // --- Mortal Kombat-style realistic fist: knuckle bumps, finger separations,
    // wrap/glove detail, darker creases ---
    var g = ctx.createRadialGradient(-1,-2,1, 0,0,8.5);
    g.addColorStop(0, light); g.addColorStop(0.5, base); g.addColorStop(1, dark);
    ctx.beginPath(); ctx.ellipse(1,0,8.5,6.8,0,0,Math.PI*2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
    // thumb
    ctx.beginPath(); ctx.ellipse(-4,-3.5,3.5,2.4,0.5,0,Math.PI*2); ctx.fillStyle = base; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.8; ctx.stroke();
    // knuckle bumps — four distinct domes across the fist face
    ctx.fillStyle = light;
    for(var kn=0; kn<4; kn++){
      var kx = -1 + kn*2.8;
      ctx.beginPath(); ctx.arc(kx, -4.5, 1.6, 0, Math.PI*2); ctx.fill();
    }
    // finger separation creases
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1,-5); ctx.lineTo(-1,4.5);
    ctx.moveTo(2.5,-5.2); ctx.lineTo(2.5,4.5);
    ctx.moveTo(5.8,-4.2); ctx.lineTo(5.8,4);
    ctx.stroke();
    // wrist wrap detail
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-7,-1.5); ctx.lineTo(-6,1.5); ctx.stroke();
    ctx.moveTo(-6.5,-1.5); ctx.lineTo(-5.5,1.5); ctx.stroke();
    ctx.restore();
  }

  function acDrawShoe(ctx, x, y, skin, base, dark, light){
    ctx.save(); ctx.translate(x,y);
    // --- more defined boot shape ---
    ctx.beginPath();
    ctx.moveTo(-6,-3); ctx.lineTo(12,2); ctx.quadraticCurveTo(14,5,10,7); ctx.lineTo(-7,6); ctx.closePath();
    var g = ctx.createLinearGradient(-6,-3,10,7);
    g.addColorStop(0, light); g.addColorStop(0.5, base); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
    // sole
    ctx.fillStyle = '#0a0b10';
    ctx.beginPath(); ctx.moveTo(-7,5); ctx.lineTo(10,6); ctx.lineTo(10,7.5); ctx.lineTo(-7,7); ctx.closePath(); ctx.fill();
    // laces
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-2,-1); ctx.lineTo(1,1);
    ctx.moveTo(0,-1.5); ctx.lineTo(3,0.6);
    ctx.moveTo(2,-2); ctx.lineTo(5,0.2);
    ctx.moveTo(4,-2.5); ctx.lineTo(7,-0.2);
    ctx.stroke();
    ctx.restore();
  }

  function acDrawLeg(ctx, hx,hy, hipAng, kneeAng, L1, L2, skin,skinDark,skinLight, gear,gearDark, wet, fatigueEff){
    var kx = hx+Math.sin(hipAng)*L1, ky = hy+Math.cos(hipAng)*L1;
    var fx = kx+Math.sin(hipAng+kneeAng)*L2, fy = ky+Math.cos(hipAng+kneeAng)*L2;
    // --- thigh with quadriceps definition ---
    acLimb(ctx, hx,hy, kx,ky, 18,14, gear, gearDark, skinLight);
    acBulge(ctx, hx,hy, kx,ky, 18);
    // quad separation line (vastus lateralis / rectus)
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(hx+(kx-hx)*0.3, hy+(ky-hy)*0.3); ctx.lineTo(kx-(kx-hx)*0.15, ky-(ky-hy)*0.15); ctx.stroke();
    acJoint(ctx, hx,hy, 8, gear, gearDark, skinLight);
    // --- shin with calf muscle bulge ---
    acLimb(ctx, kx,ky, fx,fy, 13,9, skin, skinDark, skinLight, true);
    // calf bulge
    var calfX = kx+(fx-kx)*0.35, calfY = ky+(fy-ky)*0.35;
    acBulge(ctx, kx,ky, fx,fy, 13);
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = skinLight;
    ctx.beginPath(); ctx.arc(calfX, calfY, 4, 0, Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(kx,ky); ctx.rotate(Math.atan2(fy-ky,fx-kx));
    ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,0); ctx.lineTo(0,4); ctx.lineTo(-4,0); ctx.closePath();
    ctx.fillStyle = gear; ctx.globalAlpha=0.8; ctx.fill(); ctx.globalAlpha=1;
    ctx.strokeStyle = gearDark; ctx.lineWidth=0.8; ctx.stroke();
    ctx.restore();
    acJoint(ctx, kx,ky, 6, skin, skinDark, skinLight);
    acDrawShoe(ctx, fx, fy, skin, gear, gearDark, skinLight);
    acJoint(ctx, fx,fy, 4, skin, skinDark, skinLight);
  }

  function acDrawArm(ctx, sx,sy, shAng, elAng, L1, L2, skin,skinDark,skinLight, gear,gearDark, wet, sweatPhase, fatigueEff){
    var ex = sx+Math.cos(shAng)*L1, ey = sy+Math.sin(shAng)*L1;
    var hx = ex+Math.cos(shAng+elAng)*L2, hy = ey+Math.sin(shAng+elAng)*L2;
    // --- upper arm with biceps definition ---
    acLimb(ctx, sx,sy, ex,ey, 14,11, skin, skinDark, skinLight, true);
    acBulge(ctx, sx,sy, ex,ey, 14);
    // biceps peak
    var bicepX = sx+(ex-sx)*0.4, bicepY = sy+(ey-sy)*0.4;
    ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = skinLight;
    ctx.beginPath(); ctx.arc(bicepX, bicepY, 4, 0, Math.PI*2); ctx.fill(); ctx.restore();
    // --- veins on forearm when fatigued ---
    if(fatigueEff > 0.3){
      var veinAlpha = Math.min(0.5, (fatigueEff-0.3)*0.8);
      ctx.save(); ctx.globalAlpha = veinAlpha;
      ctx.strokeStyle = 'rgba(80,30,60,.6)'; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.quadraticCurveTo(ex+(hx-ex)*0.3, ey+(hy-ey)*0.3-2, ex+(hx-ex)*0.6, ey+(hy-ey)*0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex+1, ey+1);
      ctx.quadraticCurveTo(ex+(hx-ex)*0.4, ey+(hy-ey)*0.4+2, ex+(hx-ex)*0.7, ey+(hy-ey)*0.7);
      ctx.stroke();
      ctx.restore();
    }
    acJoint(ctx, sx,sy, 7, skin, skinDark, skinLight);
    // --- forearm ---
    acLimb(ctx, ex,ey, hx,hy, 11,8, skin, skinDark, skinLight, true);
    if(wet>0.15){
      var bx=sx+(ex-sx)*0.4, by=sy+(ey-sy)*0.4;
      acSheen(ctx, bx, by, 7, wet, 0.15);
      acDrip(ctx, ex,ey, hx,hy, wet, 0.15, sweatPhase);
    }
    var wwx = ex+(hx-ex)*0.8, wwy = ey+(hy-ey)*0.8;
    ctx.save(); ctx.translate(wwx,wwy); ctx.rotate(Math.atan2(hy-ey,hx-ex)+Math.PI/2);
    ctx.fillStyle = gear; ctx.fillRect(-4,-2,8,4);
    ctx.strokeStyle = gearDark; ctx.lineWidth=0.6; ctx.strokeRect(-4,-2,8,4);
    ctx.restore();
    acJoint(ctx, ex,ey, 5, skin, skinDark, skinLight);
    acDrawFist(ctx, hx, hy, hx-ex, hy-ey, gearDark, '#101114', gear);
  }

  function acDrawTorso(ctx, hipY, shoulderY, skin,skinDark,skinLight, gear,gearDark, breathVal, sashA, damage){
    var shoulderW=16 + (breathVal||0)*0.6, waistW=10;
    ctx.beginPath();
    ctx.moveTo(-shoulderW, shoulderY+2);
    ctx.quadraticCurveTo(-shoulderW-2, (shoulderY+hipY)/2, -waistW, hipY);
    ctx.lineTo(waistW, hipY);
    ctx.quadraticCurveTo(shoulderW+2, (shoulderY+hipY)/2, shoulderW, shoulderY+2);
    ctx.closePath();
    var g = ctx.createLinearGradient(-shoulderW,0,shoulderW,0);
    g.addColorStop(0, skinDark); g.addColorStop(0.5, skinLight); g.addColorStop(1, skinDark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = skinDark; ctx.lineWidth = 1; ctx.stroke();
    acApplySkinGrain(ctx, 0.14);

    // --- deltoid caps on shoulders ---
    for(var dl=0; dl<2; dl++){
      var dx = dl===0 ? -shoulderW+2 : shoulderW-2;
      ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = skinLight;
      ctx.beginPath(); ctx.arc(dx, shoulderY+3, 5, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    // --- pectoral muscles: two separate bellies with cleavage ---
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-9, shoulderY+7); ctx.quadraticCurveTo(-5, shoulderY+11, -1, shoulderY+8);
    ctx.moveTo(9, shoulderY+7); ctx.quadraticCurveTo(5, shoulderY+11, 1, shoulderY+8);
    ctx.stroke();
    // pec lower border
    ctx.beginPath();
    ctx.moveTo(-shoulderW+2, shoulderY+10); ctx.quadraticCurveTo(0, shoulderY+14, shoulderW-2, shoulderY+10); ctx.stroke();
    // pec highlight
    ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = skinLight;
    ctx.beginPath(); ctx.arc(-6, shoulderY+6, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, shoulderY+6, 3.5, 0, Math.PI*2); ctx.fill(); ctx.restore();

    // --- 6-pack abs: individual segments ---
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1;
    for(var i=1;i<=3;i++){
      var yy = shoulderY + (hipY-shoulderY)*(0.45+i*0.16);
      ctx.beginPath(); ctx.moveTo(-5,yy); ctx.lineTo(5,yy); ctx.stroke();
    }
    // vertical linea alba
    ctx.beginPath(); ctx.moveTo(0, shoulderY+12); ctx.lineTo(0, hipY-4); ctx.stroke();
    // oblique striations
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 0.8;
    for(var ob=0; ob<2; ob++){
      var oby = shoulderY + (hipY-shoulderY)*(0.6+ob*0.12);
      ctx.beginPath(); ctx.moveTo(-shoulderW+3, oby); ctx.lineTo(-6, oby+3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(shoulderW-3, oby); ctx.lineTo(6, oby+3); ctx.stroke();
    }

    // --- vest/gear overlay (torn at high damage) ---
    ctx.beginPath();
    ctx.moveTo(-shoulderW+2, shoulderY+4);
    ctx.lineTo(shoulderW-2, shoulderY+4);
    ctx.lineTo(waistW+2, hipY-6);
    ctx.lineTo(-waistW-2, hipY-6);
    ctx.closePath();
    var vestAlpha = damage > 0.5 ? 0.5 : 0.85;
    ctx.globalAlpha = vestAlpha; ctx.fillStyle = gear; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = gearDark; ctx.lineWidth = 1; ctx.stroke();
    // torn vest edges at high damage
    if(damage > 0.5){
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-shoulderW+4, shoulderY+8); ctx.lineTo(-8, shoulderY+12); ctx.lineTo(-5, shoulderY+10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(shoulderW-4, shoulderY+9); ctx.lineTo(6, shoulderY+14); ctx.lineTo(3, shoulderY+11); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 0.6; ctx.setLineDash([2,2]);
    ctx.beginPath(); ctx.moveTo(-shoulderW+4, shoulderY+6); ctx.lineTo(-waistW, hipY-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(shoulderW-4, shoulderY+6); ctx.lineTo(waistW, hipY-8); ctx.stroke();
    ctx.setLineDash([]);

    // belt
    ctx.fillStyle = gearDark;
    ctx.fillRect(-waistW-2, hipY-5, (waistW+2)*2, 4);
    ctx.fillStyle = skinLight;
    ctx.fillRect(-2.5, hipY-4.5, 5, 3);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.6;
    ctx.strokeRect(-2.5, hipY-4.5, 5, 3);

    // --- damage-based bruising on ribs ---
    if(damage > 0.2){
      var bruiseA = Math.min(0.5, damage*0.6);
      ctx.save(); ctx.globalAlpha = bruiseA;
      ctx.fillStyle = 'rgba(60,20,40,.5)';
      ctx.beginPath(); ctx.arc(-7, shoulderY+22, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(80,30,50,.4)';
      ctx.beginPath(); ctx.arc(8, shoulderY+26, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // belt sash hanging free below the buckle
    ctx.save();
    ctx.translate(-1.5, hipY-2);
    ctx.rotate(sashA||0);
    var sashLen = 15;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.quadraticCurveTo(-4, sashLen*0.6, -1.5, sashLen);
    ctx.lineTo(1.5, sashLen);
    ctx.quadraticCurveTo(3, sashLen*0.6, 3, 0);
    ctx.closePath();
    var sg = ctx.createLinearGradient(-3,0,3,0);
    sg.addColorStop(0, gearDark); sg.addColorStop(0.5, gear); sg.addColorStop(1, gearDark);
    ctx.fillStyle = sg; ctx.fill();
    ctx.strokeStyle = gearDark; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.restore();
  }

  function acDrawHead(ctx, headR, skin,skinDark,skinLight, gear,gearDark, wet, breathVal, sweatPhase, tailA, damage, bruiseSeed){
    // --- ear ---
    ctx.fillStyle = skinDark;
    ctx.beginPath(); ctx.ellipse(-headR*0.75, -headR*0.9, headR*0.28, headR*0.4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(-headR*0.75, -headR*0.9, headR*0.15, headR*0.22, 0, 0, Math.PI*2); ctx.fill();

    // --- skull ---
    var g = ctx.createRadialGradient(-headR*0.3,-headR*1.3,headR*0.2, 0,-headR,headR);
    g.addColorStop(0, skinLight); g.addColorStop(0.6, skin); g.addColorStop(1, skinDark);
    ctx.beginPath(); ctx.arc(0,-headR,headR,0,Math.PI*2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = skinDark; ctx.lineWidth = 1; ctx.stroke();
    acApplySkinGrain(ctx, 0.24);

    // --- cheekbone shading ---
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = skinDark;
    ctx.beginPath(); ctx.arc(2, -headR+headR*0.35, headR*0.55, 0, Math.PI*2); ctx.fill(); ctx.restore();

    // --- jawline ---
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-headR*0.6, -headR+headR*0.3);
    ctx.quadraticCurveTo(-headR*0.4, -headR+headR*0.75, 0, -headR+headR*0.8);
    ctx.quadraticCurveTo(headR*0.4, -headR+headR*0.75, headR*0.6, -headR+headR*0.3);
    ctx.stroke();

    // --- eyebrow ---
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headR*0.05, -headR-headR*0.12);
    ctx.quadraticCurveTo(headR*0.4, -headR-headR*0.2, headR*0.68, -headR-headR*0.22);
    ctx.stroke();

    // --- eye with iris, pupil, highlight ---
    var eyeX = headR*0.35, eyeY = -headR-1;
    // eye socket shadow
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = skinDark;
    ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 3.5, 2.2, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    // sclera
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 2.4, 1.6, 0, 0, Math.PI*2); ctx.fill();
    // iris
    ctx.fillStyle = damage > 0.5 ? '#8a2020' : '#4a3520';
    ctx.beginPath(); ctx.arc(eyeX+0.4, eyeY, 1.3, 0, Math.PI*2); ctx.fill();
    // pupil
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.arc(eyeX+0.4, eyeY, 0.7, 0, Math.PI*2); ctx.fill();
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(eyeX+0.8, eyeY-0.4, 0.4, 0, Math.PI*2); ctx.fill();

    // --- nose bridge + nostril ---
    ctx.strokeStyle = skinDark; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(headR*0.85, -headR+headR*0.05);
    ctx.lineTo(headR*0.95, -headR+headR*0.35);
    ctx.lineTo(headR*0.78, -headR+headR*0.38);
    ctx.stroke();
    // nostril
    ctx.fillStyle = 'rgba(40,20,10,.4)';
    ctx.beginPath(); ctx.ellipse(headR*0.82, -headR+headR*0.35, 0.8, 0.5, 0, 0, Math.PI*2); ctx.fill();

    // --- mouth ---
    var wetV = wet||0, breathV = breathVal||0;
    var panting = wetV > 0.12;
    if(panting){
      var openAmt = 0.15 + 0.85*Math.max(0,-breathV);
      var mh = (0.8 + 2.4*openAmt) * Math.min(1, wetV/0.45+0.3);
      // mouth interior
      ctx.fillStyle = 'rgba(35,8,8,.7)';
    ctx.beginPath(); ctx.ellipse(headR*0.62, -headR+headR*0.63, 2.4, mh, 0, 0, Math.PI*2); ctx.fill();
      // teeth
      ctx.fillStyle = 'rgba(230,225,210,.8)';
      ctx.fillRect(headR*0.5, -headR+headR*0.63 - mh*0.7, 3, 1.2);
    } else {
      // lips
      ctx.strokeStyle = 'rgba(80,40,30,.5)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(headR*0.35, -headR+headR*0.62); ctx.lineTo(headR*0.85, -headR+headR*0.58); ctx.stroke();
      // lower lip
      ctx.strokeStyle = 'rgba(80,40,30,.3)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(headR*0.4, -headR+headR*0.68); ctx.lineTo(headR*0.8, -headR+headR*0.65); ctx.stroke();
    }

    // --- facial stubble (deterministic positions to avoid flicker) ---
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#2a1a10';
    var stubbleR = bruiseSeed || 0;
    for(var st=0; st<8; st++){
      var sa = stubbleR + st*0.7;
      var sx = headR*0.3 + (Math.sin(sa*1.3)*0.5+0.5)*headR*0.5;
      var sy = -headR + headR*0.7 + (Math.cos(sa*1.7)*0.5+0.5)*headR*0.3;
      ctx.beginPath(); ctx.arc(sx, sy, 0.4, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // --- bruising under eye when damaged ---
    if(damage > 0.2){
      var bA = Math.min(0.6, damage*0.7);
      ctx.save(); ctx.globalAlpha = bA;
      ctx.fillStyle = 'rgba(50,15,35,.5)';
      ctx.beginPath(); ctx.ellipse(headR*0.35, -headR+headR*0.05, headR*0.3, headR*0.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(30,10,25,.4)';
      ctx.beginPath(); ctx.ellipse(headR*0.8, -headR+headR*0.3, headR*0.2, headR*0.12, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // --- blood drips from face when damaged ---
    if(damage > 0.3){
      ctx.save(); ctx.globalAlpha = Math.min(0.7, damage*0.8);
      ctx.fillStyle = '#6a1010';
      ctx.beginPath(); ctx.ellipse(headR*0.4, -headR+headR*0.1, 1, 3+damage*4, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(headR*0.7, -headR+headR*0.2, 0.8, 2+damage*3, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // --- breath puff ---
    if(breathV < -0.5 && wetV > 0.02){
      var exhaleK = Math.min(1, (-breathV-0.5)/0.5);
      var puffK = exhaleK * Math.min(1, wetV/0.5 + 0.25);
      ctx.save();
      ctx.globalAlpha = 0.32*puffK;
      var px = headR*0.62 + 5 + 5*exhaleK, py = -headR+headR*0.63;
      var pg = ctx.createRadialGradient(px,py,0, px,py, 6+6*exhaleK);
      pg.addColorStop(0,'rgba(255,255,255,.9)'); pg.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(px,py,6+6*exhaleK,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // forehead sheen + sweat bead
    acSheen(ctx, headR*0.1, -headR*1.55, headR*0.9, wetV, 0.15);
    acDrip(ctx, headR*0.5, -headR*1.5, headR*0.42, -headR*0.1, wetV, 0.2, sweatPhase||0);

    // --- bandana ---
    ctx.fillStyle = gear;
    ctx.fillRect(-headR, -headR-headR*0.55, headR*2, headR*0.32);
    ctx.fillStyle = gearDark;
    ctx.fillRect(-headR, -headR-headR*0.42, headR*2, headR*0.08);
    // bandana knot
    ctx.fillStyle = gear;
    ctx.beginPath(); ctx.arc(-headR-1, -headR*0.4, headR*0.15, 0, Math.PI*2); ctx.fill();

    // bandana tail — hinged pendulum
    ctx.save();
    ctx.translate(-headR-1, -headR*0.4);
    ctx.rotate(tailA||0);
    ctx.fillStyle = gear;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(-headR*0.9, headR*0.3, -headR*0.35, headR*1.0);
    ctx.quadraticCurveTo(-headR*0.5, headR*0.35, -headR*0.15, headR*0.05);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = gearDark; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.rotate(-0.18);
    ctx.fillStyle = gear;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(-headR*0.55, headR*0.05, -headR*0.6, headR*0.62);
    ctx.quadraticCurveTo(-headR*0.35, headR*0.15, -headR*0.05, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = gearDark; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.restore();
  }

  function acDrawFighter(ctx, f, cx, groundY, scale){
    ctx.save();
    ctx.translate(cx + f.x*scale, groundY + f.y*scale);
    ctx.scale(f.facing*scale, scale);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if(f.hitFlash>0){ ctx.globalAlpha = 0.55 + 0.45*Math.sin(f.hitFlash*90); }

    // --- darker, more realistic skin tones (Mortal Kombat grit) ---
    var skin='#b87850', skinDark='#7a4a2d', skinLight='#d9a878';
    var gear=f.color, gearDark=f.colorDark, backGear=f.colorDark, backGearDark=acShade(f.colorDark,-30);

    var breathV = f.breathVal||0, wetV = f.fatigueEff||0, sweatP = f.sweatPhase||0;
    var damageV = f.damage||0;
    var breathAmp = 1.1 + wetV*2.6;
    var hipY=-46, torsoLen=46+breathV*breathAmp, headR=11, thighLen=26, shinLen=24, upperArm=20, foreArm=18;
    ctx.rotate(f.pose.torso*0.3);

    // --- blood pool on ground under damaged fighter ---
    if(damageV > 0.3){
      ctx.save(); ctx.globalAlpha = Math.min(0.4, damageV*0.5);
      var poolR = 14 + damageV*10;
      ctx.fillStyle = '#3a0a0a';
      ctx.beginPath(); ctx.ellipse(0, 2, poolR, poolR*0.3, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // shadow
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0,2,20,5,0,0,Math.PI*2); ctx.fill(); ctx.restore();

    ctx.translate(f.pose.sway||0, f.pose.bob||0);

    acDrawLeg(ctx, 6, hipY, f.pose.rHip, f.pose.rKnee, thighLen, shinLen, skin,skinDark,skinLight, backGear,backGearDark, wetV, wetV);
    acDrawLeg(ctx, -6, hipY, f.pose.lHip, f.pose.lKnee, thighLen, shinLen, skin,skinDark,skinLight, gear,gearDark, wetV, wetV);

    var shoulderY = hipY - torsoLen;
    acDrawArm(ctx, -2, shoulderY+4, f.pose.rShoulder, f.pose.rElbow, upperArm, foreArm, skin,skinDark,skinLight, backGear,backGearDark, wetV, sweatP+0.5, wetV);

    acDrawTorso(ctx, hipY, shoulderY, skin,skinDark,skinLight, gear,gearDark, breathV, f.cloth.sash.a, damageV);

    // --- blood decals on torso ---
    for(var bd=0; bd<f.bloodDecals.length; bd++){
      var dec = f.bloodDecals[bd];
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#5a0a0a';
      ctx.beginPath(); ctx.arc(dec.lx, dec.ly, dec.r, 0, Math.PI*2); ctx.fill();
      // drip trail
      if(dec.drip){
        ctx.fillStyle = 'rgba(90,10,10,.5)';
        ctx.beginPath(); ctx.ellipse(dec.lx, dec.ly+dec.r+2, dec.r*0.5, dec.r*0.8, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(0, shoulderY-4);
    ctx.rotate(f.pose.headTilt*0.5);
    acDrawHead(ctx, headR, skin,skinDark,skinLight, gear,gearDark, wetV, breathV, sweatP, f.cloth.tail.a, damageV, f.bruiseSeed);
    ctx.restore();

    acDrawArm(ctx, 2, shoulderY+4, f.pose.lShoulder, f.pose.lElbow, upperArm, foreArm, skin,skinDark,skinLight, gear,gearDark, wetV, sweatP, wetV);

    ctx.restore();
  }

  // ---------- ARENA BACKGROUND ----------
  function acBuildScene(W,H,groundY){
    var far = [], x = 0;
    while(x < W){
      var w = 40+Math.random()*70, h = 60+Math.random()*140;
      var wins = Math.floor(h/22);
      // cache lit-window pattern per building so it doesn't flicker each frame
      var lit = [];
      for(var j=0;j<wins;j++){ lit[j] = Math.random() >= 0.35; }
      far.push({ x:x, w:w, h:h, wins:wins, lit:lit });
      x += w + 4 + Math.random()*10;
    }
    var near = [
      { x:-25, w:120, h:230 },
      { x:W-95, w:130, h:270 }
    ];
    return { far:far, near:near, moon:{ x:W*0.78, y:H*0.16, r:32 } };
  }

  function acDrawBackground(ctx, W, H, groundY, scene){
    // --- darker, more dramatic Mortal Kombat-style sky ---
    var sky = ctx.createLinearGradient(0,0,0,groundY);
    sky.addColorStop(0,'#050810'); sky.addColorStop(0.5,'#0c1424'); sky.addColorStop(1,'#1a2138');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,groundY);

    // --- atmospheric haze layers ---
    ctx.fillStyle = 'rgba(20,30,55,.3)';
    ctx.fillRect(0, groundY-120, W, 120);

    var m = scene.moon;
    // --- larger, more dramatic moon glow ---
    var mg = ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r*4);
    mg.addColorStop(0,'rgba(200,210,255,.3)'); mg.addColorStop(0.5,'rgba(150,160,200,.12)'); mg.addColorStop(1,'rgba(150,160,200,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m.x,m.y,m.r*4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#d8dcf0'; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2); ctx.fill();
    // moon crater shading
    ctx.fillStyle = 'rgba(100,110,140,.3)';
    ctx.beginPath(); ctx.arc(m.x-m.r*0.3, m.y-m.r*0.2, m.r*0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(m.x+m.r*0.4, m.y+m.r*0.3, m.r*0.15, 0, Math.PI*2); ctx.fill();

    // --- far buildings (darker, no flicker — lit windows cached in scene) ---
    ctx.fillStyle = 'rgba(18,24,42,.9)';
    for(var i=0;i<scene.far.length;i++){
      var b = scene.far[i];
      ctx.fillRect(b.x, groundY-b.h, b.w, b.h);
    }
    ctx.fillStyle = 'rgba(200,160,80,.15)';
    for(var i2=0;i2<scene.far.length;i2++){
      var b2 = scene.far[i2];
      for(var j=0;j<b2.wins;j++){
        if(b2.lit && !b2.lit[j]) continue;
        ctx.fillRect(b2.x+6, groundY-b2.h+10+j*22, 5, 7);
      }
    }

    // --- ground fog ---
    var fog = ctx.createLinearGradient(0,groundY-70,0,groundY);
    fog.addColorStop(0,'rgba(60,70,100,0)'); fog.addColorStop(1,'rgba(60,70,100,.35)');
    ctx.fillStyle = fog; ctx.fillRect(0,groundY-70,W,70);

    // --- near buildings (darker, more silhouette) ---
    ctx.fillStyle = '#06080e';
    for(var i3=0;i3<scene.near.length;i3++){
      var b3 = scene.near[i3];
      ctx.fillRect(b3.x, groundY-b3.h, b3.w, b3.h);
    }

    // --- arena floor (darker, grittier) ---
    var floor = ctx.createLinearGradient(0,groundY,0,H);
    floor.addColorStop(0,'#2a2d36'); floor.addColorStop(1,'#0a0c12');
    ctx.fillStyle = floor; ctx.fillRect(0,groundY,W,H-groundY);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
    for(var gx=0; gx<=W; gx+=60){
      ctx.beginPath(); ctx.moveTo(gx,groundY); ctx.lineTo(gx+(gx-W/2)*0.18, H); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.moveTo(0,groundY+0.5); ctx.lineTo(W,groundY+0.5); ctx.stroke();
  }

  function acVignette(ctx, W, H){
    // --- stronger, more dramatic vignette ---
    var vg = ctx.createRadialGradient(W/2,H*0.5,H*0.2, W/2,H*0.5,H*0.85);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(0.6,'rgba(0,0,0,.15)'); vg.addColorStop(1,'rgba(0,0,0,.6)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
  }

  // ---------- HIT PARTICLES ----------
  function acSpawnHit(list, x, y, color, big){
    var n = big ? 14 : 8;
    for(var i=0;i<n;i++){
      var ang = Math.random()*Math.PI*2;
      var spd = (big?150:95) + Math.random()*130;
      list.push({ x:x, y:y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, t:0, life:0.2+Math.random()*0.18, color:color, type:'spark' });
    }
    list.push({ x:x, y:y, vx:0, vy:0, t:0, life:0.12, color:'#ffffff', type:'flash', size: big?28:19 });
    // --- blood splatter particles (Mortal Kombat style) ---
    var bloodN = big ? 10 : 5;
    for(var b=0;b<bloodN;b++){
      var bang = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.2;
      var bspd = 60+Math.random()*120;
      list.push({ x:x, y:y, vx:Math.cos(bang)*bspd, vy:Math.sin(bang)*bspd, t:0, life:0.5+Math.random()*0.4, type:'blood' });
    }
  }

  // a flicked bead of sweat on a clean hit — classic fighting-game punctuation
  function acSpawnSweat(list, x, y){
    var n = 1 + (Math.random()<0.6?1:0);
    for(var i=0;i<n;i++){
      var ang = -Math.PI/2 + (Math.random()-0.5)*1.7;
      var spd = 90+Math.random()*110;
      list.push({ x:x, y:y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, t:0, life:0.45+Math.random()*0.3, type:'sweat' });
    }
  }

  function acUpdateParticles(list, dt){
    for(var i=list.length-1;i>=0;i--){
      var p = list[i];
      p.t += dt; p.x += p.vx*dt; p.y += p.vy*dt;
      if(p.type==='blood'){ p.vy += 600*dt; p.vx *= 0.98; }
      else if(p.type==='sweat'){ p.vy += 480*dt; } else { p.vx *= 0.9; p.vy *= 0.9; }
      if(p.t >= p.life) list.splice(i,1);
    }
  }

  function acDrawParticles(ctx, list){
    for(var i=0;i<list.length;i++){
      var p = list[i], k = 1 - p.t/p.life;
      ctx.save(); ctx.globalAlpha = Math.max(0,k);
      if(p.type==='flash'){
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y, p.size*0.5*(1-k*0.3), 0, Math.PI*2); ctx.fill();
      } else if(p.type==='blood'){
        // blood droplet — dark red, elongated in travel direction
        ctx.fillStyle = '#6a0a0a';
        ctx.beginPath(); ctx.ellipse(p.x,p.y, 3, 2, Math.atan2(p.vy,p.vx), 0, Math.PI*2); ctx.fill();
      } else if(p.type==='sweat'){
        ctx.fillStyle = 'rgba(225,241,255,.92)';
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.ellipse(p.x,p.y, 3, 2, Math.atan2(p.vy,p.vx), 0, Math.PI*2); ctx.fill(); ctx.stroke();
      } else {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*0.03, p.y-p.vy*0.03); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------- FIGHT LOOP ----------
  function acStartFight(){
    var canvas = document.getElementById('ac-canvas');
    var ctx = canvas.getContext('2d');
    var halfW = 300;

    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var targetRatio = 16/9;
      var w = rect.width, h = rect.width/targetRatio;
      if(h > rect.height){ h = rect.height; w = h*targetRatio; }
      canvas.style.width = w+'px';
      canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var W = canvas.width, H = canvas.height, groundY = H*0.72, cx = W/2, scale = W/960;
    var scene = acBuildScene(W, H, groundY);
    var particles = [];
    var shakeMag = 0, hitStopT = 0;

    var P1 = acMakeFighter(-140, 1, '#5fd4c7', acShade('#5fd4c7', -70));
    var P2 = acMakeFighter(140, -1, '#ff5a5a', acShade('#ff5a5a', -70));
    acCpu.timer = 0;

    acImpactCB = function(wx, wy, isKick, blocked){
      var sx = cx + wx*scale, sy = groundY + wy*scale;
      var color = blocked ? '#9aa3b5' : (isKick ? '#ffd86b' : '#ffffff');
      acSpawnHit(particles, sx, sy, color, isKick && !blocked);
      if(!blocked) acSpawnSweat(particles, sx, sy-8);
      shakeMag = Math.min(14, shakeMag + (blocked?4:(isKick?10:7)));
      hitStopT = Math.max(hitStopT, blocked?0.02:(isKick?0.07:0.05));
    };

    var timeLeft = 60, over = false, paused = false, clockAcc = 0;
    var hp1El = document.getElementById('ac-hp1');
    var hp2El = document.getElementById('ac-hp2');
    var clockEl = document.getElementById('ac-clock');
    var statusEl = document.getElementById('ac-status');
    var acPauseBtn = document.getElementById('ac-pause-btn');
    var acPauseOv = document.getElementById('ac-pause-overlay');
    var acResumeBtn = document.getElementById('ac-resume-btn');
    if(acPauseBtn) acPauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(acPauseOv) acPauseOv.classList.toggle('on', paused); acPauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(acResumeBtn) acResumeBtn.addEventListener('click', function(){ paused = false; if(acPauseOv) acPauseOv.classList.remove('on'); if(acPauseBtn) acPauseBtn.textContent = '⏸'; });
    window.addEventListener('keydown', function(e){ if(e.key === 'Escape' || e.key === 'p' || e.key === 'P'){ if(over) return; paused = !paused; if(acPauseOv) acPauseOv.classList.toggle('on', paused); if(acPauseBtn) acPauseBtn.textContent = paused ? '▶' : '⏸'; } });

    window.addEventListener('keydown', acOnKeyDown);
    window.addEventListener('keyup', acOnKeyUp);

    var last = performance.now();

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!over && !paused){
        var simDt = hitStopT>0 ? 0 : dt;
        if(hitStopT>0) hitStopT = Math.max(0, hitStopT-dt);

        var in1 = { left:acKeys['a'], right:acKeys['d'], jump:acKeys['w'], block:acKeys['s'], punch:acKeys['j'], kick:acKeys['k'] };
        var in2;
        if(acMode==='pvp'){
          in2 = { left:acKeys['arrowleft'], right:acKeys['arrowright'], jump:acKeys['arrowup'], block:acKeys['arrowdown'], punch:acKeys['1'], kick:acKeys['2'] };
        } else {
          in2 = acCpuThink(P2, P1, acMode, simDt);
        }

        acUpdateFighter(P1, P2, in1, simDt, halfW);
        acUpdateFighter(P2, P1, in2, simDt, halfW);
        acUpdateParticles(particles, dt);
        shakeMag = Math.max(0, shakeMag - dt*40);

        clockAcc += dt;
        if(clockAcc >= 1){ clockAcc -= 1; timeLeft = Math.max(0, timeLeft-1); clockEl.textContent = timeLeft; }

        hp1El.style.width = P1.hp + '%';
        hp2El.style.width = P2.hp + '%';

        if(P1.hp<=0 || P2.hp<=0 || timeLeft<=0){
          over = true;
          var isKO = (P1.hp<=0 || P2.hp<=0);
          var winnerLabel = P1.hp===P2.hp ? 'DRAW' : (P1.hp>P2.hp ? 'P1 WINS' : (acMode==='pvp'?'P2 WINS':'CPU WINS'));
          var msg = winnerLabel + (winnerLabel!=='DRAW' ? (isKO ? ' (KO)' : ' (TIME)') : '');
          statusEl.textContent = msg + ' — click to reset';
          canvas.style.cursor = 'pointer';
          canvas.addEventListener('click', function(){ acBoot(); }, { once:true });
          var fightResult = P1.hp===P2.hp ? 'draw' : (P1.hp>P2.hp ? 'win' : 'loss');
          wbRecordFightResult('rooftopRumble', fightResult, isKO);
        } else {
          statusEl.textContent = timeLeft<=10 ? 'HURRY!' : '';
        }

        ctx.clearRect(0,0,W,H);
        var shx = (Math.random()-0.5)*shakeMag, shy = (Math.random()-0.5)*shakeMag*0.6;
        ctx.save();
        ctx.translate(shx, shy);
        acDrawBackground(ctx, W, H, groundY, scene);
        acDrawFighter(ctx, P1, cx, groundY, scale);
        acDrawFighter(ctx, P2, cx, groundY, scale);
        acDrawParticles(ctx, particles);
        ctx.restore();
        acVignette(ctx, W, H);
      }

      acRaf = requestAnimationFrame(loop);
    }

    acRaf = requestAnimationFrame(loop);
  }

  acRenderTile();
})();

/* ---- Arcade cabinet #2: Neon Sprint ---- */
(function(){
  var rcSlot = document.getElementById('rc-slot-2');
  var rcOverlay = document.getElementById('ac-overlay');
  var rcRaf = null;
  var rcKeys = {};
  var rcMode = null;

  function rcOnKeyDown(e){ rcKeys[e.key.toLowerCase()] = true; }
  function rcOnKeyUp(e){ rcKeys[e.key.toLowerCase()] = false; }

  function rcRenderTile(){
    rcSlot.innerHTML =
      '<div class="ac-bubble" id="rc-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">NEON SPRINT</div>' +
          '<div class="ac-sub">racing &middot; arcade racer</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><rect x="8" y="4" width="18" height="34" rx="4" fill="#e0a458"/><circle cx="12" cy="8" r="2" fill="#ffeb99"/><circle cx="22" cy="8" r="2" fill="#ffeb99"/><rect x="6" y="14" width="4" height="8" fill="#1a1a1a"/><rect x="24" y="14" width="4" height="8" fill="#1a1a1a"/><rect x="6" y="26" width="4" height="8" fill="#1a1a1a"/><rect x="24" y="26" width="4" height="8" fill="#1a1a1a"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Top-down racer on a procedurally curving road. Dodge traffic and roadside obstacles. 3 crash lives.</div>' +
        '</div>' +
      '</div>';
    document.getElementById('rc-bubble-btn').addEventListener('click', rcOpen, { once:true });
  }

  function rcRequestFullscreen(){
    var el = rcOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function rcExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function rcOpen(){
    rcOverlay.classList.add('on');
    rcRequestFullscreen();
    rcShowLoading();
    setTimeout(rcShowModeSelect, 550);
  }
  function rcShowLoading(){
    rcOverlay.innerHTML =
      '<div class="ac-loading">' +
        '<div class="ac-spinner"></div>' +
        '<div class="ac-loading-text">LOADING NEON SPRINT&hellip;</div>' +
      '</div>';
  }
  function rcShowModeSelect(){
    rcOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="rc-mode-close" title="close">&times;</div>' +
        '<h2>NEON SPRINT</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="time"><strong>Time Trial</strong><span>reach 3000m, no traffic</span></button>' +
          '<button class="ac-mode-btn" data-mode="traffic"><strong>Traffic Dodge</strong><span>dodge cars, reach 3000m</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Hard Traffic</strong><span>more cars, less time</span></button>' +
          '<button class="ac-mode-btn" data-mode="infinite"><strong>Infinite</strong><span>endless road, reach 5000m to win</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: A / D or &larr; / &rarr; to steer. The car auto-accelerates. Stay on the road and dodge traffic. 3 crashes = game over.</p>' +
        '<p class="ac-hint" id="rc-modal-record" style="margin-top:10px"></p>' +
      '</div>';
    document.getElementById('rc-mode-close').addEventListener('click', rcClose);
    var recordEl = document.getElementById('rc-modal-record');
    if(recordEl){
      var rec = wbProfile.arcade.circuitRacer || { wins:0, losses:0, fights:0 };
      recordEl.innerHTML = '<b>Your record:</b> ' + rec.wins + 'W&ndash;' + rec.losses + 'L across ' + rec.fights + ' race' + (rec.fights===1?'':'s');
    }
    var btns = rcOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){
        rcMode = this.getAttribute('data-mode');
        rcBoot();
      });
    }
  }
  function rcBoot(){
    wbTrackGamePlayed('circuitRacer');
    rcOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="rc-close-btn" title="unload">&times;</div>' +
        '<div class="ac-info-panel">Neon Sprint · A/D or Arrows steer · Avoid traffic · Reach the distance before time runs out · P pause</div>' +
        '<button class="ac-pause-btn" id="rc-pause-btn" title="Pause">⏸</button>' +
        '<div class="ac-pause-overlay" id="rc-pause-overlay"><div class="ac-pause-title">Paused</div><button class="ac-resume-btn" id="rc-resume-btn">Resume</button></div>' +
        '<div class="ac-hud">' +
          '<div class="ac-hp-block"><div class="ac-hp-name">SPEED</div><div class="ac-hp-bar-bg"><div class="ac-hp-bar" id="rc-speed-bar" style="width:0%"></div></div></div>' +
          '<div class="ac-clock" id="rc-clock">' + (rcMode==='infinite' ? '&infin;' : '70') + '</div>' +
          '<div class="ac-hp-block p2"><div class="ac-hp-name">DISTANCE</div><div class="ac-hp-bar-bg"><div class="ac-hp-bar" id="rc-dist-bar" style="width:0%"></div></div></div>' +
        '</div>' +
        '<div class="ac-canvas-wrap"><canvas id="rc-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="rc-status">GO!</div>' +
      '</div>';
    document.getElementById('rc-close-btn').addEventListener('click', rcClose);
    rcStartRace();
  }
  function rcClose(){
    if(rcRaf) cancelAnimationFrame(rcRaf);
    rcRaf = null;
    window.removeEventListener('keydown', rcOnKeyDown);
    window.removeEventListener('keyup', rcOnKeyUp);
    rcKeys = {};
    rcMode = null;
    rcExitFullscreen();
    rcOverlay.classList.remove('on');
    rcOverlay.innerHTML = '';
    rcRenderTile();
  }

  // --- Car rendering (top-down) ---
  function rcDrawCar(ctx, x, y, color, colorDark, isPlayer){
    ctx.save();
    ctx.translate(x, y);
    // shadow
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(2, 2, 13, 20, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    // wheels
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-13, -13, 4, 8); ctx.fillRect(9, -13, 4, 8);
    ctx.fillRect(-13, 5, 4, 8); ctx.fillRect(9, 5, 4, 8);
    // body
    var g = ctx.createLinearGradient(-12, 0, 12, 0);
    g.addColorStop(0, colorDark); g.addColorStop(0.4, color); g.addColorStop(0.6, color); g.addColorStop(1, colorDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, 15); ctx.lineTo(-11, -8);
    ctx.quadraticCurveTo(-11, -18, -6, -18); ctx.lineTo(6, -18);
    ctx.quadraticCurveTo(11, -18, 11, -8); ctx.lineTo(10, 15);
    ctx.quadraticCurveTo(10, 18, 7, 18); ctx.lineTo(-7, 18);
    ctx.quadraticCurveTo(-10, 18, -10, 15);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = colorDark; ctx.lineWidth = 1; ctx.stroke();
    // hood line
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, -12); ctx.stroke();
    // windshield
    var wg = ctx.createLinearGradient(0, -10, 0, -2);
    wg.addColorStop(0, 'rgba(80,120,160,.7)'); wg.addColorStop(1, 'rgba(120,160,200,.4)');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.lineTo(7, -3); ctx.lineTo(-7, -3); ctx.closePath(); ctx.fill();
    // roof
    ctx.fillStyle = colorDark; ctx.fillRect(-7, -3, 14, 8);
    // rear window
    ctx.fillStyle = 'rgba(80,120,160,.4)';
    ctx.beginPath(); ctx.moveTo(-7, 5); ctx.lineTo(7, 5); ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill();
    // headlights
    ctx.fillStyle = '#ffeb99';
    ctx.beginPath(); ctx.arc(-7, -16, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -16, 1.8, 0, Math.PI*2); ctx.fill();
    if(isPlayer){
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffeb99';
      ctx.beginPath(); ctx.arc(-7, -16, 5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -16, 5, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
    // taillights
    ctx.fillStyle = '#cc2222';
    ctx.beginPath(); ctx.arc(-6, 16, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 16, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // --- Traffic car (simpler) ---
  function rcDrawTraffic(ctx, x, y, color, colorDark){
    ctx.save(); ctx.translate(x, y);
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(2, 2, 12, 18, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-12, -12, 4, 7); ctx.fillRect(8, -12, 4, 7);
    ctx.fillRect(-12, 5, 4, 7); ctx.fillRect(8, 5, 4, 7);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-10, -16, 20, 32, 4);
    ctx.fill();
    ctx.strokeStyle = colorDark; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(80,120,160,.5)';
    ctx.beginPath(); ctx.roundRect(-8, -10, 16, 6, 2); ctx.fill();
    ctx.fillStyle = 'rgba(80,120,160,.3)';
    ctx.beginPath(); ctx.roundRect(-8, 6, 16, 5, 2); ctx.fill();
    ctx.fillStyle = '#cc2222';
    ctx.beginPath(); ctx.arc(-6, 15, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 15, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // --- Roadside objects ---
  function rcDrawTree(ctx, x, y){
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#3a2510'; ctx.fillRect(-2, -8, 4, 16);
    ctx.fillStyle = '#1a4a1a';
    ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2a5a2a';
    ctx.beginPath(); ctx.arc(-3, -14, 6, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function rcDrawLamp(ctx, x, y){
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-1, -20, 2, 20);
    ctx.fillStyle = '#ffeb99';
    ctx.beginPath(); ctx.arc(0, -22, 3, 0, Math.PI*2); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#ffeb99';
    ctx.beginPath(); ctx.arc(0, -22, 8, 0, Math.PI*2); ctx.fill(); ctx.restore();
    ctx.restore();
  }

  // --- Race loop ---
  function rcStartRace(){
    var canvas = document.getElementById('rc-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var targetRatio = 16/9;
      var w = rect.width, h = rect.width/targetRatio;
      if(h > rect.height){ h = rect.height; w = h*targetRatio; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    // Touch controls — steer by touching left/right side of canvas
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = e.touches[0].clientX - rect.left;
      if(x < rect.width / 2){ rcKeys['a'] = true; rcKeys['d'] = false; }
      else { rcKeys['d'] = true; rcKeys['a'] = false; }
    }, { passive: false });
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = e.touches[0].clientX - rect.left;
      if(x < rect.width / 2){ rcKeys['a'] = true; rcKeys['d'] = false; }
      else { rcKeys['d'] = true; rcKeys['a'] = false; }
    }, { passive: false });
    canvas.addEventListener('touchend', function(e){
      e.preventDefault();
      rcKeys['a'] = false; rcKeys['d'] = false;
    }, { passive: false });

    var W = canvas.width, H = canvas.height;
    var roadW = 300;
    var player = { x: W/2, y: H - 80, speed: 200, maxSpeed: 600, crashes: 0, invuln: 0 };
    var traffic = [];
    var roadside = [];
    var scrollOffset = 0;
    var roadCurve = 0, curveTarget = 0, curveTimer = 0;
    var distance = 0, targetDistance = rcMode === 'infinite' ? 5000 : 3000;
    var timeLeft = rcMode === 'hard' ? 50 : (rcMode === 'infinite' ? Infinity : 70);
    var isInfinite = rcMode === 'infinite';
    var over = false, paused = false, clockAcc = 0;
    var trafficSpawnTimer = 0, roadsideTimer = 0;
    var trafficColors = [
      ['#4a6a9a','#2a4a7a'], ['#9a4a4a','#7a2a2a'],
      ['#4a9a6a','#2a7a4a'], ['#9a9a4a','#7a7a2a'], ['#9a6a9a','#7a4a7a']
    ];

    var speedBar = document.getElementById('rc-speed-bar');
    var distBar = document.getElementById('rc-dist-bar');
    var clockEl = document.getElementById('rc-clock');
    var statusEl = document.getElementById('rc-status');
    var rcPauseBtn = document.getElementById('rc-pause-btn');
    var rcPauseOv = document.getElementById('rc-pause-overlay');
    var rcResumeBtn = document.getElementById('rc-resume-btn');
    if(rcPauseBtn) rcPauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(rcPauseOv) rcPauseOv.classList.toggle('on', paused); rcPauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(rcResumeBtn) rcResumeBtn.addEventListener('click', function(){ paused = false; if(rcPauseOv) rcPauseOv.classList.remove('on'); if(rcPauseBtn) rcPauseBtn.textContent = '⏸'; });
    window.addEventListener('keydown', function(e){ if(e.key === 'Escape' || e.key === 'p' || e.key === 'P'){ if(over) return; paused = !paused; if(rcPauseOv) rcPauseOv.classList.toggle('on', paused); if(rcPauseBtn) rcPauseBtn.textContent = paused ? '▶' : '⏸'; } });

    window.addEventListener('keydown', rcOnKeyDown);
    window.addEventListener('keyup', rcOnKeyUp);
    var last = performance.now();

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!over && !paused){
        var steer = 0;
        if(rcKeys['a'] || rcKeys['arrowleft']) steer = -1;
        if(rcKeys['d'] || rcKeys['arrowright']) steer = 1;
        player.x += steer * 320 * dt;
        // keep on road (road center at player y is near W/2, curve is minimal at bottom)
        var roadCenterAtPlayer = W/2;
        player.x = Math.max(roadCenterAtPlayer - roadW/2 + 15, Math.min(roadCenterAtPlayer + roadW/2 - 15, player.x));

        // speed up
        player.speed = Math.min(player.maxSpeed, player.speed + 25 * dt);
        if(player.invuln > 0) player.invuln -= dt;

        // distance
        distance += player.speed * dt * 0.1;
        scrollOffset += player.speed * dt;

        // road curve
        curveTimer -= dt;
        if(curveTimer <= 0){
          curveTimer = 2 + Math.random() * 4;
          curveTarget = (Math.random() - 0.5) * 140;
        }
        roadCurve += (curveTarget - roadCurve) * dt * 1.5;

        // spawn traffic
        if(rcMode !== 'time'){
          trafficSpawnTimer -= dt;
          var spawnRate = rcMode === 'hard' ? 0.7 : (isInfinite ? 1.6 : 1.4);
          if(trafficSpawnTimer <= 0 && player.speed > 100){
            trafficSpawnTimer = spawnRate + Math.random() * spawnRate;
            var lane = Math.random();
            var trafficX = W/2 + (lane - 0.5) * roadW * 0.7;
            var trafficSpeed = 80 + Math.random() * 120;
            var tc = trafficColors[Math.floor(Math.random() * trafficColors.length)];
            traffic.push({ x: trafficX, y: -30, speed: trafficSpeed, color: tc[0], colorDark: tc[1] });
          }
        }

        // update traffic
        for(var i = traffic.length - 1; i >= 0; i--){
          var t = traffic[i];
          t.y += (player.speed - t.speed) * dt;
          if(player.invuln <= 0){
            var dx = Math.abs(t.x - player.x);
            var dy = Math.abs(t.y - player.y);
            if(dx < 18 && dy < 25){
              player.crashes++;
              player.speed = Math.max(120, player.speed * 0.35);
              player.invuln = 1.2;
              traffic.splice(i, 1);
              if(player.crashes >= 3){
                over = true;
                statusEl.textContent = 'CRASHED OUT — click to reset';
                canvas.style.cursor = 'pointer';
                canvas.addEventListener('click', function(){ rcBoot(); }, { once:true });
                wbRecordFightResult('circuitRacer', 'loss', false);
              }
              continue;
            }
          }
          if(t.y > H + 40) traffic.splice(i, 1);
        }

        // spawn roadside
        roadsideTimer -= dt;
        if(roadsideTimer <= 0){
          roadsideTimer = 0.3 + Math.random() * 0.6;
          var side = Math.random() < 0.5 ? -1 : 1;
          var objX = W/2 + side * (roadW/2 + 25 + Math.random() * 50);
          if(Math.random() < 0.65) roadside.push({ x: objX, y: -30, type: 'tree' });
          else roadside.push({ x: objX, y: -30, type: 'lamp' });
        }
        for(var j = roadside.length - 1; j >= 0; j--){
          roadside[j].y += player.speed * dt;
          if(roadside[j].y > H + 40) roadside.splice(j, 1);
        }

        // clock (skip countdown in infinite mode)
        if(!isInfinite){
          clockAcc += dt;
          if(clockAcc >= 1){
            clockAcc -= 1;
            timeLeft = Math.max(0, timeLeft - 1);
            clockEl.textContent = timeLeft;
          }
        }

        // HUD
        speedBar.style.width = (player.speed / player.maxSpeed * 100) + '%';
        distBar.style.width = Math.min(100, distance / targetDistance * 100) + '%';

        // win/lose
        if(distance >= targetDistance){
          over = true;
          statusEl.textContent = (isInfinite ? 'NEW RECORD — ' : 'FINISH LINE — ') + 'click to reset';
          canvas.style.cursor = 'pointer';
          canvas.addEventListener('click', function(){ rcBoot(); }, { once:true });
          wbRecordFightResult('circuitRacer', 'win', false);
        } else if(!isInfinite && timeLeft <= 0){
          over = true;
          statusEl.textContent = 'TIME UP — click to reset';
          canvas.style.cursor = 'pointer';
          canvas.addEventListener('click', function(){ rcBoot(); }, { once:true });
          wbRecordFightResult('circuitRacer', 'loss', false);
        } else {
          statusEl.textContent = Math.floor(distance) + 'm' + (isInfinite ? ' / 5000m' : ' / ' + targetDistance + 'm');
        }

        // --- Render ---
        ctx.clearRect(0, 0, W, H);
        // grass
        ctx.fillStyle = '#152815';
        ctx.fillRect(0, 0, W, H);
        // road (curved band)
        ctx.fillStyle = '#2a2a30';
        ctx.beginPath();
        ctx.moveTo(0, H);
        for(var ry = H; ry >= 0; ry -= 8){
          var rt = 1 - ry / H;
          var cAmt = roadCurve * rt * rt;
          ctx.lineTo(W/2 + cAmt - roadW/2, ry);
        }
        for(var ry2 = 0; ry2 <= H; ry2 += 8){
          var rt2 = 1 - ry2 / H;
          var cAmt2 = roadCurve * rt2 * rt2;
          ctx.lineTo(W/2 + cAmt2 + roadW/2, ry2);
        }
        ctx.closePath();
        ctx.fill();
        // road edges
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
        ctx.beginPath();
        for(var ey = H; ey >= 0; ey -= 8){
          var et = 1 - ey / H; var ec = roadCurve * et * et;
          if(ey === H) ctx.moveTo(W/2 + ec - roadW/2, ey);
          else ctx.lineTo(W/2 + ec - roadW/2, ey);
        }
        ctx.stroke();
        ctx.beginPath();
        for(var ey2 = H; ey2 >= 0; ey2 -= 8){
          var et2 = 1 - ey2 / H; var ec2 = roadCurve * et2 * et2;
          if(ey2 === H) ctx.moveTo(W/2 + ec2 + roadW/2, ey2);
          else ctx.lineTo(W/2 + ec2 + roadW/2, ey2);
        }
        ctx.stroke();
        // dashed center line
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
        ctx.setLineDash([20, 20]); ctx.lineDashOffset = -scrollOffset;
        ctx.beginPath();
        for(var ly = H; ly >= 0; ly -= 8){
          var lt = 1 - ly / H; var lc = roadCurve * lt * lt;
          if(ly === H) ctx.moveTo(W/2 + lc, ly);
          else ctx.lineTo(W/2 + lc, ly);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // roadside objects
        for(var ri = 0; ri < roadside.length; ri++){
          if(roadside[ri].type === 'tree') rcDrawTree(ctx, roadside[ri].x, roadside[ri].y);
          else rcDrawLamp(ctx, roadside[ri].x, roadside[ri].y);
        }
        // traffic cars
        for(var ti = 0; ti < traffic.length; ti++){
          rcDrawTraffic(ctx, traffic[ti].x, traffic[ti].y, traffic[ti].color, traffic[ti].colorDark);
        }
        // player car (flash when invulnerable)
        if(!(player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0)){
          rcDrawCar(ctx, player.x, player.y, '#e0a458', '#8a6020', true);
        }
        // crash indicator
        if(player.crashes > 0){
          ctx.fillStyle = '#cc2222';
          ctx.font = 'bold 14px Space Grotesk, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('CRASHES: ' + player.crashes + '/3', 16, 30);
        }
        // vignette
        var vg = ctx.createRadialGradient(W/2, H*0.5, H*0.3, W/2, H*0.5, H*0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }
      rcRaf = requestAnimationFrame(loop);
    }
    rcRaf = requestAnimationFrame(loop);
  }

  rcRenderTile();
})();

/* ---- Arcade cabinet #3: Neon Breaker (brick breaker) ---- */
(function(){
  var bbSlot = document.getElementById('bb-slot-3');
  var bbOverlay = document.getElementById('ac-overlay');
  var bbRaf = null;
  var bbKeys = {};

  function bbOnKeyDown(e){ bbKeys[e.key.toLowerCase()] = true; }
  function bbOnKeyUp(e){ bbKeys[e.key.toLowerCase()] = false; }

  function bbRenderTile(){
    bbSlot.innerHTML =
      '<div class="ac-bubble" id="bb-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">NEON BREAKER</div>' +
          '<div class="ac-sub">arcade &middot; brick breaker</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><rect x="4" y="36" width="26" height="4" rx="2" fill="#e0a458"/><circle cx="17" cy="28" r="3" fill="#5fd4c7"/><rect x="8" y="4" width="6" height="6" fill="#ff5a5a"/><rect x="16" y="4" width="6" height="6" fill="#5fd4c7"/><rect x="24" y="4" width="6" height="6" fill="#e0a458"/><rect x="8" y="12" width="6" height="6" fill="#e0a458"/><rect x="16" y="12" width="6" height="6" fill="#ff5a5a"/><rect x="24" y="12" width="6" height="6" fill="#5fd4c7"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Brick breaker with neon visuals. Bounce the ball, destroy all bricks. Power-ups drop occasionally!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('bb-bubble-btn').addEventListener('click', bbOpen, { once:true });
  }

  function bbRequestFullscreen(){
    var el = bbOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function bbExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function bbOpen(){
    bbOverlay.classList.add('on');
    bbRequestFullscreen();
    bbShowLoading();
    setTimeout(bbShowModeSelect, 500);
  }
  function bbShowLoading(){
    bbOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING NEON BREAKER&hellip;</div></div>';
  }
  function bbShowModeSelect(){
    bbOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="bb-mode-close" title="close">&times;</div>' +
        '<h2>NEON BREAKER</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>5 rows, standard speed</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Hard</strong><span>7 rows, faster ball</span></button>' +
          '<button class="ac-mode-btn" data-mode="extreme"><strong>Extreme</strong><span>8 rows, fastest ball</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: A / D or &larr; / &rarr; to move the paddle. Touch and drag on mobile.</p>' +
      '</div>';
    document.getElementById('bb-mode-close').addEventListener('click', bbClose);
    var btns = bbOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ bbBoot(this.getAttribute('data-mode')); });
    }
  }
  function bbBoot(mode){
    wbTrackGamePlayed('neonBreaker');
    bbOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="bb-close-btn" title="unload">&times;</div>' +
        '<button class="ac-pause-btn" id="bb-pause-btn" title="pause">⏸</button>' +
        '<div class="ac-game-info"><b>Neon Breaker</b> &middot; Move paddle with mouse/touch &middot; Break all bricks to win &middot; <b>Tip:</b> Hit ball with paddle edges for sharper angles</div>' +
        '<div class="ac-canvas-wrap"><canvas id="bb-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="bb-status">BREAK ALL BRICKS!</div>' +
        '<div class="ac-pause-overlay" id="bb-pause-overlay"><h3>Paused</h3><button id="bb-resume-btn">Resume</button></div>' +
      '</div>';
    document.getElementById('bb-close-btn').addEventListener('click', bbClose);
    bbStartGame(mode);
  }
  function bbClose(){
    if(bbRaf) cancelAnimationFrame(bbRaf);
    bbRaf = null;
    window.removeEventListener('keydown', bbOnKeyDown);
    window.removeEventListener('keyup', bbOnKeyUp);
    bbKeys = {};
    bbExitFullscreen();
    bbOverlay.classList.remove('on');
    bbOverlay.innerHTML = '';
    bbRenderTile();
  }

  function bbStartGame(mode){
    var canvas = document.getElementById('bb-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 16/9;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    // Touch controls
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      paddle.x = (e.touches[0].clientX - rect.left) * scaleX - paddle.w/2;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
    }, { passive:false });

    var W = canvas.width, H = canvas.height;
    var rows = mode==='hard' ? 7 : (mode==='extreme' ? 8 : 5);
    var ballSpeed = mode==='hard' ? 340 : (mode==='extreme' ? 400 : 280);
    var paddle = { x: W/2 - 60, y: H - 30, w: 120, h: 12 };
    var ball = { x: W/2, y: H/2, vx: ballSpeed*0.5, vy: -ballSpeed*0.866, r: 8 };
    var bricks = [];
    var cols = 11;
    var brickW = (W - 80) / cols;
    var brickH = 24;
    var brickGap = 4;
    var colors = ['#ff5a5a','#ff8f6b','#e0a458','#5fd4c7','#5f9fd4','#9a6a9a','#5fd4c7','#e0a458'];
    for(var r=0; r<rows; r++){
      for(var c=0; c<cols; c++){
        bricks.push({ x: 40 + c*brickW + brickGap/2, y: 60 + r*(brickH+brickGap), w: brickW - brickGap, h: brickH, color: colors[r % colors.length], alive: true });
      }
    }
    var score = 0, lives = 3, over = false, won = false, paused = false;
    var statusEl = document.getElementById('bb-status');
    var pauseBtn = document.getElementById('bb-pause-btn');
    var pauseOverlay = document.getElementById('bb-pause-overlay');
    var resumeBtn = document.getElementById('bb-resume-btn');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(pauseOverlay) pauseOverlay.classList.toggle('on', paused); pauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ paused = false; if(pauseOverlay) pauseOverlay.classList.remove('on'); if(pauseBtn) pauseBtn.textContent = '⏸'; });
    window.addEventListener('keydown', function(e){ if(e.key === 'Escape' || e.key === 'p' || e.key === 'P'){ if(over) return; paused = !paused; if(pauseOverlay) pauseOverlay.classList.toggle('on', paused); if(pauseBtn) pauseBtn.textContent = paused ? '▶' : '⏸'; } });

    window.addEventListener('keydown', bbOnKeyDown);
    window.addEventListener('keyup', bbOnKeyUp);
    var last = performance.now();

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!over && !paused){
        // Paddle movement
        var pSpeed = 450;
        if(bbKeys['a'] || bbKeys['arrowleft']) paddle.x -= pSpeed*dt;
        if(bbKeys['d'] || bbKeys['arrowright']) paddle.x += pSpeed*dt;
        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

        // Ball movement
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Wall collisions
        if(ball.x - ball.r < 0){ ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        if(ball.x + ball.r > W){ ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if(ball.y - ball.r < 0){ ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

        // Paddle collision
        if(ball.y + ball.r > paddle.y && ball.y + ball.r < paddle.y + paddle.h + 10 && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0){
          ball.y = paddle.y - ball.r;
          ball.vy = -Math.abs(ball.vy);
          var relX = (ball.x - paddle.x) / paddle.w - 0.5;
          ball.vx = relX * ballSpeed * 1.5;
        }

        // Brick collisions
        for(var i=0; i<bricks.length; i++){
          var b = bricks[i];
          if(!b.alive) continue;
          if(ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h){
            b.alive = false;
            score += 10;
            // Determine bounce direction
            var overlapL = (ball.x + ball.r) - b.x;
            var overlapR = (b.x + b.w) - (ball.x - ball.r);
            var overlapT = (ball.y + ball.r) - b.y;
            var overlapB = (b.y + b.h) - (ball.y - ball.r);
            var minH = Math.min(overlapL, overlapR);
            var minV = Math.min(overlapT, overlapB);
            if(minH < minV){ ball.vx = -ball.vx; } else { ball.vy = -ball.vy; }
            break;
          }
        }

        // Check win
        var remaining = 0;
        for(var j=0; j<bricks.length; j++){ if(bricks[j].alive) remaining++; }
        if(remaining === 0){ over = true; won = true; wbTrackSpecialAchievement('breakerClear'); wbRecordFightResult('neonBreaker', 'win', false); wbRecordGameScore('neonBreaker', mode, score); }

        // Check lose
        if(ball.y - ball.r > H){
          lives--;
          if(lives <= 0){ over = true; won = false; wbRecordFightResult('neonBreaker', 'loss', false); wbRecordGameScore('neonBreaker', mode, score); }
          else { ball.x = W/2; ball.y = H/2; ball.vx = ballSpeed*0.5; ball.vy = -ballSpeed*0.866; }
        }

        if(statusEl){
          if(over){
            statusEl.textContent = (won ? 'YOU WIN! ' : 'GAME OVER ') + 'Score: ' + score + ' — click to reset';
            canvas.style.cursor = 'pointer';
          } else {
            statusEl.textContent = 'Score: ' + score + '  |  Lives: ' + lives + '  |  Bricks: ' + remaining;
          }
        }
      }

      // Render
      ctx.clearRect(0,0,W,H);
      // Background
      var bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#0a0e18'); bg.addColorStop(1,'#12161d');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // Bricks
      for(var k=0; k<bricks.length; k++){
        var br = bricks[k];
        if(!br.alive) continue;
        ctx.fillStyle = br.color;
        ctx.fillRect(br.x, br.y, br.w, br.h);
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        ctx.fillRect(br.x, br.y, br.w, 3);
        ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(br.x, br.y, br.w, br.h);
      }

      // Paddle
      var pg = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
      pg.addColorStop(0,'#8a6020'); pg.addColorStop(0.5,'#e0a458'); pg.addColorStop(1,'#8a6020');
      ctx.fillStyle = pg;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(paddle.x, paddle.y, paddle.w, 3);

      // Ball
      ctx.fillStyle = '#5fd4c7';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(95,212,199,.3)';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r*2, 0, Math.PI*2); ctx.fill();

      // Vignette
      var vg = ctx.createRadialGradient(W/2,H*0.5,H*0.3,W/2,H*0.5,H*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.4)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

      if(over){
        canvas.addEventListener('click', function(){ bbBoot(mode); }, { once:true });
      }

      bbRaf = requestAnimationFrame(loop);
    }
    bbRaf = requestAnimationFrame(loop);
  }
  bbRenderTile();
})();

/* ---- Arcade cabinet #4: Starfall Defender (space shooter) ---- */
(function(){
  var sfSlot = document.getElementById('sf-slot-4');
  var sfOverlay = document.getElementById('ac-overlay');
  var sfRaf = null;
  var sfKeys = {};

  function sfOnKeyDown(e){ sfKeys[e.key.toLowerCase()] = true; }
  function sfOnKeyUp(e){ sfKeys[e.key.toLowerCase()] = false; }

  function sfRenderTile(){
    sfSlot.innerHTML =
      '<div class="ac-bubble" id="sf-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">STARFALL DEFENDER</div>' +
          '<div class="ac-sub">arcade &middot; space shooter</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><polygon points="17,4 8,28 12,24 12,36 22,36 22,24 26,28" fill="#5fd4c7"/><polygon points="17,4 14,16 17,14 20,16" fill="#e0a458"/><circle cx="8" cy="16" r="2" fill="#ff5a5a"/><circle cx="26" cy="20" r="2" fill="#ff5a5a"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Space shooter. Blast waves of alien invaders. Collect power-ups for multi-shot and shields!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('sf-bubble-btn').addEventListener('click', sfOpen, { once:true });
  }

  function sfRequestFullscreen(){
    var el = sfOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function sfExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function sfOpen(){
    sfOverlay.classList.add('on');
    sfRequestFullscreen();
    sfShowLoading();
    setTimeout(sfShowModeSelect, 500);
  }
  function sfShowLoading(){
    sfOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING STARFALL DEFENDER&hellip;</div></div>';
  }
  function sfShowModeSelect(){
    sfOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="sf-mode-close" title="close">&times;</div>' +
        '<h2>STARFALL DEFENDER</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>moderate asteroid field</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Hard</strong><span>dense field, more enemies</span></button>' +
          '<button class="ac-mode-btn" data-mode="survival"><strong>Survival</strong><span>endless, how long can you last?</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: A / D or &larr; / &rarr; to move. Space or W to shoot. Touch left/right sides and tap center to shoot on mobile.</p>' +
      '</div>';
    document.getElementById('sf-mode-close').addEventListener('click', sfClose);
    var btns = sfOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ sfBoot(this.getAttribute('data-mode')); });
    }
  }
  function sfBoot(mode){
    wbTrackGamePlayed('starfallDefender');
    sfOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="sf-close-btn" title="unload">&times;</div>' +
        '<button class="ac-pause-btn" id="sf-pause-btn" title="pause">⏸</button>' +
        '<div class="ac-game-info"><b>Starfall Defender</b> &middot; A/D or arrows to move &middot; Space/W to shoot &middot; <b>Tip:</b> Large asteroids split into smaller ones</div>' +
        '<div class="ac-canvas-wrap"><canvas id="sf-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="sf-status">DEFEND THE STAR!</div>' +
        '<div class="ac-pause-overlay" id="sf-pause-overlay"><h3>Paused</h3><button id="sf-resume-btn">Resume</button></div>' +
      '</div>';
    document.getElementById('sf-close-btn').addEventListener('click', sfClose);
    sfStartGame(mode);
  }
  function sfClose(){
    if(sfRaf) cancelAnimationFrame(sfRaf);
    sfRaf = null;
    window.removeEventListener('keydown', sfOnKeyDown);
    window.removeEventListener('keyup', sfOnKeyUp);
    sfKeys = {};
    sfExitFullscreen();
    sfOverlay.classList.remove('on');
    sfOverlay.innerHTML = '';
    sfRenderTile();
  }

  function sfStartGame(mode){
    var canvas = document.getElementById('sf-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 16/9;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var W = canvas.width, H = canvas.height;
    var player = { x: W/2, y: H - 60, w: 30, h: 34, cooldown: 0 };
    var bullets = [];
    var enemies = [];
    var asteroids = [];
    var particles = [];
    var stars = [];
    for(var si=0; si<80; si++){ stars.push({ x: Math.random()*W, y: Math.random()*H, speed: 20+Math.random()*60, size: Math.random()*1.5+0.3 }); }
    var score = 0, lives = 3, over = false, paused = false;
    var spawnTimer = 0, astTimer = 0;
    var isSurvival = mode === 'survival';
    var statusEl = document.getElementById('sf-status');
    var sfPauseBtn = document.getElementById('sf-pause-btn');
    var sfPauseOv = document.getElementById('sf-pause-overlay');
    var sfResumeBtn = document.getElementById('sf-resume-btn');
    if(sfPauseBtn) sfPauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(sfPauseOv) sfPauseOv.classList.toggle('on', paused); sfPauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(sfResumeBtn) sfResumeBtn.addEventListener('click', function(){ paused = false; if(sfPauseOv) sfPauseOv.classList.remove('on'); if(sfPauseBtn) sfPauseBtn.textContent = '⏸'; });

    // Touch controls
    var touchSide = 0;
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = e.touches[0].clientX - rect.left;
      if(x < rect.width * 0.4) touchSide = -1;
      else if(x > rect.width * 0.6) touchSide = 1;
      else { touchSide = 0; player.cooldown = 0; }
    }, { passive:false });
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = e.touches[0].clientX - rect.left;
      if(x < rect.width * 0.4) touchSide = -1;
      else if(x > rect.width * 0.6) touchSide = 1;
      else touchSide = 0;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ e.preventDefault(); touchSide = 0; }, { passive:false });

    window.addEventListener('keydown', sfOnKeyDown);
    window.addEventListener('keyup', sfOnKeyUp);
    var e_touchShoot = true;
    var last = performance.now();

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!over && !paused){
        // Player movement
        var pSpeed = 350;
        if(sfKeys['a'] || sfKeys['arrowleft'] || touchSide === -1) player.x -= pSpeed*dt;
        if(sfKeys['d'] || sfKeys['arrowright'] || touchSide === 1) player.x += pSpeed*dt;
        player.x = Math.max(player.w/2, Math.min(W - player.w/2, player.x));

        // Shooting
        player.cooldown -= dt;
        if((sfKeys[' '] || sfKeys['w'] || sfKeys['arrowup'] || touchSide === 0) && player.cooldown <= 0 && e_touchShoot){
          bullets.push({ x: player.x, y: player.y - 20, vy: -500 });
          player.cooldown = 0.2;
        }
        if((sfKeys[' '] || sfKeys['w']) && player.cooldown <= 0){
          bullets.push({ x: player.x, y: player.y - 20, vy: -500 });
          player.cooldown = 0.2;
        }

        // Spawn enemies
        spawnTimer -= dt;
        var spawnRate = mode==='hard' ? 1.0 : (isSurvival ? 1.2 : 1.5);
        if(spawnTimer <= 0){
          spawnTimer = spawnRate + Math.random()*spawnRate;
          enemies.push({ x: Math.random()*W, y: -30, w: 28, h: 28, vy: 60+Math.random()*40, hp: 1 });
        }

        // Spawn asteroids
        astTimer -= dt;
        var astRate = mode==='hard' ? 1.5 : (isSurvival ? 1.8 : 2.5);
        if(astTimer <= 0){
          astTimer = astRate + Math.random()*astRate;
          var asize = 15 + Math.random()*20;
          asteroids.push({ x: Math.random()*W, y: -asize, r: asize, vy: 80+Math.random()*60, vx: (Math.random()-0.5)*40, rot: 0, rotSpd: (Math.random()-0.5)*2 });
        }

        // Update bullets
        for(var i=bullets.length-1; i>=0; i--){
          bullets[i].y += bullets[i].vy * dt;
          if(bullets[i].y < -10) bullets.splice(i,1);
        }

        // Update enemies
        for(var j=enemies.length-1; j>=0; j--){
          var en = enemies[j];
          en.y += en.vy * dt;
          // Bullet hits
          for(var bi=bullets.length-1; bi>=0; bi--){
            if(Math.abs(bullets[bi].x - en.x) < en.w/2 && Math.abs(bullets[bi].y - en.y) < en.h/2){
              en.hp--; bullets.splice(bi,1);
              sfSpawnParticles(particles, en.x, en.y, '#ff5a5a', 6);
              if(en.hp <= 0){
                score += 20;
                sfSpawnParticles(particles, en.x, en.y, '#e0a458', 10);
                enemies.splice(j,1);
                break;
              }
            }
          }
          // Player collision
          if(Math.abs(en.x - player.x) < (en.w+player.w)/2 && Math.abs(en.y - player.y) < (en.h+player.h)/2){
            lives--; sfSpawnParticles(particles, en.x, en.y, '#ff5a5a', 12);
            enemies.splice(j,1);
            if(lives <= 0){ over = true; wbRecordFightResult('starfallDefender', 'loss', false); wbRecordGameScore('starfallDefender', mode, score); }
            continue;
          }
          if(en.y > H + 30) enemies.splice(j,1);
        }

        // Update asteroids
        for(var ak=asteroids.length-1; ak>=0; ak--){
          var ast = asteroids[ak];
          ast.y += ast.vy * dt; ast.x += ast.vx * dt; ast.rot += ast.rotSpd * dt;
          // Bullet hits
          for(var ab=bullets.length-1; ab>=0; ab--){
            var dx = bullets[ab].x - ast.x, dy = bullets[ab].y - ast.y;
            if(dx*dx + dy*dy < ast.r*ast.r){
              bullets.splice(ab,1);
              if(ast.r > 18){
                // Split
                asteroids.push({ x: ast.x, y: ast.y, r: ast.r*0.6, vy: ast.vy*0.8, vx: ast.vx-40, rot:0, rotSpd:ast.rotSpd });
                asteroids.push({ x: ast.x, y: ast.y, r: ast.r*0.6, vy: ast.vy*0.8, vx: ast.vx+40, rot:0, rotSpd:-ast.rotSpd });
              }
              score += 5;
              sfSpawnParticles(particles, ast.x, ast.y, '#8b93a1', 6);
              asteroids.splice(ak,1);
              break;
            }
          }
          // Player collision
          var pdx = ast.x - player.x, pdy = ast.y - player.y;
          if(pdx*pdx + pdy*pdy < (ast.r + 15)*(ast.r + 15)){
            lives--; sfSpawnParticles(particles, ast.x, ast.y, '#ff5a5a', 12);
            asteroids.splice(ak,1);
            if(lives <= 0){ over = true; wbRecordFightResult('starfallDefender', 'loss', false); wbRecordGameScore('starfallDefender', mode, score); }
            continue;
          }
          if(ast.y > H + 40) asteroids.splice(ak,1);
        }

        // Update particles
        for(var pi=particles.length-1; pi>=0; pi--){
          var p = particles[pi];
          p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 200*dt; p.life -= dt;
          if(p.life <= 0) particles.splice(pi,1);
        }

        // Update stars
        for(var ss=0; ss<stars.length; ss++){ stars[ss].y += stars[ss].speed * dt; if(stars[ss].y > H) stars[ss].y = 0; }

        if(statusEl){
          if(over) statusEl.textContent = 'GAME OVER — Score: ' + score + ' — click to reset';
          else statusEl.textContent = 'Score: ' + score + '  |  Lives: ' + lives;
        }
      }

      // Render
      ctx.clearRect(0,0,W,H);
      var bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#050810'); bg.addColorStop(1,'#0a0e18');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // Stars
      for(var st=0; st<stars.length; st++){
        ctx.fillStyle = 'rgba(200,210,255,' + (0.3 + stars[st].size/3) + ')';
        ctx.fillRect(stars[st].x, stars[st].y, stars[st].size, stars[st].size);
      }

      // Asteroids
      for(var ar=0; ar<asteroids.length; ar++){
        var a = asteroids[ar];
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
        ctx.fillStyle = '#5a5e68';
        ctx.beginPath();
        for(var av=0; av<7; av++){
          var ang = av/7 * Math.PI*2;
          var rad = a.r * (0.7 + Math.sin(av*3)*0.2);
          if(av===0) ctx.moveTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
          else ctx.lineTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }

      // Enemies
      for(var en2=0; en2<enemies.length; en2++){
        var e = enemies[en2];
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.fillStyle = '#ff5a5a';
        ctx.beginPath();
        ctx.moveTo(0, e.h/2); ctx.lineTo(-e.w/2, -e.h/2); ctx.lineTo(e.w/2, -e.h/2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff8f6b';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      // Bullets
      ctx.fillStyle = '#e0a458';
      for(var bl=0; bl<bullets.length; bl++){
        ctx.fillRect(bullets[bl].x - 2, bullets[bl].y - 8, 4, 12);
      }

      // Player ship
      ctx.save(); ctx.translate(player.x, player.y);
      ctx.fillStyle = '#5fd4c7';
      ctx.beginPath();
        ctx.moveTo(0, -player.h/2); ctx.lineTo(-player.w/2, player.h/2); ctx.lineTo(-6, player.h/2 - 4);
        ctx.lineTo(6, player.h/2 - 4); ctx.lineTo(player.w/2, player.h/2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e0a458';
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
      // Engine glow
      ctx.fillStyle = 'rgba(224,164,88,.4)';
      ctx.beginPath(); ctx.arc(0, player.h/2 + 4, 6, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // Particles
      for(var pt=0; pt<particles.length; pt++){
        var pp = particles[pt];
        ctx.globalAlpha = Math.max(0, pp.life / pp.maxLife);
        ctx.fillStyle = pp.color;
        ctx.fillRect(pp.x - 2, pp.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      }

      // Vignette
      var vg = ctx.createRadialGradient(W/2,H*0.5,H*0.3,W/2,H*0.5,H*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.5)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

      if(over){
        canvas.addEventListener('click', function(){ sfBoot(mode); }, { once:true });
      }

      sfRaf = requestAnimationFrame(loop);
    }
    sfRaf = requestAnimationFrame(loop);
  }
  function sfSpawnParticles(list, x, y, color, n){
    for(var i=0; i<n; i++){
      var ang = Math.random()*Math.PI*2;
      var spd = 50 + Math.random()*100;
      list.push({ x:x, y:y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:0.4+Math.random()*0.3, maxLife:0.6, color:color });
    }
  }
  sfRenderTile();
})();

/* ---- Arcade cabinet #5: Circuit Snake (neon snake) ---- */
(function(){
  var snSlot = document.getElementById('sn-slot-5');
  var snOverlay = document.getElementById('ac-overlay');
  var snRaf = null;
  var snKeys = {};

  function snOnKeyDown(e){ snKeys[e.key.toLowerCase()] = true; }
  function snOnKeyUp(e){ snKeys[e.key.toLowerCase()] = false; }

  function snRenderTile(){
    snSlot.innerHTML =
      '<div class="ac-bubble" id="sn-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">CIRCUIT SNAKE</div>' +
          '<div class="ac-sub">arcade &middot; neon snake</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><rect x="6" y="6" width="6" height="6" fill="#5fd4c7"/><rect x="12" y="6" width="6" height="6" fill="#5fd4c7" opacity=".7"/><rect x="18" y="6" width="6" height="6" fill="#5fd4c7" opacity=".5"/><rect x="18" y="12" width="6" height="6" fill="#5fd4c7" opacity=".3"/><circle cx="26" cy="20" r="3" fill="#e0a458"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Neon snake. Eat food to grow longer. Dont hit the walls or your own tail!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('sn-bubble-btn').addEventListener('click', snOpen, { once:true });
  }

  function snRequestFullscreen(){
    var el = snOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function snExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function snOpen(){
    snOverlay.classList.add('on');
    snRequestFullscreen();
    snShowLoading();
    setTimeout(snShowModeSelect, 500);
  }
  function snShowLoading(){
    snOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING CIRCUIT SNAKE&hellip;</div></div>';
  }
  function snShowModeSelect(){
    snOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="sn-mode-close" title="close">&times;</div>' +
        '<h2>CIRCUIT SNAKE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>walls kill, eat to grow</span></button>' +
          '<button class="ac-mode-btn" data-mode="walls"><strong>Wrap</strong><span>walls wrap around</span></button>' +
          '<button class="ac-mode-btn" data-mode="speed"><strong>Speed Run</strong><span>speeds up as you eat</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Arrow keys or WASD to steer. Swipe to turn on mobile.</p>' +
      '</div>';
    document.getElementById('sn-mode-close').addEventListener('click', snClose);
    var btns = snOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ snBoot(this.getAttribute('data-mode')); });
    }
  }
  function snBoot(mode){
    wbTrackGamePlayed('circuitSnake');
    snOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="sn-close-btn" title="unload">&times;</div>' +
        '<button class="ac-pause-btn" id="sn-pause-btn" title="pause">⏸</button>' +
        '<div class="ac-game-info"><b>Circuit Snake</b> &middot; Arrows/WASD to steer &middot; Eat orbs to grow &middot; <b>Tip:</b> Reach length 20 for an achievement</div>' +
        '<div class="ac-canvas-wrap"><canvas id="sn-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="sn-status">EAT THE ORBS!</div>' +
        '<div class="ac-pause-overlay" id="sn-pause-overlay"><h3>Paused</h3><button id="sn-resume-btn">Resume</button></div>' +
      '</div>';
    document.getElementById('sn-close-btn').addEventListener('click', snClose);
    snStartGame(mode);
  }
  function snClose(){
    if(snRaf) cancelAnimationFrame(snRaf);
    snRaf = null;
    window.removeEventListener('keydown', snOnKeyDown);
    window.removeEventListener('keyup', snOnKeyUp);
    snKeys = {};
    snExitFullscreen();
    snOverlay.classList.remove('on');
    snOverlay.innerHTML = '';
    snRenderTile();
  }

  function snStartGame(mode){
    var canvas = document.getElementById('sn-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 16/9;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var W = canvas.width, H = canvas.height;
    var cellSize = 24;
    var cols = Math.floor(W / cellSize);
    var rows = Math.floor(H / cellSize);
    var gridW = cols * cellSize;
    var gridH = rows * cellSize;
    var offsetX = (W - gridW) / 2;
    var offsetY = (H - gridH) / 2;

    var snake = [{ x: Math.floor(cols/2), y: Math.floor(rows/2) }];
    var dir = { x: 1, y: 0 };
    var nextDir = { x: 1, y: 0 };
    var food = { x: 5, y: 5 };
    var score = 0, over = false, paused = false;
    var stepTimer = 0;
    var stepInterval = 0.12;
    var isWrap = mode === 'walls';
    var isSpeed = mode === 'speed';
    var statusEl = document.getElementById('sn-status');
    var snPauseBtn = document.getElementById('sn-pause-btn');
    var snPauseOv = document.getElementById('sn-pause-overlay');
    var snResumeBtn = document.getElementById('sn-resume-btn');
    if(snPauseBtn) snPauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(snPauseOv) snPauseOv.classList.toggle('on', paused); snPauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(snResumeBtn) snResumeBtn.addEventListener('click', function(){ paused = false; if(snPauseOv) snPauseOv.classList.remove('on'); if(snPauseBtn) snPauseBtn.textContent = '⏸'; });

    function placeFood(){
      var valid = false;
      while(!valid){
        food.x = Math.floor(Math.random()*cols);
        food.y = Math.floor(Math.random()*rows);
        valid = true;
        for(var i=0; i<snake.length; i++){
          if(snake[i].x === food.x && snake[i].y === food.y){ valid = false; break; }
        }
      }
    }
    placeFood();

    // Touch swipe controls
    var touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      touchStartX = e.touches[0].clientX - rect.left;
      touchStartY = e.touches[0].clientY - rect.top;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var dx = (e.changedTouches[0].clientX - rect.left) - touchStartX;
      var dy = (e.changedTouches[0].clientY - rect.top) - touchStartY;
      if(Math.abs(dx) > Math.abs(dy)){
        if(dx > 20 && dir.x === 0) nextDir = { x:1, y:0 };
        else if(dx < -20 && dir.x === 0) nextDir = { x:-1, y:0 };
      } else {
        if(dy > 20 && dir.y === 0) nextDir = { x:0, y:1 };
        else if(dy < -20 && dir.y === 0) nextDir = { x:0, y:-1 };
      }
    }, { passive:false });

    window.addEventListener('keydown', snOnKeyDown);
    window.addEventListener('keyup', snOnKeyUp);
    var last = performance.now();

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!over && !paused){
        // Input
        if((snKeys['arrowup'] || snKeys['w']) && dir.y === 0) nextDir = { x:0, y:-1 };
        if((snKeys['arrowdown'] || snKeys['s']) && dir.y === 0) nextDir = { x:0, y:1 };
        if((snKeys['arrowleft'] || snKeys['a']) && dir.x === 0) nextDir = { x:-1, y:0 };
        if((snKeys['arrowright'] || snKeys['d']) && dir.x === 0) nextDir = { x:1, y:0 };

        stepTimer += dt;
        if(stepTimer >= stepInterval){
          stepTimer = 0;
          dir = nextDir;
          var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

          if(isWrap){
            head.x = (head.x + cols) % cols;
            head.y = (head.y + rows) % rows;
          } else {
            if(head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows){ over = true; wbRecordFightResult('circuitSnake', 'loss', false); wbRecordGameScore('circuitSnake', mode, score); }
          }

          if(!over){
            // Self collision
            for(var i=0; i<snake.length; i++){
              if(snake[i].x === head.x && snake[i].y === head.y){ over = true; wbRecordFightResult('circuitSnake', 'loss', false); wbRecordGameScore('circuitSnake', mode, score); break; }
            }
          }

          if(!over){
            snake.unshift(head);
            if(head.x === food.x && head.y === food.y){
              score += 10;
              if(snake.length >= 20) wbTrackSpecialAchievement('snake20');
              if(isSpeed) stepInterval = Math.max(0.04, stepInterval - 0.004);
              placeFood();
            } else {
              snake.pop();
            }
          }
        }

        if(statusEl){
          if(over) statusEl.textContent = 'GAME OVER — Score: ' + score + ' — Length: ' + snake.length + ' — click to reset';
          else statusEl.textContent = 'Score: ' + score + '  |  Length: ' + snake.length;
        }
      }

      // Render
      ctx.clearRect(0,0,W,H);
      var bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#0a0e18'); bg.addColorStop(1,'#12161d');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // Grid lines
      ctx.strokeStyle = 'rgba(95,212,199,.05)'; ctx.lineWidth = 1;
      for(var gx=0; gx<=cols; gx++){
        ctx.beginPath(); ctx.moveTo(offsetX + gx*cellSize, offsetY); ctx.lineTo(offsetX + gx*cellSize, offsetY + gridH); ctx.stroke();
      }
      for(var gy=0; gy<=rows; gy++){
        ctx.beginPath(); ctx.moveTo(offsetX, offsetY + gy*cellSize); ctx.lineTo(offsetX + gridW, offsetY + gy*cellSize); ctx.stroke();
      }

      // Border
      ctx.strokeStyle = 'rgba(95,212,199,.3)'; ctx.lineWidth = 2;
      ctx.strokeRect(offsetX, offsetY, gridW, gridH);

      // Food
      var fx = offsetX + food.x*cellSize + cellSize/2;
      var fy = offsetY + food.y*cellSize + cellSize/2;
      var pulse = 1 + Math.sin(now*0.008)*0.15;
      ctx.fillStyle = 'rgba(224,164,88,.3)';
      ctx.beginPath(); ctx.arc(fx, fy, cellSize*0.5*pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e0a458';
      ctx.beginPath(); ctx.arc(fx, fy, cellSize*0.3*pulse, 0, Math.PI*2); ctx.fill();

      // Snake
      for(var s=snake.length-1; s>=0; s--){
        var seg = snake[s];
        var sx = offsetX + seg.x*cellSize;
        var sy = offsetY + seg.y*cellSize;
        var alpha = s === 0 ? 1 : Math.max(0.3, 1 - s*0.04);
        ctx.fillStyle = s === 0 ? '#5fd4c7' : 'rgba(95,212,199,' + alpha + ')';
        ctx.fillRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);
        if(s === 0){
          // Head highlight
          ctx.fillStyle = 'rgba(255,255,255,.3)';
          ctx.fillRect(sx + 2, sy + 2, cellSize - 4, 3);
          // Eyes
          ctx.fillStyle = '#12161d';
          var eyeOff = dir.x === 1 ? cellSize - 8 : (dir.x === -1 ? 2 : cellSize/2 - 4);
          var eyeY = dir.y === 1 ? cellSize - 8 : (dir.y === -1 ? 2 : cellSize/2 - 4);
          if(dir.x !== 0){
            ctx.fillRect(sx + eyeOff, sy + 4, 3, 3);
            ctx.fillRect(sx + eyeOff, sy + cellSize - 7, 3, 3);
          } else {
            ctx.fillRect(sx + 4, sy + eyeY, 3, 3);
            ctx.fillRect(sx + cellSize - 7, sy + eyeY, 3, 3);
          }
        }
      }

      // Vignette
      var vg = ctx.createRadialGradient(W/2,H*0.5,H*0.3,W/2,H*0.5,H*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.4)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

      if(over){
        canvas.addEventListener('click', function(){ snBoot(mode); }, { once:true });
      }

      snRaf = requestAnimationFrame(loop);
    }
    snRaf = requestAnimationFrame(loop);
  }
  snRenderTile();
})();

/* ---- Arcade cabinet #6: Neon Pong (pong vs AI) ---- */
(function(){
  var pgSlot = document.getElementById('pg-slot-6');
  var pgOverlay = document.getElementById('ac-overlay');
  var pgRaf = null;
  var pgKeys = {};

  function pgOnKeyDown(e){ pgKeys[e.key.toLowerCase()] = true; }
  function pgOnKeyUp(e){ pgKeys[e.key.toLowerCase()] = false; }

  function pgRenderTile(){
    pgSlot.innerHTML =
      '<div class="ac-bubble" id="pg-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">NEON PONG</div>' +
          '<div class="ac-sub">arcade &middot; pong vs AI</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><rect x="4" y="10" width="5" height="24" rx="2" fill="#5fd4c7"/><rect x="25" y="10" width="5" height="24" rx="2" fill="#ff5a5a"/><circle cx="17" cy="22" r="4" fill="#e0a458"/><line x1="17" y1="4" x2="17" y2="40" stroke="#3a3e48" stroke-width="1" stroke-dasharray="3,3"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Classic Pong vs AI. First to 7 points wins. Win 7-0 for a special achievement!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('pg-bubble-btn').addEventListener('click', pgOpen, { once:true });
  }

  function pgRequestFullscreen(){
    var el = pgOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function pgExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function pgOpen(){
    pgOverlay.classList.add('on');
    pgRequestFullscreen();
    pgShowLoading();
    setTimeout(pgShowModeSelect, 500);
  }
  function pgShowLoading(){
    pgOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING NEON PONG&hellip;</div></div>';
  }
  function pgShowModeSelect(){
    pgOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="pg-mode-close" title="close">&times;</div>' +
        '<h2>NEON PONG</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Easy</strong><span>slow AI, slow ball</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>fair AI, normal speed</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Hard</strong><span>fast AI, fast ball</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: W / S or &uarr; / &darr; to move your paddle. Touch and drag on mobile.</p>' +
      '</div>';
    document.getElementById('pg-mode-close').addEventListener('click', pgClose);
    var btns = pgOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ pgBoot(this.getAttribute('data-mode')); });
    }
  }
  function pgBoot(mode){
    wbTrackGamePlayed('neonPong');
    pgOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="pg-close-btn" title="unload">&times;</div>' +
        '<button class="ac-pause-btn" id="pg-pause-btn" title="pause">⏸</button>' +
        '<div class="ac-game-info"><b>Neon Pong</b> &middot; W/S or arrows to move paddle &middot; First to 7 wins &middot; <b>Tip:</b> Win 7-0 for a special achievement</div>' +
        '<div class="ac-canvas-wrap"><canvas id="pg-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="pg-status">FIRST TO 7 WINS</div>' +
        '<div class="ac-pause-overlay" id="pg-pause-overlay"><h3>Paused</h3><button id="pg-resume-btn">Resume</button></div>' +
      '</div>';
    document.getElementById('pg-close-btn').addEventListener('click', pgClose);
    pgStartGame(mode);
  }
  function pgClose(){
    if(pgRaf) cancelAnimationFrame(pgRaf);
    pgRaf = null;
    window.removeEventListener('keydown', pgOnKeyDown);
    window.removeEventListener('keyup', pgOnKeyUp);
    pgKeys = {};
    pgExitFullscreen();
    pgOverlay.classList.remove('on');
    pgOverlay.innerHTML = '';
    pgRenderTile();
  }

  function pgStartGame(mode){
    var canvas = document.getElementById('pg-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 16/9;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var W = canvas.width, H = canvas.height;
    var paddleH = 80, paddleW = 12;
    var player = { x: 30, y: H/2 - paddleH/2, score: 0 };
    var ai = { x: W - 30 - paddleW, y: H/2 - paddleH/2, score: 0 };
    var ball = { x: W/2, y: H/2, vx: 0, vy: 0, r: 8 };
    var ballSpeed = mode==='hard' ? 380 : (mode==='easy' ? 220 : 300);
    var aiSpeed = mode==='hard' ? 320 : (mode==='easy' ? 160 : 240);
    var aiReact = mode==='hard' ? 0.9 : (mode==='easy' ? 0.4 : 0.65);
    var over = false, paused = false;
    var statusEl = document.getElementById('pg-status');
    var pgPauseBtn = document.getElementById('pg-pause-btn');
    var pgPauseOv = document.getElementById('pg-pause-overlay');
    var pgResumeBtn = document.getElementById('pg-resume-btn');
    if(pgPauseBtn) pgPauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(pgPauseOv) pgPauseOv.classList.toggle('on', paused); pgPauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(pgResumeBtn) pgResumeBtn.addEventListener('click', function(){ paused = false; if(pgPauseOv) pgPauseOv.classList.remove('on'); if(pgPauseBtn) pgPauseBtn.textContent = '⏸'; });

    function resetBall(dir){
      ball.x = W/2; ball.y = H/2;
      var ang = (Math.random() - 0.5) * 0.6;
      ball.vx = dir * ballSpeed * Math.cos(ang);
      ball.vy = ballSpeed * Math.sin(ang);
    }
    resetBall(Math.random() > 0.5 ? 1 : -1);

    // Touch controls
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var scaleY = canvas.height / rect.height;
      player.y = (e.touches[0].clientY - rect.top) * scaleY - paddleH/2;
      player.y = Math.max(0, Math.min(H - paddleH, player.y));
    }, { passive:false });

    window.addEventListener('keydown', pgOnKeyDown);
    window.addEventListener('keyup', pgOnKeyUp);
    var last = performance.now();

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!over && !paused){
        // Player movement
        var pSpeed = 400;
        if(pgKeys['w'] || pgKeys['arrowup']) player.y -= pSpeed*dt;
        if(pgKeys['s'] || pgKeys['arrowdown']) player.y += pSpeed*dt;
        player.y = Math.max(0, Math.min(H - paddleH, player.y));

        // AI movement
        var aiTarget = ball.y - paddleH/2;
        var aiDiff = aiTarget - ai.y;
        if(Math.abs(aiDiff) > 4){
          ai.y += Math.sign(aiDiff) * aiSpeed * aiReact * dt;
        }
        ai.y = Math.max(0, Math.min(H - paddleH, ai.y));

        // Ball movement
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Top/bottom walls
        if(ball.y - ball.r < 0){ ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
        if(ball.y + ball.r > H){ ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); }

        // Player paddle collision
        if(ball.x - ball.r < player.x + paddleW && ball.x - ball.r > player.x && ball.y > player.y && ball.y < player.y + paddleH && ball.vx < 0){
          ball.x = player.x + paddleW + ball.r;
          ball.vx = Math.abs(ball.vx);
          var relY = (ball.y - (player.y + paddleH/2)) / (paddleH/2);
          ball.vy = relY * ballSpeed * 0.7;
        }

        // AI paddle collision
        if(ball.x + ball.r > ai.x && ball.x + ball.r < ai.x + paddleW && ball.y > ai.y && ball.y < ai.y + paddleH && ball.vx > 0){
          ball.x = ai.x - ball.r;
          ball.vx = -Math.abs(ball.vx);
          var relY2 = (ball.y - (ai.y + paddleH/2)) / (paddleH/2);
          ball.vy = relY2 * ballSpeed * 0.7;
        }

        // Score
        if(ball.x < -20){
          ai.score++; resetBall(1);
          if(ai.score >= 7){ over = true; wbRecordFightResult('neonPong', 'loss', false); wbRecordGameScore('neonPong', mode, player.score * 100); }
        }
        if(ball.x > W + 20){
          player.score++; resetBall(-1);
          if(player.score >= 7){ over = true; if(ai.score === 0) wbTrackSpecialAchievement('pongShutout'); wbRecordFightResult('neonPong', 'win', false); wbRecordGameScore('neonPong', mode, player.score * 100); }
        }

        if(statusEl){
          if(over) statusEl.textContent = (player.score >= 7 ? 'YOU WIN! ' : 'YOU LOSE ') + player.score + ' - ' + ai.score + ' \u2014 click to reset';
          else statusEl.textContent = 'You: ' + player.score + '  |  AI: ' + ai.score + '  |  First to 7';
        }
      }

      // Render
      ctx.clearRect(0,0,W,H);
      var bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#0a0e18'); bg.addColorStop(1,'#12161d');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // Center line
      ctx.strokeStyle = 'rgba(95,212,199,.15)'; ctx.lineWidth = 2;
      ctx.setLineDash([8,8]);
      ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
      ctx.setLineDash([]);

      // Scores
      ctx.font = 'bold 56px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(95,212,199,.3)';
      ctx.fillText(player.score, W/4, 80);
      ctx.fillStyle = 'rgba(255,90,90,.3)';
      ctx.fillText(ai.score, W*3/4, 80);

      // Player paddle
      ctx.fillStyle = '#5fd4c7';
      ctx.fillRect(player.x, player.y, paddleW, paddleH);
      ctx.fillStyle = 'rgba(95,212,199,.3)';
      ctx.fillRect(player.x - 4, player.y, 4, paddleH);

      // AI paddle
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(ai.x, ai.y, paddleW, paddleH);
      ctx.fillStyle = 'rgba(255,90,90,.3)';
      ctx.fillRect(ai.x + paddleW, ai.y, 4, paddleH);

      // Ball
      ctx.fillStyle = '#e0a458';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(224,164,88,.3)';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r*2.5, 0, Math.PI*2); ctx.fill();

      // Vignette
      var vg = ctx.createRadialGradient(W/2,H*0.5,H*0.3,W/2,H*0.5,H*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.4)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

      if(over){
        canvas.addEventListener('click', function(){ pgBoot(mode); }, { once:true });
      }

      pgRaf = requestAnimationFrame(loop);
    }
    pgRaf = requestAnimationFrame(loop);
  }
  pgRenderTile();
})();

/* ---- Arcade cabinet #7: Meteor Command (missile command) ---- */
(function(){
  var mcSlot = document.getElementById('mc-slot-7');
  var mcOverlay = document.getElementById('ac-overlay');
  var mcRaf = null;
  var mcKeys = {};

  function mcOnKeyDown(e){ mcKeys[e.key.toLowerCase()] = true; }
  function mcOnKeyUp(e){ mcKeys[e.key.toLowerCase()] = false; }

  function mcRenderTile(){
    mcSlot.innerHTML =
      '<div class="ac-bubble" id="mc-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">METEOR COMMAND</div>' +
          '<div class="ac-sub">arcade &middot; defense</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><rect x="4" y="36" width="6" height="6" fill="#5fd4c7"/><rect x="14" y="36" width="6" height="6" fill="#5fd4c7"/><rect x="24" y="36" width="6" height="6" fill="#5fd4c7"/><circle cx="10" cy="12" r="3" fill="#ff5a5a"/><circle cx="22" cy="8" r="2" fill="#e0a458"/><circle cx="17" cy="22" r="2" fill="#ff8f6b"/><line x1="17" y1="36" x2="10" y2="12" stroke="#5fd4c7" stroke-width="1" opacity=".4"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Missile Command. Defend your cities from incoming meteors. Click to fire interceptors!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('mc-bubble-btn').addEventListener('click', mcOpen, { once:true });
  }

  function mcRequestFullscreen(){
    var el = mcOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function mcExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function mcOpen(){
    mcOverlay.classList.add('on');
    mcRequestFullscreen();
    mcShowLoading();
    setTimeout(mcShowModeSelect, 500);
  }
  function mcShowLoading(){
    mcOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING METEOR COMMAND&hellip;</div></div>';
  }
  function mcShowModeSelect(){
    mcOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="mc-mode-close" title="close">&times;</div>' +
        '<h2>METEOR COMMAND</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>moderate meteors</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Hard</strong><span>fast, frequent meteors</span></button>' +
          '<button class="ac-mode-btn" data-mode="survival"><strong>Survival</strong><span>endless, escalating</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click or tap anywhere to fire an interceptor. Protect your cities at the bottom.</p>' +
      '</div>';
    document.getElementById('mc-mode-close').addEventListener('click', mcClose);
    var btns = mcOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ mcBoot(this.getAttribute('data-mode')); });
    }
  }
  function mcBoot(mode){
    wbTrackGamePlayed('meteorCommand');
    mcOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="mc-close-btn" title="unload">&times;</div>' +
        '<button class="ac-pause-btn" id="mc-pause-btn" title="pause">⏸</button>' +
        '<div class="ac-game-info"><b>Meteor Command</b> &middot; Click/tap to launch interceptors &middot; Protect your cities &middot; <b>Tip:</b> Lead your shots for fast meteors</div>' +
        '<div class="ac-canvas-wrap"><canvas id="mc-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="mc-status">PROTECT YOUR CITIES!</div>' +
        '<div class="ac-pause-overlay" id="mc-pause-overlay"><h3>Paused</h3><button id="mc-resume-btn">Resume</button></div>' +
      '</div>';
    document.getElementById('mc-close-btn').addEventListener('click', mcClose);
    mcStartGame(mode);
  }
  function mcClose(){
    if(mcRaf) cancelAnimationFrame(mcRaf);
    mcRaf = null;
    window.removeEventListener('keydown', mcOnKeyDown);
    window.removeEventListener('keyup', mcOnKeyUp);
    mcKeys = {};
    mcExitFullscreen();
    mcOverlay.classList.remove('on');
    mcOverlay.innerHTML = '';
    mcRenderTile();
  }

  function mcStartGame(mode){
    var canvas = document.getElementById('mc-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 16/9;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var W = canvas.width, H = canvas.height;
    var cities = [];
    var cityCount = 5;
    for(var ci=0; ci<cityCount; ci++){
      cities.push({ x: 80 + ci * (W - 160) / (cityCount - 1), y: H - 40, alive: true });
    }
    var base = { x: W/2, y: H - 20 };
    var meteors = [];
    var missiles = [];
    var explosions = [];
    var particles = [];
    var score = 0, wave = 1, waveTimer = 0, over = false, paused = false;
    var isSurvival = mode === 'survival';
    var meteorRate = mode==='hard' ? 1.2 : 2.0;
    var meteorSpeed = mode==='hard' ? 120 : 80;
    var statusEl = document.getElementById('mc-status');
    var mcPauseBtn = document.getElementById('mc-pause-btn');
    var mcPauseOv = document.getElementById('mc-pause-overlay');
    var mcResumeBtn = document.getElementById('mc-resume-btn');
    if(mcPauseBtn) mcPauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(mcPauseOv) mcPauseOv.classList.toggle('on', paused); mcPauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(mcResumeBtn) mcResumeBtn.addEventListener('click', function(){ paused = false; if(mcPauseOv) mcPauseOv.classList.remove('on'); if(mcPauseBtn) mcPauseBtn.textContent = '⏸'; });

    canvas.addEventListener('click', function(e){
      if(over) return;
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var tx = (e.clientX - rect.left) * scaleX;
      var ty = (e.clientY - rect.top) * scaleY;
      // Launch missile from base toward target
      var dx = tx - base.x, dy = ty - base.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      var spd = 500;
      missiles.push({ x: base.x, y: base.y, tx: tx, ty: ty, vx: dx/dist*spd, vy: dy/dist*spd, life: 0, maxLife: dist/spd });
    });

    canvas.addEventListener('touchstart', function(e){
      if(over) return;
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var tx = (e.touches[0].clientX - rect.left) * scaleX;
      var ty = (e.touches[0].clientY - rect.top) * scaleY;
      var dx = tx - base.x, dy = ty - base.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      var spd = 500;
      missiles.push({ x: base.x, y: base.y, tx: tx, ty: ty, vx: dx/dist*spd, vy: dy/dist*spd, life: 0, maxLife: dist/spd });
    }, { passive:false });

    window.addEventListener('keydown', mcOnKeyDown);
    window.addEventListener('keyup', mcOnKeyUp);
    var last = performance.now();

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!over && !paused){
        // Spawn meteors
        waveTimer += dt;
        var spawnInterval = isSurvival ? Math.max(0.4, meteorRate - wave*0.1) : meteorRate;
        if(waveTimer >= spawnInterval){
          waveTimer = 0;
          var targetCity = cities[Math.floor(Math.random()*cities.length)];
          if(!targetCity.alive){
            for(var ci2=0; ci2<cities.length; ci2++){ if(cities[ci2].alive){ targetCity = cities[ci2]; break; } }
          }
          meteors.push({
            x: Math.random()*W, y: -20,
            vx: (targetCity.x - Math.random()*W) * 0.3 / (H / meteorSpeed),
            vy: meteorSpeed + Math.random()*40,
            r: 8 + Math.random()*6
          });
        }

        // Update missiles
        for(var mi=missiles.length-1; mi>=0; mi--){
          var m = missiles[mi];
          m.x += m.vx * dt; m.y += m.vy * dt; m.life += dt;
          if(m.life >= m.maxLife || m.y <= m.ty){
            // Explode at target
            explosions.push({ x: m.tx, y: m.ty, r: 5, maxR: 60, life: 0.5, maxLife: 0.5 });
            missiles.splice(mi, 1);
          }
        }

        // Update meteors
        for(var mei=meteors.length-1; mei>=0; mei--){
          var me = meteors[mei];
          me.x += me.vx * dt; me.y += me.vy * dt;

          // Check explosions
          for(var exi=explosions.length-1; exi>=0; exi--){
            var ex = explosions[exi];
            var dx = me.x - ex.x, dy = me.y - ex.y;
            if(dx*dx + dy*dy < ex.r*ex.r){
              score += 10;
              mcSpawnParticles(particles, me.x, me.y, '#ff8f6b', 8);
              meteors.splice(mei, 1);
              break;
            }
          }
          if(mei >= meteors.length) continue;

          // Check city collision
          if(me.y > H - 45){
            for(var cci=0; cci<cities.length; cci++){
              if(cities[cci].alive && Math.abs(me.x - cities[cci].x) < 30){
                cities[cci].alive = false;
                mcSpawnParticles(particles, cities[cci].x, cities[cci].y, '#ff5a5a', 20);
                meteors.splice(mei, 1);
                break;
              }
            }
            if(mei >= meteors.length) continue;
            // Check if meteor hit ground without city
            if(me.y > H - 15){
              mcSpawnParticles(particles, me.x, H-15, '#8b93a1', 5);
              meteors.splice(mei, 1);
            }
          }
        }

        // Update explosions
        for(var exi2=explosions.length-1; exi2>=0; exi2--){
          var ex2 = explosions[exi2];
          ex2.life -= dt;
          ex2.r = ex2.maxR * (1 - ex2.life / ex2.maxLife);
          if(ex2.life <= 0) explosions.splice(exi2, 1);
        }

        // Update particles
        for(var pi=particles.length-1; pi>=0; pi--){
          var p = particles[pi];
          p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 150*dt; p.life -= dt;
          if(p.life <= 0) particles.splice(pi, 1);
        }

        // Check game over
        var aliveCities = 0;
        for(var ac=0; ac<cities.length; ac++){ if(cities[ac].alive) aliveCities++; }
        if(aliveCities === 0){
          over = true;
          wbRecordFightResult('meteorCommand', 'loss', false);
          wbRecordGameScore('meteorCommand', mode, score);
        }

        // Wave progression
        if(score > 0 && score % 100 === 0 && waveTimer < 0.1){
          wave++;
        }

        if(statusEl){
          if(over) statusEl.textContent = 'GAME OVER \u2014 Score: ' + score + ' \u2014 Wave: ' + wave + ' \u2014 click to reset';
          else statusEl.textContent = 'Score: ' + score + '  |  Cities: ' + aliveCities + '/' + cityCount + '  |  Wave: ' + wave;
        }
      }

      // Render
      ctx.clearRect(0,0,W,H);
      var bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#050810'); bg.addColorStop(0.7,'#0a0e18'); bg.addColorStop(1,'#1a1a24');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // Stars
      ctx.fillStyle = 'rgba(200,210,255,.2)';
      for(var st=0; st<50; st++){
        var sx = (st * 137) % W;
        var sy = (st * 97) % (H - 60);
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Ground
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, H - 15, W, 15);
      ctx.strokeStyle = 'rgba(95,212,199,.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H-15); ctx.lineTo(W, H-15); ctx.stroke();

      // Cities
      for(var c=0; c<cities.length; c++){
        var city = cities[c];
        if(!city.alive) continue;
        ctx.fillStyle = '#5fd4c7';
        ctx.fillRect(city.x - 20, city.y, 40, 20);
        ctx.fillStyle = 'rgba(95,212,199,.5)';
        ctx.fillRect(city.x - 20, city.y, 40, 4);
        ctx.fillStyle = '#3a3e48';
        for(var cw=0; cw<4; cw++){
          ctx.fillRect(city.x - 18 + cw*10, city.y + 5, 6, 15);
        }
      }

      // Base
      ctx.fillStyle = '#e0a458';
      ctx.fillRect(base.x - 15, base.y - 10, 30, 10);
      ctx.fillStyle = '#8a6020';
      ctx.fillRect(base.x - 15, base.y, 30, 5);

      // Meteors
      for(var me2=0; me2<meteors.length; me2++){
        var m2 = meteors[me2];
        ctx.fillStyle = 'rgba(255,90,90,.3)';
        ctx.beginPath(); ctx.arc(m2.x, m2.y, m2.r*1.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff5a5a';
        ctx.beginPath(); ctx.arc(m2.x, m2.y, m2.r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff8f6b';
        ctx.beginPath(); ctx.arc(m2.x - m2.r*0.3, m2.y - m2.r*0.3, m2.r*0.4, 0, Math.PI*2); ctx.fill();
      }

      // Missiles
      ctx.strokeStyle = '#5fd4c7'; ctx.lineWidth = 2;
      for(var ml=0; ml<missiles.length; ml++){
        var ms = missiles[ml];
        ctx.beginPath(); ctx.moveTo(base.x, base.y - 10); ctx.lineTo(ms.x, ms.y); ctx.stroke();
        ctx.fillStyle = '#e0a458';
        ctx.beginPath(); ctx.arc(ms.x, ms.y, 3, 0, Math.PI*2); ctx.fill();
      }

      // Explosions
      for(var ex3=0; ex3<explosions.length; ex3++){
        var ex4 = explosions[ex3];
        var alpha = ex4.life / ex4.maxLife;
        ctx.fillStyle = 'rgba(224,164,88,' + (alpha*0.5) + ')';
        ctx.beginPath(); ctx.arc(ex4.x, ex4.y, ex4.r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,143,107,' + alpha + ')';
        ctx.beginPath(); ctx.arc(ex4.x, ex4.y, ex4.r*0.6, 0, Math.PI*2); ctx.fill();
      }

      // Particles
      for(var pt=0; pt<particles.length; pt++){
        var pp = particles[pt];
        ctx.globalAlpha = Math.max(0, pp.life / pp.maxLife);
        ctx.fillStyle = pp.color;
        ctx.fillRect(pp.x - 2, pp.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      }

      // Vignette
      var vg = ctx.createRadialGradient(W/2,H*0.5,H*0.3,W/2,H*0.5,H*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.5)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

      if(over){
        canvas.addEventListener('click', function(){ mcBoot(mode); }, { once:true });
      }

      mcRaf = requestAnimationFrame(loop);
    }
    mcRaf = requestAnimationFrame(loop);
  }
  function mcSpawnParticles(list, x, y, color, n){
    for(var i=0; i<n; i++){
      var ang = Math.random()*Math.PI*2;
      var spd = 50 + Math.random()*100;
      list.push({ x:x, y:y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:0.4+Math.random()*0.3, maxLife:0.6, color:color });
    }
  }
  mcRenderTile();
})();

/* ---- Arcade cabinet #8: Stack Surge (timing stacker) ---- */
(function(){
  var ssSlot = document.getElementById('ss-slot-8');
  var ssOverlay = document.getElementById('ac-overlay');
  var ssRaf = null;
  var ssKeys = {};

  function ssOnKeyDown(e){ ssKeys[e.key.toLowerCase()] = true; }
  function ssOnKeyUp(e){ ssKeys[e.key.toLowerCase()] = false; }

  function ssRenderTile(){
    ssSlot.innerHTML =
      '<div class="ac-bubble" id="ss-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">STACK SURGE</div>' +
          '<div class="ac-sub">arcade &middot; timing stacker</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><rect x="6" y="34" width="22" height="6" fill="#5fd4c7"/><rect x="8" y="26" width="18" height="6" fill="#e0a458"/><rect x="10" y="18" width="14" height="6" fill="#ff5a5a"/><rect x="12" y="10" width="10" height="6" fill="#5fd4c7"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Timing stacker. Drop blocks to build a tower. Misaligned edges get trimmed. How tall can you go?</div>' +
        '</div>' +
      '</div>';
    document.getElementById('ss-bubble-btn').addEventListener('click', ssOpen, { once:true });
  }

  function ssRequestFullscreen(){
    var el = ssOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function ssExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function ssOpen(){
    ssOverlay.classList.add('on');
    ssRequestFullscreen();
    ssShowLoading();
    setTimeout(ssShowModeSelect, 500);
  }
  function ssShowLoading(){
    ssOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING STACK SURGE&hellip;</div></div>';
  }
  function ssShowModeSelect(){
    ssOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<div class="ac-mode-close" id="ss-mode-close" title="close">&times;</div>' +
        '<h2>STACK SURGE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>steady speed, classic mode</span></button>' +
          '<button class="ac-mode-btn" data-mode="speed"><strong>Speed</strong><span>gets faster each row</span></button>' +
          '<button class="ac-mode-btn" data-mode="zen"><strong>Zen</strong><span>no game over, just stack</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Space, Enter, or tap to drop the block. Time it perfectly!</p>' +
      '</div>';
    document.getElementById('ss-mode-close').addEventListener('click', ssClose);
    var btns = ssOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ ssBoot(this.getAttribute('data-mode')); });
    }
  }
  function ssBoot(mode){
    wbTrackGamePlayed('stackSurge');
    ssOverlay.innerHTML =
      '<div class="ac-game">' +
        '<div class="ac-close" id="ss-close-btn" title="unload">&times;</div>' +
        '<button class="ac-pause-btn" id="ss-pause-btn" title="pause">⏸</button>' +
        '<div class="ac-game-info"><b>Stack Surge</b> &middot; Click/tap or Space to drop blocks &middot; Stack as high as you can &middot; <b>Tip:</b> Perfect alignment keeps your stack steady</div>' +
        '<div class="ac-canvas-wrap"><canvas id="ss-canvas" width="960" height="540"></canvas></div>' +
        '<div class="ac-status" id="ss-status">TAP OR SPACE TO DROP!</div>' +
        '<div class="ac-pause-overlay" id="ss-pause-overlay"><h3>Paused</h3><button id="ss-resume-btn">Resume</button></div>' +
      '</div>';
    document.getElementById('ss-close-btn').addEventListener('click', ssClose);
    ssStartGame(mode);
  }
  function ssClose(){
    if(ssRaf) cancelAnimationFrame(ssRaf);
    ssRaf = null;
    window.removeEventListener('keydown', ssOnKeyDown);
    window.removeEventListener('keyup', ssOnKeyUp);
    ssKeys = {};
    ssExitFullscreen();
    ssOverlay.classList.remove('on');
    ssOverlay.innerHTML = '';
    ssRenderTile();
  }

  function ssStartGame(mode){
    var canvas = document.getElementById('ss-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 16/9;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var W = canvas.width, H = canvas.height;
    var blockH = 30;
    var baseW = 300;
    var stack = [{ x: W/2 - baseW/2, w: baseW, y: H - 40 }];
    var current = { x: 0, w: baseW, y: H - 40 - blockH, dir: 1, speed: 200 };
    var score = 0, over = false, paused = false;
    var isZen = mode === 'zen';
    var isSpeed = mode === 'speed';
    var statusEl = document.getElementById('ss-status');
    var ssPauseBtn = document.getElementById('ss-pause-btn');
    var ssPauseOv = document.getElementById('ss-pause-overlay');
    var ssResumeBtn = document.getElementById('ss-resume-btn');
    if(ssPauseBtn) ssPauseBtn.addEventListener('click', function(){ if(over) return; paused = !paused; if(ssPauseOv) ssPauseOv.classList.toggle('on', paused); ssPauseBtn.textContent = paused ? '▶' : '⏸'; });
    if(ssResumeBtn) ssResumeBtn.addEventListener('click', function(){ paused = false; if(ssPauseOv) ssPauseOv.classList.remove('on'); if(ssPauseBtn) ssPauseBtn.textContent = '⏸'; });
    var colors = ['#5fd4c7','#e0a458','#ff5a5a','#ff8f6b','#5f9fd4','#9a6a9a','#5fd4c7','#e0a458'];

    function dropBlock(){
      if(over) return;
      var top = stack[stack.length - 1];
      var overlapL = Math.max(current.x, top.x);
      var overlapR = Math.min(current.x + current.w, top.x + top.w);
      var overlap = overlapR - overlapL;

      if(overlap <= 0 && !isZen){
        over = true;
        wbRecordFightResult('stackSurge', 'loss', false);
        wbRecordGameScore('stackSurge', mode, score);
        return;
      }

      if(overlap <= 0 && isZen){
        // In zen mode, just place it at the edge
        overlap = 10;
        overlapL = top.x;
        overlapR = top.x + 10;
      }

      var newBlock = { x: overlapL, w: overlap, y: current.y };
      stack.push(newBlock);
      score++;

      // Trim the overhang
      if(overlap < current.w){
        // Add falling piece for visual effect
      }

      // New block
      var newW = overlap;
      current.w = newW;
      current.y = newBlock.y - blockH;
      current.x = current.dir > 0 ? 0 : W - newW;
      current.speed = isSpeed ? 200 + score * 15 : Math.min(400, 200 + score * 5);
      current.dir = -current.dir;

      if(statusEl){
        if(over) statusEl.textContent = 'GAME OVER \u2014 Height: ' + score + ' \u2014 click to reset';
        else statusEl.textContent = 'Height: ' + score + '  |  Width: ' + Math.round(newW) + 'px';
      }
    }

    function onDrop(e){
      if(e) e.preventDefault();
      if(over){
        canvas.removeEventListener('click', onDrop);
        canvas.removeEventListener('touchstart', onDrop);
        ssBoot(mode);
        return;
      }
      dropBlock();
    }

    canvas.addEventListener('click', onDrop);
    canvas.addEventListener('touchstart', onDrop, { passive:false });

    window.addEventListener('keydown', ssOnKeyDown);
    window.addEventListener('keyup', ssOnKeyUp);
    var last = performance.now();
    var spacePressed = false;

    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!paused){
      // Handle space/enter drop
      if((ssKeys[' '] || ssKeys['enter']) && !spacePressed){
        spacePressed = true;
        if(over){
          ssBoot(mode);
          return;
        }
        dropBlock();
      }
      if(!ssKeys[' '] && !ssKeys['enter']) spacePressed = false;

      if(!over){
        // Move current block
        current.x += current.dir * current.speed * dt;
        if(current.x <= 0){ current.x = 0; current.dir = 1; }
        if(current.x + current.w >= W){ current.x = W - current.w; current.dir = -1; }
      }

      // Render
      ctx.clearRect(0,0,W,H);
      var bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#0a0e18'); bg.addColorStop(1,'#12161d');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // Draw stack
      for(var s=0; s<stack.length; s++){
        var block = stack[s];
        ctx.fillStyle = colors[s % colors.length];
        ctx.fillRect(block.x, block.y, block.w, blockH);
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        ctx.fillRect(block.x, block.y, block.w, 3);
        ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(block.x, block.y, block.w, blockH);
      }

      // Draw current moving block
      if(!over){
        ctx.fillStyle = colors[stack.length % colors.length];
        ctx.fillRect(current.x, current.y, current.w, blockH);
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        ctx.fillRect(current.x, current.y, current.w, 3);
        ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(current.x, current.y, current.w, blockH);

        // Guide line
        var top = stack[stack.length - 1];
        ctx.strokeStyle = 'rgba(224,164,88,.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4,4]);
        ctx.beginPath();
        ctx.moveTo(top.x, current.y); ctx.lineTo(top.x, current.y + blockH);
        ctx.moveTo(top.x + top.w, current.y); ctx.lineTo(top.x + top.w, current.y + blockH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Vignette
      var vg = ctx.createRadialGradient(W/2,H*0.5,H*0.3,W/2,H*0.5,H*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.4)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
      }

      ssRaf = requestAnimationFrame(loop);
    }
    ssRaf = requestAnimationFrame(loop);
  }
  ssRenderTile();
})();

/* ---- Arcade cabinet #9: Bot Defense ---- */
(function(){
  var bdSlot = document.getElementById('bd-slot-9');
  if(!bdSlot) return;
  var bdOverlay = document.getElementById('ac-overlay');
  var bdRaf = null;
  var bdKeys = {};
  var bdCanvas, bdCtx;
  var W = 900, H = 450;
  var GROUND_Y = 360;
  var bdPlayer = { x:100, y:0, vx:0, vy:0, health:100, maxHealth:100, speed:3, onGround:true, facing:1, weapon:'rifle' };
  var bdEnemies = [];
  var bdBullets = [];
  var bdParticles = [];
  var bdBarricades = [];
  var bdScore = 0;
  var bdScoreFloat = 0;
  var bdKills = 0;
  var bdTime = 0;
  var bdWave = 0;
  var bdWaveTimer = 0;
  var bdEnemiesInWave = 0;
  var bdEnemiesSpawned = 0;
  var bdSpawnTimer = 0;
  var bdShootCooldown = 0;
  var bdRunning = false;
  var bdPaused = false;
  var bdGameOver = false;
  var bdDifficulty = 'normal';
  var bdCameraX = 0;
  var bdBarricadeCooldown = 0;

  function bdOnKeyDown(e){ bdKeys[e.key.toLowerCase()] = true; if(e.key === ' ') { e.preventDefault(); bdKeys[' '] = true; } }
  function bdOnKeyUp(e){ bdKeys[e.key.toLowerCase()] = false; }

  function bdRenderTile(){
    bdSlot.innerHTML =
      '<div class="ac-bubble" id="bd-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">BOT DEFENSE</div>' +
          '<div class="ac-sub">side-scroll &middot; wave defense</div>' +
          '<div class="ac-vs">' +
            '<svg viewBox="0 0 34 44"><rect x="12" y="10" width="10" height="24" rx="3" fill="#5fd4c7"/><rect x="14" y="6" width="6" height="6" rx="2" fill="#e8c39e"/><rect x="22" y="18" width="10" height="4" rx="1" fill="#444"/></svg>' +
            '<svg viewBox="0 0 34 44"><rect x="8" y="14" width="12" height="22" rx="2" fill="#4a6a3a"/><rect x="10" y="8" width="8" height="8" rx="2" fill="#5a7a4a"/><circle cx="12" cy="11" r="1.5" fill="#ff0000"/><circle cx="16" cy="11" r="1.5" fill="#ff0000"/></svg>' +
          '</div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Side-scroll wave defense. Move, shoot, and place barricades. Survive the zombie waves!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('bd-bubble-btn').addEventListener('click', bdOpen, { once:true });
  }

  function bdRequestFullscreen(){
    var el = bdOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function bdExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function bdOpen(){
    bdOverlay.classList.add('on');
    bdRequestFullscreen();
    bdShowLoading();
    setTimeout(bdShowModeSelect, 500);
  }
  function bdShowLoading(){
    bdOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING BOT DEFENSE&hellip;</div></div>';
  }
  function bdShowModeSelect(){
    bdOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="bd-close-btn">&times;</span>' +
        '<h2>BOT DEFENSE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" id="bd-easy"><strong>Easy</strong><span>Slow enemies, more health, cheaper barricades</span></button>' +
          '<button class="ac-mode-btn" id="bd-normal"><strong>Normal</strong><span>Balanced wave defense</span></button>' +
          '<button class="ac-mode-btn" id="bd-hard"><strong>Hard</strong><span>Fast enemies, less health, pricey barricades</span></button>' +
        '</div>' +
        '<p class="ac-hint">A/D or arrows to move, SPACE or F to shoot. Press B to place barricades (costs score). Survive the waves!</p>' +
      '</div>';
    document.getElementById('bd-close-btn').addEventListener('click', bdClose);
    document.getElementById('bd-easy').addEventListener('click', function(){ bdStart('easy'); });
    document.getElementById('bd-normal').addEventListener('click', function(){ bdStart('normal'); });
    document.getElementById('bd-hard').addEventListener('click', function(){ bdStart('hard'); });
  }

  function bdClose(){
    bdRunning = false;
    if(bdRaf) cancelAnimationFrame(bdRaf);
    bdExitFullscreen();
    bdOverlay.classList.remove('on');
    bdOverlay.innerHTML = '';
    window.removeEventListener('keydown', bdOnKeyDown);
    window.removeEventListener('keyup', bdOnKeyUp);
    setTimeout(bdRenderTile, 200);
  }

  function bdStart(mode){
    bdDifficulty = mode;
    var hp = mode === 'easy' ? 150 : mode === 'hard' ? 60 : 100;
    bdPlayer = { x:120, y:GROUND_Y, vx:0, vy:0, health:hp, maxHealth:hp, speed: mode === 'easy' ? 3.5 : mode === 'hard' ? 2.5 : 3, onGround:true, facing:1, weapon:'rifle' };
    bdEnemies = [];
    bdBullets = [];
    bdParticles = [];
    bdBarricades = [];
    bdScore = 0;
    bdScoreFloat = 0;
    bdKills = 0;
    bdTime = 0;
    bdWave = 0;
    bdWaveTimer = 3;
    bdEnemiesInWave = 0;
    bdEnemiesSpawned = 0;
    bdSpawnTimer = 0;
    bdShootCooldown = 0;
    bdBarricadeCooldown = 0;
    bdCameraX = 0;
    bdRunning = true;
    bdPaused = false;
    bdGameOver = false;
    window.addEventListener('keydown', bdOnKeyDown);
    window.addEventListener('keyup', bdOnKeyUp);
    bdSetupGame();
  }

  function bdSetupGame(){
    bdOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="bd-game-close">&times;</span>' +
        '<span class="ac-pause-btn" id="bd-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-hud">' +
          '<div class="ac-hp-block"><div class="ac-hp-name">HEALTH</div><div class="ac-hp-bar-bg"><div class="ac-hp-bar" id="bd-hp-bar" style="width:100%"></div></div></div>' +
          '<div class="ac-clock" id="bd-clock">WAVE 1</div>' +
          '<div class="ac-hp-block p2"><div class="ac-hp-name">KILLS: <span id="bd-kills">0</span></div><div class="ac-hp-name">SCORE: <span id="bd-score">0</span></div></div>' +
        '</div>' +
        '<div class="ac-game-info"><b>Bot Defense</b> &middot; A/D to move &middot; SPACE or F to shoot &middot; B to place barricade (costs 20 pts) &middot; Survive the waves!</div>' +
        '<div class="ac-canvas-wrap"><canvas id="bd-canvas" width="900" height="450"></canvas></div>' +
        '<div class="ac-status" id="bd-status">Defend your position!</div>' +
        '<div class="ac-touch-controls">' +
          '<div class="ac-touch-row"><div class="ac-tbtn" id="bd-up">JUMP</div></div>' +
          '<div class="ac-touch-row"><div class="ac-tbtn" id="bd-left">LEFT</div><div class="ac-tbtn" id="bd-down">BARRICADE</div><div class="ac-tbtn" id="bd-right">RIGHT</div></div>' +
        '</div>' +
        '<div class="ac-pause-overlay" id="bd-pause-overlay"><h3>Paused</h3><button id="bd-resume">Resume</button></div>' +
      '</div>';
    bdCanvas = document.getElementById('bd-canvas');
    bdCtx = bdCanvas.getContext('2d');
    document.getElementById('bd-game-close').addEventListener('click', bdClose);
    document.getElementById('bd-pause-btn').addEventListener('click', bdTogglePause);
    document.getElementById('bd-resume').addEventListener('click', bdTogglePause);
    var touchMap = { 'bd-up':'w', 'bd-down':'b', 'bd-left':'a', 'bd-right':'d', 'bd-shoot':' ' };
    for(var id in touchMap){
      (function(key){
        var el = document.getElementById(id);
        if(el){
          el.addEventListener('touchstart', function(e){ e.preventDefault(); bdKeys[key] = true; });
          el.addEventListener('touchend', function(e){ e.preventDefault(); bdKeys[key] = false; });
        }
      })(touchMap[id]);
    }
    bdRaf = requestAnimationFrame(bdLoop);
  }

  function bdTogglePause(){
    bdPaused = !bdPaused;
    var ov = document.getElementById('bd-pause-overlay');
    if(ov) ov.classList.toggle('on', bdPaused);
    if(!bdPaused) bdRaf = requestAnimationFrame(bdLoop);
  }

  function bdStartWave(){
    bdWave++;
    bdEnemiesSpawned = 0;
    bdEnemiesInWave = 5 + bdWave * 3;
    bdSpawnTimer = 0;
    var status = document.getElementById('bd-status');
    if(status) status.textContent = 'Wave ' + bdWave + ' incoming!';
  }

  function bdSpawnEnemy(){
    var type = 'normal';
    var r = Math.random();
    if(bdWave >= 3 && r < 0.2) type = 'tank';
    else if(bdWave >= 2 && r < 0.4) type = 'fast';

    var speed = (bdDifficulty === 'easy' ? 0.8 : bdDifficulty === 'hard' ? 1.8 : 1.2) * 0.5; // 5.13.0: 50% slower zombies
    var hp = bdDifficulty === 'easy' ? 20 : bdDifficulty === 'hard' ? 40 : 30;
    var size = 14;

    if(type === 'fast'){ speed *= 1.8; hp *= 0.6; size = 10; }
    else if(type === 'tank'){ speed *= 0.5; hp *= 3; size = 22; }

    speed *= (1 + bdWave * 0.05);
    var spawnX = W + 50 + Math.random() * 100;
    var enemyY = GROUND_Y - size;
    bdEnemies.push({ x:spawnX, y:enemyY, speed:speed, health:hp, maxHealth:hp, size:size, type:type, attackCooldown:0 });
  }

  function bdPlaceBarricade(){
    var cost = bdDifficulty === 'easy' ? 15 : bdDifficulty === 'hard' ? 30 : 20;
    if(bdScore < cost) return;
    if(bdBarricadeCooldown > 0) return;
    // Don't place too close to player or other barricades
    var px = bdPlayer.x + bdPlayer.facing * 60;
    for(var i = 0; i < bdBarricades.length; i++){
      if(Math.abs(bdBarricades[i].x - px) < 40) return;
    }
    bdScore -= cost;
    bdBarricades.push({ x:px, y:GROUND_Y, health:100, maxHealth:100, w:30, h:40 });
    bdBarricadeCooldown = 1.0;
  }

  function bdLoop(){
    if(!bdRunning || bdPaused) return;
    var dt = 1/60;
    bdTime += dt;
    bdBarricadeCooldown = Math.max(0, bdBarricadeCooldown - dt);

    // Wave management
    if(bdEnemiesInWave > 0 && bdEnemiesSpawned < bdEnemiesInWave){
      bdSpawnTimer -= dt;
      if(bdSpawnTimer <= 0){
        bdSpawnTimer = Math.max(0.4, 2.0 - bdWave * 0.1);
        bdSpawnEnemy();
        bdEnemiesSpawned++;
      }
    } else if(bdEnemies.length === 0 && bdEnemiesSpawned >= bdEnemiesInWave){
      // Wave complete, start next wave after delay
      bdWaveTimer -= dt;
      var status = document.getElementById('bd-status');
      if(status) status.textContent = 'Next wave in ' + Math.ceil(bdWaveTimer) + 's...';
      if(bdWaveTimer <= 0){
        bdWaveTimer = 3;
        bdStartWave();
      }
    }

    // Player movement
    var dx = 0;
    if(bdKeys['a'] || bdKeys['arrowleft']){ dx -= 1; bdPlayer.facing = -1; }
    if(bdKeys['d'] || bdKeys['arrowright']){ dx += 1; bdPlayer.facing = 1; }
    bdPlayer.x += dx * bdPlayer.speed;
    bdPlayer.x = Math.max(30, Math.min(W - 30, bdPlayer.x));

    // Jump
    if((bdKeys['w'] || bdKeys['arrowup']) && bdPlayer.onGround){
      bdPlayer.vy = -10;
      bdPlayer.onGround = false;
    }
    // Barricade
    if(bdKeys['b']){ bdPlaceBarricade(); bdKeys['b'] = false; }

    // Gravity
    bdPlayer.vy += 0.5;
    bdPlayer.y += bdPlayer.vy;
    if(bdPlayer.y >= GROUND_Y){
      bdPlayer.y = GROUND_Y;
      bdPlayer.vy = 0;
      bdPlayer.onGround = true;
    }

    // 5.13.0: Manual shooting — player controls when to fire
    bdShootCooldown -= dt;
    if(bdShootCooldown <= 0 && (bdKeys[' '] || bdKeys['spacebar'] || bdKeys['f'])){
      bdShootCooldown = 0.2;
      var dir = bdPlayer.facing;
      bdBullets.push({ x:bdPlayer.x + dir * 15, y:bdPlayer.y - 20, vx:dir * 12, life:1.5, damage:15 });
    }

    // Bullets
    for(var i = bdBullets.length - 1; i >= 0; i--){
      var b = bdBullets[i];
      b.x += b.vx; b.life -= dt;
      if(b.life <= 0 || b.x < 0 || b.x > W + 50){ bdBullets.splice(i, 1); continue; }
      for(var j = bdEnemies.length - 1; j >= 0; j--){
        var e = bdEnemies[j];
        if(Math.abs(b.x - e.x) < e.size && Math.abs(b.y - (e.y - e.size/2)) < e.size){
          e.health -= b.damage;
          bdParticles.push({ x:b.x, y:b.y, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4, life:0.3, color:'#ff6600' });
          bdBullets.splice(i, 1);
          if(e.health <= 0){
            bdKills++;
            var pts = e.type === 'tank' ? 30 : e.type === 'fast' ? 15 : 10;
            bdScore += pts;
            for(var k = 0; k < 10; k++) bdParticles.push({ x:e.x, y:e.y - e.size/2, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6 - 2, life:0.6, color:e.type === 'tank' ? '#4a6a3a' : e.type === 'fast' ? '#aa3333' : '#6a3a3a' });
            bdEnemies.splice(j, 1);
          }
          break;
        }
      }
    }

    // Enemy movement and attacks
    for(var i = 0; i < bdEnemies.length; i++){
      var e = bdEnemies[i];
      // Move toward player
      var edx = bdPlayer.x - e.x;
      var elen = Math.abs(edx);
      if(elen > 5){
        e.x += (edx > 0 ? 1 : -1) * e.speed;
      }
      // Attack barricades if in the way
      var hitBarricade = false;
      for(var j = 0; j < bdBarricades.length; j++){
        var bar = bdBarricades[j];
        if(Math.abs(e.x - bar.x) < 25){
          hitBarricade = true;
          e.attackCooldown -= dt;
          if(e.attackCooldown <= 0){
            e.attackCooldown = 0.5;
            bar.health -= e.type === 'tank' ? 8 : 4;
            if(bar.health <= 0){ bdBarricades.splice(j, 1); }
          }
          break;
        }
      }
      // Attack player if close
      if(!hitBarricade && Math.abs(e.x - bdPlayer.x) < e.size + 15){
        e.attackCooldown -= dt;
        if(e.attackCooldown <= 0){
          e.attackCooldown = 0.8;
          bdPlayer.health -= e.type === 'tank' ? 8 : e.type === 'fast' ? 3 : 5;
        }
      }
    }

    // Particles
    for(var i = bdParticles.length - 1; i >= 0; i--){
      var p = bdParticles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= dt;
      if(p.life <= 0) bdParticles.splice(i, 1);
    }

    // Survival score
    bdScoreFloat += dt * 2;
    if(bdScoreFloat >= 1){
      bdScore += Math.floor(bdScoreFloat);
      bdScoreFloat -= Math.floor(bdScoreFloat);
    }

    // Achievements
    if(!wbProfile.specialAchievements) wbProfile.specialAchievements = {};
    if(bdTime >= 60) wbProfile.specialAchievements.zombieSurvivor = true;
    if(bdKills >= 50) wbProfile.specialAchievements.zombieSlayer = true;
    if(bdTime >= 120) wbProfile.specialAchievements.zombieMaster = true;

    // Death check
    if(bdPlayer.health <= 0){
      bdPlayer.health = 0;
      bdGameOver = true;
      bdRunning = false;
    }

    bdDraw();
    bdUpdateHUD();
    if(bdRunning) bdRaf = requestAnimationFrame(bdLoop);
    else if(bdGameOver) bdEndGame();
  }

  function bdDraw(){
    var ctx = bdCtx;
    // Sky gradient
    var sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#1a1a2e');
    sky.addColorStop(1, '#3a2a1a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Distant hills
    ctx.fillStyle = '#2a2a3a';
    for(var i = 0; i < 5; i++){
      var hx = (i * 200 - bdCameraX * 0.3) % (W + 200) - 100;
      ctx.beginPath();
      ctx.arc(hx, GROUND_Y, 80, Math.PI, 0); ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#3a3a2a';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // Road
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, GROUND_Y, W, 30);
    // Lane divider
    ctx.fillStyle = '#ddaa00';
    for(var x = 0; x < W; x += 40){
      ctx.fillRect(x, GROUND_Y + 14, 20, 3);
    }

    // Grass
    ctx.fillStyle = '#2a4a1a';
    ctx.fillRect(0, GROUND_Y + 30, W, H - GROUND_Y - 30);

    // Barricades
    for(var i = 0; i < bdBarricades.length; i++){
      var bar = bdBarricades[i];
      ctx.fillStyle = '#555';
      ctx.fillRect(bar.x - bar.w/2, bar.y - bar.h, bar.w, bar.h);
      // Hazard stripes
      ctx.fillStyle = '#ddaa00';
      ctx.fillRect(bar.x - bar.w/2, bar.y - bar.h, bar.w, 5);
      ctx.fillStyle = '#222';
      for(var s = 0; s < bar.w; s += 6){
        if((s/6) % 2 === 0) ctx.fillRect(bar.x - bar.w/2 + s, bar.y - bar.h, 3, 5);
      }
      // Health bar
      if(bar.health < bar.maxHealth){
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bar.x - bar.w/2, bar.y - bar.h - 8, bar.w, 3);
        ctx.fillStyle = '#44dd44';
        ctx.fillRect(bar.x - bar.w/2, bar.y - bar.h - 8, bar.w * (bar.health / bar.maxHealth), 3);
      }
    }

    // Particles
    for(var i = 0; i < bdParticles.length; i++){
      var p = bdParticles[i];
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // Bullets
    ctx.fillStyle = '#ffee44';
    for(var i = 0; i < bdBullets.length; i++){
      var b = bdBullets[i];
      ctx.fillRect(b.x - 2, b.y - 2, 6, 4);
      // Trail
      ctx.fillStyle = 'rgba(255,238,68,0.3)';
      ctx.fillRect(b.x - b.vx * 0.5 - 2, b.y - 1, 4, 2);
      ctx.fillStyle = '#ffee44';
    }

    // Enemies
    for(var i = 0; i < bdEnemies.length; i++){
      var e = bdEnemies[i];
      var col = e.type === 'tank' ? '#4a6a3a' : e.type === 'fast' ? '#aa3333' : '#6a5a3a';
      // Body
      ctx.fillStyle = col;
      ctx.fillRect(e.x - e.size/2, e.y - e.size, e.size, e.size);
      // Head
      ctx.fillStyle = e.type === 'tank' ? '#5a7a4a' : '#e8c39e';
      ctx.fillRect(e.x - e.size/3, e.y - e.size - e.size/2, e.size*2/3, e.size/2);
      // Eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(e.x - e.size/4, e.y - e.size - e.size/3, 2, 2);
      ctx.fillRect(e.x + 2, e.y - e.size - e.size/3, 2, 2);
      // Legs
      ctx.fillStyle = col;
      ctx.fillRect(e.x - e.size/2, e.y - 4, e.size/3, 4);
      ctx.fillRect(e.x + 2, e.y - 4, e.size/3, 4);
      // Health bar
      if(e.health < e.maxHealth){
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - e.size/2, e.y - e.size - e.size/2 - 8, e.size, 3);
        ctx.fillStyle = '#dd4444';
        ctx.fillRect(e.x - e.size/2, e.y - e.size - e.size/2 - 8, e.size * (e.health / e.maxHealth), 3);
      }
    }

    // Player character
    var px = bdPlayer.x, py = bdPlayer.y;
    // Legs
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(px - 6, py - 20, 5, 20);
    ctx.fillRect(px + 1, py - 20, 5, 20);
    // Body
    ctx.fillStyle = '#3a5a7a';
    ctx.fillRect(px - 10, py - 40, 20, 22);
    // Vest
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(px - 10, py - 38, 20, 6);
    // Head
    ctx.fillStyle = '#e8c39e';
    ctx.fillRect(px - 7, py - 52, 14, 14);
    // Helmet
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(px - 8, py - 56, 16, 6);
    // Weapon (rifle)
    ctx.fillStyle = '#333';
    var gunX = px + bdPlayer.facing * 8;
    ctx.fillRect(gunX, py - 35, bdPlayer.facing * 20, 5);
    ctx.fillStyle = '#222';
    ctx.fillRect(gunX + bdPlayer.facing * 15, py - 33, bdPlayer.facing * 8, 3);

    // Health ring
    ctx.strokeStyle = bdPlayer.health > 50 ? '#5fd4c7' : bdPlayer.health > 25 ? '#ddaa00' : '#dd4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py - 30, 25, 0, Math.PI * 2 * (bdPlayer.health / bdPlayer.maxHealth));
    ctx.stroke();
  }

  function bdUpdateHUD(){
    var hp = document.getElementById('bd-hp-bar');
    if(hp) hp.style.width = Math.max(0, bdPlayer.health / bdPlayer.maxHealth * 100) + '%';
    var cl = document.getElementById('bd-clock');
    if(cl) cl.textContent = 'WAVE ' + (bdWave || 1);
    var kl = document.getElementById('bd-kills');
    if(kl) kl.textContent = bdKills;
    var sc = document.getElementById('bd-score');
    if(sc) sc.textContent = bdScore;
  }

  function bdEndGame(){
    var result = { win: false, score: bdScore, kills: bdKills, time: Math.floor(bdTime) };
    wbRecordFightResult('botDefense', result, false);
    if(!wbProfile.specialAchievements) wbProfile.specialAchievements = {};
    if(bdTime >= 60) wbProfile.specialAchievements.zombieSurvivor = true;
    if(bdKills >= 50) wbProfile.specialAchievements.zombieSlayer = true;
    if(bdTime >= 120) wbProfile.specialAchievements.zombieMaster = true;
    wbCheckAchievements();
    if(!wbProfile.highScores) wbProfile.highScores = wbDefaultHighScores();
    if(!wbProfile.highScores.botDefense) wbProfile.highScores.botDefense = {};
    if(!wbProfile.highScores.botDefense[bdDifficulty] || bdScore > wbProfile.highScores.botDefense[bdDifficulty]){
      wbProfile.highScores.botDefense[bdDifficulty] = bdScore;
    }
    wbSaveProfile();
    bdOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="bd-end-close">&times;</span>' +
        '<h2>GAME OVER</h2>' +
        '<div class="ac-mode-options">' +
          '<div class="ac-mode-btn"><strong>Score: ' + bdScore + '</strong><span>Wave: ' + bdWave + ' &middot; Kills: ' + bdKills + ' &middot; Time: ' + Math.floor(bdTime) + 's</span></div>' +
        '</div>' +
        '<div style="margin-top:16px; display:flex; gap:8px; justify-content:center;">' +
          '<button class="ac-mode-btn" id="bd-play-again" style="max-width:200px;"><strong>Play Again</strong></button>' +
          '<button class="ac-mode-btn" id="bd-back" style="max-width:200px;"><strong>Back to Arcade</strong></button>' +
        '</div>' +
      '</div>';
    document.getElementById('bd-end-close').addEventListener('click', bdClose);
    document.getElementById('bd-play-again').addEventListener('click', function(){ bdShowModeSelect(); });
    document.getElementById('bd-back').addEventListener('click', bdClose);
  }

  bdRenderTile();
})();

/* ---- Arcade cabinet #10: CRYSTAL GARDEN ---- */
(function(){
  var cgSlot = document.getElementById('cg-slot-10');
  if(!cgSlot) return;
  var cgOverlay = document.getElementById('ac-overlay');
  var cgRaf = null;
  var cgKeys = {};
  var cgMouse = { x:0, y:0, down:false };
  var cgPaused = false;
  var cgState = null;

  function cgOnKeyDown(e){ cgKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function cgOnKeyUp(e){ cgKeys[e.key.toLowerCase()] = false; }
  function cgOnMouseMove(e){
    var canvas = document.getElementById('cg-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    cgMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    cgMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function cgOnMouseDown(){ cgMouse.down = true; }
  function cgOnMouseUp(){ cgMouse.down = false; }

  function cgRenderTile(){
    cgSlot.innerHTML =
      '<div class="ac-bubble" id="cg-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">CRYSTAL GARDEN</div>' +
          '<div class="ac-sub">casual · idle growing</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><polygon points="17,8 24,20 17,36 10,20" fill="#b070ff" stroke="#d0a0ff" stroke-width="1"/><polygon points="17,8 24,20 17,36" fill="#c080ff" opacity="0.5"/><polygon points="17,12 21,20 17,28 13,20" fill="#e0c0ff" opacity="0.6"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Plant crystals and watch them grow over time. Harvest them for points. Bigger crystals = more points, but wait too long and they may crack!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('cg-bubble-btn').addEventListener('click', cgOpen, { once:true });
  }

  function cgRequestFullscreen(){
    var el = cgOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function cgExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function cgOpen(){
    cgOverlay.classList.add('on');
    cgRequestFullscreen();
    cgShowLoading();
    setTimeout(cgShowModeSelect, 400);
  }
  function cgShowLoading(){
    cgOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING CRYSTAL GARDEN&hellip;</div></div>';
  }
  function cgShowModeSelect(){
    cgOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="cg-mode-close">&times;</span>' +
        '<h2>CRYSTAL GARDEN</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow growth</strong><span>Plenty of time, forgiving</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>Balanced growth and decay</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast decay</strong><span>Crystals crack quickly!</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click empty soil to plant. Click a grown crystal to harvest. Wait for growth but dont let them crack!</p>' +
      '</div>';
    document.getElementById('cg-mode-close').addEventListener('click', cgClose);
    var btns = cgOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ cgBoot(this.getAttribute('data-mode')); });
    }
  }
  function cgBoot(mode){
    wbTrackGamePlayed('crystalGarden');
    cgOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="cg-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="cg-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>CRYSTAL GARDEN</b> &middot; casual · idle growing</div>' +
        '<div class="ac-canvas-wrap"><canvas id="cg-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="cg-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="cg-pause-overlay"><h3>Paused</h3><button id="cg-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('cg-close-btn').addEventListener('click', cgClose);
    var pauseBtn = document.getElementById('cg-pause-btn');
    var pauseOv = document.getElementById('cg-pause-overlay');
    var resumeBtn = document.getElementById('cg-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ cgPaused = !cgPaused; if(pauseOv) pauseOv.classList.toggle('on', cgPaused); if(pauseBtn) pauseBtn.innerHTML = cgPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ cgPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    cgStartGame(mode);
  }
  function cgClose(){
    if(cgRaf) cancelAnimationFrame(cgRaf);
    cgRaf = null;
    cgPaused = false;
    cgState = null;
    window.removeEventListener('keydown', cgOnKeyDown);
    window.removeEventListener('keyup', cgOnKeyUp);
    window.removeEventListener('mousemove', cgOnMouseMove);
    window.removeEventListener('mousedown', cgOnMouseDown);
    window.removeEventListener('mouseup', cgOnMouseUp);
    cgKeys = {};
    cgMouse = { x:0, y:0, down:false };
    cgExitFullscreen();
    cgOverlay.classList.remove('on');
    cgOverlay.innerHTML = '';
    cgRenderTile();
  }

  function cgStartGame(mode){
    var canvas = document.getElementById('cg-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', cgOnMouseMove);
    window.addEventListener('mousedown', cgOnMouseDown);
    window.addEventListener('mouseup', cgOnMouseUp);
    window.addEventListener('keydown', cgOnKeyDown);
    window.addEventListener('keyup', cgOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('cg-status');
    var over = false;
    var score = 0;

    // Initialize game state
    cgState = cgInitState(mode, W, H);
    cgState.mode = mode;
    cgState.W = W;
    cgState.H = H;
    cgState.score = 0;
    cgState.over = false;
    cgState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      cgMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      cgMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      cgMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      cgMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      cgMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ cgMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!cgState.over && !cgPaused){
        cgState.time += dt;
        cgUpdate(cgState, dt, cgKeys, cgMouse);
        score = cgState.score;
        if(cgState.over){
          wbRecordGameScore('crystalGarden', mode, score);
          wbRecordFightResult('crystalGarden', 'loss', false);
        }
        if(statusEl){
          if(cgState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(cgState.statusText) statusEl.textContent = cgState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      cgDraw(ctx, W, H, cgState);

      if(cgState.over){
        canvas.addEventListener('click', function(){ cgBoot(mode); }, { once:true });
      }

      cgRaf = requestAnimationFrame(loop);
    }
    cgRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  cgInitState = function(mode, W, H){
    return cgGameInit(mode, W, H);
  };

  cgGameInit = function(mode, W, H){
    var spots = [];
    var cols = 5, rows = 3;
    for(var r=0;r<rows;r++) for(var c=0;c<cols;c++){
      spots.push({ x: (c+0.5)*W/cols, y: (r+0.5)*H/rows, planted:false, growth:0, cracked:false, harvested:false, size:0 });
    }
    return { spots:spots, clickCooldown:0, growSpeed: mode==='hard'?0.4:mode==='easy'?0.15:0.25, crackTime: mode==='hard'?3:mode==='easy'?8:5 };
  };

  cgUpdate = function(s, dt, keys, mouse){
    s.clickCooldown = Math.max(0, s.clickCooldown - dt);
    for(var i=0;i<s.spots.length;i++){
      var sp = s.spots[i];
      if(sp.planted && !sp.harvested && !sp.cracked){
        sp.growth += dt * s.growSpeed;
        sp.size = Math.min(1, sp.growth / 3);
        if(sp.growth > s.crackTime + 2){ sp.cracked = true; }
      }
    }
    if(mouse.down && s.clickCooldown <= 0){
      for(var i=0;i<s.spots.length;i++){
        var sp = s.spots[i];
        if(Math.abs(mouse.x - sp.x) < 35 && Math.abs(mouse.y - sp.y) < 35){
          if(!sp.planted){ sp.planted = true; sp.growth = 0; s.clickCooldown = 0.3; }
          else if(sp.planted && !sp.cracked && sp.size > 0.3){ s.score += Math.floor(sp.size * 100); sp.harvested = true; sp.planted = false; sp.growth = 0; sp.size = 0; s.clickCooldown = 0.3; }
          break;
        }
      }
    }
    s.statusText = 'Score: ' + s.score + ' | Plant & harvest crystals!';
  };

  cgDraw = function(ctx, W, H, s){
    var bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#1a1a2e'); bg.addColorStop(1,'#2a1a3a');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    // Garden grid / individual growth plots
    ctx.strokeStyle='rgba(224,164,88,.08)'; ctx.lineWidth=1;
    for(var gx=1;gx<5;gx++){ ctx.beginPath(); ctx.moveTo(gx*W/5,55); ctx.lineTo(gx*W/5,H-48); ctx.stroke(); }
    for(var gy=1;gy<3;gy++){ ctx.beginPath(); ctx.moveTo(35,gy*H/3); ctx.lineTo(W-35,gy*H/3); ctx.stroke(); }
    // Soil spots
    for(var i=0;i<s.spots.length;i++){
      var sp = s.spots[i];
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y+10, 30, 12, 0, 0, Math.PI*2); ctx.fill();
      if(sp.planted && !sp.cracked && !sp.harvested){
        var sz = sp.size;
        var r = 7 + sz * 24;
        var glow = ctx.createRadialGradient(sp.x,sp.y,2,sp.x,sp.y,r*1.7);
        glow.addColorStop(0,'rgba(224,164,255,.34)'); glow.addColorStop(1,'rgba(176,112,255,0)');
        ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(sp.x,sp.y,r*1.7,0,Math.PI*2); ctx.fill();
        var grad=ctx.createLinearGradient(sp.x-r,sp.y-r,sp.x+r,sp.y+r);
        grad.addColorStop(0,'#f0d8ff'); grad.addColorStop(.28,'#c98cff'); grad.addColorStop(.62,'#9c55dc'); grad.addColorStop(1,'#5e2d9d');
        ctx.fillStyle=grad; ctx.strokeStyle='rgba(245,226,255,.82)'; ctx.lineWidth=1.4;
        ctx.beginPath();
        ctx.moveTo(sp.x,sp.y-r);
        ctx.lineTo(sp.x+r*.48,sp.y-r*.32);
        ctx.lineTo(sp.x+r*.72,sp.y+r*.35);
        ctx.lineTo(sp.x+r*.28,sp.y+r);
        ctx.lineTo(sp.x-r*.35,sp.y+r*.78);
        ctx.lineTo(sp.x-r*.72,sp.y+r*.18);
        ctx.lineTo(sp.x-r*.45,sp.y-r*.34);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.18)';
        ctx.beginPath(); ctx.moveTo(sp.x,sp.y-r); ctx.lineTo(sp.x+r*.48,sp.y-r*.32); ctx.lineTo(sp.x,sp.y+r*.12); ctx.closePath(); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.11)';
        ctx.beginPath(); ctx.moveTo(sp.x,sp.y+r*.12); ctx.lineTo(sp.x+r*.72,sp.y+r*.35); ctx.lineTo(sp.x+r*.28,sp.y+r); ctx.closePath(); ctx.fill();
        if(sz > 0.35){ ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(sp.x-r*.16,sp.y-r*.52); ctx.lineTo(sp.x+r*.1,sp.y-r*.05); ctx.lineTo(sp.x-r*.04,sp.y+r*.5); ctx.stroke(); }
        if(sz > 0.8){ ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(sp.x-r*.2,sp.y-r*.45,2.2,0,Math.PI*2); ctx.fill(); }
      }
      if(sp.cracked){
        ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sp.x-10, sp.y-10); ctx.lineTo(sp.x-2,sp.y-2); ctx.lineTo(sp.x+2,sp.y-7); ctx.lineTo(sp.x+10,sp.y+10);
        ctx.moveTo(sp.x+9, sp.y-9); ctx.lineTo(sp.x+3,sp.y-2); ctx.lineTo(sp.x-5,sp.y+2); ctx.lineTo(sp.x-9,sp.y+9); ctx.stroke();
        ctx.strokeStyle='rgba(255,90,90,.25)'; ctx.lineWidth=5; ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Click soil to plant. Click grown crystals to harvest.', W/2, H-20);
  };

  cgRenderTile();
})();


/* ---- Arcade cabinet #11: MEMORY MATCH ---- */
(function(){
  var mmSlot = document.getElementById('mm-slot-11');
  if(!mmSlot) return;
  var mmOverlay = document.getElementById('ac-overlay');
  var mmRaf = null;
  var mmKeys = {};
  var mmMouse = { x:0, y:0, down:false };
  var mmPaused = false;
  var mmState = null;

  function mmOnKeyDown(e){ mmKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function mmOnKeyUp(e){ mmKeys[e.key.toLowerCase()] = false; }
  function mmOnMouseMove(e){
    var canvas = document.getElementById('mm-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    mmMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mmMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function mmOnMouseDown(){ mmMouse.down = true; }
  function mmOnMouseUp(){ mmMouse.down = false; }

  function mmRenderTile(){
    mmSlot.innerHTML =
      '<div class="ac-bubble" id="mm-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">MEMORY MATCH</div>' +
          '<div class="ac-sub">puzzle · card pairs</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="4" y="8" width="12" height="16" rx="2" fill="#5fd4c7" stroke="#3a4a4a" stroke-width="1"/><rect x="18" y="8" width="12" height="16" rx="2" fill="#e0a458" stroke="#3a4a4a" stroke-width="1"/><circle cx="10" cy="16" r="3" fill="#fff" opacity="0.5"/><circle cx="24" cy="16" r="3" fill="#fff" opacity="0.5"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Flip cards two at a time to find matching pairs. Match all pairs before running out of moves. Fewer moves = higher score!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('mm-bubble-btn').addEventListener('click', mmOpen, { once:true });
  }

  function mmRequestFullscreen(){
    var el = mmOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function mmExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function mmOpen(){
    mmOverlay.classList.add('on');
    mmRequestFullscreen();
    mmShowLoading();
    setTimeout(mmShowModeSelect, 400);
  }
  function mmShowLoading(){
    mmOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING MEMORY MATCH&hellip;</div></div>';
  }
  function mmShowModeSelect(){
    mmOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="mm-mode-close">&times;</span>' +
        '<h2>MEMORY MATCH</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>4x3 grid</strong><span>6 pairs, 12 moves max</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>4x4 grid</strong><span>8 pairs, 16 moves max</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>5x4 grid</strong><span>10 pairs, 20 moves max</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click cards to flip them. Match pairs to keep them face-up.</p>' +
      '</div>';
    document.getElementById('mm-mode-close').addEventListener('click', mmClose);
    var btns = mmOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ mmBoot(this.getAttribute('data-mode')); });
    }
  }
  function mmBoot(mode){
    wbTrackGamePlayed('memoryMatch');
    mmOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="mm-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="mm-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>MEMORY MATCH</b> &middot; puzzle · card pairs</div>' +
        '<div class="ac-canvas-wrap"><canvas id="mm-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="mm-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="mm-pause-overlay"><h3>Paused</h3><button id="mm-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('mm-close-btn').addEventListener('click', mmClose);
    var pauseBtn = document.getElementById('mm-pause-btn');
    var pauseOv = document.getElementById('mm-pause-overlay');
    var resumeBtn = document.getElementById('mm-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ mmPaused = !mmPaused; if(pauseOv) pauseOv.classList.toggle('on', mmPaused); if(pauseBtn) pauseBtn.innerHTML = mmPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ mmPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    mmStartGame(mode);
  }
  function mmClose(){
    if(mmRaf) cancelAnimationFrame(mmRaf);
    mmRaf = null;
    mmPaused = false;
    mmState = null;
    window.removeEventListener('keydown', mmOnKeyDown);
    window.removeEventListener('keyup', mmOnKeyUp);
    window.removeEventListener('mousemove', mmOnMouseMove);
    window.removeEventListener('mousedown', mmOnMouseDown);
    window.removeEventListener('mouseup', mmOnMouseUp);
    mmKeys = {};
    mmMouse = { x:0, y:0, down:false };
    mmExitFullscreen();
    mmOverlay.classList.remove('on');
    mmOverlay.innerHTML = '';
    mmRenderTile();
  }

  function mmStartGame(mode){
    var canvas = document.getElementById('mm-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', mmOnMouseMove);
    window.addEventListener('mousedown', mmOnMouseDown);
    window.addEventListener('mouseup', mmOnMouseUp);
    window.addEventListener('keydown', mmOnKeyDown);
    window.addEventListener('keyup', mmOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('mm-status');
    var over = false;
    var score = 0;

    // Initialize game state
    mmState = mmInitState(mode, W, H);
    mmState.mode = mode;
    mmState.W = W;
    mmState.H = H;
    mmState.score = 0;
    mmState.over = false;
    mmState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      mmMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      mmMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      mmMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      mmMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      mmMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ mmMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!mmState.over && !mmPaused){
        mmState.time += dt;
        mmUpdate(mmState, dt, mmKeys, mmMouse);
        score = mmState.score;
        if(mmState.over){
          wbRecordGameScore('memoryMatch', mode, score);
          wbRecordFightResult('memoryMatch', 'loss', false);
        }
        if(statusEl){
          if(mmState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(mmState.statusText) statusEl.textContent = mmState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      mmDraw(ctx, W, H, mmState);

      if(mmState.over){
        canvas.addEventListener('click', function(){ mmBoot(mode); }, { once:true });
      }

      mmRaf = requestAnimationFrame(loop);
    }
    mmRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  mmInitState = function(mode, W, H){
    return mmGameInit(mode, W, H);
  };

  mmGameInit = function(mode, W, H){
    var pairs = mode==='hard'?10:mode==='easy'?6:8;
    var cols = mode==='hard'?5:4, rows = Math.ceil(pairs*2/cols);
    var cards = [];
    var symbols = ['\u2605','\u2660','\u2665','\u2666','\u2663','\u25cf','\u25b2','\u25c6','\u2600','\u263c'];
    var pool = [];
    for(var i=0;i<pairs;i++){ pool.push(symbols[i]); pool.push(symbols[i]); }
    pool.sort(function(){ return Math.random()-0.5; });
    var cw = (W - 60) / cols, ch = Math.min(100, (H-100)/rows);
    var idx = 0;
    for(var r=0;r<rows;r++) for(var c=0;c<cols;c++){
      if(idx < pool.length){
        cards.push({ x: 30+c*cw, y: 50+r*ch, w: cw-8, h: ch-8, sym: pool[idx], flipped:false, matched:false, flipAnim:0 });
        idx++;
      }
    }
    return { cards:cards, flipped:[], moves:0, maxMoves: pairs*2+4, pairs:pairs, matched:0, lockTimer:0, cols:cols, rows:rows, cw:cw, ch:ch };
  };

  mmUpdate = function(s, dt, keys, mouse){
    s.lockTimer = Math.max(0, s.lockTimer - dt);
    if(mouse.down && s.lockTimer <= 0){
      for(var i=0;i<s.cards.length;i++){
        var c = s.cards[i];
        if(c.matched || c.flipped) continue;
        if(mouse.x > c.x && mouse.x < c.x+c.w && mouse.y > c.y && mouse.y < c.y+c.h){
          c.flipped = true; c.flipAnim = 0;
          s.flipped.push(c); s.moves++;
          if(s.flipped.length === 2){
            if(s.flipped[0].sym === s.flipped[1].sym){
              s.flipped[0].matched = true; s.flipped[1].matched = true;
              s.matched++; s.score += 100; s.flipped = [];
              if(s.matched >= s.pairs){ s.score += Math.max(0, (s.maxMoves - s.moves) * 50); s.over = true; }
            } else {
              s.lockTimer = 1.0;
              var f = s.flipped; s.flipped = [];
              setTimeout(function(){ f[0].flipped = false; f[1].flipped = false; }, 800);
            }
          }
          break;
        }
      }
    }
    for(var i=0;i<s.cards.length;i++) s.cards[i].flipAnim = Math.min(1, s.cards[i].flipAnim + dt*5);
    s.statusText = 'Moves: ' + s.moves + '/' + s.maxMoves + ' | Matched: ' + s.matched + '/' + s.pairs;
    if(s.moves >= s.maxMoves && !s.over){ s.over = true; }
  };

  mmDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.cards.length;i++){
      var c = s.cards[i];
      if(c.matched){ ctx.fillStyle = 'rgba(95,212,199,0.15)'; }
      else if(c.flipped){ ctx.fillStyle = '#1a2a3a'; }
      else{ ctx.fillStyle = '#2a3a4a'; }
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = c.matched ? '#5fd4c7' : '#3a3e48'; ctx.lineWidth = 2;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      if(c.flipped || c.matched){
        ctx.fillStyle = c.matched ? '#5fd4c7' : '#e0a458';
        ctx.font = Math.floor(c.h*0.4) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(c.sym, c.x+c.w/2, c.y+c.h/2);
      } else {
        ctx.fillStyle = '#5fd4c7'; ctx.font = Math.floor(c.h*0.3) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', c.x+c.w/2, c.y+c.h/2);
      }
    }
  };

  mmRenderTile();
})();


/* ---- Arcade cabinet #12: COLOR MIXER ---- */
(function(){
  var cmSlot = document.getElementById('cm-slot-12');
  if(!cmSlot) return;
  var cmOverlay = document.getElementById('ac-overlay');
  var cmRaf = null;
  var cmKeys = {};
  var cmMouse = { x:0, y:0, down:false };
  var cmPaused = false;
  var cmState = null;

  function cmOnKeyDown(e){ cmKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function cmOnKeyUp(e){ cmKeys[e.key.toLowerCase()] = false; }
  function cmOnMouseMove(e){
    var canvas = document.getElementById('cm-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    cmMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    cmMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function cmOnMouseDown(){ cmMouse.down = true; }
  function cmOnMouseUp(){ cmMouse.down = false; }

  function cmRenderTile(){
    cmSlot.innerHTML =
      '<div class="ac-bubble" id="cm-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">COLOR MIXER</div>' +
          '<div class="ac-sub">puzzle · match the color</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="12" cy="14" r="8" fill="#ff5a5a" opacity="0.7"/><circle cx="22" cy="14" r="8" fill="#5fd4c7" opacity="0.7"/><circle cx="17" cy="26" r="8" fill="#e0a458" opacity="0.7"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">A target color is shown. Adjust RGB sliders to match it as closely as possible. Closer match = higher score!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('cm-bubble-btn').addEventListener('click', cmOpen, { once:true });
  }

  function cmRequestFullscreen(){
    var el = cmOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function cmExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function cmOpen(){
    cmOverlay.classList.add('on');
    cmRequestFullscreen();
    cmShowLoading();
    setTimeout(cmShowModeSelect, 400);
  }
  function cmShowLoading(){
    cmOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING COLOR MIXER&hellip;</div></div>';
  }
  function cmShowModeSelect(){
    cmOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="cm-mode-close">&times;</span>' +
        '<h2>COLOR MIXER</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Close match</strong><span>Wide tolerance</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Good match</strong><span>Medium tolerance</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Exact match</strong><span>Very tight tolerance</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Drag the R, G, B sliders to match the target color. Press Enter or click Submit.</p>' +
      '</div>';
    document.getElementById('cm-mode-close').addEventListener('click', cmClose);
    var btns = cmOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ cmBoot(this.getAttribute('data-mode')); });
    }
  }
  function cmBoot(mode){
    wbTrackGamePlayed('colorMixer');
    cmOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="cm-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="cm-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>COLOR MIXER</b> &middot; puzzle · match the color</div>' +
        '<div class="ac-canvas-wrap"><canvas id="cm-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="cm-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="cm-pause-overlay"><h3>Paused</h3><button id="cm-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('cm-close-btn').addEventListener('click', cmClose);
    var pauseBtn = document.getElementById('cm-pause-btn');
    var pauseOv = document.getElementById('cm-pause-overlay');
    var resumeBtn = document.getElementById('cm-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ cmPaused = !cmPaused; if(pauseOv) pauseOv.classList.toggle('on', cmPaused); if(pauseBtn) pauseBtn.innerHTML = cmPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ cmPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    cmStartGame(mode);
  }
  function cmClose(){
    if(cmRaf) cancelAnimationFrame(cmRaf);
    cmRaf = null;
    cmPaused = false;
    cmState = null;
    window.removeEventListener('keydown', cmOnKeyDown);
    window.removeEventListener('keyup', cmOnKeyUp);
    window.removeEventListener('mousemove', cmOnMouseMove);
    window.removeEventListener('mousedown', cmOnMouseDown);
    window.removeEventListener('mouseup', cmOnMouseUp);
    cmKeys = {};
    cmMouse = { x:0, y:0, down:false };
    cmExitFullscreen();
    cmOverlay.classList.remove('on');
    cmOverlay.innerHTML = '';
    cmRenderTile();
  }

  function cmStartGame(mode){
    var canvas = document.getElementById('cm-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', cmOnMouseMove);
    window.addEventListener('mousedown', cmOnMouseDown);
    window.addEventListener('mouseup', cmOnMouseUp);
    window.addEventListener('keydown', cmOnKeyDown);
    window.addEventListener('keyup', cmOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('cm-status');
    var over = false;
    var score = 0;

    // Initialize game state
    cmState = cmInitState(mode, W, H);
    cmState.mode = mode;
    cmState.W = W;
    cmState.H = H;
    cmState.score = 0;
    cmState.over = false;
    cmState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      cmMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      cmMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      cmMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      cmMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      cmMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ cmMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!cmState.over && !cmPaused){
        cmState.time += dt;
        cmUpdate(cmState, dt, cmKeys, cmMouse);
        score = cmState.score;
        if(cmState.over){
          wbRecordGameScore('colorMixer', mode, score);
          wbRecordFightResult('colorMixer', 'loss', false);
        }
        if(statusEl){
          if(cmState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(cmState.statusText) statusEl.textContent = cmState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      cmDraw(ctx, W, H, cmState);

      if(cmState.over){
        canvas.addEventListener('click', function(){ cmBoot(mode); }, { once:true });
      }

      cmRaf = requestAnimationFrame(loop);
    }
    cmRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  cmInitState = function(mode, W, H){
    return cmGameInit(mode, W, H);
  };

  cmGameInit = function(mode, W, H){
    var tol = mode==='hard'?15:mode==='easy'?60:35;
    var tr = Math.floor(Math.random()*256), tg = Math.floor(Math.random()*256), tb = Math.floor(Math.random()*256);
    return { r:128, g:128, b:128, tr:tr, tg:tg, tb:tb, tol:tol, rounds:0, maxRounds:5, submitted:false, score:0, resultTimer:0 };
  };

  cmUpdate = function(s, dt, keys, mouse){
    if(s.submitted){ s.resultTimer += dt; if(s.resultTimer > 2){ s.submitted = false; s.resultTimer = 0; if(s.rounds >= s.maxRounds){ s.over = true; } } return; }
    // Sliders: R at y=200, G at y=260, B at y=320
    var sliders = [{ y:200, key:'r' }, { y:260, key:'g' }, { y:320, key:'b' }];
    for(var i=0;i<sliders.length;i++){
      if(mouse.y > sliders[i].y-15 && mouse.y < sliders[i].y+15 && mouse.x > 100 && mouse.x < W-100){
        if(mouse.down || (mouse.x > 100 && mouse.x < W-100)){
          var val = Math.floor((mouse.x - 100) / (W - 200) * 255);
          s[sliders[i].key] = Math.max(0, Math.min(255, val));
        }
      }
    }
    // Submit button
    if(mouse.down && mouse.x > W/2-80 && mouse.x < W/2+80 && mouse.y > 400 && mouse.y < 450){
      var diff = Math.abs(s.r-s.tr) + Math.abs(s.g-s.tg) + Math.abs(s.b-s.tb);
      var pts = Math.max(0, 200 - diff);
      s.score += pts; s.rounds++;
      if(s.rounds >= s.maxRounds){ s.over = true; }
      s.submitted = true; s.resultTimer = 0;
    }
    s.statusText = 'Round ' + (s.rounds+1) + '/' + s.maxRounds + ' | Score: ' + s.score;
  };

  cmDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    // Target color
    ctx.fillStyle = 'rgb('+s.tr+','+s.tg+','+s.tb+')';
    ctx.fillRect(W/2-80, 30, 160, 80);
    ctx.strokeStyle = '#3a3e48'; ctx.strokeRect(W/2-80, 30, 160, 80);
    ctx.fillStyle = '#fff'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
    ctx.fillText('TARGET', W/2, 25);
    // Your color
    ctx.fillStyle = 'rgb('+s.r+','+s.g+','+s.b+')';
    ctx.fillRect(W/2-80, 130, 160, 80);
    ctx.strokeStyle = '#3a3e48'; ctx.strokeRect(W/2-80, 130, 160, 80);
    ctx.fillText('YOUR MIX', W/2, 125);
    // Sliders
    var labels = [['R', s.r, '#ff5a5a'], ['G', s.g, '#5fd4c7'], ['B', s.b, '#5a8aff']];
    for(var i=0;i<3;i++){
      var y = 200+i*60;
      ctx.fillStyle = '#3a3e48'; ctx.fillRect(100, y-4, W-200, 8);
      var px = 100 + (labels[i][1]/255) * (W-200);
      ctx.fillStyle = labels[i][2]; ctx.beginPath(); ctx.arc(px, y, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '14px Inter'; ctx.textAlign = 'left';
      ctx.fillText(labels[i][0] + ': ' + labels[i][1], 20, y+5);
    }
    // Submit button
    ctx.fillStyle = '#e0a458'; ctx.fillRect(W/2-80, 400, 160, 50);
    ctx.fillStyle = '#12161d'; ctx.font = 'bold 16px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SUBMIT', W/2, 425);
    ctx.textBaseline = 'alphabetic';
  };

  cmRenderTile();
})();


/* ---- Arcade cabinet #13: FISHING HOLE ---- */
(function(){
  var fhSlot = document.getElementById('fh-slot-13');
  if(!fhSlot) return;
  var fhOverlay = document.getElementById('ac-overlay');
  var fhRaf = null;
  var fhKeys = {};
  var fhMouse = { x:0, y:0, down:false };
  var fhPaused = false;
  var fhState = null;

  function fhOnKeyDown(e){ fhKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function fhOnKeyUp(e){ fhKeys[e.key.toLowerCase()] = false; }
  function fhOnMouseMove(e){
    var canvas = document.getElementById('fh-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    fhMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    fhMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function fhOnMouseDown(){ fhMouse.down = true; }
  function fhOnMouseUp(){ fhMouse.down = false; }

  function fhRenderTile(){
    fhSlot.innerHTML =
      '<div class="ac-bubble" id="fh-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">FISHING HOLE</div>' +
          '<div class="ac-sub">casual · catch fish</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="0" y="28" width="34" height="16" fill="#2a4a6a" opacity="0.5"/><line x1="17" y1="6" x2="17" y2="28" stroke="#e0a458" stroke-width="1"/><circle cx="17" cy="30" r="3" fill="#ff5a5a"/><path d="M14,32 Q17,38 20,32" stroke="#5fd4c7" stroke-width="1.5" fill="none"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Cast your line and wait for a fish to bite. Click to reel it in when the bobber dips. Different fish are worth different points!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('fh-bubble-btn').addEventListener('click', fhOpen, { once:true });
  }

  function fhRequestFullscreen(){
    var el = fhOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function fhExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function fhOpen(){
    fhOverlay.classList.add('on');
    fhRequestFullscreen();
    fhShowLoading();
    setTimeout(fhShowModeSelect, 400);
  }
  function fhShowLoading(){
    fhOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING FISHING HOLE&hellip;</div></div>';
  }
  function fhShowModeSelect(){
    fhOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="fh-mode-close">&times;</span>' +
        '<h2>FISHING HOLE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Calm waters</strong><span>Lots of fish, slow bites</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal</strong><span>Balanced fishing</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Stormy</strong><span>Fast bites, rare fish</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click to cast. Wait for the bobber to dip, then click to reel in.</p>' +
      '</div>';
    document.getElementById('fh-mode-close').addEventListener('click', fhClose);
    var btns = fhOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ fhBoot(this.getAttribute('data-mode')); });
    }
  }
  function fhBoot(mode){
    wbTrackGamePlayed('fishingHole');
    fhOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="fh-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="fh-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>FISHING HOLE</b> &middot; casual · catch fish</div>' +
        '<div class="ac-canvas-wrap"><canvas id="fh-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="fh-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="fh-pause-overlay"><h3>Paused</h3><button id="fh-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('fh-close-btn').addEventListener('click', fhClose);
    var pauseBtn = document.getElementById('fh-pause-btn');
    var pauseOv = document.getElementById('fh-pause-overlay');
    var resumeBtn = document.getElementById('fh-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ fhPaused = !fhPaused; if(pauseOv) pauseOv.classList.toggle('on', fhPaused); if(pauseBtn) pauseBtn.innerHTML = fhPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ fhPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    fhStartGame(mode);
  }
  function fhClose(){
    if(fhRaf) cancelAnimationFrame(fhRaf);
    fhRaf = null;
    fhPaused = false;
    fhState = null;
    window.removeEventListener('keydown', fhOnKeyDown);
    window.removeEventListener('keyup', fhOnKeyUp);
    window.removeEventListener('mousemove', fhOnMouseMove);
    window.removeEventListener('mousedown', fhOnMouseDown);
    window.removeEventListener('mouseup', fhOnMouseUp);
    fhKeys = {};
    fhMouse = { x:0, y:0, down:false };
    fhExitFullscreen();
    fhOverlay.classList.remove('on');
    fhOverlay.innerHTML = '';
    fhRenderTile();
  }

  function fhStartGame(mode){
    var canvas = document.getElementById('fh-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', fhOnMouseMove);
    window.addEventListener('mousedown', fhOnMouseDown);
    window.addEventListener('mouseup', fhOnMouseUp);
    window.addEventListener('keydown', fhOnKeyDown);
    window.addEventListener('keyup', fhOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('fh-status');
    var over = false;
    var score = 0;

    // Initialize game state
    fhState = fhInitState(mode, W, H);
    fhState.mode = mode;
    fhState.W = W;
    fhState.H = H;
    fhState.score = 0;
    fhState.over = false;
    fhState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      fhMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      fhMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      fhMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      fhMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      fhMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ fhMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!fhState.over && !fhPaused){
        fhState.time += dt;
        fhUpdate(fhState, dt, fhKeys, fhMouse);
        score = fhState.score;
        if(fhState.over){
          wbRecordGameScore('fishingHole', mode, score);
          wbRecordFightResult('fishingHole', 'loss', false);
        }
        if(statusEl){
          if(fhState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(fhState.statusText) statusEl.textContent = fhState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      fhDraw(ctx, W, H, fhState);

      if(fhState.over){
        canvas.addEventListener('click', function(){ fhBoot(mode); }, { once:true });
      }

      fhRaf = requestAnimationFrame(loop);
    }
    fhRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  fhInitState = function(mode, W, H){
    return fhGameInit(mode, W, H);
  };

  fhGameInit = function(mode, W, H){
    return { castState:'idle', castTimer:0, biteTimer:0, fishY:0, bobberY:0, lineX:W/2, score:0, catches:0, time:60, mode:mode, biteWindow:0, nextBite:2+Math.random()*3, castProgress:0 };
  };

  fhUpdate = function(s, dt, keys, mouse){
    s.time -= dt;
    if(s.time <= 0){ s.over = true; return; }
    if(s.castState === 'idle'){
      if(mouse.down || keys[' ']){ s.castState = 'casting'; s.castProgress = 0; }
      s.statusText = 'Score: ' + s.score + ' | Time: ' + Math.ceil(s.time) + 's | Click to cast!';
    } else if(s.castState === 'casting'){
      s.castProgress += dt;
      if(s.castProgress > 0.5){ s.castState = 'waiting'; s.biteTimer = 0; s.nextBite = 1+Math.random()*3; }
    } else if(s.castState === 'waiting'){
      s.biteTimer += dt;
      s.bobberY = H*0.55 + Math.sin(s.biteTimer*3)*2;
      if(s.biteTimer >= s.nextBite){ s.castState = 'biting'; s.biteWindow = 0; }
      s.statusText = 'Score: ' + s.score + ' | Time: ' + Math.ceil(s.time) + 's | Waiting for bite...';
    } else if(s.castState === 'biting'){
      s.biteWindow += dt;
      s.bobberY = H*0.55 + Math.sin(s.biteWindow*30)*8;
      if(mouse.down || keys[' ']){
        var pts = Math.floor(50 + (1-s.biteWindow/1.5) * 100);
        s.score += pts; s.catches++; s.castState = 'idle';
      }
      if(s.biteWindow > 1.5){ s.castState = 'idle'; }
      s.statusText = 'Score: ' + s.score + ' | Time: ' + Math.ceil(s.time) + 's | REEL NOW!';
    }
  };

  fhDraw = function(ctx, W, H, s){
    var sky = ctx.createLinearGradient(0,0,0,H*0.6);
    sky.addColorStop(0,'#1a3a5a'); sky.addColorStop(1,'#3a5a7a');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H*0.6);
    var water = ctx.createLinearGradient(0,H*0.6,0,H);
    water.addColorStop(0,'#1a3a5a'); water.addColorStop(1,'#0a1a2a');
    ctx.fillStyle = water; ctx.fillRect(0,H*0.6,W,H*0.4);
    // Water surface
    ctx.strokeStyle = 'rgba(95,212,199,0.3)'; ctx.lineWidth = 1;
    for(var x=0;x<W;x+=20){ ctx.beginPath(); ctx.moveTo(x, H*0.6); ctx.lineTo(x+15, H*0.6+3); ctx.stroke(); }
    // Fisher
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(W/2-15, H*0.5, 30, 40);
    ctx.fillStyle = '#e8c39e'; ctx.fillRect(W/2-8, H*0.45, 16, 16);
    // Rod
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W/2+10, H*0.5); ctx.lineTo(s.lineX, H*0.55); ctx.stroke();
    // Bobber
    if(s.castState !== 'idle'){
      ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(s.lineX, s.bobberY, 6, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      // Fishing line
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W/2+10, H*0.5); ctx.lineTo(s.lineX, s.bobberY); ctx.stroke();
    }
  };

  fhRenderTile();
})();


/* ---- Arcade cabinet #14: DOT CONNECT ---- */
(function(){
  var dcSlot = document.getElementById('dc-slot-14');
  if(!dcSlot) return;
  var dcOverlay = document.getElementById('ac-overlay');
  var dcRaf = null;
  var dcKeys = {};
  var dcMouse = { x:0, y:0, down:false };
  var dcPaused = false;
  var dcState = null;

  function dcOnKeyDown(e){ dcKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function dcOnKeyUp(e){ dcKeys[e.key.toLowerCase()] = false; }
  function dcOnMouseMove(e){
    var canvas = document.getElementById('dc-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    dcMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    dcMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function dcOnMouseDown(){ dcMouse.down = true; }
  function dcOnMouseUp(){ dcMouse.down = false; }

  function dcRenderTile(){
    dcSlot.innerHTML =
      '<div class="ac-bubble" id="dc-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">DOT CONNECT</div>' +
          '<div class="ac-sub">puzzle · connect the dots</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="8" cy="10" r="3" fill="#5fd4c7"/><text x="8" y="13" font-size="5" text-anchor="middle" fill="#fff">1</text><circle cx="26" cy="10" r="3" fill="#e0a458"/><text x="26" y="13" font-size="5" text-anchor="middle" fill="#fff">2</text><circle cx="17" cy="28" r="3" fill="#b070ff"/><text x="17" y="31" font-size="5" text-anchor="middle" fill="#fff">3</text><line x1="8" y1="10" x2="26" y2="10" stroke="#5fd4c7" stroke-width="1" opacity="0.4" stroke-dasharray="2,2"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Connect numbered dots in order from 1 to N. Draw the path without crossing yourself. Complete the shape to win!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('dc-bubble-btn').addEventListener('click', dcOpen, { once:true });
  }

  function dcRequestFullscreen(){
    var el = dcOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function dcExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function dcOpen(){
    dcOverlay.classList.add('on');
    dcRequestFullscreen();
    dcShowLoading();
    setTimeout(dcShowModeSelect, 400);
  }
  function dcShowLoading(){
    dcOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING DOT CONNECT&hellip;</div></div>';
  }
  function dcShowModeSelect(){
    dcOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="dc-mode-close">&times;</span>' +
        '<h2>DOT CONNECT</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>8 dots</strong><span>Simple shape</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>12 dots</strong><span>Medium shape</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>16 dots</strong><span>Complex shape</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click dots in numerical order (1, 2, 3...) to connect them.</p>' +
      '</div>';
    document.getElementById('dc-mode-close').addEventListener('click', dcClose);
    var btns = dcOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ dcBoot(this.getAttribute('data-mode')); });
    }
  }
  function dcBoot(mode){
    wbTrackGamePlayed('dotConnect');
    dcOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="dc-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="dc-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>DOT CONNECT</b> &middot; puzzle · connect the dots</div>' +
        '<div class="ac-canvas-wrap"><canvas id="dc-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="dc-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="dc-pause-overlay"><h3>Paused</h3><button id="dc-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('dc-close-btn').addEventListener('click', dcClose);
    var pauseBtn = document.getElementById('dc-pause-btn');
    var pauseOv = document.getElementById('dc-pause-overlay');
    var resumeBtn = document.getElementById('dc-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ dcPaused = !dcPaused; if(pauseOv) pauseOv.classList.toggle('on', dcPaused); if(pauseBtn) pauseBtn.innerHTML = dcPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ dcPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    dcStartGame(mode);
  }
  function dcClose(){
    if(dcRaf) cancelAnimationFrame(dcRaf);
    dcRaf = null;
    dcPaused = false;
    dcState = null;
    window.removeEventListener('keydown', dcOnKeyDown);
    window.removeEventListener('keyup', dcOnKeyUp);
    window.removeEventListener('mousemove', dcOnMouseMove);
    window.removeEventListener('mousedown', dcOnMouseDown);
    window.removeEventListener('mouseup', dcOnMouseUp);
    dcKeys = {};
    dcMouse = { x:0, y:0, down:false };
    dcExitFullscreen();
    dcOverlay.classList.remove('on');
    dcOverlay.innerHTML = '';
    dcRenderTile();
  }

  function dcStartGame(mode){
    var canvas = document.getElementById('dc-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', dcOnMouseMove);
    window.addEventListener('mousedown', dcOnMouseDown);
    window.addEventListener('mouseup', dcOnMouseUp);
    window.addEventListener('keydown', dcOnKeyDown);
    window.addEventListener('keyup', dcOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('dc-status');
    var over = false;
    var score = 0;

    // Initialize game state
    dcState = dcInitState(mode, W, H);
    dcState.mode = mode;
    dcState.W = W;
    dcState.H = H;
    dcState.score = 0;
    dcState.over = false;
    dcState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      dcMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      dcMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      dcMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      dcMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      dcMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ dcMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!dcState.over && !dcPaused){
        dcState.time += dt;
        dcUpdate(dcState, dt, dcKeys, dcMouse);
        score = dcState.score;
        if(dcState.over){
          wbRecordGameScore('dotConnect', mode, score);
          wbRecordFightResult('dotConnect', 'loss', false);
        }
        if(statusEl){
          if(dcState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(dcState.statusText) statusEl.textContent = dcState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      dcDraw(ctx, W, H, dcState);

      if(dcState.over){
        canvas.addEventListener('click', function(){ dcBoot(mode); }, { once:true });
      }

      dcRaf = requestAnimationFrame(loop);
    }
    dcRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  dcInitState = function(mode, W, H){
    return dcGameInit(mode, W, H);
  };

  dcGameInit = function(mode, W, H){
    var count = mode==='hard'?16:mode==='easy'?8:12;
    var dots = [];
    for(var i=0;i<count;i++){
      dots.push({ x: 60+Math.random()*(W-120), y: 60+Math.random()*(H-120), num: i+1, connected: false });
    }
    return { dots:dots, next:1, score:0, lines:[] };
  };

  dcUpdate = function(s, dt, keys, mouse){
    if(mouse.down){
      for(var i=0;i<s.dots.length;i++){
        var d = s.dots[i];
        if(Math.hypot(mouse.x-d.x, mouse.y-d.y) < 25 && d.num === s.next){
          d.connected = true;
          if(s.next > 1){ s.lines.push({ x1:s.dots[i-1].x, y1:s.dots[i-1].y, x2:d.x, y2:d.y }); }
          s.score += 50; s.next++;
          if(s.next > s.dots.length){ s.score += 200; s.over = true; }
          break;
        }
      }
    }
    s.statusText = 'Next: ' + s.next + ' | Score: ' + s.score;
  };

  dcDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    // Lines
    ctx.strokeStyle = '#5fd4c7'; ctx.lineWidth = 3;
    for(var i=0;i<s.lines.length;i++){
      ctx.beginPath(); ctx.moveTo(s.lines[i].x1, s.lines[i].y1); ctx.lineTo(s.lines[i].x2, s.lines[i].y2); ctx.stroke();
    }
    // Dots
    for(var i=0;i<s.dots.length;i++){
      var d = s.dots[i];
      ctx.fillStyle = d.connected ? '#5fd4c7' : (d.num === s.next ? '#e0a458' : '#3a3e48');
      ctx.beginPath(); ctx.arc(d.x, d.y, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.num, d.x, d.y);
      ctx.textBaseline = 'alphabetic';
    }
  };

  dcRenderTile();
})();


/* ---- Arcade cabinet #15: SLIDE PUZZLE ---- */
(function(){
  var spSlot = document.getElementById('sp-slot-15');
  if(!spSlot) return;
  var spOverlay = document.getElementById('ac-overlay');
  var spRaf = null;
  var spKeys = {};
  var spMouse = { x:0, y:0, down:false };
  var spPaused = false;
  var spState = null;

  function spOnKeyDown(e){ spKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function spOnKeyUp(e){ spKeys[e.key.toLowerCase()] = false; }
  function spOnMouseMove(e){
    var canvas = document.getElementById('sp-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    spMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    spMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function spOnMouseDown(){ spMouse.down = true; }
  function spOnMouseUp(){ spMouse.down = false; }

  function spRenderTile(){
    spSlot.innerHTML =
      '<div class="ac-bubble" id="sp-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">SLIDE PUZZLE</div>' +
          '<div class="ac-sub">puzzle · slide tiles</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="4" y="6" width="10" height="10" rx="2" fill="#5fd4c7"/><text x="9" y="13" font-size="6" text-anchor="middle" fill="#12161d">1</text><rect x="16" y="6" width="10" height="10" rx="2" fill="#e0a458"/><text x="21" y="13" font-size="6" text-anchor="middle" fill="#12161d">2</text><rect x="4" y="18" width="10" height="10" rx="2" fill="#e0a458"/><text x="9" y="25" font-size="6" text-anchor="middle" fill="#12161d">3</text><rect x="16" y="18" width="10" height="10" rx="2" fill="#5fd4c7" opacity="0.3"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Slide numbered tiles into order (1, 2, 3...). The empty space lets you slide adjacent tiles. Solve in fewer moves for a higher score!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('sp-bubble-btn').addEventListener('click', spOpen, { once:true });
  }

  function spRequestFullscreen(){
    var el = spOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function spExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function spOpen(){
    spOverlay.classList.add('on');
    spRequestFullscreen();
    spShowLoading();
    setTimeout(spShowModeSelect, 400);
  }
  function spShowLoading(){
    spOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING SLIDE PUZZLE&hellip;</div></div>';
  }
  function spShowModeSelect(){
    spOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="sp-mode-close">&times;</span>' +
        '<h2>SLIDE PUZZLE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>3x3</strong><span>8 tiles</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>4x4</strong><span>15 tiles</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>5x5</strong><span>24 tiles</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click a tile adjacent to the empty space to slide it.</p>' +
      '</div>';
    document.getElementById('sp-mode-close').addEventListener('click', spClose);
    var btns = spOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ spBoot(this.getAttribute('data-mode')); });
    }
  }
  function spBoot(mode){
    wbTrackGamePlayed('slidingPuzzle');
    spOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="sp-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="sp-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>SLIDE PUZZLE</b> &middot; puzzle · slide tiles</div>' +
        '<div class="ac-canvas-wrap"><canvas id="sp-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="sp-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="sp-pause-overlay"><h3>Paused</h3><button id="sp-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('sp-close-btn').addEventListener('click', spClose);
    var pauseBtn = document.getElementById('sp-pause-btn');
    var pauseOv = document.getElementById('sp-pause-overlay');
    var resumeBtn = document.getElementById('sp-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ spPaused = !spPaused; if(pauseOv) pauseOv.classList.toggle('on', spPaused); if(pauseBtn) pauseBtn.innerHTML = spPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ spPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    spStartGame(mode);
  }
  function spClose(){
    if(spRaf) cancelAnimationFrame(spRaf);
    spRaf = null;
    spPaused = false;
    spState = null;
    window.removeEventListener('keydown', spOnKeyDown);
    window.removeEventListener('keyup', spOnKeyUp);
    window.removeEventListener('mousemove', spOnMouseMove);
    window.removeEventListener('mousedown', spOnMouseDown);
    window.removeEventListener('mouseup', spOnMouseUp);
    spKeys = {};
    spMouse = { x:0, y:0, down:false };
    spExitFullscreen();
    spOverlay.classList.remove('on');
    spOverlay.innerHTML = '';
    spRenderTile();
  }

  function spStartGame(mode){
    var canvas = document.getElementById('sp-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', spOnMouseMove);
    window.addEventListener('mousedown', spOnMouseDown);
    window.addEventListener('mouseup', spOnMouseUp);
    window.addEventListener('keydown', spOnKeyDown);
    window.addEventListener('keyup', spOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('sp-status');
    var over = false;
    var score = 0;

    // Initialize game state
    spState = spInitState(mode, W, H);
    spState.mode = mode;
    spState.W = W;
    spState.H = H;
    spState.score = 0;
    spState.over = false;
    spState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      spMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      spMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      spMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      spMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      spMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ spMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!spState.over && !spPaused){
        spState.time += dt;
        spUpdate(spState, dt, spKeys, spMouse);
        score = spState.score;
        if(spState.over){
          wbRecordGameScore('slidingPuzzle', mode, score);
          wbRecordFightResult('slidingPuzzle', 'loss', false);
        }
        if(statusEl){
          if(spState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(spState.statusText) statusEl.textContent = spState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      spDraw(ctx, W, H, spState);

      if(spState.over){
        canvas.addEventListener('click', function(){ spBoot(mode); }, { once:true });
      }

      spRaf = requestAnimationFrame(loop);
    }
    spRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  spInitState = function(mode, W, H){
    return spGameInit(mode, W, H);
  };

  spGameInit = function(mode, W, H){
    var n = mode==='hard'?5:mode==='easy'?3:4;
    var tiles = [];
    var total = n*n - 1;
    for(var i=0;i<total;i++) tiles.push(i+1);
    tiles.push(0); // empty
    // Shuffle
    for(var i=0;i<100;i++){ var a=Math.floor(Math.random()*tiles.length), b=Math.floor(Math.random()*tiles.length); var t=tiles[a]; tiles[a]=tiles[b]; tiles[b]=t; }
    var sz = Math.min(W-100, H-100);
    var ox = (W-sz)/2, oy = (H-sz)/2 + 20;
    return { tiles:tiles, n:n, sz:sz, ox:ox, oy:oy, moves:0, score:0 };
  };

  spUpdate = function(s, dt, keys, mouse){
    if(mouse.down){
      var ts = s.sz / s.n;
      var col = Math.floor((mouse.x - s.ox) / ts);
      var row = Math.floor((mouse.y - s.oy) / ts);
      if(col < 0 || col >= s.n || row < 0 || row >= s.n) return;
      var idx = row * s.n + col;
      var emptyIdx = s.tiles.indexOf(0);
      var er = Math.floor(emptyIdx/s.n), ec = emptyIdx%s.n;
      if(Math.abs(row-er) + Math.abs(col-ec) === 1){
        var t = s.tiles[idx]; s.tiles[idx] = 0; s.tiles[emptyIdx] = t;
        s.moves++; s.score = Math.max(0, 1000 - s.moves * 10);
        // Check solved
        var solved = true;
        for(var i=0;i<s.tiles.length-1;i++){ if(s.tiles[i] !== i+1){ solved = false; break; } }
        if(solved){ s.over = true; }
      }
      mouse.down = false;
    }
    s.statusText = 'Moves: ' + s.moves + ' | Score: ' + s.score;
  };

  spDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    var ts = s.sz / s.n;
    for(var i=0;i<s.tiles.length;i++){
      var t = s.tiles[i];
      var col = i % s.n, row = Math.floor(i / s.n);
      var x = s.ox + col * ts, y = s.oy + row * ts;
      if(t === 0) continue;
      ctx.fillStyle = '#1a2a3a';
      ctx.fillRect(x+2, y+2, ts-4, ts-4);
      ctx.strokeStyle = '#5fd4c7'; ctx.lineWidth = 2;
      ctx.strokeRect(x+2, y+2, ts-4, ts-4);
      ctx.fillStyle = '#e0a458'; ctx.font = 'bold ' + Math.floor(ts*0.4) + 'px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t, x+ts/2, y+ts/2);
      ctx.textBaseline = 'alphabetic';
    }
  };

  spRenderTile();
})();


/* ---- Arcade cabinet #16: PATTERN MEMORY ---- */
(function(){
  var pmSlot = document.getElementById('pm-slot-16');
  if(!pmSlot) return;
  var pmOverlay = document.getElementById('ac-overlay');
  var pmRaf = null;
  var pmKeys = {};
  var pmMouse = { x:0, y:0, down:false };
  var pmPaused = false;
  var pmState = null;

  function pmOnKeyDown(e){ pmKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function pmOnKeyUp(e){ pmKeys[e.key.toLowerCase()] = false; }
  function pmOnMouseMove(e){
    var canvas = document.getElementById('pm-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    pmMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    pmMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function pmOnMouseDown(){ pmMouse.down = true; }
  function pmOnMouseUp(){ pmMouse.down = false; }

  function pmRenderTile(){
    pmSlot.innerHTML =
      '<div class="ac-bubble" id="pm-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">PATTERN MEMORY</div>' +
          '<div class="ac-sub">puzzle · repeat the pattern</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="4" y="6" width="12" height="12" rx="2" fill="#ff5a5a"/><rect x="18" y="6" width="12" height="12" rx="2" fill="#5fd4c7"/><rect x="4" y="20" width="12" height="12" rx="2" fill="#e0a458"/><rect x="18" y="20" width="12" height="12" rx="2" fill="#b070ff"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Watch a sequence of glowing tiles light up, then repeat the pattern by clicking them in order. Each round adds one more step!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('pm-bubble-btn').addEventListener('click', pmOpen, { once:true });
  }

  function pmRequestFullscreen(){
    var el = pmOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function pmExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function pmOpen(){
    pmOverlay.classList.add('on');
    pmRequestFullscreen();
    pmShowLoading();
    setTimeout(pmShowModeSelect, 400);
  }
  function pmShowLoading(){
    pmOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING PATTERN MEMORY&hellip;</div></div>';
  }
  function pmShowModeSelect(){
    pmOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="pm-mode-close">&times;</span>' +
        '<h2>PATTERN MEMORY</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow flash</strong><span>3s between each</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>1.5s between each</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast flash</strong><span>0.8s between each</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Watch the pattern, then click the tiles in the same order.</p>' +
      '</div>';
    document.getElementById('pm-mode-close').addEventListener('click', pmClose);
    var btns = pmOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ pmBoot(this.getAttribute('data-mode')); });
    }
  }
  function pmBoot(mode){
    wbTrackGamePlayed('patternMemory');
    pmOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="pm-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="pm-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>PATTERN MEMORY</b> &middot; puzzle · repeat the pattern</div>' +
        '<div class="ac-canvas-wrap"><canvas id="pm-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="pm-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="pm-pause-overlay"><h3>Paused</h3><button id="pm-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('pm-close-btn').addEventListener('click', pmClose);
    var pauseBtn = document.getElementById('pm-pause-btn');
    var pauseOv = document.getElementById('pm-pause-overlay');
    var resumeBtn = document.getElementById('pm-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ pmPaused = !pmPaused; if(pauseOv) pauseOv.classList.toggle('on', pmPaused); if(pauseBtn) pauseBtn.innerHTML = pmPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ pmPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    pmStartGame(mode);
  }
  function pmClose(){
    if(pmRaf) cancelAnimationFrame(pmRaf);
    pmRaf = null;
    pmPaused = false;
    pmState = null;
    window.removeEventListener('keydown', pmOnKeyDown);
    window.removeEventListener('keyup', pmOnKeyUp);
    window.removeEventListener('mousemove', pmOnMouseMove);
    window.removeEventListener('mousedown', pmOnMouseDown);
    window.removeEventListener('mouseup', pmOnMouseUp);
    pmKeys = {};
    pmMouse = { x:0, y:0, down:false };
    pmExitFullscreen();
    pmOverlay.classList.remove('on');
    pmOverlay.innerHTML = '';
    pmRenderTile();
  }

  function pmStartGame(mode){
    var canvas = document.getElementById('pm-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', pmOnMouseMove);
    window.addEventListener('mousedown', pmOnMouseDown);
    window.addEventListener('mouseup', pmOnMouseUp);
    window.addEventListener('keydown', pmOnKeyDown);
    window.addEventListener('keyup', pmOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('pm-status');
    var over = false;
    var score = 0;

    // Initialize game state
    pmState = pmInitState(mode, W, H);
    pmState.mode = mode;
    pmState.W = W;
    pmState.H = H;
    pmState.score = 0;
    pmState.over = false;
    pmState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      pmMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      pmMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      pmMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      pmMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      pmMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ pmMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!pmState.over && !pmPaused){
        pmState.time += dt;
        pmUpdate(pmState, dt, pmKeys, pmMouse);
        score = pmState.score;
        if(pmState.over){
          wbRecordGameScore('patternMemory', mode, score);
          wbRecordFightResult('patternMemory', 'loss', false);
        }
        if(statusEl){
          if(pmState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(pmState.statusText) statusEl.textContent = pmState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      pmDraw(ctx, W, H, pmState);

      if(pmState.over){
        canvas.addEventListener('click', function(){ pmBoot(mode); }, { once:true });
      }

      pmRaf = requestAnimationFrame(loop);
    }
    pmRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  pmInitState = function(mode, W, H){
    return pmGameInit(mode, W, H);
  };

  pmGameInit = function(mode, W, H){
    var speed = mode==='hard'?0.8:mode==='easy'?3:1.5;
    var tiles = [];
    for(var i=0;i<4;i++){ tiles.push({ x: W/4*(i+0.5), y: H/2, lit:false, flashTimer:0 }); }
    return { tiles:tiles, pattern:[], playerIdx:0, phase:'show', showTimer:0, showIdx:0, speed:speed, round:0, score:0, flashTile:-1, flashTimer:0 };
  };

  pmUpdate = function(s, dt, keys, mouse){
    if(s.phase === 'show'){
      s.showTimer += dt;
      if(s.showTimer >= s.speed){
        if(s.showIdx < s.pattern.length){
          s.flashTile = s.pattern[s.showIdx]; s.flashTimer = 0.4;
          s.showIdx++; s.showTimer = 0;
        } else {
          s.phase = 'input'; s.playerIdx = 0;
        }
      }
    } else if(s.phase === 'input'){
      if(mouse.down){
        for(var i=0;i<s.tiles.length;i++){
          var t = s.tiles[i];
          if(Math.hypot(mouse.x-t.x, mouse.y-t.y) < 60){
            s.flashTile = i; s.flashTimer = 0.3;
            if(i === s.pattern[s.playerIdx]){
              s.playerIdx++;
              if(s.playerIdx >= s.pattern.length){
                s.round++; s.score += s.round * 50;
                s.pattern.push(Math.floor(Math.random()*4));
                s.phase = 'show'; s.showIdx = 0; s.showTimer = 0;
              }
            } else {
              s.over = true;
            }
            break;
          }
        }
      }
    }
    if(s.flashTimer > 0) s.flashTimer -= dt;
    s.statusText = 'Round ' + s.round + ' | Score: ' + s.score + (s.phase==='show' ? ' | Watch...' : ' | Your turn!');
  };

  pmDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    var colors = ['#ff5a5a','#5fd4c7','#e0a458','#b070ff'];
    for(var i=0;i<s.tiles.length;i++){
      var t = s.tiles[i];
      var lit = (s.flashTile === i && s.flashTimer > 0);
      ctx.fillStyle = lit ? colors[i] : colors[i]+'30';
      ctx.beginPath(); ctx.arc(t.x, t.y, 60, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = colors[i]; ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  pmRenderTile();
})();


/* ---- Arcade cabinet #17: TOWER BUILDER ---- */
(function(){
  var tbSlot = document.getElementById('tb-slot-17');
  if(!tbSlot) return;
  var tbOverlay = document.getElementById('ac-overlay');
  var tbRaf = null;
  var tbKeys = {};
  var tbMouse = { x:0, y:0, down:false };
  var tbPaused = false;
  var tbState = null;

  function tbOnKeyDown(e){ tbKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function tbOnKeyUp(e){ tbKeys[e.key.toLowerCase()] = false; }
  function tbOnMouseMove(e){
    var canvas = document.getElementById('tb-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    tbMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    tbMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function tbOnMouseDown(){ tbMouse.down = true; }
  function tbOnMouseUp(){ tbMouse.down = false; }

  function tbRenderTile(){
    tbSlot.innerHTML =
      '<div class="ac-bubble" id="tb-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">TOWER BUILDER</div>' +
          '<div class="ac-sub">casual · stack blocks</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="8" y="30" width="18" height="6" fill="#5fd4c7"/><rect x="10" y="22" width="14" height="6" fill="#e0a458"/><rect x="12" y="14" width="10" height="6" fill="#b070ff"/><rect x="14" y="6" width="6" height="6" fill="#ff5a5a"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Time your block drops to stack them perfectly. Misaligned edges get trimmed off. How tall can you build before the block is too small?</div>' +
        '</div>' +
      '</div>';
    document.getElementById('tb-bubble-btn').addEventListener('click', tbOpen, { once:true });
  }

  function tbRequestFullscreen(){
    var el = tbOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function tbExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function tbOpen(){
    tbOverlay.classList.add('on');
    tbRequestFullscreen();
    tbShowLoading();
    setTimeout(tbShowModeSelect, 400);
  }
  function tbShowLoading(){
    tbOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING TOWER BUILDER&hellip;</div></div>';
  }
  function tbShowModeSelect(){
    tbOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="tb-mode-close">&times;</span>' +
        '<h2>TOWER BUILDER</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow scroll</strong><span>Plenty of time</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast scroll</strong><span>Quick timing needed</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Press SPACE or click to drop the block. Align it with the tower below.</p>' +
      '</div>';
    document.getElementById('tb-mode-close').addEventListener('click', tbClose);
    var btns = tbOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ tbBoot(this.getAttribute('data-mode')); });
    }
  }
  function tbBoot(mode){
    wbTrackGamePlayed('towerBuilder');
    tbOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="tb-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="tb-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>TOWER BUILDER</b> &middot; casual · stack blocks</div>' +
        '<div class="ac-canvas-wrap"><canvas id="tb-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="tb-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="tb-pause-overlay"><h3>Paused</h3><button id="tb-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('tb-close-btn').addEventListener('click', tbClose);
    var pauseBtn = document.getElementById('tb-pause-btn');
    var pauseOv = document.getElementById('tb-pause-overlay');
    var resumeBtn = document.getElementById('tb-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ tbPaused = !tbPaused; if(pauseOv) pauseOv.classList.toggle('on', tbPaused); if(pauseBtn) pauseBtn.innerHTML = tbPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ tbPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    tbStartGame(mode);
  }
  function tbClose(){
    if(tbRaf) cancelAnimationFrame(tbRaf);
    tbRaf = null;
    tbPaused = false;
    tbState = null;
    window.removeEventListener('keydown', tbOnKeyDown);
    window.removeEventListener('keyup', tbOnKeyUp);
    window.removeEventListener('mousemove', tbOnMouseMove);
    window.removeEventListener('mousedown', tbOnMouseDown);
    window.removeEventListener('mouseup', tbOnMouseUp);
    tbKeys = {};
    tbMouse = { x:0, y:0, down:false };
    tbExitFullscreen();
    tbOverlay.classList.remove('on');
    tbOverlay.innerHTML = '';
    tbRenderTile();
  }

  function tbStartGame(mode){
    var canvas = document.getElementById('tb-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', tbOnMouseMove);
    window.addEventListener('mousedown', tbOnMouseDown);
    window.addEventListener('mouseup', tbOnMouseUp);
    window.addEventListener('keydown', tbOnKeyDown);
    window.addEventListener('keyup', tbOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('tb-status');
    var over = false;
    var score = 0;

    // Initialize game state
    tbState = tbInitState(mode, W, H);
    tbState.mode = mode;
    tbState.W = W;
    tbState.H = H;
    tbState.score = 0;
    tbState.over = false;
    tbState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      tbMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      tbMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      tbMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      tbMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      tbMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ tbMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!tbState.over && !tbPaused){
        tbState.time += dt;
        tbUpdate(tbState, dt, tbKeys, tbMouse);
        score = tbState.score;
        if(tbState.over){
          wbRecordGameScore('towerBuilder', mode, score);
          wbRecordFightResult('towerBuilder', 'loss', false);
        }
        if(statusEl){
          if(tbState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(tbState.statusText) statusEl.textContent = tbState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      tbDraw(ctx, W, H, tbState);

      if(tbState.over){
        canvas.addEventListener('click', function(){ tbBoot(mode); }, { once:true });
      }

      tbRaf = requestAnimationFrame(loop);
    }
    tbRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  tbInitState = function(mode, W, H){
    return tbGameInit(mode, W, H);
  };

  tbGameInit = function(mode, W, H){
    var speed = mode==='hard'?2.5:mode==='easy'?1.0:1.7;
    return { blocks:[], current:{ x:100, y:H-60, w:200, dir:1, speed:speed }, towerY:H-30, score:0, speed:speed, dropping:false, dropTimer:0, nextBlock:null };
  };

  tbUpdate = function(s, dt, keys, mouse){
    if(s.dropping){
      s.dropTimer += dt;
      if(s.dropTimer > 0.3){
        s.dropping = false; s.dropTimer = 0;
        // Trim
        var last = s.blocks[s.blocks.length-1];
        var cur = s.current;
        var overlap = Math.min(last.x+last.w, cur.x+cur.w) - Math.max(last.x, cur.x);
        if(overlap <= 0){ s.over = true; return; }
        var diff = cur.x - last.x;
        if(diff > 0) cur.x += diff; cur.w = overlap;
        s.blocks.push({ x:cur.x, y:cur.y, w:cur.w });
        s.score += Math.floor(overlap);
        s.towerY -= 30;
        var ns = Math.max(40, cur.w * 0.95);
        s.current = { x:50, y:s.towerY-30, w:ns, dir:1, speed:s.speed };
      }
      return;
    }
    s.current.x += s.current.dir * s.current.speed * 60 * dt;
    if(s.current.x + s.current.w > W-20){ s.current.x = W-20-s.current.w; s.current.dir = -1; }
    if(s.current.x < 20){ s.current.x = 20; s.current.dir = 1; }
    if(mouse.down || keys[' ']){ s.dropping = true; mouse.down = false; }
    s.statusText = 'Score: ' + s.score + ' | SPACE to drop';
  };

  tbDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    // Ground
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, H-30, W, 30);
    // Placed blocks
    var colors = ['#5fd4c7','#e0a458','#b070ff','#ff5a5a','#5a8aff'];
    for(var i=0;i<s.blocks.length;i++){ ctx.fillStyle = colors[i%colors.length]; ctx.fillRect(s.blocks[i].x, s.blocks[i].y, s.blocks[i].w, 28); }
    // Current moving block
    ctx.fillStyle = '#e0a458'; ctx.fillRect(s.current.x, s.current.y, s.current.w, 28);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(s.current.x, s.current.y, s.current.w, 28);
  };

  tbRenderTile();
})();


/* ---- Arcade cabinet #18: BUBBLE SORT ---- */
(function(){
  var bsSlot = document.getElementById('bs-slot-18');
  if(!bsSlot) return;
  var bsOverlay = document.getElementById('ac-overlay');
  var bsRaf = null;
  var bsKeys = {};
  var bsMouse = { x:0, y:0, down:false };
  var bsPaused = false;
  var bsState = null;

  function bsOnKeyDown(e){ bsKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function bsOnKeyUp(e){ bsKeys[e.key.toLowerCase()] = false; }
  function bsOnMouseMove(e){
    var canvas = document.getElementById('bs-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    bsMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    bsMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function bsOnMouseDown(){ bsMouse.down = true; }
  function bsOnMouseUp(){ bsMouse.down = false; }

  function bsRenderTile(){
    bsSlot.innerHTML =
      '<div class="ac-bubble" id="bs-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">BUBBLE SORT</div>' +
          '<div class="ac-sub">puzzle · sort the bubbles</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="10" cy="14" r="4" fill="#5fd4c7" opacity="0.6"/><circle cx="22" cy="10" r="6" fill="#e0a458" opacity="0.6"/><circle cx="20" cy="26" r="3" fill="#b070ff" opacity="0.6"/><circle cx="8" cy="30" r="5" fill="#ff5a5a" opacity="0.6"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Bubbles of different sizes float around. Click them in order from smallest to largest to pop them. Pop in wrong order and lose a life!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('bs-bubble-btn').addEventListener('click', bsOpen, { once:true });
  }

  function bsRequestFullscreen(){
    var el = bsOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function bsExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function bsOpen(){
    bsOverlay.classList.add('on');
    bsRequestFullscreen();
    bsShowLoading();
    setTimeout(bsShowModeSelect, 400);
  }
  function bsShowLoading(){
    bsOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING BUBBLE SORT&hellip;</div></div>';
  }
  function bsShowModeSelect(){
    bsOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="bs-mode-close">&times;</span>' +
        '<h2>BUBBLE SORT</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>5 bubbles</strong><span>Slow float</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>8 bubbles</strong><span>Medium speed</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>12 bubbles</strong><span>Fast float</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click bubbles from smallest to largest. Wrong order costs a life!</p>' +
      '</div>';
    document.getElementById('bs-mode-close').addEventListener('click', bsClose);
    var btns = bsOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ bsBoot(this.getAttribute('data-mode')); });
    }
  }
  function bsBoot(mode){
    wbTrackGamePlayed('bubbleSort');
    bsOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="bs-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="bs-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>BUBBLE SORT</b> &middot; puzzle · sort the bubbles</div>' +
        '<div class="ac-canvas-wrap"><canvas id="bs-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="bs-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="bs-pause-overlay"><h3>Paused</h3><button id="bs-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('bs-close-btn').addEventListener('click', bsClose);
    var pauseBtn = document.getElementById('bs-pause-btn');
    var pauseOv = document.getElementById('bs-pause-overlay');
    var resumeBtn = document.getElementById('bs-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ bsPaused = !bsPaused; if(pauseOv) pauseOv.classList.toggle('on', bsPaused); if(pauseBtn) pauseBtn.innerHTML = bsPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ bsPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    bsStartGame(mode);
  }
  function bsClose(){
    if(bsRaf) cancelAnimationFrame(bsRaf);
    bsRaf = null;
    bsPaused = false;
    bsState = null;
    window.removeEventListener('keydown', bsOnKeyDown);
    window.removeEventListener('keyup', bsOnKeyUp);
    window.removeEventListener('mousemove', bsOnMouseMove);
    window.removeEventListener('mousedown', bsOnMouseDown);
    window.removeEventListener('mouseup', bsOnMouseUp);
    bsKeys = {};
    bsMouse = { x:0, y:0, down:false };
    bsExitFullscreen();
    bsOverlay.classList.remove('on');
    bsOverlay.innerHTML = '';
    bsRenderTile();
  }

  function bsStartGame(mode){
    var canvas = document.getElementById('bs-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', bsOnMouseMove);
    window.addEventListener('mousedown', bsOnMouseDown);
    window.addEventListener('mouseup', bsOnMouseUp);
    window.addEventListener('keydown', bsOnKeyDown);
    window.addEventListener('keyup', bsOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('bs-status');
    var over = false;
    var score = 0;

    // Initialize game state
    bsState = bsInitState(mode, W, H);
    bsState.mode = mode;
    bsState.W = W;
    bsState.H = H;
    bsState.score = 0;
    bsState.over = false;
    bsState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      bsMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      bsMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      bsMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      bsMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      bsMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ bsMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!bsState.over && !bsPaused){
        bsState.time += dt;
        bsUpdate(bsState, dt, bsKeys, bsMouse);
        score = bsState.score;
        if(bsState.over){
          wbRecordGameScore('bubbleSort', mode, score);
          wbRecordFightResult('bubbleSort', 'loss', false);
        }
        if(statusEl){
          if(bsState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(bsState.statusText) statusEl.textContent = bsState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      bsDraw(ctx, W, H, bsState);

      if(bsState.over){
        canvas.addEventListener('click', function(){ bsBoot(mode); }, { once:true });
      }

      bsRaf = requestAnimationFrame(loop);
    }
    bsRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  bsInitState = function(mode, W, H){
    return bsGameInit(mode, W, H);
  };

  bsGameInit = function(mode, W, H){
    var count = mode==='hard'?12:mode==='easy'?5:8;
    var speed = mode==='hard'?2:mode==='easy'?0.8:1.3;
    var bubbles = [];
    for(var i=0;i<count;i++){ bubbles.push({ x:50+Math.random()*(W-100), y:50+Math.random()*(H-100), r:8+Math.random()*20, vx:(Math.random()-0.5)*speed*30, vy:(Math.random()-0.5)*speed*30, popped:false }); }
    bubbles.sort(function(a,b){ return a.r - b.r; });
    for(var i=0;i<bubbles.length;i++) bubbles[i].rank = i+1;
    bubbles.sort(function(){ return Math.random()-0.5; });
    return { bubbles:bubbles, nextRank:1, score:0, lives:3, speed:speed };
  };

  bsUpdate = function(s, dt, keys, mouse){
    for(var i=0;i<s.bubbles.length;i++){
      var b = s.bubbles[i];
      if(b.popped) continue;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if(b.x < b.r || b.x > W-b.r) b.vx *= -1;
      if(b.y < b.r || b.y > H-b.r) b.vy *= -1;
      b.x = Math.max(b.r, Math.min(W-b.r, b.x));
      b.y = Math.max(b.r, Math.min(H-b.r, b.y));
    }
    if(mouse.down){
      for(var i=0;i<s.bubbles.length;i++){
        var b = s.bubbles[i];
        if(b.popped) continue;
        if(Math.hypot(mouse.x-b.x, mouse.y-b.y) < b.r){
          if(b.rank === s.nextRank){ b.popped = true; s.score += 50; s.nextRank++; if(s.nextRank > s.bubbles.length){ s.score += 200; s.over = true; } }
          else { s.lives--; if(s.lives <= 0){ s.over = true; } }
          break;
        }
      }
      mouse.down = false;
    }
    s.statusText = 'Next: #' + s.nextRank + ' | Score: ' + s.score + ' | Lives: ' + s.lives;
  };

  bsDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.bubbles.length;i++){
      var b = s.bubbles[i];
      if(b.popped) continue;
      var col = b.rank === s.nextRank ? '#e0a458' : '#5fd4c7';
      ctx.fillStyle = col + '60'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.rank, b.x, b.y);
      ctx.textBaseline = 'alphabetic';
    }
  };

  bsRenderTile();
})();


/* ---- Arcade cabinet #19: IDLE FARM ---- */
(function(){
  var ifSlot = document.getElementById('if-slot-19');
  if(!ifSlot) return;
  var ifOverlay = document.getElementById('ac-overlay');
  var ifRaf = null;
  var ifKeys = {};
  var ifMouse = { x:0, y:0, down:false };
  var ifPaused = false;
  var ifState = null;

  function ifOnKeyDown(e){ ifKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function ifOnKeyUp(e){ ifKeys[e.key.toLowerCase()] = false; }
  function ifOnMouseMove(e){
    var canvas = document.getElementById('if-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    ifMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    ifMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function ifOnMouseDown(){ ifMouse.down = true; }
  function ifOnMouseUp(){ ifMouse.down = false; }

  function ifRenderTile(){
    ifSlot.innerHTML =
      '<div class="ac-bubble" id="if-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">IDLE FARM</div>' +
          '<div class="ac-sub">casual · grow crops</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="2" y="30" width="30" height="14" fill="#3a3a2a"/><rect x="6" y="24" width="6" height="8" fill="#5a8a3a"/><rect x="14" y="20" width="6" height="12" fill="#5a8a3a"/><rect x="22" y="26" width="6" height="6" fill="#5a8a3a"/><circle cx="9" cy="22" r="3" fill="#ff5a5a"/><circle cx="17" cy="16" r="3" fill="#e0a458"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Plant seeds, water them, and harvest when ripe. Each crop takes time to grow. Manage your field for maximum harvest before the round ends!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('if-bubble-btn').addEventListener('click', ifOpen, { once:true });
  }

  function ifRequestFullscreen(){
    var el = ifOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function ifExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function ifOpen(){
    ifOverlay.classList.add('on');
    ifRequestFullscreen();
    ifShowLoading();
    setTimeout(ifShowModeSelect, 400);
  }
  function ifShowLoading(){
    ifOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING IDLE FARM&hellip;</div></div>';
  }
  function ifShowModeSelect(){
    ifOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="if-mode-close">&times;</span>' +
        '<h2>IDLE FARM</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>60 seconds</strong><span>Fast growth, big field</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>90 seconds</strong><span>Normal pace</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>45 seconds</strong><span>Small field, fast decay</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click empty soil to plant. Click watered soil to water. Click ripe crops to harvest.</p>' +
      '</div>';
    document.getElementById('if-mode-close').addEventListener('click', ifClose);
    var btns = ifOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ ifBoot(this.getAttribute('data-mode')); });
    }
  }
  function ifBoot(mode){
    wbTrackGamePlayed('idleFarm');
    ifOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="if-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="if-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>IDLE FARM</b> &middot; casual · grow crops</div>' +
        '<div class="ac-canvas-wrap"><canvas id="if-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="if-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="if-pause-overlay"><h3>Paused</h3><button id="if-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('if-close-btn').addEventListener('click', ifClose);
    var pauseBtn = document.getElementById('if-pause-btn');
    var pauseOv = document.getElementById('if-pause-overlay');
    var resumeBtn = document.getElementById('if-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ ifPaused = !ifPaused; if(pauseOv) pauseOv.classList.toggle('on', ifPaused); if(pauseBtn) pauseBtn.innerHTML = ifPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ ifPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    ifStartGame(mode);
  }
  function ifClose(){
    if(ifRaf) cancelAnimationFrame(ifRaf);
    ifRaf = null;
    ifPaused = false;
    ifState = null;
    window.removeEventListener('keydown', ifOnKeyDown);
    window.removeEventListener('keyup', ifOnKeyUp);
    window.removeEventListener('mousemove', ifOnMouseMove);
    window.removeEventListener('mousedown', ifOnMouseDown);
    window.removeEventListener('mouseup', ifOnMouseUp);
    ifKeys = {};
    ifMouse = { x:0, y:0, down:false };
    ifExitFullscreen();
    ifOverlay.classList.remove('on');
    ifOverlay.innerHTML = '';
    ifRenderTile();
  }

  function ifStartGame(mode){
    var canvas = document.getElementById('if-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', ifOnMouseMove);
    window.addEventListener('mousedown', ifOnMouseDown);
    window.addEventListener('mouseup', ifOnMouseUp);
    window.addEventListener('keydown', ifOnKeyDown);
    window.addEventListener('keyup', ifOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('if-status');
    var over = false;
    var score = 0;

    // Initialize game state
    ifState = ifInitState(mode, W, H);
    ifState.mode = mode;
    ifState.W = W;
    ifState.H = H;
    ifState.score = 0;
    ifState.over = false;
    ifState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ifMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ifMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ifMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ifMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      ifMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ ifMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!ifState.over && !ifPaused){
        ifState.time += dt;
        ifUpdate(ifState, dt, ifKeys, ifMouse);
        score = ifState.score;
        if(ifState.over){
          wbRecordGameScore('idleFarm', mode, score);
          wbRecordFightResult('idleFarm', 'loss', false);
        }
        if(statusEl){
          if(ifState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(ifState.statusText) statusEl.textContent = ifState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      ifDraw(ctx, W, H, ifState);

      if(ifState.over){
        canvas.addEventListener('click', function(){ ifBoot(mode); }, { once:true });
      }

      ifRaf = requestAnimationFrame(loop);
    }
    ifRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  ifInitState = function(mode, W, H){
    return ifGameInit(mode, W, H);
  };

  ifGameInit = function(mode, W, H){
    var cols=5, rows=3;
    var plots = [];
    for(var r=0;r<rows;r++) for(var c=0;c<cols;c++){ plots.push({ x: (c+0.5)*W/cols, y: (r+0.5)*H/rows, stage:'empty', timer:0 }); }
    var time = mode==='hard'?45:mode==='easy'?60:90;
    return { plots:plots, score:0, time:time, growSpeed: mode==='hard'?0.8:1.5 };
  };

  ifUpdate = function(s, dt, keys, mouse){
    s.time -= dt;
    if(s.time <= 0){ s.over = true; return; }
    for(var i=0;i<s.plots.length;i++){
      var pl = s.plots[i];
      if(pl.stage === 'planted' || pl.stage === 'watered'){
        pl.timer += dt * s.growSpeed;
        if(pl.stage === 'watered' && pl.timer > 3) pl.stage = 'ripe';
      }
    }
    if(mouse.down){
      for(var i=0;i<s.plots.length;i++){
        var pl = s.plots[i];
        if(Math.abs(mouse.x-pl.x)<35 && Math.abs(mouse.y-pl.y)<35){
          if(pl.stage === 'empty'){ pl.stage = 'planted'; pl.timer = 0; }
          else if(pl.stage === 'planted'){ pl.stage = 'watered'; pl.timer = 0; }
          else if(pl.stage === 'ripe'){ s.score += 50; pl.stage = 'empty'; pl.timer = 0; }
          break;
        }
      }
      mouse.down = false;
    }
    s.statusText = 'Score: ' + s.score + ' | Time: ' + Math.ceil(s.time) + 's';
  };

  ifDraw = function(ctx, W, H, s){
    var bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#1a2a1a'); bg.addColorStop(1,'#2a3a2a');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.plots.length;i++){
      var pl = s.plots[i];
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(pl.x-30, pl.y-20, 60, 40);
      if(pl.stage === 'planted'){ ctx.fillStyle = '#5a8a3a'; ctx.fillRect(pl.x-8, pl.y-5, 16, 10); }
      else if(pl.stage === 'watered'){ ctx.fillStyle = '#7aaa5a'; ctx.fillRect(pl.x-12, pl.y-8, 24, 16); }
      else if(pl.stage === 'ripe'){ ctx.fillStyle = '#e0a458'; ctx.beginPath(); ctx.arc(pl.x, pl.y, 12, 0, Math.PI*2); ctx.fill(); }
    }
  };

  ifRenderTile();
})();


/* ---- Arcade cabinet #20: LASER DODGE ---- */
(function(){
  var ldSlot = document.getElementById('ld-slot-20');
  if(!ldSlot) return;
  var ldOverlay = document.getElementById('ac-overlay');
  var ldRaf = null;
  var ldKeys = {};
  var ldMouse = { x:0, y:0, down:false };
  var ldPaused = false;
  var ldState = null;

  function ldOnKeyDown(e){ ldKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function ldOnKeyUp(e){ ldKeys[e.key.toLowerCase()] = false; }
  function ldOnMouseMove(e){
    var canvas = document.getElementById('ld-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    ldMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    ldMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function ldOnMouseDown(){ ldMouse.down = true; }
  function ldOnMouseUp(){ ldMouse.down = false; }

  function ldRenderTile(){
    ldSlot.innerHTML =
      '<div class="ac-bubble" id="ld-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">LASER DODGE</div>' +
          '<div class="ac-sub">action · dodge lasers</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="0" y="12" width="34" height="2" fill="#ff5a5a" opacity="0.7"/><rect x="0" y="24" width="34" height="2" fill="#ff5a5a" opacity="0.7"/><circle cx="17" cy="18" r="4" fill="#5fd4c7"/><rect x="0" y="36" width="34" height="2" fill="#e0a458" opacity="0.5"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Move your character to avoid sweeping laser beams. Lasers get faster and more frequent over time. Survive as long as possible!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('ld-bubble-btn').addEventListener('click', ldOpen, { once:true });
  }

  function ldRequestFullscreen(){
    var el = ldOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function ldExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function ldOpen(){
    ldOverlay.classList.add('on');
    ldRequestFullscreen();
    ldShowLoading();
    setTimeout(ldShowModeSelect, 400);
  }
  function ldShowLoading(){
    ldOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING LASER DODGE&hellip;</div></div>';
  }
  function ldShowModeSelect(){
    ldOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="ld-mode-close">&times;</span>' +
        '<h2>LASER DODGE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow lasers</strong><span>Wide gaps</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast lasers</strong><span>Tight gaps</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: A/D or arrows to move. Avoid the red laser beams!</p>' +
      '</div>';
    document.getElementById('ld-mode-close').addEventListener('click', ldClose);
    var btns = ldOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ ldBoot(this.getAttribute('data-mode')); });
    }
  }
  function ldBoot(mode){
    wbTrackGamePlayed('laserDodge');
    ldOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="ld-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="ld-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>LASER DODGE</b> &middot; action · dodge lasers</div>' +
        '<div class="ac-canvas-wrap"><canvas id="ld-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="ld-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="ld-pause-overlay"><h3>Paused</h3><button id="ld-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('ld-close-btn').addEventListener('click', ldClose);
    var pauseBtn = document.getElementById('ld-pause-btn');
    var pauseOv = document.getElementById('ld-pause-overlay');
    var resumeBtn = document.getElementById('ld-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ ldPaused = !ldPaused; if(pauseOv) pauseOv.classList.toggle('on', ldPaused); if(pauseBtn) pauseBtn.innerHTML = ldPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ ldPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    ldStartGame(mode);
  }
  function ldClose(){
    if(ldRaf) cancelAnimationFrame(ldRaf);
    ldRaf = null;
    ldPaused = false;
    ldState = null;
    window.removeEventListener('keydown', ldOnKeyDown);
    window.removeEventListener('keyup', ldOnKeyUp);
    window.removeEventListener('mousemove', ldOnMouseMove);
    window.removeEventListener('mousedown', ldOnMouseDown);
    window.removeEventListener('mouseup', ldOnMouseUp);
    ldKeys = {};
    ldMouse = { x:0, y:0, down:false };
    ldExitFullscreen();
    ldOverlay.classList.remove('on');
    ldOverlay.innerHTML = '';
    ldRenderTile();
  }

  function ldStartGame(mode){
    var canvas = document.getElementById('ld-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', ldOnMouseMove);
    window.addEventListener('mousedown', ldOnMouseDown);
    window.addEventListener('mouseup', ldOnMouseUp);
    window.addEventListener('keydown', ldOnKeyDown);
    window.addEventListener('keyup', ldOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('ld-status');
    var over = false;
    var score = 0;

    // Initialize game state
    ldState = ldInitState(mode, W, H);
    ldState.mode = mode;
    ldState.W = W;
    ldState.H = H;
    ldState.score = 0;
    ldState.over = false;
    ldState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ldMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ldMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ldMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ldMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      ldMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ ldMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!ldState.over && !ldPaused){
        ldState.time += dt;
        ldUpdate(ldState, dt, ldKeys, ldMouse);
        score = ldState.score;
        if(ldState.over){
          wbRecordGameScore('laserDodge', mode, score);
          wbRecordFightResult('laserDodge', 'loss', false);
        }
        if(statusEl){
          if(ldState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(ldState.statusText) statusEl.textContent = ldState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      ldDraw(ctx, W, H, ldState);

      if(ldState.over){
        canvas.addEventListener('click', function(){ ldBoot(mode); }, { once:true });
      }

      ldRaf = requestAnimationFrame(loop);
    }
    ldRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  ldInitState = function(mode, W, H){
    return ldGameInit(mode, W, H);
  };

  ldGameInit = function(mode, W, H){
    var speed = mode==='hard'?1.5:mode==='easy'?0.6:1.0;
    return { player:{ x:W/2, y:H-60, w:20, h:20 }, lasers:[], timer:0, spawnRate: mode==='hard'?1.5:mode==='easy'?3:2.2, speed:speed, survival:0 };
  };

  ldUpdate = function(s, dt, keys, mouse){
    s.survival += dt; s.score = Math.floor(s.survival * 10);
    var sp = 200 * s.speed;
    if(keys['a']||keys['arrowleft']) s.player.x -= sp*dt;
    if(keys['d']||keys['arrowright']) s.player.x += sp*dt;
    s.player.x = Math.max(10, Math.min(W-30, s.player.x));
    s.timer += dt;
    if(s.timer >= s.spawnRate){ s.timer = 0; s.lasers.push({ y:0, w:80+Math.random()*120, x:Math.random()*(W-200), speed:150+s.speed*100 }); }
    for(var i=s.lasers.length-1;i>=0;i--){
      s.lasers[i].y += s.lasers[i].speed * dt;
      if(s.lasers[i].y > H){ s.lasers.splice(i,1); continue; }
      if(s.player.x > s.lasers[i].x && s.player.x < s.lasers[i].x+s.lasers[i].w && s.player.y > s.lasers[i].y && s.player.y < s.lasers[i].y+8){ s.over = true; }
    }
    s.statusText = 'Score: ' + s.score + ' | Avoid the lasers!';
  };

  ldDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.lasers.length;i++){ ctx.fillStyle = '#ff5a5a'; ctx.fillRect(s.lasers[i].x, s.lasers[i].y, s.lasers[i].w, 8); }
    ctx.fillStyle = '#5fd4c7'; ctx.fillRect(s.player.x, s.player.y, s.player.w, s.player.h);
  };

  ldRenderTile();
})();


/* ---- Arcade cabinet #21: NINJA DASH ---- */
(function(){
  var ndSlot = document.getElementById('nd-slot-21');
  if(!ndSlot) return;
  var ndOverlay = document.getElementById('ac-overlay');
  var ndRaf = null;
  var ndKeys = {};
  var ndMouse = { x:0, y:0, down:false };
  var ndPaused = false;
  var ndState = null;

  function ndOnKeyDown(e){ ndKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function ndOnKeyUp(e){ ndKeys[e.key.toLowerCase()] = false; }
  function ndOnMouseMove(e){
    var canvas = document.getElementById('nd-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    ndMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    ndMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function ndOnMouseDown(){ ndMouse.down = true; }
  function ndOnMouseUp(){ ndMouse.down = false; }

  function ndRenderTile(){
    ndSlot.innerHTML =
      '<div class="ac-bubble" id="nd-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">NINJA DASH</div>' +
          '<div class="ac-sub">action · wall jump</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="0" y="0" width="6" height="44" fill="#3a3e48"/><rect x="28" y="0" width="6" height="44" fill="#3a3e48"/><circle cx="10" cy="22" r="3" fill="#5fd4c7"/><polygon points="22,20 28,18 28,26 22,24" fill="#e0a458"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Jump between two walls, dodging obstacles. Tap to jump to the opposite wall. Time your jumps to avoid spikes and collect coins!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('nd-bubble-btn').addEventListener('click', ndOpen, { once:true });
  }

  function ndRequestFullscreen(){
    var el = ndOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function ndExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function ndOpen(){
    ndOverlay.classList.add('on');
    ndRequestFullscreen();
    ndShowLoading();
    setTimeout(ndShowModeSelect, 400);
  }
  function ndShowLoading(){
    ndOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING NINJA DASH&hellip;</div></div>';
  }
  function ndShowModeSelect(){
    ndOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="nd-mode-close">&times;</span>' +
        '<h2>NINJA DASH</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow obstacles</strong><span>Big gaps</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast obstacles</strong><span>Tight timing</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: SPACE or click to jump to the other wall. Avoid obstacles!</p>' +
      '</div>';
    document.getElementById('nd-mode-close').addEventListener('click', ndClose);
    var btns = ndOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ ndBoot(this.getAttribute('data-mode')); });
    }
  }
  function ndBoot(mode){
    wbTrackGamePlayed('ninjaDash');
    ndOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="nd-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="nd-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>NINJA DASH</b> &middot; action · wall jump</div>' +
        '<div class="ac-canvas-wrap"><canvas id="nd-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="nd-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="nd-pause-overlay"><h3>Paused</h3><button id="nd-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('nd-close-btn').addEventListener('click', ndClose);
    var pauseBtn = document.getElementById('nd-pause-btn');
    var pauseOv = document.getElementById('nd-pause-overlay');
    var resumeBtn = document.getElementById('nd-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ ndPaused = !ndPaused; if(pauseOv) pauseOv.classList.toggle('on', ndPaused); if(pauseBtn) pauseBtn.innerHTML = ndPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ ndPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    ndStartGame(mode);
  }
  function ndClose(){
    if(ndRaf) cancelAnimationFrame(ndRaf);
    ndRaf = null;
    ndPaused = false;
    ndState = null;
    window.removeEventListener('keydown', ndOnKeyDown);
    window.removeEventListener('keyup', ndOnKeyUp);
    window.removeEventListener('mousemove', ndOnMouseMove);
    window.removeEventListener('mousedown', ndOnMouseDown);
    window.removeEventListener('mouseup', ndOnMouseUp);
    ndKeys = {};
    ndMouse = { x:0, y:0, down:false };
    ndExitFullscreen();
    ndOverlay.classList.remove('on');
    ndOverlay.innerHTML = '';
    ndRenderTile();
  }

  function ndStartGame(mode){
    var canvas = document.getElementById('nd-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', ndOnMouseMove);
    window.addEventListener('mousedown', ndOnMouseDown);
    window.addEventListener('mouseup', ndOnMouseUp);
    window.addEventListener('keydown', ndOnKeyDown);
    window.addEventListener('keyup', ndOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('nd-status');
    var over = false;
    var score = 0;

    // Initialize game state
    ndState = ndInitState(mode, W, H);
    ndState.mode = mode;
    ndState.W = W;
    ndState.H = H;
    ndState.score = 0;
    ndState.over = false;
    ndState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ndMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ndMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ndMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ndMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      ndMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ ndMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!ndState.over && !ndPaused){
        ndState.time += dt;
        ndUpdate(ndState, dt, ndKeys, ndMouse);
        score = ndState.score;
        if(ndState.over){
          wbRecordGameScore('ninjaDash', mode, score);
          wbRecordFightResult('ninjaDash', 'loss', false);
        }
        if(statusEl){
          if(ndState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(ndState.statusText) statusEl.textContent = ndState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      ndDraw(ctx, W, H, ndState);

      if(ndState.over){
        canvas.addEventListener('click', function(){ ndBoot(mode); }, { once:true });
      }

      ndRaf = requestAnimationFrame(loop);
    }
    ndRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  ndInitState = function(mode, W, H){
    return ndGameInit(mode, W, H);
  };

  ndGameInit = function(mode, W, H){
    var speed = mode==='hard'?2.5:mode==='easy'?1.0:1.7;
    return { player:{ x:20, y:H/2, side:0, vy:0 }, obstacles:[], timer:0, spawnRate: mode==='hard'?1.2:mode==='easy'?2.5:1.8, speed:speed, score:0, scroll:0, coins:[] };
  };

  ndUpdate = function(s, dt, keys, mouse){
    s.score += Math.floor(dt * 10 * s.speed);
    s.scroll += s.speed * 60 * dt;
    if(keys[' ']||mouse.down){
      s.player.side = s.player.side === 0 ? 1 : 0;
      s.player.x = s.player.side === 0 ? 20 : W-40;
      keys[' '] = false; mouse.down = false;
    }
    s.player.y += s.player.vy * dt; s.player.vy += 600 * dt;
    if(s.player.y > H-40){ s.player.y = H-40; s.player.vy = 0; }
    s.timer += dt;
    if(s.timer >= s.spawnRate){
      s.timer = 0;
      var side = Math.random() > 0.5 ? 0 : 1;
      var ox = side === 0 ? 10 : W-30;
      s.obstacles.push({ x:ox, y:-40, w:20, h:40, side:side });
    }
    for(var i=s.obstacles.length-1;i>=0;i--){
      s.obstacles[i].y += s.speed * 80 * dt;
      if(s.obstacles[i].y > H){ s.obstacles.splice(i,1); s.score += 10; continue; }
      var ob = s.obstacles[i];
      if(ob.side === s.player.side && ob.y > s.player.y-30 && ob.y < s.player.y+30){ s.over = true; }
    }
    s.statusText = 'Score: ' + s.score;
  };

  ndDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#1a1a2a'; ctx.fillRect(0,0,10,H); ctx.fillRect(W-10,0,10,H);
    for(var i=0;i<s.obstacles.length;i++){ var o = s.obstacles[i]; ctx.fillStyle = '#ff5a5a'; ctx.fillRect(o.x, o.y, o.w, o.h); }
    ctx.fillStyle = '#5fd4c7'; ctx.fillRect(s.player.x, s.player.y, 20, 30);
  };

  ndRenderTile();
})();


/* ---- Arcade cabinet #22: ORB CATCHER ---- */
(function(){
  var ocSlot = document.getElementById('oc-slot-22');
  if(!ocSlot) return;
  var ocOverlay = document.getElementById('ac-overlay');
  var ocRaf = null;
  var ocKeys = {};
  var ocMouse = { x:0, y:0, down:false };
  var ocPaused = false;
  var ocState = null;

  function ocOnKeyDown(e){ ocKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function ocOnKeyUp(e){ ocKeys[e.key.toLowerCase()] = false; }
  function ocOnMouseMove(e){
    var canvas = document.getElementById('oc-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    ocMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    ocMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function ocOnMouseDown(){ ocMouse.down = true; }
  function ocOnMouseUp(){ ocMouse.down = false; }

  function ocRenderTile(){
    ocSlot.innerHTML =
      '<div class="ac-bubble" id="oc-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">ORB CATCHER</div>' +
          '<div class="ac-sub">action · catch falling orbs</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="10" cy="8" r="3" fill="#5fd4c7"/><circle cx="20" cy="12" r="3" fill="#e0a458"/><circle cx="14" cy="6" r="3" fill="#ff5a5a"/><path d="M6,30 L28,30 L24,38 L10,38 Z" fill="#b070ff"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Move your basket to catch falling colored orbs. Catch good orbs for points, avoid bombs! Gold orbs are worth extra. How long can you last?</div>' +
        '</div>' +
      '</div>';
    document.getElementById('oc-bubble-btn').addEventListener('click', ocOpen, { once:true });
  }

  function ocRequestFullscreen(){
    var el = ocOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function ocExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function ocOpen(){
    ocOverlay.classList.add('on');
    ocRequestFullscreen();
    ocShowLoading();
    setTimeout(ocShowModeSelect, 400);
  }
  function ocShowLoading(){
    ocOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING ORB CATCHER&hellip;</div></div>';
  }
  function ocShowModeSelect(){
    ocOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="oc-mode-close">&times;</span>' +
        '<h2>ORB CATCHER</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow fall</strong><span>Fewer bombs</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast fall</strong><span>More bombs</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: A/D or arrows to move the basket. Catch orbs, avoid bombs!</p>' +
      '</div>';
    document.getElementById('oc-mode-close').addEventListener('click', ocClose);
    var btns = ocOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ ocBoot(this.getAttribute('data-mode')); });
    }
  }
  function ocBoot(mode){
    wbTrackGamePlayed('orbCatcher');
    ocOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="oc-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="oc-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>ORB CATCHER</b> &middot; action · catch falling orbs</div>' +
        '<div class="ac-canvas-wrap"><canvas id="oc-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="oc-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="oc-pause-overlay"><h3>Paused</h3><button id="oc-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('oc-close-btn').addEventListener('click', ocClose);
    var pauseBtn = document.getElementById('oc-pause-btn');
    var pauseOv = document.getElementById('oc-pause-overlay');
    var resumeBtn = document.getElementById('oc-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ ocPaused = !ocPaused; if(pauseOv) pauseOv.classList.toggle('on', ocPaused); if(pauseBtn) pauseBtn.innerHTML = ocPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ ocPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    ocStartGame(mode);
  }
  function ocClose(){
    if(ocRaf) cancelAnimationFrame(ocRaf);
    ocRaf = null;
    ocPaused = false;
    ocState = null;
    window.removeEventListener('keydown', ocOnKeyDown);
    window.removeEventListener('keyup', ocOnKeyUp);
    window.removeEventListener('mousemove', ocOnMouseMove);
    window.removeEventListener('mousedown', ocOnMouseDown);
    window.removeEventListener('mouseup', ocOnMouseUp);
    ocKeys = {};
    ocMouse = { x:0, y:0, down:false };
    ocExitFullscreen();
    ocOverlay.classList.remove('on');
    ocOverlay.innerHTML = '';
    ocRenderTile();
  }

  function ocStartGame(mode){
    var canvas = document.getElementById('oc-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', ocOnMouseMove);
    window.addEventListener('mousedown', ocOnMouseDown);
    window.addEventListener('mouseup', ocOnMouseUp);
    window.addEventListener('keydown', ocOnKeyDown);
    window.addEventListener('keyup', ocOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('oc-status');
    var over = false;
    var score = 0;

    // Initialize game state
    ocState = ocInitState(mode, W, H);
    ocState.mode = mode;
    ocState.W = W;
    ocState.H = H;
    ocState.score = 0;
    ocState.over = false;
    ocState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ocMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ocMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      ocMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      ocMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      ocMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ ocMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!ocState.over && !ocPaused){
        ocState.time += dt;
        ocUpdate(ocState, dt, ocKeys, ocMouse);
        score = ocState.score;
        if(ocState.over){
          wbRecordGameScore('orbCatcher', mode, score);
          wbRecordFightResult('orbCatcher', 'loss', false);
        }
        if(statusEl){
          if(ocState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(ocState.statusText) statusEl.textContent = ocState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      ocDraw(ctx, W, H, ocState);

      if(ocState.over){
        canvas.addEventListener('click', function(){ ocBoot(mode); }, { once:true });
      }

      ocRaf = requestAnimationFrame(loop);
    }
    ocRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  ocInitState = function(mode, W, H){
    return ocGameInit(mode, W, H);
  };

  ocGameInit = function(mode, W, H){
    var speed = mode==='hard'?1.5:mode==='easy'?0.7:1.0;
    return { basket:{ x:W/2, y:H-40, w:80 }, orbs:[], timer:0, spawnRate: mode==='hard'?0.6:mode==='easy'?1.2:0.9, speed:speed, score:0, lives:3 };
  };

  ocUpdate = function(s, dt, keys, mouse){
    var sp = 300;
    if(keys['a']||keys['arrowleft']) s.basket.x -= sp*dt;
    if(keys['d']||keys['arrowright']) s.basket.x += sp*dt;
    if(mouse.x > 0) s.basket.x = mouse.x;
    s.basket.x = Math.max(40, Math.min(W-40, s.basket.x));
    s.timer += dt;
    if(s.timer >= s.spawnRate){
      s.timer = 0;
      var r = Math.random();
      var type = r < 0.15 ? 'bomb' : r < 0.25 ? 'gold' : 'normal';
      s.orbs.push({ x:50+Math.random()*(W-100), y:0, type:type, vy:100+s.speed*80 });
    }
    for(var i=s.orbs.length-1;i>=0;i--){
      var o = s.orbs[i]; o.y += o.vy * dt;
      if(o.y > H){ s.orbs.splice(i,1); continue; }
      if(o.y > s.basket.y-10 && Math.abs(o.x - s.basket.x) < s.basket.w/2){
        if(o.type === 'bomb'){ s.lives--; if(s.lives<=0) s.over = true; }
        else { s.score += o.type === 'gold' ? 30 : 10; }
        s.orbs.splice(i,1);
      }
    }
    s.statusText = 'Score: ' + s.score + ' | Lives: ' + s.lives;
  };

  ocDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.orbs.length;i++){
      var o = s.orbs[i];
      ctx.fillStyle = o.type==='bomb'?'#ff5a5a':o.type==='gold'?'#e0a458':'#5fd4c7';
      ctx.beginPath(); ctx.arc(o.x, o.y, 12, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#b070ff';
    ctx.beginPath(); ctx.moveTo(s.basket.x-s.basket.w/2, s.basket.y); ctx.lineTo(s.basket.x+s.basket.w/2, s.basket.y); ctx.lineTo(s.basket.x+s.basket.w/2-10, s.basket.y+20); ctx.lineTo(s.basket.x-s.basket.w/2+10, s.basket.y+20); ctx.closePath(); ctx.fill();
  };

  ocRenderTile();
})();


/* ---- Arcade cabinet #23: BLADE SLICE ---- */
(function(){
  var bs2Slot = document.getElementById('bs2-slot-23');
  if(!bs2Slot) return;
  var bs2Overlay = document.getElementById('ac-overlay');
  var bs2Raf = null;
  var bs2Keys = {};
  var bs2Mouse = { x:0, y:0, down:false };
  var bs2Paused = false;
  var bs2State = null;

  function bs2OnKeyDown(e){ bs2Keys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function bs2OnKeyUp(e){ bs2Keys[e.key.toLowerCase()] = false; }
  function bs2OnMouseMove(e){
    var canvas = document.getElementById('bs2-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    bs2Mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    bs2Mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function bs2OnMouseDown(){ bs2Mouse.down = true; }
  function bs2OnMouseUp(){ bs2Mouse.down = false; }

  function bs2RenderTile(){
    bs2Slot.innerHTML =
      '<div class="ac-bubble" id="bs2-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">BLADE SLICE</div>' +
          '<div class="ac-sub">action · slice fruit</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="12" cy="14" r="5" fill="#ff5a5a"/><circle cx="24" cy="22" r="5" fill="#e0a458"/><line x1="4" y1="30" x2="30" y2="10" stroke="#5fd4c7" stroke-width="2" opacity="0.6"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Fruit flies across the screen. Swipe to slice it! Avoid the bombs. Chain multiple slices for combo bonuses!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('bs2-bubble-btn').addEventListener('click', bs2Open, { once:true });
  }

  function bs2RequestFullscreen(){
    var el = bs2Overlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function bs2ExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function bs2Open(){
    bs2Overlay.classList.add('on');
    bs2RequestFullscreen();
    bs2ShowLoading();
    setTimeout(bs2ShowModeSelect, 400);
  }
  function bs2ShowLoading(){
    bs2Overlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING BLADE SLICE&hellip;</div></div>';
  }
  function bs2ShowModeSelect(){
    bs2Overlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="bs2-mode-close">&times;</span>' +
        '<h2>BLADE SLICE</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow fruit</strong><span>Fewer bombs</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast fruit</strong><span>More bombs</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Move mouse to slice. Click and drag across fruit to slice them!</p>' +
      '</div>';
    document.getElementById('bs2-mode-close').addEventListener('click', bs2Close);
    var btns = bs2Overlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ bs2Boot(this.getAttribute('data-mode')); });
    }
  }
  function bs2Boot(mode){
    wbTrackGamePlayed('bladeSlice');
    bs2Overlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="bs2-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="bs2-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>BLADE SLICE</b> &middot; action · slice fruit</div>' +
        '<div class="ac-canvas-wrap"><canvas id="bs2-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="bs2-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="bs2-pause-overlay"><h3>Paused</h3><button id="bs2-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('bs2-close-btn').addEventListener('click', bs2Close);
    var pauseBtn = document.getElementById('bs2-pause-btn');
    var pauseOv = document.getElementById('bs2-pause-overlay');
    var resumeBtn = document.getElementById('bs2-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ bs2Paused = !bs2Paused; if(pauseOv) pauseOv.classList.toggle('on', bs2Paused); if(pauseBtn) pauseBtn.innerHTML = bs2Paused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ bs2Paused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    bs2StartGame(mode);
  }
  function bs2Close(){
    if(bs2Raf) cancelAnimationFrame(bs2Raf);
    bs2Raf = null;
    bs2Paused = false;
    bs2State = null;
    window.removeEventListener('keydown', bs2OnKeyDown);
    window.removeEventListener('keyup', bs2OnKeyUp);
    window.removeEventListener('mousemove', bs2OnMouseMove);
    window.removeEventListener('mousedown', bs2OnMouseDown);
    window.removeEventListener('mouseup', bs2OnMouseUp);
    bs2Keys = {};
    bs2Mouse = { x:0, y:0, down:false };
    bs2ExitFullscreen();
    bs2Overlay.classList.remove('on');
    bs2Overlay.innerHTML = '';
    bs2RenderTile();
  }

  function bs2StartGame(mode){
    var canvas = document.getElementById('bs2-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', bs2OnMouseMove);
    window.addEventListener('mousedown', bs2OnMouseDown);
    window.addEventListener('mouseup', bs2OnMouseUp);
    window.addEventListener('keydown', bs2OnKeyDown);
    window.addEventListener('keyup', bs2OnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('bs2-status');
    var over = false;
    var score = 0;

    // Initialize game state
    bs2State = bs2InitState(mode, W, H);
    bs2State.mode = mode;
    bs2State.W = W;
    bs2State.H = H;
    bs2State.score = 0;
    bs2State.over = false;
    bs2State.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      bs2Mouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      bs2Mouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      bs2Mouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      bs2Mouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      bs2Mouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ bs2Mouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!bs2State.over && !bs2Paused){
        bs2State.time += dt;
        bs2Update(bs2State, dt, bs2Keys, bs2Mouse);
        score = bs2State.score;
        if(bs2State.over){
          wbRecordGameScore('bladeSlice', mode, score);
          wbRecordFightResult('bladeSlice', 'loss', false);
        }
        if(statusEl){
          if(bs2State.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(bs2State.statusText) statusEl.textContent = bs2State.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      bs2Draw(ctx, W, H, bs2State);

      if(bs2State.over){
        canvas.addEventListener('click', function(){ bs2Boot(mode); }, { once:true });
      }

      bs2Raf = requestAnimationFrame(loop);
    }
    bs2Raf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  bs2InitState = function(mode, W, H){
    return bs2GameInit(mode, W, H);
  };

  bs2GameInit = function(mode, W, H){
    var speed = mode==='hard'?1.5:mode==='easy'?0.7:1.0;
    return { fruits:[], timer:0, spawnRate: mode==='hard'?0.8:mode==='easy'?1.5:1.1, speed:speed, score:0, lives:3, trail:[] };
  };

  bs2Update = function(s, dt, keys, mouse){
    s.trail.push({ x:mouse.x, y:mouse.y, life:0.3 });
    for(var i=s.trail.length-1;i>=0;i--){ s.trail[i].life -= dt; if(s.trail[i].life <= 0) s.trail.splice(i,1); }
    s.timer += dt;
    if(s.timer >= s.spawnRate){
      s.timer = 0;
      var r = Math.random();
      var type = r < 0.2 ? 'bomb' : 'fruit';
      var colors = ['#ff5a5a','#e0a458','#5fd4c7','#b070ff','#5a8aff'];
      s.fruits.push({ x:50+Math.random()*(W-100), y:H+20, vx:(Math.random()-0.5)*100, vy:-(400+s.speed*200), type:type, color: colors[Math.floor(Math.random()*colors.length)], sliced:false, r:20 });
    }
    for(var i=s.fruits.length-1;i>=0;i--){
      var f = s.fruits[i];
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 500 * dt;
      if(f.y > H+50){ s.fruits.splice(i,1); if(!f.sliced && f.type==='fruit') s.lives--; if(s.lives<=0) s.over=true; continue; }
      if(!f.sliced && mouse.down){
        if(Math.hypot(mouse.x-f.x, mouse.y-f.y) < f.r+10){
          if(f.type === 'bomb'){ s.over = true; }
          else { f.sliced = true; s.score += 10; }
        }
      }
    }
    s.statusText = 'Score: ' + s.score + ' | Lives: ' + s.lives;
  };

  bs2Draw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    // Trail
    for(var i=0;i<s.trail.length;i++){
      ctx.fillStyle = 'rgba(95,212,199,'+s.trail[i].life+')'; ctx.beginPath(); ctx.arc(s.trail[i].x, s.trail[i].y, 4, 0, Math.PI*2); ctx.fill();
    }
    for(var i=0;i<s.fruits.length;i++){
      var f = s.fruits[i];
      if(f.sliced) continue;
      ctx.fillStyle = f.type==='bomb' ? '#1a1a1a' : f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
      if(f.type === 'bomb'){ ctx.fillStyle = '#ff5a5a'; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText('\u2620', f.x, f.y+6); }
    }
  };

  bs2RenderTile();
})();


/* ---- Arcade cabinet #24: GRAVITY FLIP ---- */
(function(){
  var gfSlot = document.getElementById('gf-slot-24');
  if(!gfSlot) return;
  var gfOverlay = document.getElementById('ac-overlay');
  var gfRaf = null;
  var gfKeys = {};
  var gfMouse = { x:0, y:0, down:false };
  var gfPaused = false;
  var gfState = null;

  function gfOnKeyDown(e){ gfKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function gfOnKeyUp(e){ gfKeys[e.key.toLowerCase()] = false; }
  function gfOnMouseMove(e){
    var canvas = document.getElementById('gf-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    gfMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    gfMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function gfOnMouseDown(){ gfMouse.down = true; }
  function gfOnMouseUp(){ gfMouse.down = false; }

  function gfRenderTile(){
    gfSlot.innerHTML =
      '<div class="ac-bubble" id="gf-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">GRAVITY FLIP</div>' +
          '<div class="ac-sub">action · flip gravity</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="0" y="0" width="34" height="4" fill="#3a3e48"/><rect x="0" y="40" width="34" height="4" fill="#3a3e48"/><circle cx="10" cy="8" r="3" fill="#5fd4c7"/><polygon points="20,36 24,32 28,36" fill="#ff5a5a"/><polygon points="6,4 10,8 14,4" fill="#e0a458"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Flip gravity to navigate a corridor of obstacles. Tap to flip between floor and ceiling. Time your flips to dodge spikes and gaps!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('gf-bubble-btn').addEventListener('click', gfOpen, { once:true });
  }

  function gfRequestFullscreen(){
    var el = gfOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function gfExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function gfOpen(){
    gfOverlay.classList.add('on');
    gfRequestFullscreen();
    gfShowLoading();
    setTimeout(gfShowModeSelect, 400);
  }
  function gfShowLoading(){
    gfOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING GRAVITY FLIP&hellip;</div></div>';
  }
  function gfShowModeSelect(){
    gfOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="gf-mode-close">&times;</span>' +
        '<h2>GRAVITY FLIP</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow scroll</strong><span>Big gaps</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast scroll</strong><span>Tight timing</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: SPACE or click to flip gravity. Avoid obstacles on both floor and ceiling!</p>' +
      '</div>';
    document.getElementById('gf-mode-close').addEventListener('click', gfClose);
    var btns = gfOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ gfBoot(this.getAttribute('data-mode')); });
    }
  }
  function gfBoot(mode){
    wbTrackGamePlayed('gravityFlip');
    gfOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="gf-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="gf-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>GRAVITY FLIP</b> &middot; action · flip gravity</div>' +
        '<div class="ac-canvas-wrap"><canvas id="gf-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="gf-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="gf-pause-overlay"><h3>Paused</h3><button id="gf-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('gf-close-btn').addEventListener('click', gfClose);
    var pauseBtn = document.getElementById('gf-pause-btn');
    var pauseOv = document.getElementById('gf-pause-overlay');
    var resumeBtn = document.getElementById('gf-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ gfPaused = !gfPaused; if(pauseOv) pauseOv.classList.toggle('on', gfPaused); if(pauseBtn) pauseBtn.innerHTML = gfPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ gfPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    gfStartGame(mode);
  }
  function gfClose(){
    if(gfRaf) cancelAnimationFrame(gfRaf);
    gfRaf = null;
    gfPaused = false;
    gfState = null;
    window.removeEventListener('keydown', gfOnKeyDown);
    window.removeEventListener('keyup', gfOnKeyUp);
    window.removeEventListener('mousemove', gfOnMouseMove);
    window.removeEventListener('mousedown', gfOnMouseDown);
    window.removeEventListener('mouseup', gfOnMouseUp);
    gfKeys = {};
    gfMouse = { x:0, y:0, down:false };
    gfExitFullscreen();
    gfOverlay.classList.remove('on');
    gfOverlay.innerHTML = '';
    gfRenderTile();
  }

  function gfStartGame(mode){
    var canvas = document.getElementById('gf-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', gfOnMouseMove);
    window.addEventListener('mousedown', gfOnMouseDown);
    window.addEventListener('mouseup', gfOnMouseUp);
    window.addEventListener('keydown', gfOnKeyDown);
    window.addEventListener('keyup', gfOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('gf-status');
    var over = false;
    var score = 0;

    // Initialize game state
    gfState = gfInitState(mode, W, H);
    gfState.mode = mode;
    gfState.W = W;
    gfState.H = H;
    gfState.score = 0;
    gfState.over = false;
    gfState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      gfMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      gfMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      gfMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      gfMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      gfMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ gfMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!gfState.over && !gfPaused){
        gfState.time += dt;
        gfUpdate(gfState, dt, gfKeys, gfMouse);
        score = gfState.score;
        if(gfState.over){
          wbRecordGameScore('gravityFlip', mode, score);
          wbRecordFightResult('gravityFlip', 'loss', false);
        }
        if(statusEl){
          if(gfState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(gfState.statusText) statusEl.textContent = gfState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      gfDraw(ctx, W, H, gfState);

      if(gfState.over){
        canvas.addEventListener('click', function(){ gfBoot(mode); }, { once:true });
      }

      gfRaf = requestAnimationFrame(loop);
    }
    gfRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  gfInitState = function(mode, W, H){
    return gfGameInit(mode, W, H);
  };

  gfGameInit = function(mode, W, H){
    var speed = mode==='hard'?2.5:mode==='easy'?1.0:1.7;
    return { player:{ x:100, y:H-40, vy:0, gravity:1 }, obstacles:[], timer:0, spawnRate: mode==='hard'?1.0:mode==='easy'?2.0:1.5, speed:speed, score:0, scroll:0 };
  };

  gfUpdate = function(s, dt, keys, mouse){
    s.score += Math.floor(dt * 10 * s.speed);
    s.scroll += s.speed * 60 * dt;
    if(keys[' ']||mouse.down){ s.player.gravity *= -1; s.player.vy = 0; keys[' '] = false; mouse.down = false; }
    s.player.vy += s.player.gravity * 800 * dt;
    s.player.y += s.player.vy * dt;
    if(s.player.y > H-30){ s.player.y = H-30; s.player.vy = 0; }
    if(s.player.y < 10){ s.player.y = 10; s.player.vy = 0; }
    s.timer += dt;
    if(s.timer >= s.spawnRate){
      s.timer = 0;
      var onCeiling = Math.random() > 0.5;
      s.obstacles.push({ x:W+20, y: onCeiling ? 10 : H-40, w:20, h:30, onCeiling:onCeiling });
    }
    for(var i=s.obstacles.length-1;i>=0;i--){
      s.obstacles[i].x -= s.speed * 80 * dt;
      if(s.obstacles[i].x < -30){ s.obstacles.splice(i,1); s.score += 10; continue; }
      var o = s.obstacles[i];
      if(s.player.x > o.x-15 && s.player.x < o.x+o.w+15 && s.player.y > o.y-15 && s.player.y < o.y+o.h+15){ s.over = true; }
    }
    s.statusText = 'Score: ' + s.score;
  };

  gfDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#1a1a2a'; ctx.fillRect(0,0,W,6); ctx.fillRect(0,H-6,W,6);
    for(var i=0;i<s.obstacles.length;i++){ var o = s.obstacles[i]; ctx.fillStyle = '#ff5a5a'; ctx.fillRect(o.x, o.y, o.w, o.h); }
    ctx.fillStyle = '#5fd4c7'; ctx.fillRect(s.player.x, s.player.y, 20, 20);
  };

  gfRenderTile();
})();


/* ---- Arcade cabinet #25: BULLET STORM ---- */
(function(){
  var btSlot = document.getElementById('bt-slot-25');
  if(!btSlot) return;
  var btOverlay = document.getElementById('ac-overlay');
  var btRaf = null;
  var btKeys = {};
  var btMouse = { x:0, y:0, down:false };
  var btPaused = false;
  var btState = null;

  function btOnKeyDown(e){ btKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function btOnKeyUp(e){ btKeys[e.key.toLowerCase()] = false; }
  function btOnMouseMove(e){
    var canvas = document.getElementById('bt-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    btMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    btMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function btOnMouseDown(){ btMouse.down = true; }
  function btOnMouseUp(){ btMouse.down = false; }

  function btRenderTile(){
    btSlot.innerHTML =
      '<div class="ac-bubble" id="bt-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">BULLET STORM</div>' +
          '<div class="ac-sub">action · dodge bullets</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="17" cy="22" r="4" fill="#5fd4c7"/><circle cx="4" cy="8" r="2" fill="#ff5a5a"/><circle cx="30" cy="10" r="2" fill="#ff5a5a"/><circle cx="6" cy="36" r="2" fill="#ff5a5a"/><circle cx="28" cy="34" r="2" fill="#ff5a5a"/><line x1="4" y1="8" x2="17" y2="22" stroke="#ff5a5a" stroke-width="0.5" opacity="0.4"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Bullets fire from all sides of the screen. Move your dot to dodge them all. Survive as long as possible for a high score!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('bt-bubble-btn').addEventListener('click', btOpen, { once:true });
  }

  function btRequestFullscreen(){
    var el = btOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function btExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function btOpen(){
    btOverlay.classList.add('on');
    btRequestFullscreen();
    btShowLoading();
    setTimeout(btShowModeSelect, 400);
  }
  function btShowLoading(){
    btOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING BULLET STORM&hellip;</div></div>';
  }
  function btShowModeSelect(){
    btOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="bt-mode-close">&times;</span>' +
        '<h2>BULLET STORM</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Sparse bullets</strong><span>Slow fire</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal density</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Dense bullets</strong><span>Fast fire</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Mouse or WASD to move your dot. Dodge all bullets!</p>' +
      '</div>';
    document.getElementById('bt-mode-close').addEventListener('click', btClose);
    var btns = btOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ btBoot(this.getAttribute('data-mode')); });
    }
  }
  function btBoot(mode){
    wbTrackGamePlayed('bulletStorm');
    btOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="bt-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="bt-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>BULLET STORM</b> &middot; action · dodge bullets</div>' +
        '<div class="ac-canvas-wrap"><canvas id="bt-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="bt-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="bt-pause-overlay"><h3>Paused</h3><button id="bt-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('bt-close-btn').addEventListener('click', btClose);
    var pauseBtn = document.getElementById('bt-pause-btn');
    var pauseOv = document.getElementById('bt-pause-overlay');
    var resumeBtn = document.getElementById('bt-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ btPaused = !btPaused; if(pauseOv) pauseOv.classList.toggle('on', btPaused); if(pauseBtn) pauseBtn.innerHTML = btPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ btPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    btStartGame(mode);
  }
  function btClose(){
    if(btRaf) cancelAnimationFrame(btRaf);
    btRaf = null;
    btPaused = false;
    btState = null;
    window.removeEventListener('keydown', btOnKeyDown);
    window.removeEventListener('keyup', btOnKeyUp);
    window.removeEventListener('mousemove', btOnMouseMove);
    window.removeEventListener('mousedown', btOnMouseDown);
    window.removeEventListener('mouseup', btOnMouseUp);
    btKeys = {};
    btMouse = { x:0, y:0, down:false };
    btExitFullscreen();
    btOverlay.classList.remove('on');
    btOverlay.innerHTML = '';
    btRenderTile();
  }

  function btStartGame(mode){
    var canvas = document.getElementById('bt-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', btOnMouseMove);
    window.addEventListener('mousedown', btOnMouseDown);
    window.addEventListener('mouseup', btOnMouseUp);
    window.addEventListener('keydown', btOnKeyDown);
    window.addEventListener('keyup', btOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('bt-status');
    var over = false;
    var score = 0;

    // Initialize game state
    btState = btInitState(mode, W, H);
    btState.mode = mode;
    btState.W = W;
    btState.H = H;
    btState.score = 0;
    btState.over = false;
    btState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      btMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      btMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      btMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      btMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      btMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ btMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!btState.over && !btPaused){
        btState.time += dt;
        btUpdate(btState, dt, btKeys, btMouse);
        score = btState.score;
        if(btState.over){
          wbRecordGameScore('bulletStorm', mode, score);
          wbRecordFightResult('bulletStorm', 'loss', false);
        }
        if(statusEl){
          if(btState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(btState.statusText) statusEl.textContent = btState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      btDraw(ctx, W, H, btState);

      if(btState.over){
        canvas.addEventListener('click', function(){ btBoot(mode); }, { once:true });
      }

      btRaf = requestAnimationFrame(loop);
    }
    btRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  btInitState = function(mode, W, H){
    return btGameInit(mode, W, H);
  };

  btGameInit = function(mode, W, H){
    var speed = mode==='hard'?1.5:mode==='easy'?0.6:1.0;
    return { player:{ x:W/2, y:H/2, r:10 }, bullets:[], timer:0, spawnRate: mode==='hard'?0.3:mode==='easy'?0.8:0.5, speed:speed, survival:0 };
  };

  btUpdate = function(s, dt, keys, mouse){
    s.survival += dt; s.score = Math.floor(s.survival * 10);
    var sp = 250;
    if(keys['w']||keys['arrowup']) s.player.y -= sp*dt;
    if(keys['s']||keys['arrowdown']) s.player.y += sp*dt;
    if(keys['a']||keys['arrowleft']) s.player.x -= sp*dt;
    if(keys['d']||keys['arrowright']) s.player.x += sp*dt;
    if(mouse.x > 0 && mouse.y > 0){ s.player.x = mouse.x; s.player.y = mouse.y; }
    s.player.x = Math.max(s.player.r, Math.min(W-s.player.r, s.player.x));
    s.player.y = Math.max(s.player.r, Math.min(H-s.player.r, s.player.y));
    s.timer += dt;
    if(s.timer >= s.spawnRate){
      s.timer = 0;
      var side = Math.floor(Math.random()*4);
      var bx, by, vx, vy;
      var bs = 150 + s.speed*100;
      if(side===0){ bx=0; by=Math.random()*H; vx=bs; vy=0; }
      else if(side===1){ bx=W; by=Math.random()*H; vx=-bs; vy=0; }
      else if(side===2){ bx=Math.random()*W; by=0; vx=0; vy=bs; }
      else { bx=Math.random()*W; by=H; vx=0; vy=-bs; }
      s.bullets.push({ x:bx, y:by, vx:vx, vy:vy, r:5 });
    }
    for(var i=s.bullets.length-1;i>=0;i--){
      var b = s.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt;
      if(b.x < -20 || b.x > W+20 || b.y < -20 || b.y > H+20){ s.bullets.splice(i,1); continue; }
      if(Math.hypot(b.x-s.player.x, b.y-s.player.y) < b.r + s.player.r){ s.over = true; }
    }
    s.statusText = 'Score: ' + s.score + ' | Dodge the bullets!';
  };

  btDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.bullets.length;i++){ ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(s.bullets[i].x, s.bullets[i].y, s.bullets[i].r, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = '#5fd4c7'; ctx.beginPath(); ctx.arc(s.player.x, s.player.y, s.player.r, 0, Math.PI*2); ctx.fill();
  };

  btRenderTile();
})();


/* ---- Arcade cabinet #26: PLATFORM JUMPER ---- */
(function(){
  var pjSlot = document.getElementById('pj-slot-26');
  if(!pjSlot) return;
  var pjOverlay = document.getElementById('ac-overlay');
  var pjRaf = null;
  var pjKeys = {};
  var pjMouse = { x:0, y:0, down:false };
  var pjPaused = false;
  var pjState = null;

  function pjOnKeyDown(e){ pjKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function pjOnKeyUp(e){ pjKeys[e.key.toLowerCase()] = false; }
  function pjOnMouseMove(e){
    var canvas = document.getElementById('pj-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    pjMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    pjMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function pjOnMouseDown(){ pjMouse.down = true; }
  function pjOnMouseUp(){ pjMouse.down = false; }

  function pjRenderTile(){
    pjSlot.innerHTML =
      '<div class="ac-bubble" id="pj-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">PLATFORM JUMPER</div>' +
          '<div class="ac-sub">action · jump platforms</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="2" y="36" width="12" height="4" rx="1" fill="#5fd4c7"/><rect x="18" y="28" width="12" height="4" rx="1" fill="#e0a458"/><rect x="4" y="18" width="12" height="4" rx="1" fill="#b070ff"/><circle cx="10" cy="30" r="3" fill="#ff5a5a"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Jump across moving platforms to climb as high as possible. Miss a platform and you fall! Time your jumps carefully.</div>' +
        '</div>' +
      '</div>';
    document.getElementById('pj-bubble-btn').addEventListener('click', pjOpen, { once:true });
  }

  function pjRequestFullscreen(){
    var el = pjOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function pjExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function pjOpen(){
    pjOverlay.classList.add('on');
    pjRequestFullscreen();
    pjShowLoading();
    setTimeout(pjShowModeSelect, 400);
  }
  function pjShowLoading(){
    pjOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING PLATFORM JUMPER&hellip;</div></div>';
  }
  function pjShowModeSelect(){
    pjOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="pj-mode-close">&times;</span>' +
        '<h2>PLATFORM JUMPER</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow platforms</strong><span>Wide and slow</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast platforms</strong><span>Narrow and fast</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: A/D to move, SPACE to jump. Land on platforms to climb!</p>' +
      '</div>';
    document.getElementById('pj-mode-close').addEventListener('click', pjClose);
    var btns = pjOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ pjBoot(this.getAttribute('data-mode')); });
    }
  }
  function pjBoot(mode){
    wbTrackGamePlayed('platformJumper');
    pjOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="pj-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="pj-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>PLATFORM JUMPER</b> &middot; action · jump platforms</div>' +
        '<div class="ac-canvas-wrap"><canvas id="pj-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="pj-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="pj-pause-overlay"><h3>Paused</h3><button id="pj-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('pj-close-btn').addEventListener('click', pjClose);
    var pauseBtn = document.getElementById('pj-pause-btn');
    var pauseOv = document.getElementById('pj-pause-overlay');
    var resumeBtn = document.getElementById('pj-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ pjPaused = !pjPaused; if(pauseOv) pauseOv.classList.toggle('on', pjPaused); if(pauseBtn) pauseBtn.innerHTML = pjPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ pjPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    pjStartGame(mode);
  }
  function pjClose(){
    if(pjRaf) cancelAnimationFrame(pjRaf);
    pjRaf = null;
    pjPaused = false;
    pjState = null;
    window.removeEventListener('keydown', pjOnKeyDown);
    window.removeEventListener('keyup', pjOnKeyUp);
    window.removeEventListener('mousemove', pjOnMouseMove);
    window.removeEventListener('mousedown', pjOnMouseDown);
    window.removeEventListener('mouseup', pjOnMouseUp);
    pjKeys = {};
    pjMouse = { x:0, y:0, down:false };
    pjExitFullscreen();
    pjOverlay.classList.remove('on');
    pjOverlay.innerHTML = '';
    pjRenderTile();
  }

  function pjStartGame(mode){
    var canvas = document.getElementById('pj-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', pjOnMouseMove);
    window.addEventListener('mousedown', pjOnMouseDown);
    window.addEventListener('mouseup', pjOnMouseUp);
    window.addEventListener('keydown', pjOnKeyDown);
    window.addEventListener('keyup', pjOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('pj-status');
    var over = false;
    var score = 0;

    // Initialize game state
    pjState = pjInitState(mode, W, H);
    pjState.mode = mode;
    pjState.W = W;
    pjState.H = H;
    pjState.score = 0;
    pjState.over = false;
    pjState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      pjMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      pjMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      pjMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      pjMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      pjMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ pjMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!pjState.over && !pjPaused){
        pjState.time += dt;
        pjUpdate(pjState, dt, pjKeys, pjMouse);
        score = pjState.score;
        if(pjState.over){
          wbRecordGameScore('platformJumper', mode, score);
          wbRecordFightResult('platformJumper', 'loss', false);
        }
        if(statusEl){
          if(pjState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(pjState.statusText) statusEl.textContent = pjState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      pjDraw(ctx, W, H, pjState);

      if(pjState.over){
        canvas.addEventListener('click', function(){ pjBoot(mode); }, { once:true });
      }

      pjRaf = requestAnimationFrame(loop);
    }
    pjRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  pjInitState = function(mode, W, H){
    return pjGameInit(mode, W, H);
  };

  pjGameInit = function(mode, W, H){
    var speed = mode==='hard'?2.5:mode==='easy'?1.0:1.7;
    var plats = [];
    for(var i=0;i<6;i++) plats.push({ x:Math.random()*W, y:H-100-i*70, w:80+Math.random()*40, vx:(Math.random()-0.5)*speed*40 });
    return { player:{ x:W/2, y:H-50, vy:0, onGround:false }, platforms:plats, speed:speed, score:0, maxJump:-500 };
  };

  pjUpdate = function(s, dt, keys, mouse){
    s.player.vy += 600 * dt;
    s.player.y += s.player.vy * dt;
    var sp = 250;
    if(keys['a']||keys['arrowleft']) s.player.x -= sp*dt;
    if(keys['d']||keys['arrowright']) s.player.x += sp*dt;
    if(keys[' ']&&s.player.onGround){ s.player.vy = s.maxJump; s.player.onGround = false; keys[' '] = false; }
    s.player.x = Math.max(15, Math.min(W-15, s.player.x));
    for(var i=0;i<s.platforms.length;i++){
      var pl = s.platforms[i];
      pl.x += pl.vx * dt;
      if(pl.x < 0 || pl.x+pl.w > W) pl.vx *= -1;
      if(s.player.vy > 0 && s.player.x > pl.x && s.player.x < pl.x+pl.w && s.player.y > pl.y-5 && s.player.y < pl.y+15){ s.player.y = pl.y; s.player.vy = 0; s.player.onGround = true; }
    }
    if(s.player.y > H){ s.over = true; }
    s.score = Math.floor((H - s.player.y) * 0.5);
    s.statusText = 'Score: ' + s.score;
  };

  pjDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.platforms.length;i++){ var pl = s.platforms[i]; ctx.fillStyle = '#5fd4c7'; ctx.fillRect(pl.x, pl.y, pl.w, 8); }
    ctx.fillStyle = '#e0a458'; ctx.fillRect(s.player.x-10, s.player.y-20, 20, 20);
  };

  pjRenderTile();
})();


/* ---- Arcade cabinet #27: PIXEL RUNNER ---- */
(function(){
  var prSlot = document.getElementById('pr-slot-27');
  if(!prSlot) return;
  var prOverlay = document.getElementById('ac-overlay');
  var prRaf = null;
  var prKeys = {};
  var prMouse = { x:0, y:0, down:false };
  var prPaused = false;
  var prState = null;

  function prOnKeyDown(e){ prKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function prOnKeyUp(e){ prKeys[e.key.toLowerCase()] = false; }
  function prOnMouseMove(e){
    var canvas = document.getElementById('pr-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    prMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    prMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function prOnMouseDown(){ prMouse.down = true; }
  function prOnMouseUp(){ prMouse.down = false; }

  function prRenderTile(){
    prSlot.innerHTML =
      '<div class="ac-bubble" id="pr-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">PIXEL RUNNER</div>' +
          '<div class="ac-sub">action · run and dodge</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><rect x="0" y="36" width="34" height="8" fill="#3a3a2a"/><rect x="8" y="28" width="6" height="8" fill="#ff5a5a"/><rect x="20" y="20" width="6" height="16" fill="#e0a458"/><rect x="14" y="30" width="4" height="6" fill="#5fd4c7"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Run forward and dodge obstacles by jumping or ducking. Obstacles come faster as you go. How far can you run?</div>' +
        '</div>' +
      '</div>';
    document.getElementById('pr-bubble-btn').addEventListener('click', prOpen, { once:true });
  }

  function prRequestFullscreen(){
    var el = prOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function prExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function prOpen(){
    prOverlay.classList.add('on');
    prRequestFullscreen();
    prShowLoading();
    setTimeout(prShowModeSelect, 400);
  }
  function prShowLoading(){
    prOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING PIXEL RUNNER&hellip;</div></div>';
  }
  function prShowModeSelect(){
    prOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="pr-mode-close">&times;</span>' +
        '<h2>PIXEL RUNNER</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow run</strong><span>Sparse obstacles</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast run</strong><span>Dense obstacles</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: SPACE to jump, S to duck. Dodge the obstacles!</p>' +
      '</div>';
    document.getElementById('pr-mode-close').addEventListener('click', prClose);
    var btns = prOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ prBoot(this.getAttribute('data-mode')); });
    }
  }
  function prBoot(mode){
    wbTrackGamePlayed('pixelRunner');
    prOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="pr-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="pr-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>PIXEL RUNNER</b> &middot; action · run and dodge</div>' +
        '<div class="ac-canvas-wrap"><canvas id="pr-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="pr-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="pr-pause-overlay"><h3>Paused</h3><button id="pr-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('pr-close-btn').addEventListener('click', prClose);
    var pauseBtn = document.getElementById('pr-pause-btn');
    var pauseOv = document.getElementById('pr-pause-overlay');
    var resumeBtn = document.getElementById('pr-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ prPaused = !prPaused; if(pauseOv) pauseOv.classList.toggle('on', prPaused); if(pauseBtn) pauseBtn.innerHTML = prPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ prPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    prStartGame(mode);
  }
  function prClose(){
    if(prRaf) cancelAnimationFrame(prRaf);
    prRaf = null;
    prPaused = false;
    prState = null;
    window.removeEventListener('keydown', prOnKeyDown);
    window.removeEventListener('keyup', prOnKeyUp);
    window.removeEventListener('mousemove', prOnMouseMove);
    window.removeEventListener('mousedown', prOnMouseDown);
    window.removeEventListener('mouseup', prOnMouseUp);
    prKeys = {};
    prMouse = { x:0, y:0, down:false };
    prExitFullscreen();
    prOverlay.classList.remove('on');
    prOverlay.innerHTML = '';
    prRenderTile();
  }

  function prStartGame(mode){
    var canvas = document.getElementById('pr-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', prOnMouseMove);
    window.addEventListener('mousedown', prOnMouseDown);
    window.addEventListener('mouseup', prOnMouseUp);
    window.addEventListener('keydown', prOnKeyDown);
    window.addEventListener('keyup', prOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('pr-status');
    var over = false;
    var score = 0;

    // Initialize game state
    prState = prInitState(mode, W, H);
    prState.mode = mode;
    prState.W = W;
    prState.H = H;
    prState.score = 0;
    prState.over = false;
    prState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      prMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      prMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      prMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      prMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      prMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ prMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!prState.over && !prPaused){
        prState.time += dt;
        prUpdate(prState, dt, prKeys, prMouse);
        score = prState.score;
        if(prState.over){
          wbRecordGameScore('pixelRunner', mode, score);
          wbRecordFightResult('pixelRunner', 'loss', false);
        }
        if(statusEl){
          if(prState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(prState.statusText) statusEl.textContent = prState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      prDraw(ctx, W, H, prState);

      if(prState.over){
        canvas.addEventListener('click', function(){ prBoot(mode); }, { once:true });
      }

      prRaf = requestAnimationFrame(loop);
    }
    prRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  prInitState = function(mode, W, H){
    return prGameInit(mode, W, H);
  };

  prGameInit = function(mode, W, H){
    var speed = mode==='hard'?3:mode==='easy'?1.2:2.0;
    return { player:{ x:100, y:H-60, vy:0, onGround:true, ducking:false }, obstacles:[], timer:0, spawnRate: mode==='hard'?1.0:mode==='easy'?2.0:1.5, speed:speed, score:0, scroll:0 };
  };

  prUpdate = function(s, dt, keys, mouse){
    s.score += Math.floor(dt * 10 * s.speed);
    if(keys[' ']&&s.player.onGround){ s.player.vy = -500; s.player.onGround = false; keys[' '] = false; }
    if(keys['s']) s.player.ducking = true; else s.player.ducking = false;
    s.player.vy += 800 * dt; s.player.y += s.player.vy * dt;
    if(s.player.y >= H-60){ s.player.y = H-60; s.player.vy = 0; s.player.onGround = true; }
    s.timer += dt;
    if(s.timer >= s.spawnRate){
      s.timer = 0;
      var type = Math.random() > 0.5 ? 'low' : 'high';
      s.obstacles.push({ x:W+20, y: type==='low' ? H-50 : H-120, w:20, h: type==='low' ? 30 : 40, type:type });
    }
    for(var i=s.obstacles.length-1;i>=0;i--){
      s.obstacles[i].x -= s.speed * 100 * dt;
      if(s.obstacles[i].x < -30){ s.obstacles.splice(i,1); s.score += 10; continue; }
      var o = s.obstacles[i];
      var py = s.player.ducking ? s.player.y+15 : s.player.y-20;
      var ph = s.player.ducking ? 15 : 40;
      if(s.player.x > o.x-10 && s.player.x < o.x+o.w+10 && py < o.y+o.h && py+ph > o.y){ s.over = true; }
    }
    s.statusText = 'Score: ' + s.score;
  };

  prDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0,H-30,W,30);
    for(var i=0;i<s.obstacles.length;i++){ var o = s.obstacles[i]; ctx.fillStyle = '#ff5a5a'; ctx.fillRect(o.x, o.y, o.w, o.h); }
    ctx.fillStyle = '#5fd4c7';
    var py = s.player.ducking ? s.player.y : s.player.y-20;
    var ph = s.player.ducking ? 15 : 40;
    ctx.fillRect(s.player.x, py, 20, ph);
  };

  prRenderTile();
})();


/* ---- Arcade cabinet #28: CHAIN REACTOR ---- */
(function(){
  var crSlot = document.getElementById('cr-slot-28');
  if(!crSlot) return;
  var crOverlay = document.getElementById('ac-overlay');
  var crRaf = null;
  var crKeys = {};
  var crMouse = { x:0, y:0, down:false };
  var crPaused = false;
  var crState = null;

  function crOnKeyDown(e){ crKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function crOnKeyUp(e){ crKeys[e.key.toLowerCase()] = false; }
  function crOnMouseMove(e){
    var canvas = document.getElementById('cr-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    crMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    crMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function crOnMouseDown(){ crMouse.down = true; }
  function crOnMouseUp(){ crMouse.down = false; }

  function crRenderTile(){
    crSlot.innerHTML =
      '<div class="ac-bubble" id="cr-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">CHAIN REACTOR</div>' +
          '<div class="ac-sub">action · chain reactions</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><circle cx="10" cy="12" r="4" fill="#ff5a5a" opacity="0.7"/><circle cx="24" cy="16" r="4" fill="#e0a458" opacity="0.7"/><circle cx="17" cy="28" r="4" fill="#5fd4c7" opacity="0.7"/><line x1="10" y1="12" x2="24" y2="16" stroke="#fff" stroke-width="0.5" opacity="0.3"/><line x1="24" y1="16" x2="17" y2="28" stroke="#fff" stroke-width="0.5" opacity="0.3"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Click to detonate a node and trigger chain reactions. The more nodes caught in the chain, the higher the score. Plan your timing!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('cr-bubble-btn').addEventListener('click', crOpen, { once:true });
  }

  function crRequestFullscreen(){
    var el = crOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function crExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function crOpen(){
    crOverlay.classList.add('on');
    crRequestFullscreen();
    crShowLoading();
    setTimeout(crShowModeSelect, 400);
  }
  function crShowLoading(){
    crOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING CHAIN REACTOR&hellip;</div></div>';
  }
  function crShowModeSelect(){
    crOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="cr-mode-close">&times;</span>' +
        '<h2>CHAIN REACTOR</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow nodes</strong><span>Big explosion radius</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Balanced</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast nodes</strong><span>Small radius</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: Click a node to detonate it. Chain to nearby nodes for bonus points!</p>' +
      '</div>';
    document.getElementById('cr-mode-close').addEventListener('click', crClose);
    var btns = crOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ crBoot(this.getAttribute('data-mode')); });
    }
  }
  function crBoot(mode){
    wbTrackGamePlayed('chainReactor');
    crOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="cr-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="cr-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>CHAIN REACTOR</b> &middot; action · chain reactions</div>' +
        '<div class="ac-canvas-wrap"><canvas id="cr-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="cr-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="cr-pause-overlay"><h3>Paused</h3><button id="cr-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('cr-close-btn').addEventListener('click', crClose);
    var pauseBtn = document.getElementById('cr-pause-btn');
    var pauseOv = document.getElementById('cr-pause-overlay');
    var resumeBtn = document.getElementById('cr-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ crPaused = !crPaused; if(pauseOv) pauseOv.classList.toggle('on', crPaused); if(pauseBtn) pauseBtn.innerHTML = crPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ crPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    crStartGame(mode);
  }
  function crClose(){
    if(crRaf) cancelAnimationFrame(crRaf);
    crRaf = null;
    crPaused = false;
    crState = null;
    window.removeEventListener('keydown', crOnKeyDown);
    window.removeEventListener('keyup', crOnKeyUp);
    window.removeEventListener('mousemove', crOnMouseMove);
    window.removeEventListener('mousedown', crOnMouseDown);
    window.removeEventListener('mouseup', crOnMouseUp);
    crKeys = {};
    crMouse = { x:0, y:0, down:false };
    crExitFullscreen();
    crOverlay.classList.remove('on');
    crOverlay.innerHTML = '';
    crRenderTile();
  }

  function crStartGame(mode){
    var canvas = document.getElementById('cr-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', crOnMouseMove);
    window.addEventListener('mousedown', crOnMouseDown);
    window.addEventListener('mouseup', crOnMouseUp);
    window.addEventListener('keydown', crOnKeyDown);
    window.addEventListener('keyup', crOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('cr-status');
    var over = false;
    var score = 0;

    // Initialize game state
    crState = crInitState(mode, W, H);
    crState.mode = mode;
    crState.W = W;
    crState.H = H;
    crState.score = 0;
    crState.over = false;
    crState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      crMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      crMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      crMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      crMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      crMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ crMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!crState.over && !crPaused){
        crState.time += dt;
        crUpdate(crState, dt, crKeys, crMouse);
        score = crState.score;
        if(crState.over){
          wbRecordGameScore('chainReactor', mode, score);
          wbRecordFightResult('chainReactor', 'loss', false);
        }
        if(statusEl){
          if(crState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(crState.statusText) statusEl.textContent = crState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      crDraw(ctx, W, H, crState);

      if(crState.over){
        canvas.addEventListener('click', function(){ crBoot(mode); }, { once:true });
      }

      crRaf = requestAnimationFrame(loop);
    }
    crRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  crInitState = function(mode, W, H){
    return crGameInit(mode, W, H);
  };

  crGameInit = function(mode, W, H){
    var count = mode==='hard'?20:mode==='easy'?8:14;
    var radius = mode==='hard'?40:mode==='easy'?80:60;
    var nodes = [];
    for(var i=0;i<count;i++) nodes.push({ x:50+Math.random()*(W-100), y:50+Math.random()*(H-100), r:8, exploding:0, exploded:false });
    return { nodes:nodes, radius:radius, score:0, clicked:false, chainTimer:0, explosions:0 };
  };

  crUpdate = function(s, dt, keys, mouse){
    if(!s.clicked && mouse.down){
      for(var i=0;i<s.nodes.length;i++){
        var n = s.nodes[i];
        if(Math.hypot(mouse.x-n.x, mouse.y-n.y) < n.r+10){ n.exploding = 0.5; s.clicked = true; break; }
      }
    }
    var anyExploding = false;
    for(var i=0;i<s.nodes.length;i++){
      var n = s.nodes[i];
      if(n.exploding > 0){
        anyExploding = true;
        n.exploding -= dt;
        n.r = 8 + (0.5 - n.exploding) * 30;
        if(n.exploding <= 0 && !n.exploded){
          n.exploded = true; n.r = 8; s.explosions++; s.score += 20;
          // Chain to nearby
          for(var j=0;j<s.nodes.length;j++){
            if(j===i || s.nodes[j].exploded || s.nodes[j].exploding > 0) continue;
            if(Math.hypot(n.x-s.nodes[j].x, n.y-s.nodes[j].y) < s.radius){ s.nodes[j].exploding = 0.3; }
          }
        }
      }
    }
    if(s.clicked && !anyExploding && s.explosions > 0){ s.over = true; }
    s.statusText = 'Score: ' + s.score + ' | Chain: ' + s.explosions;
  };

  crDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.nodes.length;i++){
      var n = s.nodes[i];
      if(n.exploded) continue;
      ctx.fillStyle = n.exploding > 0 ? '#ff5a5a' : '#e0a458';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2); ctx.fill();
      if(n.exploding > 0){ ctx.fillStyle = 'rgba(255,90,90,0.3)'; ctx.beginPath(); ctx.arc(n.x, n.y, n.r+15, 0, Math.PI*2); ctx.fill(); }
    }
  };

  crRenderTile();
})();


/* ---- Arcade cabinet #29: ROCKET DASH ---- */
(function(){
  var rdSlot = document.getElementById('rd-slot-29');
  if(!rdSlot) return;
  var rdOverlay = document.getElementById('ac-overlay');
  var rdRaf = null;
  var rdKeys = {};
  var rdMouse = { x:0, y:0, down:false };
  var rdPaused = false;
  var rdState = null;

  function rdOnKeyDown(e){ rdKeys[e.key.toLowerCase()] = true; if(e.key === ' ') e.preventDefault(); }
  function rdOnKeyUp(e){ rdKeys[e.key.toLowerCase()] = false; }
  function rdOnMouseMove(e){
    var canvas = document.getElementById('rd-canvas');
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    rdMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    rdMouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function rdOnMouseDown(){ rdMouse.down = true; }
  function rdOnMouseUp(){ rdMouse.down = false; }

  function rdRenderTile(){
    rdSlot.innerHTML =
      '<div class="ac-bubble" id="rd-bubble-btn">' +
        '<div class="ac-glow"></div>' +
        '<div class="ac-bubble-inner">' +
          '<div class="ac-title">ROCKET DASH</div>' +
          '<div class="ac-sub">action · fly through gaps</div>' +
          '<div class="ac-vs"><svg viewBox="0 0 34 44"><polygon points="17,4 13,14 21,14" fill="#ff5a5a"/><rect x="13" y="14" width="8" height="16" fill="#5fd4c7"/><polygon points="13,30 9,36 13,36" fill="#e0a458"/><polygon points="21,30 25,36 21,36" fill="#e0a458"/><rect x="0" y="0" width="4" height="44" fill="#3a3e48"/><rect x="30" y="0" width="4" height="44" fill="#3a3e48"/></svg></div>' +
          '<div class="ac-tap">TAP TO LOAD</div>' +
          '<div class="ac-desc">Pilot a rocket through narrow gaps in walls. The walls scroll faster over time. One crash and its game over!</div>' +
        '</div>' +
      '</div>';
    document.getElementById('rd-bubble-btn').addEventListener('click', rdOpen, { once:true });
  }

  function rdRequestFullscreen(){
    var el = rdOverlay;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if(req){ try{ req.call(el); }catch(e){} }
  }
  function rdExitFullscreen(){
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if(document.fullscreenElement && exit){ try{ exit.call(document); }catch(e){} }
  }

  function rdOpen(){
    rdOverlay.classList.add('on');
    rdRequestFullscreen();
    rdShowLoading();
    setTimeout(rdShowModeSelect, 400);
  }
  function rdShowLoading(){
    rdOverlay.innerHTML = '<div class="ac-loading"><div class="ac-spinner"></div><div class="ac-loading-text">LOADING ROCKET DASH&hellip;</div></div>';
  }
  function rdShowModeSelect(){
    rdOverlay.innerHTML =
      '<div class="ac-mode">' +
        '<span class="ac-mode-close" id="rd-mode-close">&times;</span>' +
        '<h2>ROCKET DASH</h2>' +
        '<div class="ac-mode-options">' +
          '<button class="ac-mode-btn" data-mode="easy"><strong>Slow walls</strong><span>Wide gaps</span></button>' +
          '<button class="ac-mode-btn" data-mode="normal"><strong>Normal speed</strong><span>Medium gaps</span></button>' +
          '<button class="ac-mode-btn" data-mode="hard"><strong>Fast walls</strong><span>Narrow gaps</span></button>' +
        '</div>' +
        '<p class="ac-hint"><b>Controls</b>: A/D or arrows to steer left/right. Fly through the gaps!</p>' +
      '</div>';
    document.getElementById('rd-mode-close').addEventListener('click', rdClose);
    var btns = rdOverlay.querySelectorAll('.ac-mode-btn');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click', function(){ rdBoot(this.getAttribute('data-mode')); });
    }
  }
  function rdBoot(mode){
    wbTrackGamePlayed('rocketDash');
    rdOverlay.innerHTML =
      '<div class="ac-game">' +
        '<span class="ac-close" id="rd-close-btn">&times;</span>' +
        '<span class="ac-pause-btn" id="rd-pause-btn">&#10073;&#10073;</span>' +
        '<div class="ac-game-info"><b>ROCKET DASH</b> &middot; action · fly through gaps</div>' +
        '<div class="ac-canvas-wrap"><canvas id="rd-canvas" width="900" height="540"></canvas></div>' +
        '<div class="ac-status" id="rd-status">Get ready!</div>' +
        '<div class="ac-pause-overlay" id="rd-pause-overlay"><h3>Paused</h3><button id="rd-resume">Resume</button></div>' +
      '</div>';
    document.getElementById('rd-close-btn').addEventListener('click', rdClose);
    var pauseBtn = document.getElementById('rd-pause-btn');
    var pauseOv = document.getElementById('rd-pause-overlay');
    var resumeBtn = document.getElementById('rd-resume');
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ rdPaused = !rdPaused; if(pauseOv) pauseOv.classList.toggle('on', rdPaused); if(pauseBtn) pauseBtn.innerHTML = rdPaused ? '&#9654;' : '&#10073;&#10073;'; });
    if(resumeBtn) resumeBtn.addEventListener('click', function(){ rdPaused = false; if(pauseOv) pauseOv.classList.remove('on'); if(pauseBtn) pauseBtn.innerHTML = '&#10073;&#10073;'; });
    rdStartGame(mode);
  }
  function rdClose(){
    if(rdRaf) cancelAnimationFrame(rdRaf);
    rdRaf = null;
    rdPaused = false;
    rdState = null;
    window.removeEventListener('keydown', rdOnKeyDown);
    window.removeEventListener('keyup', rdOnKeyUp);
    window.removeEventListener('mousemove', rdOnMouseMove);
    window.removeEventListener('mousedown', rdOnMouseDown);
    window.removeEventListener('mouseup', rdOnMouseUp);
    rdKeys = {};
    rdMouse = { x:0, y:0, down:false };
    rdExitFullscreen();
    rdOverlay.classList.remove('on');
    rdOverlay.innerHTML = '';
    rdRenderTile();
  }

  function rdStartGame(mode){
    var canvas = document.getElementById('rd-canvas');
    var ctx = canvas.getContext('2d');
    function resize(){
      var wrap = canvas.parentElement;
      if(!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var tr = 900/540;
      var w = rect.width, h = rect.width/tr;
      if(h > rect.height){ h = rect.height; w = h*tr; }
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', rdOnMouseMove);
    window.addEventListener('mousedown', rdOnMouseDown);
    window.addEventListener('mouseup', rdOnMouseUp);
    window.addEventListener('keydown', rdOnKeyDown);
    window.addEventListener('keyup', rdOnKeyUp);

    var W = canvas.width, H = canvas.height;
    var statusEl = document.getElementById('rd-status');
    var over = false;
    var score = 0;

    // Initialize game state
    rdState = rdInitState(mode, W, H);
    rdState.mode = mode;
    rdState.W = W;
    rdState.H = H;
    rdState.score = 0;
    rdState.over = false;
    rdState.time = 0;

    // Touch support
    canvas.addEventListener('touchmove', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      rdMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      rdMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }, { passive:false });
    canvas.addEventListener('touchstart', function(e){
      e.preventDefault();
      var rect = canvas.getBoundingClientRect();
      rdMouse.x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      rdMouse.y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      rdMouse.down = true;
    }, { passive:false });
    canvas.addEventListener('touchend', function(e){ rdMouse.down = false; }, { passive:false });

    var last = performance.now();
    function loop(now){
      var dt = Math.min(0.033, (now-last)/1000);
      last = now;

      if(!rdState.over && !rdPaused){
        rdState.time += dt;
        rdUpdate(rdState, dt, rdKeys, rdMouse);
        score = rdState.score;
        if(rdState.over){
          wbRecordGameScore('rocketDash', mode, score);
          wbRecordFightResult('rocketDash', 'loss', false);
        }
        if(statusEl){
          if(rdState.over) statusEl.textContent = 'Game Over! Score: ' + score + ' - click to reset';
          else if(rdState.statusText) statusEl.textContent = rdState.statusText;
          else statusEl.textContent = 'Score: ' + score;
        }
      }

      rdDraw(ctx, W, H, rdState);

      if(rdState.over){
        canvas.addEventListener('click', function(){ rdBoot(mode); }, { once:true });
      }

      rdRaf = requestAnimationFrame(loop);
    }
    rdRaf = requestAnimationFrame(loop);
  }

  // ---- Game logic ----
  rdInitState = function(mode, W, H){
    return rdGameInit(mode, W, H);
  };

  rdGameInit = function(mode, W, H){
    var speed = mode==='hard'?2.5:mode==='easy'?1.0:1.7;
    var gapSize = mode==='hard'?80:mode==='easy'?160:120;
    return { rocket:{ x:W/2, y:H-100 }, walls:[], timer:0, spawnRate: mode==='hard'?1.0:mode==='easy'?2.0:1.5, speed:speed, score:0, gapSize:gapSize };
  };

  rdUpdate = function(s, dt, keys, mouse){
    s.score += Math.floor(dt * 10 * s.speed);
    var sp = 300;
    if(keys['a']||keys['arrowleft']) s.rocket.x -= sp*dt;
    if(keys['d']||keys['arrowright']) s.rocket.x += sp*dt;
    if(mouse.x > 0) s.rocket.x = mouse.x;
    s.rocket.x = Math.max(20, Math.min(W-20, s.rocket.x));
    s.timer += dt;
    if(s.timer >= s.spawnRate){
      s.timer = 0;
      var gapX = 50 + Math.random()*(W-100-s.gapSize);
      s.walls.push({ y:-40, gapX:gapX, gapW:s.gapSize });
    }
    for(var i=s.walls.length-1;i>=0;i--){
      s.walls[i].y += s.speed * 80 * dt;
      if(s.walls[i].y > H+40){ s.walls.splice(i,1); s.score += 10; continue; }
      var w = s.walls[i];
      if(w.y > s.rocket.y-15 && w.y < s.rocket.y+15){
        if(s.rocket.x < w.gapX || s.rocket.x > w.gapX+w.gapW){ s.over = true; }
      }
    }
    s.statusText = 'Score: ' + s.score;
  };

  rdDraw = function(ctx, W, H, s){
    ctx.fillStyle = '#0a0e18'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<s.walls.length;i++){
      var w = s.walls[i];
      ctx.fillStyle = '#3a3e48';
      ctx.fillRect(0, w.y, w.gapX, 30);
      ctx.fillRect(w.gapX+w.gapW, w.y, W-w.gapX-w.gapW, 30);
    }
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath(); ctx.moveTo(s.rocket.x, s.rocket.y-15); ctx.lineTo(s.rocket.x-8, s.rocket.y+10); ctx.lineTo(s.rocket.x+8, s.rocket.y+10); ctx.closePath(); ctx.fill();
  };

  rdRenderTile();
})();


// --- Videos Tab: Offline Video Library + P2P Sharing ---
(function(){
  var vdb = null;
  var CHUNK = 16384;

  function openVDB(){
    if(vdb) return Promise.resolve(vdb);
    return new Promise(function(resolve, reject){
      var req = indexedDB.open('wbVideos', 1);
      req.onupgradeneeded = function(e){
        var d = e.target.result;
        if(!d.objectStoreNames.contains('videos')) d.createObjectStore('videos', { keyPath:'id', autoIncrement:true });
      };
      req.onsuccess = function(e){ vdb = e.target.result; resolve(vdb); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  }
  function vAdd(file){
    return openVDB().then(function(d){
      return new Promise(function(res, rej){
        var tx = d.transaction('videos', 'readwrite');
        var r = tx.objectStore('videos').add({ name:file.name, size:file.size, type:file.type||'video/mp4', blob:file, added:Date.now() });
        r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); };
      });
    });
  }
  function vGetAll(){
    return openVDB().then(function(d){
      return new Promise(function(res, rej){
        var r = d.transaction('videos','readonly').objectStore('videos').getAll();
        r.onsuccess = function(){ res(r.result||[]); }; r.onerror = function(){ rej(r.error); };
      });
    });
  }
  function vGet(id){
    return openVDB().then(function(d){
      return new Promise(function(res, rej){
        var r = d.transaction('videos','readonly').objectStore('videos').get(id);
        r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); };
      });
    });
  }
  function vDel(id){
    return openVDB().then(function(d){
      return new Promise(function(res, rej){
        var r = d.transaction('videos','readwrite').objectStore('videos').delete(id);
        r.onsuccess = function(){ res(); }; r.onerror = function(){ rej(r.error); };
      });
    });
  }
  function vFmt(bytes){
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    if(bytes < 1073741824) return (bytes/1048576).toFixed(1) + ' MB';
    return (bytes/1073741824).toFixed(2) + ' GB';
  }

  // --- Library render ---
  function vRenderLibrary(){
    var list = document.getElementById('vid-list');
    var info = document.getElementById('vid-storage-info');
    if(!list) return;
    vGetAll().then(function(vids){
      list.innerHTML = '';
      var total = 0;
      if(!vids.length){
        list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px 0;">No videos yet. Click Import video to add one.</p>';
      } else {
        vids.sort(function(a,b){ return b.added - a.added; });
        vids.forEach(function(v){
          total += v.size;
          var el = document.createElement('div');
          el.className = 'vid-item';
          el.innerHTML = '<div><div class="vid-item-name"></div><div class="vid-item-size"></div></div>' +
            '<div class="vid-item-actions"><button class="vid-play-btn">Play</button><button class="vid-delete-btn">Delete</button></div>';
          el.querySelector('.vid-item-name').textContent = v.name;
          el.querySelector('.vid-item-size').textContent = vFmt(v.size);
          el.querySelector('.vid-play-btn').addEventListener('click', function(){ vPlay(v.id); });
          el.querySelector('.vid-delete-btn').addEventListener('click', function(){ vDel(v.id).then(vRenderLibrary); });
          list.appendChild(el);
        });
      }
      if(info) info.textContent = vids.length + ' video' + (vids.length===1?'':'s') + ' · ' + vFmt(total) + ' stored';
    });
  }

  function vPlay(id){
    vGet(id).then(function(v){
      if(!v) return;
      var pv = document.getElementById('vid-player-view');
      var lv = document.getElementById('vid-library-view');
      var sv = document.getElementById('vid-share-view');
      var pl = document.getElementById('vid-player');
      var ti = document.getElementById('vid-player-title');
      if(!pv || !pl) return;
      var url = URL.createObjectURL(v.blob);
      pl.src = url;
      if(ti) ti.textContent = v.name;
      // recorded clips (WebM from the browser) have no length stored; seeking to the end once makes the player learn it
      pl.onloadedmetadata = function(){
        if(pl.duration === Infinity){
          pl.onseeked = function(){ pl.onseeked = null; pl.currentTime = 0; var pp = pl.play(); if(pp && pp.catch) pp.catch(function(){}); };
          pl.currentTime = 1e101;
        }
      };
      pl.play();
      if(lv) lv.style.display = 'none';
      if(sv) sv.style.display = 'none';
      pv.style.display = 'flex';
      pl.onended = function(){ URL.revokeObjectURL(url); };
    });
  }

  // --- Share list populate ---
  function vPopulateShareList(){
    var sl = document.getElementById('vid-share-list');
    if(!sl) return;
    vGetAll().then(function(vids){
      sl.innerHTML = '';
      if(!vids.length){
        sl.innerHTML = '<p style="color:var(--muted);">No videos in library. Import some first.</p>';
        return;
      }
      vids.forEach(function(v){
        var el = document.createElement('div');
        el.className = 'vid-share-item';
        el.innerHTML = '<label><input type="checkbox" class="vid-share-check" data-id="'+v.id+'" checked> <span></span></label>';
        el.querySelector('span').textContent = v.name + ' (' + vFmt(v.size) + ')';
        sl.appendChild(el);
      });
    });
  }

  // --- WebRTC P2P ---
  var vpc = null, vdc = null;
  var vSendQueue = [], vSendIdx = 0, vSendOffset = 0, vSendMeta = null;
  var vRecvChunks = [], vRecvMeta = null, vRecvSize = 0;

  function vWaitIce(pc){
    return new Promise(function(res){
      if(pc.iceGatheringState === 'complete') return res();
      var chk = function(){
        if(pc.iceGatheringState === 'complete'){ pc.removeEventListener('icegatheringstatechange', chk); res(); }
      };
      pc.addEventListener('icegatheringstatechange', chk);
      setTimeout(res, 4000);
    });
  }

  function vStartHost(){
    vpc = new RTCPeerConnection({ iceServers: [] });
    vdc = vpc.createDataChannel('files', { ordered: true });
    vSetupDC(vdc, true);
    vpc.createOffer().then(function(o){ return vpc.setLocalDescription(o); })
      .then(function(){ return vWaitIce(vpc); })
      .then(function(){
        var el = document.getElementById('vid-offer-code');
        var area = document.getElementById('vid-host-area');
        if(el) el.value = wbB64.enc(vpc.localDescription.sdp);
        if(area) area.style.display = 'block';
      });
  }

  function vConnectHost(){
    var inp = document.getElementById('vid-answer-input');
    var st = document.getElementById('vid-host-status');
    if(!inp || !inp.value.trim()){ if(st) st.textContent = 'Paste your friend\'s response code first.'; return; }
    if(st) st.textContent = 'Connecting...';
    vpc.setRemoteDescription({ type:'answer', sdp: wbB64.dec(inp.value.trim()) })
      .then(function(){ if(st) st.textContent = 'Connected!'; })
      .catch(function(err){ if(st) st.textContent = 'Connection failed: ' + err.message; });
  }

  function vStartJoin(){
    var inp = document.getElementById('vid-join-offer');
    var st = document.getElementById('vid-join-status');
    if(!inp || !inp.value.trim()){ if(st) st.textContent = 'Paste the host\'s code first.'; return; }
    vpc = new RTCPeerConnection({ iceServers: [] });
    vpc.ondatachannel = function(e){ vdc = e.channel; vSetupDC(vdc, false); };
    vpc.setRemoteDescription({ type:'offer', sdp: wbB64.dec(inp.value.trim()) })
      .then(function(){ return vpc.createAnswer(); })
      .then(function(a){ return vpc.setLocalDescription(a); })
      .then(function(){ return vWaitIce(vpc); })
      .then(function(){
        var el = document.getElementById('vid-answer-code');
        var area = document.getElementById('vid-join-area');
        if(el) el.value = wbB64.enc(vpc.localDescription.sdp);
        if(area) area.style.display = 'block';
        if(st) st.textContent = 'Waiting for host to connect...';
      });
  }

  function vSetupDC(channel, isHost){
    channel.binaryType = 'arraybuffer';
    channel.onopen = function(){
      var st = document.getElementById(isHost ? 'vid-host-status' : 'vid-join-status');
      if(st) st.textContent = isHost ? 'Connected! Sending videos...' : 'Connected!';
      if(isHost) vBeginSend();
    };
    channel.onmessage = function(e){
      if(typeof e.data === 'string'){
        var msg = JSON.parse(e.data);
        if(msg.type === 'meta'){
          vRecvMeta = msg; vRecvChunks = []; vRecvSize = 0;
          var st = document.getElementById('vid-join-status');
          if(st) st.textContent = 'Receiving: ' + msg.name + ' (' + vFmt(msg.size) + ')';
        } else if(msg.type === 'done'){
          var st2 = document.getElementById('vid-join-status');
          if(st2) st2.textContent = 'All videos received!';
          vRenderLibrary();
        }
      } else {
        vRecvChunks.push(e.data);
        vRecvSize += e.data.byteLength;
        if(vRecvMeta){
          var pct = Math.round(vRecvSize / vRecvMeta.size * 100);
          var st = document.getElementById('vid-join-status');
          if(st) st.textContent = 'Receiving: ' + vRecvMeta.name + ' — ' + pct + '%';
          if(vRecvSize >= vRecvMeta.size){
            var blob = new Blob(vRecvChunks, { type: vRecvMeta.fileType || vRecvMeta.type || 'video/mp4' });
            var file = new File([blob], vRecvMeta.name, { type: vRecvMeta.type });
            vAdd(file).then(function(){
              var st2 = document.getElementById('vid-join-status');
              if(st2) st2.textContent = 'Saved: ' + vRecvMeta.name;
              vRenderLibrary();
            });
            vRecvMeta = null; vRecvChunks = [];
          }
        }
      }
    };
    channel.onclose = function(){
      var st = document.getElementById(isHost ? 'vid-host-status' : 'vid-join-status');
      if(st) st.textContent = 'Connection closed.';
    };
  }

  function vBeginSend(){
    var checks = document.querySelectorAll('.vid-share-check:checked');
    var ids = [];
    for(var i = 0; i < checks.length; i++) ids.push(parseInt(checks[i].getAttribute('data-id')));
    if(!ids.length){ if(vdc && vdc.readyState === 'open') vdc.send(JSON.stringify({ type:'done' })); return; }
    vSendQueue = ids;
    vSendNext();
  }

  function vSendNext(){
    if(!vSendQueue.length){
      if(vdc && vdc.readyState === 'open') vdc.send(JSON.stringify({ type:'done' }));
      var st = document.getElementById('vid-host-status');
      if(st) st.textContent = 'All videos sent!';
      return;
    }
    vGet(vSendQueue.shift()).then(function(v){
      if(!v){ vSendNext(); return; }
      vSendMeta = v; vSendOffset = 0;
      vdc.send(JSON.stringify({ type:'meta', name:v.name, size:v.size, fileType:v.type }));
      vSendChunk();
    });
  }

  function vSendChunk(){
    if(!vSendMeta || !vdc || vdc.readyState !== 'open') return;
    var blob = vSendMeta.blob;
    var slice = blob.slice(vSendOffset, vSendOffset + CHUNK);
    var reader = new FileReader();
    reader.onload = function(e){
      vdc.send(e.target.result);
      vSendOffset += e.target.result.byteLength;
      var pct = Math.round(vSendOffset / vSendMeta.size * 100);
      var st = document.getElementById('vid-host-status');
      if(st) st.textContent = 'Sending: ' + vSendMeta.name + ' — ' + pct + '%';
      if(vSendOffset < vSendMeta.size){
        if(vdc.bufferedAmount > 4 * 1048576){
          vdc.onbufferedamountlow = function(){ vdc.onbufferedamountlow = null; vSendChunk(); };
        } else { vSendChunk(); }
      } else {
        vSendMeta = null;
        setTimeout(vSendNext, 300);
      }
    };
    reader.readAsArrayBuffer(slice);
  }

  // --- Init ---
  function vInit(){
    var subs = document.querySelectorAll('.vid-subtab');
    for(var i = 0; i < subs.length; i++){
      subs[i].addEventListener('click', function(){
        var t = this.getAttribute('data-vidtab');
        for(var j = 0; j < subs.length; j++) subs[j].classList.remove('active');
        this.classList.add('active');
        var lv = document.getElementById('vid-library-view');
        var sv = document.getElementById('vid-share-view');
        var pv = document.getElementById('vid-player-view');
        var syv = document.getElementById('vid-sync-view');
        if(t === 'library'){ if(lv) lv.style.display='block'; if(sv) sv.style.display='none'; if(pv) pv.style.display='none'; if(syv) syv.style.display='none'; }
        else if(t === 'sync'){ if(lv) lv.style.display='none'; if(sv) sv.style.display='none'; if(pv) pv.style.display='none'; if(syv) syv.style.display='block'; }
        else if(t === 'share'){ if(lv) lv.style.display='none'; if(sv) sv.style.display='block'; if(pv) pv.style.display='none'; if(syv) syv.style.display='none'; vPopulateShareList(); }
      });
    }
    var ib = document.getElementById('vid-import-btn');
    var ii = document.getElementById('vid-import-input');
    if(ib && ii){
      ib.addEventListener('click', function(){ ii.click(); });
      ii.addEventListener('change', function(){
        var files = ii.files; var idx = 0;
        var next = function(){
          if(idx >= files.length){ ii.value = ''; vRenderLibrary(); return; }
          vAdd(files[idx]).then(function(){ idx++; next(); });
        };
        next();
      });
    }
    var cp = document.getElementById('vid-close-player');
    if(cp){
      cp.addEventListener('click', function(){
        var pl = document.getElementById('vid-player');
        var pv = document.getElementById('vid-player-view');
        if(pl){ pl.pause(); pl.src = ''; }
        if(pv) pv.style.display = 'none';
        var active = document.querySelector('.vid-subtab.active');
        if(active && active.getAttribute('data-vidtab') === 'share'){
          var sv = document.getElementById('vid-share-view'); if(sv) sv.style.display = 'block';
        } else if(active && active.getAttribute('data-vidtab') === 'sync'){
          var syv = document.getElementById('vid-sync-view'); if(syv) syv.style.display = 'block';
        } else {
          var lv = document.getElementById('vid-library-view'); if(lv) lv.style.display = 'block';
        }
      });
    }
    var hb = document.getElementById('vid-host-btn');
    if(hb) hb.addEventListener('click', vStartHost);
    var cb = document.getElementById('vid-connect-btn');
    if(cb) cb.addEventListener('click', vConnectHost);
    var jb = document.getElementById('vid-join-btn');
    if(jb) jb.addEventListener('click', vStartJoin);
    // Help popup
    var hBtn = document.getElementById('vid-help-btn');
    var mBg = document.getElementById('vid-modal-bg');
    var mClose = document.getElementById('vid-modal-close');
    if(hBtn && mBg) hBtn.addEventListener('click', function(){ mBg.style.display = 'flex'; });
    if(mClose && mBg) mClose.addEventListener('click', function(){ mBg.style.display = 'none'; });
    if(mBg) mBg.addEventListener('click', function(e){ if(e.target === mBg) mBg.style.display = 'none'; });

    // --- Sync from home server ---
    var syncAddr = document.getElementById('vid-server-addr');
    var syncFindBtn = document.getElementById('vid-find-btn');
    var syncList = document.getElementById('vid-sync-list');
    var syncStatus = document.getElementById('vid-sync-status');
    if(syncAddr){
      var savedAddr = localStorage.getItem('wb_server_addr');
      if(savedAddr) syncAddr.value = savedAddr;
      syncAddr.addEventListener('change', function(){
        localStorage.setItem('wb_server_addr', syncAddr.value.trim());
      });
    }
    function vSyncDownload(serverAddr, videoInfo, btn, progEl){
      btn.disabled = true;
      btn.textContent = 'Downloading...';
      if(progEl) progEl.textContent = '0%';
      var xhr = new XMLHttpRequest();
      xhr.open('GET', serverAddr + videoInfo.url, true);
      xhr.responseType = 'blob';
      xhr.onprogress = function(e){
        if(e.lengthComputable && progEl){
          var pct = Math.round(e.loaded / e.total * 100);
          progEl.textContent = pct + '%';
        }
      };
      xhr.onload = function(){
        if(xhr.status === 200 || xhr.status === 206){
          var blob = xhr.response;
          var file = new File([blob], videoInfo.name, { type: videoInfo.type || 'video/mp4' });
          vAdd(file).then(function(){
            btn.textContent = 'Done';
            if(progEl) progEl.textContent = 'Saved';
            vRenderLibrary();
          }).catch(function(){
            btn.textContent = 'Failed';
            if(progEl) progEl.textContent = 'Error saving';
            btn.disabled = false;
          });
        } else {
          btn.textContent = 'Failed';
          if(progEl) progEl.textContent = 'Error ' + xhr.status;
          btn.disabled = false;
        }
      };
      xhr.onerror = function(){
        btn.textContent = 'Failed';
        if(progEl) progEl.textContent = 'Connection error';
        btn.disabled = false;
      };
      xhr.send();
    }
    if(syncFindBtn){
      syncFindBtn.addEventListener('click', function(){
        var addr = syncAddr.value.trim().replace(/\/$/, '');
        if(!addr){ if(syncStatus) syncStatus.textContent = 'Enter your G16 server address first.'; return; }
        localStorage.setItem('wb_server_addr', addr);
        if(syncStatus) syncStatus.textContent = 'Connecting to ' + addr + '...';
        if(syncList) syncList.innerHTML = '';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', addr + '/api/videos', true);
        xhr.timeout = 8000;
        xhr.onload = function(){
          if(xhr.status === 200){
            try{
              var videos = JSON.parse(xhr.responseText);
              if(!videos.length){
                if(syncStatus) syncStatus.textContent = 'No videos found on the server. Put video files in the folder on your G16.';
                return;
              }
              if(syncStatus) syncStatus.textContent = 'Found ' + videos.length + ' video' + (videos.length===1?'':'s') + '. Click Download to add to your library.';
              videos.forEach(function(v){
                var el = document.createElement('div');
                el.className = 'vid-sync-item';
                el.innerHTML = '<div><div class="vid-sync-item-name"></div><div class="vid-sync-item-size"></div></div>' +
                  '<div class="vid-sync-item-actions"><button class="vid-sync-dl-btn">Download</button><span class="vid-sync-progress"></span></div>';
                el.querySelector('.vid-sync-item-name').textContent = v.name;
                el.querySelector('.vid-sync-item-size').textContent = vFmt(v.size);
                var dlBtn = el.querySelector('.vid-sync-dl-btn');
                var progEl = el.querySelector('.vid-sync-progress');
                dlBtn.addEventListener('click', function(){ vSyncDownload(addr, v, dlBtn, progEl); });
                if(syncList) syncList.appendChild(el);
              });
            } catch(e){
              if(syncStatus) syncStatus.textContent = 'Could not read the server response.';
            }
          } else {
            if(syncStatus) syncStatus.textContent = 'Server responded with error ' + xhr.status + '. Make sure the G16 server is running.';
          }
        };
        xhr.ontimeout = function(){ if(syncStatus) syncStatus.textContent = 'Connection timed out. Check that your phone is on home WiFi and the G16 server is running.'; };
        xhr.onerror = function(){ if(syncStatus) syncStatus.textContent = 'Could not connect. Check the address, that your phone is on home WiFi, and the G16 server is running.'; };
        xhr.send();
      });
    }

    vRenderLibrary();
    window.wbRefreshVideoLibrary = vRenderLibrary;
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vInit);
  else vInit();
})();

