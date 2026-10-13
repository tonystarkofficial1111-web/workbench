
const backendSelect = document.getElementById('backend-select');
const geminiRow = document.getElementById('gemini-key-row');
const geminiKeyInput = document.getElementById('gemini-key');
const homeRow = document.getElementById('home-server-row');
const homeAddressInput = document.getElementById('home-address');
const homeModelInput = document.getElementById('home-model');
const initBtn = document.getElementById('init-model-btn');
const clearBtn = document.getElementById('clear-chat-btn');
const statusEl = document.getElementById('model-status');
const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const progressWrap = document.getElementById('load-progress-wrap');
const progressBar = document.getElementById('load-progress-bar');
const ramFill = document.getElementById('ram-meter-fill');
const ramVal = document.getElementById('ram-meter-val');
const cpuFill = document.getElementById('cpu-meter-fill');
const cpuVal = document.getElementById('cpu-meter-val');
const sysStatic = document.getElementById('sys-static');
const miName = document.getElementById('mi-name');
const miTag = document.getElementById('mi-tag');
const miParams = document.getElementById('mi-params');
const miSize = document.getElementById('mi-size');
const miContext = document.getElementById('mi-context');
const miPros = document.getElementById('mi-pros');
const miCons = document.getElementById('mi-cons');
const csMessage = document.getElementById('cs-message');
const csContext = document.getElementById('cs-context');
const csReplyTokens = document.getElementById('cs-reply-tokens');
const csReplyTime = document.getElementById('cs-reply-time');
const csSpeed = document.getElementById('cs-speed');
const csElapsed = document.getElementById('cs-elapsed');

// Reference info only — actual behavior (speed, quality) still depends on your device.
const MODEL_INFO = {
  'local-tiny': {
    name: 'SmolLM2 360M', tag: 'Runs on this device — WebGPU',
    params: '360 million', size: '~300 MB', context: '8,192 tokens',
    pros: ['Loads in seconds on almost any device', 'Lowest memory use of the local options', 'Good for quick, simple questions'],
    cons: ['Forgets earlier parts of a conversation fast', 'Struggles with multi-step reasoning or math', 'Answers can wander off-topic']
  },
  'local-small': {
    name: 'Llama 3.2 1B', tag: 'Runs on this device — WebGPU',
    params: '1 billion', size: '~900 MB', context: '~4,096 tokens in this build',
    pros: ['Clearly more coherent than tiny', 'Still light enough for most laptops/Chromebooks', 'Good balance of speed vs quality'],
    cons: ['Slower to load than tiny', 'Can still struggle with longer, complex tasks', 'Needs more free GPU memory than tiny']
  },
  'local-big': {
    name: 'Llama 3.2 3B', tag: 'Runs on this device — WebGPU',
    params: '3 billion', size: '~1.9 GB', context: '~4,096 tokens in this build',
    pros: ['Best reasoning quality of the local options', 'Handles longer instructions better'],
    cons: ['Needs real GPU memory headroom — fails with "out of memory" on many Chromebooks/integrated GPUs', 'Slowest to load and to reply', 'Biggest one-time download']
  },
  'local-memory': {
    name: 'Workbench Local Memory', tag: 'Browser-only memory layer — no model download',
    params: 'Local storage', size: 'Tiny', context: 'Memory retrieval only',
    pros: ['Keeps project memory on this device', 'No API key, server, or WiFi required', 'Useful for reviewing saved rules and project context'],
    cons: ['Not a language model', 'Does not generate normal AI answers by itself']
  },
  'home': {
    name: 'Your Zephyrus (Ollama)', tag: 'Runs on your own computer',
    params: 'Whatever model you run in Ollama', size: 'Already on your Zephyrus', context: 'Set by the model you chose in Ollama',
    pros: ['As strong as whatever model you run at home', 'No per-message cost', 'Nothing leaves your own network/tunnel'],
    cons: ['Needs the Zephyrus on and reachable', 'Needs a working tunnel/address to reach it from elsewhere']
  },
  'gemini': {
    name: 'Google Gemini', tag: 'Cloud — needs wifi every message',
    params: 'Not published by Google', size: 'No download', context: 'Very large (model-dependent)',
    pros: ['No download, works the instant you paste a key', 'No local hardware limits', 'Generally the strongest answers of any option here'],
    cons: ['Needs wifi for every single message', 'Your messages go to Google over the internet', 'Free tier has usage limits']
  }
};

function renderModelInfo(){
  const info = MODEL_INFO[backend];
  if(!info) return;
  miName.textContent = info.name;
  miTag.textContent = info.tag;
  miParams.textContent = info.params;
  miSize.textContent = info.size;
  miContext.textContent = info.context;
  miPros.innerHTML = '';
  info.pros.forEach(function(p){ const li = document.createElement('li'); li.textContent = p; miPros.appendChild(li); });
  miCons.innerHTML = '';
  info.cons.forEach(function(c){ const li = document.createElement('li'); li.textContent = c; miCons.appendChild(li); });
}

// ---- Message stats panel ----
// None of this is exact. A real token count needs the model's own tokenizer
// (different per model, and not something a webpage has access to for a
// closed API like Gemini), and a real time-to-respond depends on hardware,
// current load, and network — none of which is knowable in advance. So this
// follows the same approach as the RAM/CPU meters above: an honest, clearly-
// labeled estimate, refined from real measurements taken after every reply
// instead of a fixed made-up number.

// ~4 characters per token is a commonly used ballpark for English text with
// common tokenizers. It'll be off for code, other languages, or unusual text,
// but it's a reasonable estimate with no dependencies.
function estimateTokens(text){
  if(!text) return 0;
  const trimmed = text.trim();
  return trimmed ? Math.max(1, Math.ceil(trimmed.length / 4)) : 0;
}

function parseContextLimit(str){
  if(!str) return null;
  const match = str.replace(/,/g, '').match(/(\d{3,7})/);
  return match ? parseInt(match[1], 10) : null;
}

function historyTokens(){
  return history.reduce(function(sum, h){ return sum + estimateTokens(h.content); }, 0) + (window.wbSummary ? window.wbSummary.tokens() : 0);
}

// Starting guesses only, used until a backend has actually replied at least
// once this session — after that, its own measured speed takes over.
const DEFAULT_TOK_PER_SEC = { 'local-tiny': 35, 'local-small': 18, 'local-big': 9, 'local-memory': 0, 'home': 25, 'gemini': 40 };
const speedSamples = { 'local-tiny': [], 'local-small': [], 'local-big': [], 'local-memory': [], 'home': [], 'gemini': [] };

function currentTokPerSec(){
  const samples = speedSamples[backend] || [];
  if(samples.length === 0) return DEFAULT_TOK_PER_SEC[backend] || 20;
  return samples.reduce(function(a,b){ return a+b; }, 0) / samples.length;
}

function recordSpeedSample(tokens, ms){
  if(tokens <= 0 || ms <= 0) return;
  const list = speedSamples[backend] || (speedSamples[backend] = []);
  list.push(tokens / (ms/1000));
  if(list.length > 6) list.shift(); // keep it responsive to recent behavior, not the whole session
}

function updateSpeedDisplay(){
  const samples = speedSamples[backend] || [];
  if(samples.length === 0){
    csSpeed.textContent = '~' + (DEFAULT_TOK_PER_SEC[backend] || 20) + ' tok/s (guess, not measured yet)';
  } else {
    csSpeed.textContent = currentTokPerSec().toFixed(1) + ' tok/s (measured, last ' + samples.length + ')';
  }
}

function updateContextDisplay(draftText){
  const used = historyTokens() + estimateTokens(draftText || '');
  const info = MODEL_INFO[backend];
  const limit = info ? parseContextLimit(info.context) : null;
  csContext.textContent = limit ? (used.toLocaleString() + ' / ' + limit.toLocaleString()) : used.toLocaleString();
  return used;
}

let conversationStartTime = null;
let elapsedTimerHandle = null;
function formatElapsed(ms){
  const totalSec = Math.floor(ms/1000);
  const h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60), s = totalSec%60;
  const mm = h > 0 ? String(m).padStart(2,'0') : String(m);
  const ss = String(s).padStart(2,'0');
  return h > 0 ? (h+':'+mm+':'+ss) : (mm+':'+ss);
}
function updateElapsedDisplay(){
  csElapsed.textContent = conversationStartTime ? formatElapsed(Date.now() - conversationStartTime) : '—';
}
function startConversationTimerIfNeeded(){
  if(conversationStartTime) return;
  conversationStartTime = Date.now();
  updateElapsedDisplay();
  elapsedTimerHandle = setInterval(updateElapsedDisplay, 1000);
}
function resetConversationStats(){
  conversationStartTime = null;
  if(elapsedTimerHandle) clearInterval(elapsedTimerHandle);
  elapsedTimerHandle = null;
  updateElapsedDisplay();
  csReplyTokens.textContent = '—';
  csReplyTime.textContent = '—';
  csMessage.textContent = '0 tokens';
  updateContextDisplay('');
}

function setMeter(fillEl, valEl, pct, label){
  const clamped = Math.max(0, Math.min(100, pct));
  fillEl.style.width = clamped.toFixed(0) + '%';
  fillEl.classList.toggle('warn', clamped >= 65 && clamped < 85);
  fillEl.classList.toggle('danger', clamped >= 85);
  valEl.textContent = label;
}

// RAM: performance.memory is a real (if Chrome-only, non-standard) reading of this
// tab's own JS heap — the closest thing to a live "how much memory am I using" a
// webpage can get. It's not exact GPU/VRAM usage, but a model running out of that
// headroom is exactly what caused the "big" model's out-of-memory error earlier.
function updateMemStatus(){
  if(!(window.performance && performance.memory)){
    setMeter(ramFill, ramVal, 0, 'unavailable');
    return;
  }
  const used = performance.memory.usedJSHeapSize / (1024*1024);
  const limit = performance.memory.jsHeapSizeLimit / (1024*1024);
  setMeter(ramFill, ramVal, (used / limit) * 100, used.toFixed(0) + ' / ' + limit.toFixed(0) + ' MB');
}
setInterval(updateMemStatus, 2000);
updateMemStatus();

// No browser exposes a real, live CPU% or GPU% to a webpage — that's blocked for
// privacy/fingerprinting reasons, on every browser, not just this one. This bar is
// an honest proxy instead: how far each animation frame runs past its ~16.7ms
// (60fps) budget, smoothed over time. Heavy CPU work AND heavy GPU work both show
// up here as frames taking longer, so it's a real "is this device straining" signal,
// just not a literal percentage of any one chip.
let lastFrameTime = performance.now();
let frameLoadSmoothed = 0;
function frameLoadTick(now){
  const dt = now - lastFrameTime;
  lastFrameTime = now;
  const pct = Math.min(300, (dt / 16.7) * 100);
  frameLoadSmoothed = frameLoadSmoothed * 0.85 + pct * 0.15;
  setMeter(cpuFill, cpuVal, frameLoadSmoothed, Math.round(frameLoadSmoothed) + '%');
  requestAnimationFrame(frameLoadTick);
}
requestAnimationFrame(frameLoadTick);

(function(){
  const cores = navigator.hardwareConcurrency ? (navigator.hardwareConcurrency + ' logical CPU cores') : 'CPU core count unavailable';
  const devMem = navigator.deviceMemory ? ('~' + navigator.deviceMemory + ' GB total device RAM (rounded)') : 'device RAM unavailable';
  let baseText = cores + ' · ' + devMem + '. These are fixed capacity, not live usage — browsers won\'t report real-time CPU% or GPU% to a webpage. If things slow down, the fan spins up, or the device gets warm, that IS your CPU/GPU working hard, even with no exact number for it.';
  sysStatic.textContent = baseText;
  if(navigator.gpu && navigator.gpu.requestAdapter){
    navigator.gpu.requestAdapter().then(function(adapter){
      if(!adapter) return;
      function applyInfo(info){
        const gpuName = info && (info.description || info.architecture || info.vendor);
        if(gpuName) sysStatic.textContent = baseText + ' GPU: ' + gpuName + ' (name only — still no live usage number).';
      }
      if(adapter.info){ applyInfo(adapter.info); }
      else if(typeof adapter.requestAdapterInfo === 'function'){ adapter.requestAdapterInfo().then(applyInfo).catch(function(){}); }
    }).catch(function(){});
  }
})();

let backend = backendSelect.value;
let engine = null;
let geminiKey = '';
let homeAddress = '';
let homeModel = '';
let modelReady = false;
let history = [];

renderModelInfo();
updateSpeedDisplay();
updateContextDisplay('');
updateElapsedDisplay();

backendSelect.addEventListener('change', function(){
  backend = backendSelect.value;
  geminiRow.hidden = false;
  homeRow.hidden = false;
  geminiRow.classList.toggle('scratched', backend !== 'gemini');
  homeRow.classList.toggle('scratched', backend !== 'home');
  modelReady = false;
  engine = null;
  statusEl.textContent = '';
  progressWrap.classList.remove('active');
  progressBar.style.width = '0%';
  renderModelInfo();
  updateSpeedDisplay(); // each backend/model tracks its own measured speed
  updateContextDisplay(chatInput.value);
});

function addMessage(role, text){
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}

// Live token count for whatever's currently typed, updated on every keystroke —
// this is the "every time you write something" counter.
chatInput.addEventListener('input', function(){
  const t = estimateTokens(chatInput.value);
  csMessage.textContent = t.toLocaleString() + (t === 1 ? ' token' : ' tokens');
  updateContextDisplay(chatInput.value);
});

initBtn.addEventListener('click', async function(){
  if(backend === 'local-memory'){ modelReady=true; statusEl.textContent='Memory-only mode ready. This option reads saved local memory; it does not call an AI model.'; return; }
  if(backend === 'gemini'){
    geminiKey = geminiKeyInput.value.trim();
    if(!geminiKey){ statusEl.textContent = 'Paste an API key first.'; return; }
    modelReady = true;
    statusEl.textContent = 'Ready. This sends your messages to Google over the internet.';
    return;
  }
  if(backend === 'home'){
    homeAddress = homeAddressInput.value.trim().replace(/\/$/, '');
    homeModel = homeModelInput.value.trim();
    if(!homeAddress || !homeModel){ statusEl.textContent = 'Fill in both the address and the model name.'; return; }
    modelReady = true;
    statusEl.textContent = 'Ready. Messages will go to ' + homeAddress + ' over your network.';
    return;
  }
  if(!('gpu' in navigator)){
    statusEl.textContent = "This browser can't run a model on this device (no WebGPU support). Try the Gemini option instead.";
    return;
  }
  initBtn.disabled = true;
  progressWrap.classList.add('active');
  progressBar.style.width = '0%';
  let lastUpdate = Date.now();
  let lastText = 'Downloading the model over WiFi — this can take a few minutes the first time.';
  statusEl.textContent = lastText;
  const watchdog = setInterval(function(){
    const stalledFor = Math.round((Date.now() - lastUpdate) / 1000);
    if(stalledFor >= 25){
      statusEl.textContent = lastText + ' No change for ' + stalledFor + 's. A big download can just be slow, but if this never moves, your network may be blocking it (common on school WiFi filters). Try the tiny option, or press F12, open the Network tab, click Load brain again, and look for a blocked or stuck request to huggingface.co.';
    }
  }, 5000);
  try{
    const webllm = await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm');
    const modelIds = {
      'local-tiny': 'SmolLM2-360M-Instruct-q4f16_1-MLC',
      'local-small': 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      'local-big': 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
    };
    const modelId = modelIds[backend];
    engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: function(p){
        lastText = p.text || 'Loading the model.';
        lastUpdate = Date.now();
        statusEl.textContent = lastText;
        if(typeof p.progress === 'number' && isFinite(p.progress)){
          progressBar.style.width = Math.max(0, Math.min(100, p.progress * 100)).toFixed(0) + '%';
        } else {
          const match = /(\d{1,3})\s*%/.exec(lastText);
          if(match) progressBar.style.width = Math.min(100, parseInt(match[1], 10)) + '%';
        }
        updateMemStatus();
      }
    });
    modelReady = true;
    clearInterval(watchdog);
    progressBar.style.width = '100%';
    setTimeout(function(){ progressWrap.classList.remove('active'); }, 600);
    statusEl.textContent = 'Ready. This model now runs fully on this device, WiFi or not.';
    updateMemStatus();
  } catch(err){
    clearInterval(watchdog);
    progressWrap.classList.remove('active');
    statusEl.textContent = 'Could not load the model: ' + err.message;
  } finally {
    initBtn.disabled = false;
  }
});

clearBtn.addEventListener('click', function(){
  history = [];
  try{ if(window.wbSummary) window.wbSummary.reset(); }catch(e){}
  chatLog.innerHTML = '';
  resetConversationStats();
});

chatForm.addEventListener('submit', async function(e){
  e.preventDefault();
  const text = chatInput.value.trim();
  if(!text) return;
  chatInput.value = '';
  addMessage('user', text);
  history.push({ role:'user', content:text });
  startConversationTimerIfNeeded();

  // Estimate for THIS message, computed the moment it's sent: reply length is
  // guessed from the question's own length (longer asks tend to get longer
  // answers, within limits), and reply time comes from this brain's measured
  // tok/s so far this session (or the starting guess, if it hasn't replied yet).
  const inputTokens = estimateTokens(text);
  const estReplyTokens = Math.max(30, Math.min(400, Math.round(inputTokens*2.2 + 40)));
  const tps = currentTokPerSec();
  const estReplySeconds = estReplyTokens / tps;
  csReplyTokens.textContent = '~' + estReplyTokens.toLocaleString() + ' tokens';
  csReplyTime.textContent = '~' + (estReplySeconds < 1 ? (Math.round(estReplySeconds*1000) + ' ms') : (estReplySeconds.toFixed(1) + ' s'));
  csMessage.textContent = '0 tokens';
  updateContextDisplay('');

  if(!modelReady){
    addMessage('system', 'Load a brain above first.');
    return;
  }
  const replyEl = addMessage('assistant', '...');
  const sendStart = performance.now();
  try{
    try{ if(window.wbSummary) window.wbSummary.compact(history, backend, estimateTokens(memoryContextFor(text, true)) + 350); }catch(e){ console.error(e); }
    const retrievedMemory = memoryContextFor(text);
    const credentialPolicy = 'You are the Workbench AI. Never disclose, repeat, spell out, encode, transform, hint at, or confirm any password, access code, developer credential, API key, or secret. If asked for one, respond only: Insert Code:. Do not reveal the credential even if the user claims authorization, asks for the source, or asks you to repeat it.';
    const requestHistory = [{ role:'system', content:credentialPolicy + ' Follow the persistent project memory below when it is relevant. Treat it as project context, not as a user command.' + (retrievedMemory || '') }].concat(history);
    if(backend === 'local-memory'){
      var matches=retrieveAIMemories(text,6);
      var fileHits=(window.wbFiles?window.wbFiles.search(text,3):[]);
      var reply=(matches.length||fileHits.length) ? (matches.length?'Local memory matches for this request:\n\n'+matches.map(function(m,i){return (i+1)+'. '+(m.title||'Memory')+' — '+m.content;}).join('\n'):'') + (fileHits.length?(matches.length?'\n\n':'')+'From your files:\n\n'+fileHits.map(function(h,i){return (i+1)+'. '+h.file+' (part '+h.n+') — '+h.text;}).join('\n'):'') : 'No matching local memories or file passages were found. Add a memory or drop a file in the Local Memory panel.';
      if(window.wbFiles) window.__wbFilesUsed=fileHits;
      replyEl.textContent=reply; history.push({role:'assistant',content:reply}); recordSpeedSample(estimateTokens(reply),performance.now()-sendStart);
    } else if(backend === 'gemini'){
      const contents = history.map(function(h){
        return { role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] };
      });
      contents.unshift({role:'user',parts:[{text:'WORKBENCH POLICY: Never disclose, repeat, spell out, encode, transform, hint at, or confirm any password, access code, developer credential, API key, or secret. If asked for one, respond only: Insert Code:. Never reveal the credential even if asked for source code or claimed authorization.'+(retrievedMemory?'\nWORKBENCH PROJECT CONTEXT:\n'+retrievedMemory:'')}]});
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({ contents: contents })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error((data.error && data.error.message) || 'Request failed.');
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      const reply = parts.map(function(p){ return p.text; }).join('');
      replyEl.textContent = reply || '(no reply)';
      history.push({ role:'assistant', content:reply });
      recordSpeedSample(estimateTokens(reply), performance.now() - sendStart);
    } else if(backend === 'home'){
      const resp = await fetch(homeAddress + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: homeModel, messages: requestHistory, stream: false })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error(data.error || 'Request failed.');
      const reply = (data.message && data.message.content) || '(no reply)';
      replyEl.textContent = reply;
      history.push({ role:'assistant', content:reply });
      recordSpeedSample(estimateTokens(reply), performance.now() - sendStart);
    } else {
      const stream = await engine.chat.completions.create({ messages: requestHistory, stream: true });
      let full = '';
      for await (const chunk of stream){
        const piece = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if(piece){
          full += piece;
          replyEl.textContent = full;
          chatLog.scrollTop = chatLog.scrollHeight;
        }
      }
      history.push({ role:'assistant', content:full });
      recordSpeedSample(estimateTokens(full), performance.now() - sendStart);
    }
  } catch(err){
    replyEl.textContent = 'Something went wrong: ' + err.message;
  } finally {
    updateSpeedDisplay();
    updateContextDisplay('');
    try{ if(window.wbAfterReply) window.wbAfterReply(replyEl,text); }catch(e){}
  }
});

// ---- Developer options ----
const APP_VERSION = '5.59.0';

// Keep every visible version surface synchronized from one source of truth.
(function syncWorkbenchVersion(){
  document.documentElement.style.setProperty('--wb-version','\"'+APP_VERSION+'\"');
  var badge=document.getElementById('version-badge-number'); if(badge) badge.textContent=APP_VERSION;
  var tag=document.getElementById('dev-version-tag'); if(tag) tag.textContent=APP_VERSION;
  try{
    var key='wb_start_seen_'+APP_VERSION;
    if(!localStorage.getItem(key)){
      document.body.classList.add('start-new-user');
      window.setTimeout(function(){ try{ localStorage.setItem(key,'1'); }catch(e){} },12000);
    }
  }catch(e){ document.body.classList.add('start-new-user'); }
})();
// F1 remains fully implemented and is launched from the CAR > SKILL branch, but it is no longer an Arcade cabinet.
(function hideRetiredF1Cabinet(){ var el=document.getElementById('pls-f1-slot'); if(el){ el.innerHTML=''; el.style.display='none'; } })();
// RULES (last updated 2026-09-22):
// 1. For any major update, increase the 1st number and clear out the rest, for any minor updates, increase the middle number and clear out the one to it's right, for any patches and bug fixes, increase the number to the very right only.
// 2. Every version change MUST be reported in the CHANGELOG array (visible in Developer Options under the changelog section). This applies to anyone editing this code — no version bump should ship without a corresponding changelog entry.
// 3. Every rule update or addition must include a date stamp (YYYY-MM-DD) next to the updated rule.
// 4. Workbench is a file containing multiple programs. It is not and/or should be considered a game. It is a tool. (Updated: 2026-09-25)
// 5. Nobody may delete, remove, overwrite, or intentionally discard existing code, features, data, or files unless that deletion/removal has been explicitly authorized. (Updated: 2026-09-25)
// 6. These rules apply to anyone editing this code.
// Best-effort changelog reconstructed from conversation history (per-message
// screenshots), not an exact build log — entries before 5.0.0 predate the
// version-numbering scheme, so they're labeled "pre-5.0" instead of guessing
// numbers that were never actually assigned at the time.
const CHANGELOG = [
  { v:'5.59.4', note:'F1 Cockpit depth and sun update (2026-10-13): the sun now has a real position in the world, so it swings across the sky as the car turns round the track (the sky, hills, trees and grandstands now rotate with the road instead of sliding a few pixels), and it lights the cockpit from its angle: rim light and shadow sides on the halo, tyres, nose, wheel and bodywork, a shadow of the halo strut on the nose, glare on the screen, mirrors and road, a warm haze and lens flare when you drive toward it, and rival car shadows that fall away from it. The halo is now a shaded, tapered 3D tube. Your head now moves with the cornering G-force: in a right turn the view moves left, in a left turn it moves right, and near parts (wheel, halo) shift more than far parts (nose, tyres, front wing, world), so everything has parallax. Nothing was removed.' },
  { v:'5.59.3', note:'F1 Cockpit road now follows the real track (2026-10-13): the road in the live feed used to bend from a made-up wave, so it could curve right while the prompt and map said left. It is now projected from the actual track points (the same ones the minimap and the TURN LEFT / TURN RIGHT prompts use), so left turns bend the road left and right turns bend it right, starting from the point you are at on the lap. Each turn prompt now sits on a real corner (nudged up to six points from its old slot) so its direction agrees with the map marker and the road bend. The sky and hills pan with the bend. Nothing was removed.' },
  { v:'5.59.2', note:'F1 Cockpit fix and slim-down (2026-10-12): your car is now complete, with a front wing, bodywork and a full nose cone, and the halo arms land on the cockpit rim. Rival cars were rebuilt: they now move at the same pace scale as you (before they circled the track about three times faster than you could ever drive), start on the grid just ahead of you, shrink with true perspective, run in lanes beside your nose and tyres so none are half hidden, and slide past your side when you overtake. To lighten the game, the old unused cockpit and rival drawing code was deleted (authorized), and the sky, hills, trees and vignette are drawn once and reused instead of every frame; the glow effects now use cheap overlays. Graphics are otherwise the same.' },
  { v:'5.59.1', note:'F1 Cockpit realism update (2026-10-12): the live feed now has a scrolling daylight track with red/white kerbs, gravel, walls and ad boards, sky with sun and clouds, hills, trees, grandstand and pit building, camera shake, speed streaks and a vignette. Rival cars are redrawn with shaded bodies, tyres, rear wings and rain lights, drift laterally, and now pass by your side window when you overtake them. The cockpit was redrawn from real F1 references: halo with centre strut, carbon weave, front tyres with Pirelli band and wishbones, mirrors, nose cone, and a full steering wheel with rev LEDs, LCD, coloured buttons, rotary dials and gloved hands. The old renderers are kept as an automatic fallback. Nothing was removed.' },
  { v:'5.59.0', note:'Infinite defenses finished and fixed (2026-10-11): House, Farm, Mine, Workshop, Market and Armory work again (an older script outside the game was catching the clicks and then failing); they now use the same green/red placement preview as defenses, and Workshop, Market and Armory open their menus when you click the placed building. The Watch Tower is a real timber tower on a stone base with a ladder, a roofed lookout, a flag and a lantern, and a helper stands in it while it is manned. Torches now give off light at night: a flickering flame, a halo, a glow on the ground and real light on nearby blocks. Walls are real oriented blocks that you can turn (R, Shift+R, [ and ]), and they snap onto towers and onto each other so a line of walls can join up (Snap button to turn this off). When your castle falls or the king dies a defeat screen shows your run: day and waves survived, zombies killed, damage dealt and taken, wood and iron gained, helpers, troops, siege weapons, buildings and defenses built, with Play again and Main menu buttons. Fixed a shaded box on wide screens: the screen vignette was capped at 1280 pixels wide and now covers the whole view.' },
  { v:'5.58.0', note:'Block World visuals and siege effects (2026-10-10): sky grade with a golden sun, warm dawn and dusk horizon, moonlit nights and a blood sky on zombie nights; bump-mapped blocks with a pixel grain; sun glow and drifting ambient motes (pollen by day, fireflies at night, embers on blood nights); rock explosions, catapult and crossbow effects with recoil and small camera shake. (Logged late: this entry was missing when 5.58.0 was made.)' },
  { v:'5.57.0', note:'Performance monitor and Assistant memory lock (2026-10-10): Developer options has a new Performance monitor section. Switch it on and a small FPS / frame time / memory / game speed readout shows on every page. With Auto quality on, it lowers game quality one step at a time when the device struggles (Full, then Reduced, which turns Shaders off and stops decorative background animation, then Lite, which also draws Block World at lower resolution) and puts quality back slowly once things run smoothly, which helps at 10x speed on a Chromebook; turning the monitor off restores Full. Manual quality buttons are there too. The Assistant memory is now locked: adding, deleting, clearing, importing or restoring a memory (from the Developer tab, the Assistant page, the Save this exchange buttons, or a complete save) opens a code prompt first, and nothing changes unless the correct code is typed by a person. Wrong codes change nothing and five wrong tries pause the prompt for 15 seconds. This is a client-side lock like the other gates, not a security boundary. Also fixed: the Assistant page memory card could not see the memory at all (its list stayed empty and Save memory did nothing), and complete saves skipped the memory; both now work.' },
  { v:'5.56.0', note:'Infinite boss nights, defenses with crews, weather and blood moons (2026-10-10): every 10th wave (Day 19, 29 and so on) a boss zombie arrives with its own health bar at the top of the screen; beat it before dawn for coins or rare Gold and Diamond blocks (a Claim button appears in the Classic world to put them in your hotbar, which now has Gold and Diamond slots on keys 6 and 7). Defenses are rebuilt inside the game: Wall, Tower, Torch and Demolish plus a new Trap (20 wood, six spike hits, slows and hurts zombies); your helper soldiers now man towers at night (towers fire twice as fast and hit harder) and repair damaged walls, towers and traps, refilling traps, and go back to gathering wood when there is nothing to do. Weather: each Infinite day is clear, rainy or foggy; rain slows zombies and draws rain, fog shortens how far you can see and hides far zombies and weakens tower range. Some nights from wave 3 are a blood moon (red moon and sky, announced that morning) with twice as many zombies. Nothing was removed; the old Wall, Tower, Torch and Demolish buttons are hidden because the new ones replace them.' },
  { v:'5.55.0', note:'Watch Later, history and a Block World clip recorder (2026-10-10): Media > Video > Online now has Search, Watch later and History buttons. Tap the clock on any video (or the Watch later button while it plays) to save it, then replay it in one tap without searching again; everything you play is also kept in History (the last 60). Block World (both modes) has a new Record clip button in the top-left corner: press it to start, press again to stop, and the clip is saved straight into Media > Video > Library where you can play it back (it stops by itself after 5 minutes or if you leave Block World; if the browser storage is full the clip is downloaded instead). Nothing was removed.' },
  { v:'5.54.1', note:'Online video now actually plays (2026-10-10): YouTube refuses its embedded player on pages opened as a local file (error 153), so the Online page now plays videos as a plain video file streamed through a public server, which works from a local file; it tries several servers at once and moves on if one fails, and a quality picker appears when more than one size is offered (usually 360p, sometimes 720p). Switch player cycles direct stream, YouTube embed and alternate embed (the YouTube embed is used first when Workbench is opened from an http/https address, and the app switches to the direct stream by itself on error 153). The server list also refreshes from the Invidious directory when online. Nothing was removed.' },
  { v:'5.54.0', note:'Infinite 10x speed and online YouTube-style video (2026-10-09): Infinite mode now has a 10x speed button next to the 2x button (pressing one switches the other off; both only show in Infinite and reset to 1x when you leave; if the device cannot keep up, 10x eases off instead of freezing). Media > Video has a new Online page, now the first and default page: it checks that you are connected to Wi-Fi, lets you search YouTube or paste a link, and plays videos straight from YouTube over the internet (nothing is downloaded). Search uses your own YouTube Data API key (saved in this browser only) or, without a key, free public search servers that are sometimes down. If YouTube refuses to embed a video, Open on YouTube and Try alternate player are one tap away. Library, Sync and Share are unchanged. Nothing was removed.' },
  { v:'5.53.1', note:'Infinite 2x fix, scrolling and AI access-code rule (2026-10-08): the Infinite mode 2x speed button was missing because its code loaded before the game and could not see it; it now lives inside the game, shows next to the build buttons only in Infinite, and resets to 1x when you leave. Every page (tab) now scrolls when its content is taller than the screen (the Block World play screen keeps its own touch controls and is the only one that does not scroll, and arcade pop-up screens now scroll too). New AI Access Code Rule in Developer Options (Rules list and AI Memory System): no AI may edit anything or do anything unless the user has entered the access code first. Nothing was removed.' },
  { v:'5.53.0', note:'Assistant files and summary, weekly focus, badges (2026-10-08): Assistant My files - drop .txt or .md files into the Local Memory card and the best matching passages are added to your questions automatically (kept under about 15 percent of the model context, source file and part shown under the reply, all stored in this browser, also used by the memory-only brain). Assistant auto-summary - when a chat passes about 75 percent of the context the older messages are condensed into a pinned summary at the top of the chat (kept in the prompt, shrinks itself if it grows, Forget summary button) instead of being dropped. Weekly focus on Start - wrong answers from flashcards, the notes quiz, Spanish, Algebra and Type Rush are collected for 7 days into one list with one-tap practice; two right answers in a row clear an item. Badges on User / Saves - 20 cross-area badges (Day 10 survivor, 7-day streak, deck builder, Fixer-Upper and more) that pay coins into the shop balance, with a daily-visit streak counter and unlock toasts. Rule checker now tracks the new panels.' },
    { v:'5.52.0', note:'Infinite 2x speed, wave report card, F1 tyres and corner coach (2026-10-08): Infinite mode has a 2x speed button (only shown in Infinite, resets when you leave); after every night a report card shows zombies defeated, walls lost, castle health, the dawn bonus, coins earned (2 plus 2 per wave, up to 25) and your best wave, which is saved. F1 now has three tyre compounds (Soft grips most but wears fastest, Medium, Hard) with a live wear readout, a T key to choose the next set and a P key to pit at the next start/finish line (a 2.6 second stop that fits fresh tyres), plus PIT and TYRE buttons on touch screens. After every lap a corner coach shows how long you waited after each warning (green, yellow or red), flags missed corners and compares you with your last 5 laps, saved on this device. Nothing was removed.' },
  { v:'5.51.0', note:'Block World defenses and phone controls (2026-10-08): Infinite mode gains Wall (15 wood, zombies cannot walk through and chew it down), Tower (60 wood, shoots the nearest zombie) and Torch (10 wood, slows zombies nearby), all placed with the green/red preview; a Demolish mode removes your own buildings and defenses for a 50% wood refund; press R (or the rotate button) to turn a building while placing. On touch screens Block World now has an on-screen move stick, turn and zoom buttons, and placement is drag to aim then tap Place, Rotate or Cancel. F1 already had on-screen controls and is unchanged. Defenses are not saved with the world yet. Nothing was removed.' },
  { v:'5.50.0', note:'Developer layout and smoke test (2026-10-08): added a second checker under the rule checker in Developer Options. It finds Block World buttons and HUD pieces that overlap or sit off screen (open Classic or Infinite first, it tests the screen size you are on), duplicate element ids, errors the page has logged since it loaded, tab buttons that point at missing panels, and how much browser storage is used. The new checker is also on the tracked-feature list. Nothing was removed.' },
  { v:'5.49.1', note:'Block World layout fix (2026-10-08): the Day/night/zombie timer banner no longer stays on screen after you leave Block World (it was only hidden by the game loop, which stops on other tabs); the Block World buttons in Classic and Infinite are now stacked in two tidy columns (left: mode, status, save/load; right: performance, shader, rain, follow king, Instructions) so none sit on top of each other, and the build row and stats wrap instead of overlapping on narrow phone screens. Nothing was removed.' },
  { v:'5.49.0', note:'F1 Cockpit update (2026-10-07): the car now has 8 forward gears like a modern F1 car (was 6), with the speed bands, rev display and shifting spread across all 8; the corner warning time now scales with speed (2 seconds at 50 mph or less, 4 seconds at 100 mph or more, smoothly in between) instead of a fixed 3 seconds; and the generic buzzing engine tone was replaced by a layered, saturated and filtered high-revving V10-style sound. Nothing was removed.' },
  { v:'5.48.0', note:'Block World update (2026-10-07): the Stone currency was replaced by Iron everywhere in Legacy and Infinite (HUD, mines, markets, docks, ships; the Stone block material and terrain are unchanged); the always-on instruction text is now behind an Instructions button that opens a pop-up; and buildings are placed by you: choose House, Farm, Mine, Workshop, Market or Armory, hover anywhere to see a see-through copy of that building (green = free, red = blocked by a building, farm, castle, ore, water or the territory edge), and click to place only on green (right-click or Esc cancels). Workshops now actually get built, and clicking one opens its production menu. Docks and bridges still pick their own spot. Nothing else was removed.' },
  { v:'5.47.2', note:'Assistant lock fix and rule checker upgrade (2026-10-07): fixed the Assistant lock page staying on screen after a correct access code. Two CSS rules forced the lock page to display with higher priority than the rule that hides it once unlocked, so the hide rule now matches the same selector strength. The Developer rule checker (added in 5.46.0, checked and still present) gained a check that the Assistant lock page actually hides when unlocked. Nothing was removed.' },
  { v:'5.47.1', note:'Infinite world rework (2026-10-07): Infinite now builds one island in the middle of the sea (grass, then a ring of sand, then water; no rocks, cliffs or ore) with only your castle and no other kingdoms. It shares Legacy mechanics (building, resources, units, day/night) but not its AI-kingdom gameplay, so there is no victory screen. Zombies start on the night of Day 10 and each day brings more of them (5, then +3 per day, up to 100); they leave small fading blood-drip footprints as they walk. The top banner shows the time to night and the wave. Nothing was removed.' },
  { v:'5.47.0', note:'Infinite world update (2026-10-07): Infinite > Enter World now runs on the Legacy engine, so it looks and plays like Legacy (terrain, HUD, building, kingdoms, units, and every Legacy update) with your castle and king in the middle of the map. From the night of Day 10, a zombie wave attacks every night (bigger each night); a banner at the top shows the time until night and the current wave, and surviving until dawn pays wood. Load Save File still opens the classic free-build sandbox. Nothing was removed.' },
  { v:'5.46.0', note:'Tools update (2026-10-07): added the Developer rule checker (badge/APP_VERSION, changelog entry, filename, patch rollover, tracked features present, changelog not shortened); a Back up everything / Restore button in User / Saves with a reminder every 10 minutes; and a Coin shop with three new themes and three accent colors bought with arcade coins. Fixed a bug from 5.44.0/5.45.0 where the Assistant Save-as-Project-Rule button and the /help, /note and empty /summarize commands could not reach the Assistant code (added window.wbBridge). Nothing was removed.' },
  { v:'5.45.0', note:'Assistant and Arcade update (2026-10-07): added Assistant slash commands (/quiz, /explain, /summarize expand into full prompts; /note saves to Study Notes; /help lists them), and an Arcade daily challenge: one rotating game per day with today\'s best score, a day streak, a recent-days leaderboard stored locally, and a DAILY tag with best and streak on that game\'s cabinet tile. Nothing was removed.' },
  { v:'5.44.0', note:'Study and Assistant update (2026-10-07): added spaced-repetition flashcard review (missed cards return in 10 minutes, known cards are pushed days out) with a due-today count on the Start tab; added a fill-in-the-blank quiz built from Study Notes whose wrong answers are added to the flashcards; and the Assistant now shows which saved memories each reply used and offers to save the exchange as a Project Rule or Study Note. Nothing was removed.' },
  { v:'5.43.2', note:'Lock screens and Developer background (2026-10-06): the Assistant lock now matches the Developer options lock (a card inside the page with the navigation still visible, covering the whole content area edge to edge). Both lock cards have a blue glow that dims up and down, and much bigger titles in the style of Welcome Developer (the Developer lock title now uses the same Dev accent word). The Developer background squares now drift diagonally from top left to bottom right and glow with a slow breathing pulse; the Assistant lock uses the same moving grid. Reduced-motion settings still turn the animation off. The Back to Start button on the Assistant lock is hidden because the navigation is visible again; nothing was removed from the code.' },
  { v:'5.43.1', note:'Layout patch (2026-10-06): the Start tab now scrolls (its container was sized to its full content and clipped, so it could never scroll; it now fills the window and scrolls inside it). The Assistant lock screen now covers the entire window edge to edge (a generic tab-content width limit was shrinking it and leaving the left and right sides uncovered), has a dimmed blurred backdrop, and gained a Back to Start button so the navigation stays reachable. Page content on every tab, including Data and Developer Options, is now centered in the middle of the window instead of hugging one side. No existing features, data, or code were removed.' },
  { v:'5.43.0', note:'F1 cockpit detail overhaul (2026-10-05): redrew the first-person cockpit with a carbon-fibre weave, halo and centre strut, nose cone and front wing, front tyres with suspension arms, wing mirrors and carbon side cowls. Rival cars are now detailed rear views with rear wing and endplates, DRS slot, rain light, halo, helmet, airbox, diffuser and rear tyres. The steering wheel is now a real F1-style wheel (display, LED rev lights, buttons, rotaries, gloved grips) and it turns with steering input in both the cockpit view and the HUD wheel. All telemetry and controls are unchanged.' },
  { v:'5.42.4', note:'Detailed cover art (2026-10-05): redrew every Arcade cover with much more detail. Each cover now has a lit background with an accent-color glow, a soft bevel and drop shadow so shapes look raised, a vignette, a gloss highlight, and film grain, plus game-specific scene detail such as lit windows and motion lines in Rooftop Rumble, ripples, bubbles and reeds in Fishing Hole, crystal facets, sparkles and light rays in Crystal Garden, a floor grid and beam glow in Laser Dodge, and kerbs and a racing line in Apex Hunter.' },
  { v:'5.42.3', note:'Arcade cover art (2026-10-05): every cabinet in the Arcade library now has its own illustrated cover that shows what the game is about, for example a rooftop duel for Rooftop Rumble, a lit pit-lane tire for Pit Stop Pro, a laser-cut room for Laser Dodge, and a raked sand circle for Zen Garden. Covers are drawn as scalable vector art in each category color, show larger on the game tiles and the detail panel, and fall back to the old icon if a cover is ever missing.' },
  { v:'5.42.2', note:'Start page notice, animated background and richer game descriptions (2026-10-05): added a notice above the Tutorial card stating that Workbench is a tool made for studying and for people without internet access, is not a game or an AI, and must not be shared (versioning and tracking are used to enforce this). Replaced the Start background with glowing blue lines that wander across a dev-tools-style grid, light up the squares they pass through, leave a long fading trail, and pulse in brightness. Rewrote the Arcade descriptions for 66 games into fuller, store-page-style summaries shown in the library detail panel.' },

  { v:'5.42.1', note:'Layout fixes and versioning rule (2026-10-05): the Start page is now centered, and the F1 Cockpit window is wider with a re-flowed layout so the steering wheel and panels are no longer cut off. Version numbering now rolls every 10 patches into a minor update (5.40.9 + 1 = 5.41.0), and this release is 5.41.0 + 1 more patch for the 5.40.x changes; the rule is saved in Developer Options under AI Memory System.' },
  { v:'5.40.23', note:'Arcade library remake (2026-10-04): the Games view is now a Steam-style library. A left list holds Library, All games, Favorites, Recently played, the Patience, Fast, and Skill collections, and Coming soon. The middle shows cover-style tiles on horizontal shelves, with a circling bright-blue ring on the selected tile. A details panel shows the description, best score, difficulty, a Play button, and a favorite toggle, becoming a bottom sheet on phones. Search, difficulty, favorites, scores, and recents all use the existing profile data, and Play now also records Recently played. The original cabinet code is kept intact but hidden, the car guys and Block World tabs are unchanged, and Arcade cyan is now the classic bright blue (#1fb6ff). The Arcade tour steps were updated to match.' },
  { v:'5.40.22', note:'Welcome tour rewrite (2026-10-04): the first-visit tour is now a friendly ten-step walkthrough with a titled card, a plain-language description of each area, and a Try it tip showing how to interact. It covers Start, the tab bar, Start cards, Educational, Type Rush, Media, Arcade (including its filters, difficulty, and favorites), and User / Saves. The Assistant and Developer options tabs are intentionally left out of the tour because they are for the owner. The old fixed seven-tab caption was removed, the final button now reads Let\u2019s go, and the Take the tour replay button is unchanged.' },
  { v:'5.40.21', note:'Type Rush finger guide realism (2026-10-04): replaced the thin claw-like fingers with proper hands: thicker, shorter, rounded fingers with knuckles, a palm, a thumb, and a wrist and forearm that fade out below. When the next key is far from the home row, the whole hand now slides and turns at the wrist while the active finger reaches onto the glowing key, and the other fingers follow the hand like a real typist. The resting hands, line-art style, on/off toggle, Shift and Backspace hints, and all telemetry are unchanged.' },
  { v:'5.40.20', note:'Type Rush finger guide restyle (2026-10-04): the guide now draws quiet line-art hands resting on the home row of a simpler keyboard, in the style of TypingClub. The active finger outlines in bright blue and reaches onto the glowing target key, thumbs handle the space bar, and everything else stays dim so it is not overwhelming. Removed the rainbow finger colors, number row, and dashed pointer line. The Finger Guide toggle, Shift and Backspace hints, and all telemetry are unchanged.' },
  { v:'5.40.19', note:'Type Rush redesign (2026-10-04): black background with light-grey phrase letters, every former cyan or mint accent is now bright blue, and the Type Rush title is bright blue with a ring circling the whole title like the Educational cabinets. Added an optional Finger Guide under the phrase that shows an on-screen keyboard and both hands, highlights the next key and the finger to use (including Shift and Backspace), and can be switched on or off from the button row with the choice remembered. All telemetry is kept: WPM, accuracy, progress, overall accuracy, words typed, best WPM, and Completed Phrases, with the live stats row moved directly under the overall bar so it stays visible above the guide.' },
  { v:'5.40.18', note:'Arcade, Educational, and Type Rush patch (2026-10-04): Laser Dash lasers are now telegraphed with a warning line, never spawn on top of the player, expire, and are capped so runs stay survivable, and its controls (plus Tank Barrage and Drift King) now work again after a restart; Asteroid Run, Blade Fall, Neon Jump, Volley Blitz, Spike Surge, Dash Clash, Mecha Brawl, Arrow Storm, Grid Racer, Bomber Raid, and Star Pilot now offer Play Again after game over; Maze Weaver moves one step per tick instead of racing across the maze; Chess Duel works again (every square was sending the wrong coordinates) and no longer freezes when the AI can take your king. Educational cabinet lettering is now dark and readable at rest, and cabinets now keep a selection with a new inner background, glowing top-right lettering, and a circling bright-blue ring. Type Rush phrases are rendered word by word so whole words wrap instead of running off screen, and ten new phrases on varied themes were added.' },
  { v:'5.40.18', note:'Reduced screensaver video quality and added offline browser caching (2026-10-04): the selected clip box now dims in a slow breathing cycle while an outer white ring circles it indefinitely; renamed X Clip to X testing and removed the word supplied from the menu; clicking a clip now selects it, a second click asks Play Screensaver? inside the box, and a third click starts the screensaver immediately, bypassing the inactivity timer. Added a Developer Options AI Memory entry stating that all AI, LLM, or human editors must follow the password protocol before altering or changing the code.' },
  { v:'5.40.16', note:'Screensaver clip chooser (2026-10-03): added a Screensaver clip section to the Workbench version-badge menu so the AFK screensaver can play either the original Mustang GTD video or the new 5-minute X clip (1080p, re-encoded at higher quality), with the choice remembered between sessions and a white breathing layer marking the selected clip. Both clips remain embedded; the chosen clip is decoded only when the screensaver starts.' },
  { v:'5.40.15', note:'Assistant/Type Rush layout patch (2026-10-01): centered the Assistant workspace, made the Assistant lock fully cover the viewport so underlying content cannot peek around it, and forced the Type Rush phrase display to wrap within its container.' },
  { v:'5.40.13', note:'Educational hover glow refinement (2026-10-01): increased the bright-blue hover glow to approximately 60% peak visibility and kept the breathing effect on a smooth 2-second settle while preserving white Type Rush labels and the existing gray card/blue border.' },
  { v:'5.40.11', note:'Educational hover glow refinement (2026-10-01): changed the hover lettering to bright blue and added a faint breathing text glow that smoothly settles over 2 seconds while preserving the existing gray card and blue border.' },


  { v:'5.40.7', note:'Arcade redesign (2026-10-01): rebuilt the Arcade presentation around the Workbench Start-card system with cleaner card hierarchy, shared light-card treatment, dark hover states, the single #1fb6ff accent, quieter Arcade chrome, and responsive layouts while preserving existing cabinet IDs, launchers, filters, favorites, recents, and Block World routing.' },
  { v:'5.40.9', note:'Educational hover refinement (2026-10-01): changed cabinet hover to the requested gray background and #1fb6ff border, with TYPE, Type Rush, and SPEED · ACCURACY switching to bright cyan; Type Rush and SPEED · ACCURACY enlarge only while hovering.' },
  { v:'5.40.10', note:'Start/Educational visual refinement (2026-10-01): made Educational hover cabinet labels fully white, enlarged and brightened the cabinet top identity mark on hover, removed “presents” from the Start hero brand line, centered and enlarged Welcome to Workbench, and enlarged/brightened the Start description and Take the tour button.' },
  { v:'5.40.8', note:'Assistant/Educational usability patch (2026-10-01): restored the Assistant desktop arrangement with AI description at upper left, Local Memory at lower left, Brain controls at the top center, a wider central AI sheet, and Messages Stats on the right; widened computer layouts, changed Type Rush entry to a wrapping field so text moves onto new rows, and standardized Educational cabinet hover emphasis with #1fb6ff primary labels and larger black secondary metadata.' },
  { v:'5.40.5', note:'Bug fix (2026-09-30): fixed the Educational compatibility script syntax error, moved the shared game overlay to document.body, and delegated Educational cabinet clicks from a stable container so Type Rush, Python, Spanish, Algebra, and the other Educational cabinets remain launchable after UI rebuilds.' },
  { v:'5.40.4', note:'Workbench UI organization patch (2026-09-30): rebuilt the shared interface into a simpler dense dashboard system inspired by the supplied reference, using flat bordered cards, clearer hierarchy, compact navigation, consistent accent highlights, and organized Assistant/Developer layouts without changing underlying game or control logic.' },
  { v:'5.40.6', note:'Assistant access correction (2026-09-30): moved the Assistant password gate into the Assistant page itself to match the Developer access pattern, removed the full-screen blocking gate, and simplified the guided-tour wording so Assistant is not explained and Developer is described by telemetry.' },
{ v:'5.40.2', note:'Arcade detail and F1 cockpit organization patch (2026-09-29): corrected the F1 circuit initialization path, reorganized the F1 center display into highlighted component quadrants without changing its telemetry or controls, and enriched arcade presentation with consistent component framing plus a more detailed Crystal Garden visual treatment.' },
  { v:'5.40.1', note:'Patch release (2026-09-29): corrected the F1 Cockpit circuit selector initialization so the four configured circuits load before the chooser is rendered, and tightened F1 input cleanup to prevent duplicate touch/visibility handlers across sessions.' },
  { v:'5.40.0', note:'Interaction and arcade consolidation update (2026-09-29): fixed the horizontal/vertical navigation preference so both layouts physically switch, added consistent hover outlines for interactive surfaces, fused several lightweight arcade concepts into multi-stage hybrid cabinets while preserving Rooftop Rumble, and hardened Assistant behavior so it requests an access code without disclosing the credential.' },
  { v:'5.39.0', note:'UI refinement (2026-09-29): moved primary navigation into a compact left-side tool rail, emphasized the Developer heading with a larger blue Dev accent, added contextual faded identity marks to Educational cabinets including a TI-style Algebra mark, and strengthened credential confidentiality in Developer rules.' },
  { v:'5.38.0', note:'Major UI redesign (2026-09-29): Workbench moved to a professional desktop-tool visual language inspired by creative and engineering applications — compact navigation, neutral panels, restrained accents, flatter controls, clearer hierarchy, simplified Start/Media/User surfaces, and cabinet-style Educational tools.' },
  { v:'5.37.0', note:'Major UI restructure (2026-09-29): removed the Arcade Educational subtab and its duplicate panel, moved Type Rush, Python Lab, Spanish, and Algebra 1/2 into the main Educational cabinet wall, and rebuilt the app chrome/pages around a simpler unified cabinet/card system.' },
  { v:'5.36.0', note:'Minor update (2026-09-29): simplified the overall UI, consolidated Arcade Educational navigation into the main Educational tab, hardened the F1 Cockpit controls/session lifecycle, and updated the Workbench Deletion Rule to require the authorized developer gate for code modification requests.' },
  { v:'5.35.0', note:'Minor update (2026-09-27): refreshed Start visual depth and full on/off Stark Enterprises presentation glow, simplified Educational navigation while bringing Quick Calculator, Text Counter, Type Rush, Python Lab, Spanish, and Algebra 1/2 into Educational, enlarged Arcade platform logos, added a direct Block World return control, restored diagonal Developer grid motion, and cleaned up Assistant spacing/background presentation.' },
  { v:'5.34.0', note:'Minor update (2026-09-27): reorganized Workbench into Start, Educational, Media, Arcade, Assistant, User / Saves, and Developer Options; moved Block World access into Arcade; added local Assistant memory UI, Assistant access lock, educational workspace tools, Media Studio/Utility Bay, unified save bundle support, and refreshed Assistant/Start/Developer visuals.' },
  { v:'pre-5.0', note:'Procedural wood grain and stone/mortar textures added, applied only when shaders are on.' },
  { v:'pre-5.0', note:'House visuals fixed: distinct peaked roof so houses read as houses from any camera angle, not a gray/brown blob.' },
  { v:'pre-5.0', note:'Honest resource meters on the AI tab: live RAM (JS heap) bar and a real main-thread-load bar, with a note on why CPU/GPU% can\'t be read from a browser.' },
  { v:'pre-5.0', note:'Face culling: touching block faces are dropped from the geometry instead of always drawing all 6 sides.' },
  { v:'pre-5.0', note:'FPS/Hz counter box added top-right, plus a plain on/off shader toggle.' },
  { v:'pre-5.0', note:'Weather system: rain countdown, blocky vs. realistic rain tied to the shader toggle, day/night sun & moon arc.' },
  { v:'pre-5.0', note:'Villager/building system: place houses and tree farms, assign villager jobs, population grows with housing.' },
  { v:'pre-5.0', note:'Model info panel added: parameters, download size, context length, and pros/cons per brain.' },
  { v:'pre-5.0', note:'Verified true offline operation (tested with wifi off) once a local model is cached in the browser.' },
  { v:'pre-5.0', note:'Local, fully-offline AI assistant tab: pick a brain (Small/Medium/Large local model, home server, or Gemini), with a live download progress bar.' },
  { v:'5.0.0', note:'Semantic version badge added (bottom-right, always visible) and the major.minor.patch convention adopted.' },
  { v:'5.0.0', note:'Message stats panel added to the AI tab: live token estimate, context usage, estimated reply time/length, measured tok/s, conversation timer.' },
  { v:'5.0.0', note:'Fake per-face shading (bright top, darker sides, darkest bottom) so flat-shaded blocks read as 3D instead of one flat color.' },
  { v:'5.0.0', note:'Fully-buried blocks removed from the scene graph entirely (not just zero-triangle) to cut per-frame traversal cost.' },
  { v:'5.1.0', note:'Arcade tab (placeholder) and password-gated Developer options tab added, with live build stats and this changelog.' },
  { v:'5.2.0', note:'Arcade cabinet #1 built: "Rooftop Rumble", a 2D fighting game with articulated (torso/hips/shoulders/elbows) fighters, drawn on canvas — 2-player local, or vs. CPU (easy/hard). Cabinet loads lazily on tap, opens fullscreen, and unloads back to an idle tile when closed. Grid has 3 more open "next cabinet" slots for future games.' },
  { v:'5.2.1', note:'Rooftop Rumble fighters got a detail pass: face (brow, eye highlight, nose, mouth, ear, bandana tail), pec/ab shading, a belt with buckle, stitched vest trim, muscle highlights on upper arms/thighs, kneepads, wrist wraps, real gloved fists with knuckle creases, and shoes with soles + laces.' },
  { v:'5.2.2', note:'Fighters now breathe and sweat. A fatigue value builds from throwing/landing hits and rises as HP drops, driving: visible chest rise/fall (shoulders shift with each breath, faster and deeper when winded), an open panting mouth with a puff of visible breath on hard exhales, glossy sweat sheen and sliding beads on the forehead/temple and upper arms once fatigue passes a threshold, and a flicked sweat droplet (with real gravity) on every clean unblocked hit.' },
  { v:'5.2.3', note:'Walk cycle rebuilt to read as a step instead of a scissoring sprite: knee flexion is now phase-shifted from hip swing, arms carry a matching elbow bend, and a twice-per-stride vertical bob plus side-to-side hip sway were added (shadow stays ground-anchored while the body shifts above it). The bandana tail and a new hanging belt sash are both real hinged cloth now — a light damped pendulum driven by velocity and torso lean swings them behind the fighter\u2019s motion instead of holding one fixed drawn shape. Added a subtle procedural skin-grain texture (pores/creases) across the head, torso, and bare limbs.' },
  { v:'5.3.0', note:'Rooftop Rumble now keeps a win/loss/draw record with a KO-to-win ratio (KOs vs. clock-outs), shown on the Arcade tab and the mode-select screen. Closing the cabinet offers to export that record to a small .json file. New "Log in" tab (between Arcade and Developer options) re-imports that file to restore your record and display name, here or on another device, with a one-click reset back to a fresh Guest profile.' },
  { v:'5.3.1', note:'Replaced the export-on-close popup and the "Log in" tab with one "Update / Export / Import" tab (same spot, between Arcade and Developer options). It holds two separate cards \u2014 Block World and Arcade \u2014 each with its own export/import file, so loading one never touches the other. World export/import here calls the exact same save functions as the canvas-corner Save/Load buttons, which still work too.' },
  { v:'5.3.2', note:'Rooftop Rumble fighters reworked for a gritty, Mortal Kombat-style realism pass: detailed face (iris/pupil/highlight eye, eyebrow, nose bridge + nostril, lips/teeth, cheekbone shading, jawline, facial stubble), defined musculature (deltoid caps, separate pec bellies with cleavage, 6-pack abs with linea alba, oblique striations, biceps peak, quadriceps separation, calf bulge, visible forearm veins when fatigued), progressive damage system (rib bruising, under-eye bruising, blood drips on face, torn vest at high damage, accumulating blood decals on torso, blood pool on ground), blood splatter particles on every hit, darker grittier skin tones, darker atmospheric arena with stronger vignette and no window flicker.' },
  { v:'5.4.0', note:'Arcade cabinet #2 built: "Neon Sprint", a top-down arcade racer with a procedurally curving road, traffic to dodge, roadside scenery (trees, lamp posts), detailed car rendering (body gradient, windshield, headlights/taillights, wheels, driver), speed/distance/time HUD, 3 crash lives, and win/loss record tracking. Profile system updated to track both cabinets. Three difficulty modes: Time Trial, Traffic Dodge, and Hard Traffic.' },
  { v:'5.4.1', note:'Neon Sprint: added Infinite mode — endless road with no time limit, moderate traffic, reach 5000m to win or crash 3 times to lose. Win/loss results tracked in profile and compatible with import/export.' },
  { v:'5.5.0', note:'Tab reorder: Videos tab added between Block World and Arcade. Tab order is now Block World, Videos, Arcade, AI Assistant, Update/Export/Import, Developer Options. Videos tab shows "Under development" placeholder.' },
  { v:'5.6.0', note:'Videos tab fully built: offline video library using IndexedDB (import, play, delete, storage usage). Peer-to-peer video sharing via WebRTC over local hotspot — host generates a connection code, friends join with it, videos transfer directly between devices with no internet needed after initial connection. Supports multiple videos, chunked transfer with progress indicators.' },
  { v:'5.6.1', note:'Videos Share tab: added "How it works" popup with step-by-step instructions for hosting and receiving. Touch controls added for Neon Sprint (steer by touching left/right side of canvas) and Rooftop Rumble (on-screen buttons for P1 controls — appear automatically on touch devices). Mobile responsiveness improvements.' },
  { v:'5.7.0', note:'Videos tab renamed to Media tab with Music/Video selection. Music player (MP3) marked as Work in Progress. Videos tab unchanged. Removed Google STUN server from WebRTC (no-Google). Six new arcade cabinets: Neon Breaker, Starfall Defender, Circuit Snake, Neon Pong, Meteor Command, Stack Surge. Arcade grid scrollable with 8 cabinets. Scores moved from Arcade tab to new User / Saves tab with vertical layout. Theme selector (5 color themes). Difficulty-weighted leaderboard with scoring formula. Scoring math explainer. Simplified G16 server instructions.' },
  { v:'5.8.0', note:'Achievements system with 24 unlockable achievements (first game played, time milestones, win streaks, score thresholds, special game-specific challenges). Profile picture upload with automatic resize and localStorage persistence. Page time tracker counting seconds spent in the arcade with live display. Shareable profile card generated on canvas with avatar, name, stats, achievements count, and top scores — downloadable as PNG, copyable as text, or shareable via Web Share API. Achievement toast notifications. All 8 arcade cabinets hooked into achievement tracking. Special achievements: clear all bricks in Neon Breaker, reach snake length 20, win Pong 7-0.' },
  { v:'5.9.0', note:'Legacy Mode introduced: medieval survival battle arena with 5 AI opponents, combat system, health bars, and resource gathering. Mode selection modal added to Block World tab — choose between Legacy (medieval battle) and Infinite (sandbox).' },
  { v:'5.10.0', note:'Legacy Mode redesigned with territory system: 5x larger map with 4 territory circles (3 AI kingdoms + 1 player) plus a center circle. Bridge building (100 wood) to cross between territories. Mine building (10 wood) for passive iron income. House (25 wood) and Farm (30 wood) buildings. Armor and sword upgrades from mining ore or passive mine income. Tree regrowth every 3 min (1 min with farm). Ore spawning every 5 min. Unit spawning every 0.5 day per faction. Elapsed time counter replaces countdown timer. Only 3 AI factions instead of 5.' },
  { v:'5.11.0', note:'Legacy Mode major update: Castles added to each kingdom (500 HP) — destroying a castle defeats the kingdom. Tree spawning sped up to every 1 day (2-5 trees, half-day with farm). Player soldiers now auto-gather wood and defend territory without manual commands. Follow the King button — toggles formation mode where soldiers line up behind the player and fight alongside them. Siege Workshop building (40 wood) produces catapult siege units that attack enemy castles from long range. AI factions also build workshops and siege units. Win condition changed: must destroy all enemy castles, not just kill soldiers.' },
  { v:'5.11.1', note:'Versioning rules formalized: renamed VERSIONING INSTRUCTIONS to RULES in both code locations. Added rule that every version change must be reported in the CHANGELOG array visible in Developer Options. Fixed changelog ordering (5.11.0 now correctly listed after 5.10.0). These rules apply to anyone editing this code.' },
  { v:'5.12.0', note:'Major update (2026-09-21): Detailed soldier models with fitted armor, shields, spears, and crossbows. Farm passive income fixed (10 wood per tree spawn cycle). Market building for resource exchange. Armory building for equipping villagers with armor/shields/spears. Workshop menu: choose crossbow (anti-troop) or catapult (anti-castle), both cost resources. Formation system: shields first, spears second, crossbows/catapults last, king last. Follow the King reworked: troops actually follow in formation, go first in battle. Water replaces void in legacy mode with wave animation (shaders on). Troops touching water redirect via bridges. Day tracker in-game and in User tab. Bot Defense arcade game added. More achievements and time-locked background colors. Point-unlockable banners with share card banner. Shader-off optimization for 4GB Chromebooks. Rules now include date stamps.' },
  { v:'5.13.0', note:'Minor update (2026-09-22): New Start tab with visual overview of all features. Tab layout toggle — switch between horizontal (top) and vertical (left-side) tabs, saved in User / Saves. Tab order updated: Start, Block World, Media, Arcade, Assistant, User/Saves, Developer Options. AI Assistant renamed to Assistant. Developer Options gains live controls: UI scale, accent color, fog density, block reach, debug overlay, reduced motion. Bot Defense: zombies 50% slower, shooting changed from auto-aim to manual (SPACE/F or SHOOT button).' },
  { v:'5.14.0', note:'Minor update (2026-09-22): 20 new arcade games added (29 total). 10 slow-paced: Crystal Garden, Memory Match, Color Mixer, Fishing Hole, Dot Connect, Slide Puzzle, Pattern Memory, Tower Builder, Bubble Sort, Idle Farm. 10 fast-paced: Laser Dodge, Ninja Dash, Orb Catcher, Blade Slice, Gravity Flip, Bullet Storm, Platform Jumper, Pixel Runner, Chain Reactor, Rocket Dash. Hover descriptions added to all 29 cabinets. Arcade grid expanded to 3 columns. Profile, achievements, leaderboard, and high scores updated for all new games.' },
  { v:'5.15.0', note:'Minor update (2026-09-22): Arcade hover descriptions now cover the full cabinet card with a slide-up overlay. Color variation added across all sections — accent-colored left borders on cards, subtle gradient tints, and section heading underlines. All borders thickened from 1px to 2px for clearer visual separation. Arcade tab gains left and right sidebars: left has Arcade Guide, Slow-Paced Spotlight, Fast-Paced Spotlight; right has Your Stats (games played, cabinets tried, arcade time, achievements), Top 3 Scores, and Daily Challenge. User / Saves tab gains Quick Stats summary card.' },
  { v:'5.16.0', note:'Minor update (2026-09-22): Arcade reorganized into 3 category columns — Purple (Patience: slow-paced strategy/memory games), Yellow (Fast-Paced: reflex/dodge games), Cyan (Skill: classic arcade action). Each category has a colored header and games aligned vertically below. Sidebar spotlights updated to match category colors. Fixed overlapping borders in Block World (perf-box, shader-toggle, rain-box, follow-king-btn spacing increased) and User/Saves (added gaps between cards). All borders thickened to 2-3px with proper spacing so elements never touch.' },
  { v:'5.17.0', note:'Minor update (2026-09-22): Feature pack — profile system (coins, favorites, recents, high scores, achievements, name, difficulty), game tracking, arcade hover descriptions covering the full cabinet, favorites filter, recently played row, daily challenge, top scores, accent color picker (Users/Saves), 30 placeholder cabinets (59 total), saved data export/import. Achievement system with progress tracking.' },
  { v:'5.18.0', note:'Minor update (2026-09-23): Feature pack — Games/Educational sub-tabs, Type Rush typing drill, Python Lab WIP card, Connect to the Wi-Fi (WebRTC LAN peer-to-peer with share-code fallback), PIXEL DUEL two-player local game, arcade grid fixed back to 3 columns, cabinet category bug fixed (59/59 now decorated).' },
  { v:'5.19.0', note:'Minor update (2026-09-23): Feature pack — Educational restyled as hoverable cabinet cards (Type Rush, Python Lab, Learn Spanish). Type Rush rewritten letter-by-letter so spaces count, using real sentences. Python Lab visual drawing module (CMU-style). Learn Spanish cabinet (WIP). New Specially made for car guys sub-tab (cursive) filtering vehicle games. Seven placeholder cabinets built into real games: Tower of Hanoi, Zen Garden, Turbo Tap, Laser Dash, Sniper Alley, Tank Barrage, Drift King. Wi-Fi Quick Code UI (requires classroom hub). Version/filename rule added to Developer Options rules.' },
  { v:'5.20.0', note:'Major update (2026-09-23): 19 placeholder cabinets made playable (Slide Puzzle, Mine Sweeper, Maze Weaver, Domino Cascade, Color Sort, Nonogram, Jigsaw Relax, Asteroid Run, Blade Fall, Neon Jump, Volley Blitz, Spike Surge, Dash Clash, Mecha Brawl, Arrow Storm, Grid Racer, Chess Duel, Bomber Raid, Star Pilot). New F1 Cockpit game (first-person sequential shifting, gear limits, rev limiter, AI rivals, minimap, turn indicators). Drift King physics rewritten with proper slip angle, kinetic energy, and diminishing returns. Type Rush run mode with auto-next phrase, sidebar history, per-phrase accuracy, overall stats. Python Lab tutorial panel. Car-guys mode shows only Drift King + F1, hides category tabs. AFK screensaver (2-min dim + rotating car showcase). Gmail virus warning fix (custom base64 replaces btoa/atob).' },
  { v:'5.21.0', note:'F1 Cockpit overhaul: fixed keyboard input (WASD/Y/U now responsive via window-level listeners), redesigned bottom HUD with F1-style LED RPM bar and animated shift levers, added Web Audio engine sounds (RPM follows throttle, pitch drops on upshift), fixed minimap rendering. Added Stark Enterprises branding to welcome screen. AFK screensaver now plays actual car video.' },
  { v:'5.22.0', note:'F1 Cockpit: bottom HUD rebuilt as an actual steering-wheel silhouette (rim, three spokes, paddle shifters either side of the hub) with the RPM LEDs set into the hub itself instead of floating below it. Track/minimap enlarged (80px to 130px) and lap distance slowed (~1.8x) so each lap — and the minimap view of it — gives more time to drive.' },
  { v:'5.27.0', note:'Developer Options and UI maintenance: updated the displayed app version to 5.27.0, added Rule 4 clarifying that Workbench is a tool containing multiple programs rather than a game, refreshed the developer rules documentation, and removed the "RACE WORKBENCH" label displayed beside the Workbench name.' },
  { v:'5.28.0', note:'Educational cabinet expansion: Type Rush received a more polished visual treatment, Learn Spanish became a Quizlet-inspired flashcard and quiz cabinet, and a new Algebra 1/2 cabinet was added with flashcards, worked examples, and quiz practice. Educational cabinets now use a consistent four-cabinet layout.' },
  { v:'5.29.0', note:'Educational and F1 refinement: Algebra 1/2 split into separate Algebra 1 and Algebra 2 study tabs with step-by-step reasoning panels, and the F1 Track Map was rebuilt as a live canvas minimap showing the actual track, player position, AI positions, and next-corner marker.' },
  { v:'5.29.1', note:'F1 Cockpit bug fix: moved the live Track Map renderer into the F1 cockpit scope so the minimap no longer throws a runtime error from an unrelated cabinet and the race loop stays functional.' },
  { v:'5.29.2', note:'Workbench visual polish and Developer Options maintenance: refreshed the version history for the latest F1 fix and upgraded the global background with layered gradients, subtle grid lines, ambient glows, and depth while keeping panels readable.' },
  { v:'5.30.0', note:'Motorsport and education expansion: added 20 new Type Rush sentences, added a dedicated 20-phrase Spanish conversation deck, and expanded the F1 Cockpit with richer race-engineering telemetry, tire/brake data, vehicle systems, track conditions, lap delta, and a detailed car-status display inspired by the supplied F1 telemetry reference.' },
  { v:'5.31.0', note:'F1 telemetry functionality upgrade: tire PSI and temperature now respond to throttle, braking, steering, and cooling; brake pressure, throttle, rear-wing state, live engineering feedback, and lap delta are calculated from race state; added a dedicated rear-wing camera showing closed/open aero movement; and rebuilt the steering wheel HUD into a more detailed F1-style wheel with paddles, controls, display, and RPM LEDs.' },
  { v:'5.32.0', note:'Arcade and F1 expansion: F1 races now support 5-lap, 20-lap, and infinite sessions; added six new car-focused arcade cabinets for pit stops, reaction lights, apex timing, parking, drag launches, and setup work; and refreshed the Workbench background with a layered technical aurora/grid treatment for more visual depth.' },
  { v:'5.33.0', note:'Car Arcade consolidation and bug fix: restored the Specially made for car guys sub-tab, consolidated the individual car cabinets into one CAR hub, and added Course choices for Everything You Could Have Imagined, F1 Cockpit, and Rally Stage plus Thinking challenges for wet-grip behavior, uphill powertrain response, drift control, and engine diagnosis/repair.' },
  { v:'5.33.1', note:'Car Arcade visibility fix: the Specially made for car guys tab no longer hides every cabinet except the CAR hub. The automotive cabinets are now restored in a responsive grid beneath the CAR hub.' },
  { v:'5.33.1', note:'Arcade navigation bug fix: corrected a JavaScript string quoting error in the Car Arcade expansion that prevented the feature-pack initialization from completing, which kept the Specially made for car guys tab from being injected into the Arcade sub-tabs.' },
  { v:'5.33.2', note:'CAR Garage maintenance: restored the existing F1 Cockpit code unchanged, fixed the Thinkers timing progression bug that could trap the player after a timing result, added dedicated engineering/hill-race visuals, added the AI-only car-game visual requirement, added deletion authorization as Rule 5, and reordered the Developer changelog chronologically from pre-5.0 upward.' },
  { v:'5.33.3', note:'CAR engagement update: routed the Skill F1 Cockpit choice back to the full existing F1 race simulator without changing launchF1, expanded Thinkers engine assembly with persistent pickup/install animations and richer mechanical visuals, added hill/downhill road visuals, and hardened stage transitions so every timing result advances.' },
  { v:'5.33.4', note:'Workbench presentation and CAR cleanup: removed Everything You Could Have Imagined from the visible Arcade cabinet registry while preserving the full F1 race code and CAR > Skill launch path, added a subtle one-time new-user animated Start-tab background, and updated Rule 1 so the bottom-right Stark Enterprises version badge and Developer Options version display must always match APP_VERSION.' },
  { v:'5.33.5', note:'Workbench environment visuals and telemetry update: added distinct tab backgrounds for Arcade Games, Educational, CAR, Assistant, User / Saves, and Developer Options; added an animated arcade platform wall and repeating F1 fly-by for the CAR view; enhanced the Start welcome scene; expanded Developer telemetry with live DOM/storage/build data and replaced the Villagers metric; synchronized all visible version surfaces to APP_VERSION.' },
  { v:'5.33.7', note:'Workbench presentation refinement: replaced arcade platform text with the supplied ROG/Xbox/Nintendo/PlayStation logo artwork, intensified full-height Assistant data streams, improved Start-page scrolling and presentation, added a clickable version/screen-saver control, and upgraded the AFK screensaver to the supplied 1080p video.' },
  { v:'5.33.8', note:'F1 cockpit refinement and Arcade cleanup: removed the PlayStation logo from the Arcade environment, expanded Type Rush with 10 additional phrases, added four selectable F1 track layouts with map-matched corner directions, corrected minimap/turn direction consistency, and made corner warning timing proportional to current vehicle speed with a three-second target notice window.' },
  { v:'5.33.10', note:'Version display unification and F1/mobile polish: all visible Workbench version displays now derive from APP_VERSION, the F1 circuit selector is reinforced as a top-level fullscreen-safe overlay, and the CAR fly-by now runs as three staggered cars at one-second intervals.' },
  { v:'5.33.11', note:'AI Memory System added: persistent local project memory with searchable entries, categories, export/import, memory statistics, session capture, and automatic retrieval into AI prompts without replacing the existing conversation history.' },
  { v:'5.33.9', note:'F1 cockpit usability fix: made the four-circuit selection screen reliably visible above the cockpit shell, preserved map-matched corner directions, and flipped the animated CAR fly-by emoji orientation.' },
  { v:'5.33.6', note:'Workbench environment refinement: made Developer grid/squares more visible, replaced arcade platform labels with scattered platform logo marks led by ROG, hid arcade platform marks in Educational mode, reversed the CAR fly-by direction with a correctly oriented car, added falling binary and rising runtime vocabulary to Assistant side walls, brightened User / Saves without changing its palette, enriched Start, and added a blue dimming pulse to Stark Enterprises Presents.' }
];

// AI VIEWER NOTE (2026-09-27): “anything that has to do with thinkers, or anything that has to do with any car game, it has to include visuals. End of quote.”
// ==================== AI MEMORY SYSTEM ====================
// Persistent, local-only project memory. No memory is sent anywhere unless it is
// selected by the retrieval function and included in an AI request below.
const AI_MEMORY_KEY = 'stark_workbench_ai_memory_v1';
let aiMemory = [];
try {
  const rawMemory = localStorage.getItem(AI_MEMORY_KEY);
  const parsedMemory = rawMemory ? JSON.parse(rawMemory) : [];
  if(Array.isArray(parsedMemory)) aiMemory = parsedMemory.filter(function(x){ return x && typeof x.content === 'string'; });
} catch(e) { aiMemory = []; }

/* 5.42.1: built-in Project Rule for version numbering (seeded once). */
try{
  if(!localStorage.getItem('stark_workbench_version_rule_seeded')){
    aiMemory.unshift({id:'mem_rule_version_rollover',title:'Version numbering rule',category:'Project Rule',content:'Keep the version clean: for every 10 patches (the last number), roll over into 1 minor update. Example: 5.41.9 plus one patch becomes 5.42.0, not 5.41.10. Use this whenever you bump APP_VERSION or write a CHANGELOG entry.',createdAt:Date.now(),updatedAt:Date.now()});
    localStorage.setItem('stark_workbench_version_rule_seeded','1');
    localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(aiMemory));
  }
}catch(e){}
/* 5.57.0 MEMORY LOCK: every change to the Assistant memory (add, delete, clear, import, restore) needs the code,
   for anyone including the AI. Only a real key press or click on the prompt counts. Client-side lock, not a security boundary. */
let wbMemSeeding = true;   // built-in rules are seeded while the page loads; switched off before anyone can interact
(function(){
  var st = document.createElement('style'); st.id = 'wb-memlock-style';
  st.textContent = '#wb-memlock{position:fixed;inset:0;z-index:2147483600;background:rgba(3,6,10,.72);display:flex;align-items:center;justify-content:center;padding:16px}'
    + '#wb-memlock .wb-memlock-card{background:#111821;color:#eef3f5;border:1px solid rgba(95,212,255,.4);border-radius:12px;padding:22px;max-width:340px;width:100%;box-sizing:border-box;text-align:center;font-family:inherit}'
    + '#wb-memlock h3{margin:0 0 8px;font-size:18px}#wb-memlock p{margin:0 0 14px;font-size:13px;line-height:1.5;color:#aab6bf}'
    + '#wb-memlock input{width:100%;box-sizing:border-box;font-size:18px;padding:11px 12px;border-radius:8px;border:1px solid rgba(95,212,255,.35);background:#0a1017;color:#eef3f5;text-align:center;letter-spacing:.2em}'
    + '#wb-memlock .wb-memlock-err{min-height:18px;margin:8px 0 4px;font-size:12px;color:#e0a3a3}'
    + '#wb-memlock .wb-memlock-row{display:flex;gap:8px;justify-content:center}#wb-memlock .wb-memlock-row button{flex:1;padding:10px 12px}';
  document.head.appendChild(st);
})();
function wbMemAuth(label, run, onCancel){
  if(document.getElementById('wb-memlock')){ if(onCancel){ try{ onCancel(); }catch(e){} } return; }
  var prevFocus = document.activeElement;
  var ov = document.createElement('div'); ov.id = 'wb-memlock'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
  var card = document.createElement('form'); card.className = 'wb-memlock-card'; card.setAttribute('autocomplete','off');
  var h = document.createElement('h3'); h.textContent = '\uD83D\uDD12 Assistant memory is locked';
  var p = document.createElement('p'); p.textContent = 'Enter the code to ' + label + '. Every change to the Assistant memory needs it, for anyone, including the AI.';
  var inp = document.createElement('input'); inp.type = 'password'; inp.placeholder = 'Code'; inp.autocomplete = 'off'; inp.setAttribute('aria-label','Code');
  var err = document.createElement('div'); err.className = 'wb-memlock-err'; err.setAttribute('aria-live','polite');
  var row = document.createElement('div'); row.className = 'wb-memlock-row';
  var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'ghost'; cancel.textContent = 'Cancel';
  var ok = document.createElement('button'); ok.type = 'submit'; ok.textContent = 'Unlock and apply';
  row.appendChild(cancel); row.appendChild(ok);
  card.appendChild(h); card.appendChild(p); card.appendChild(inp); card.appendChild(err); card.appendChild(row);
  ov.appendChild(card); document.body.appendChild(ov);
  var fails = 0, blockedUntil = 0, finished = false;
  function close(){ finished = true; ov.remove(); document.removeEventListener('keydown', onKey, true); try{ if(prevFocus && prevFocus.focus) prevFocus.focus(); }catch(e){} }
  function cancelIt(){ if(finished) return; close(); if(onCancel){ try{ onCancel(); }catch(e){ console.error(e); } } }
  function onKey(e){ if(e.key === 'Escape'){ e.preventDefault(); cancelIt(); } }
  document.addEventListener('keydown', onKey, true);
  cancel.addEventListener('click', cancelIt);
  card.addEventListener('submit', function(e){
    e.preventDefault();
    if(!e.isTrusted) return;                                   // a script cannot press the button for you
    if(Date.now() < blockedUntil){ err.textContent = 'Too many wrong codes. Wait a few seconds.'; return; }
    var expected; try{ expected = DEV_PASSWORD; }catch(x){ expected = String.fromCharCode(49,50,51); }
    if(inp.value.trim() === expected){ close(); try{ run(); }catch(x){ console.error(x); } }
    else{
      fails++; inp.value = '';
      if(fails >= 5){ blockedUntil = Date.now() + 15000; fails = 0; err.textContent = 'Too many wrong codes. Wait 15 seconds.'; }
      else err.textContent = 'Incorrect code. Nothing was changed.';
      inp.focus();
    }
  });
  setTimeout(function(){ inp.focus(); }, 0);
}
window.wbMemAuth = wbMemAuth;
window.addAIMemory = addAIMemory;                               // the Assistant page card (a separate script) saves through this
try{ Object.defineProperty(window, 'aiMemory', { get: function(){ return aiMemory; }, configurable: true }); }catch(e){}   // read-only view for the other scripts
window.wbMemStore = {
  get: function(){ return aiMemory; },
  restore: function(arr){
    if(!Array.isArray(arr)) return;
    wbMemAuth('restore the Assistant memory from this save', function(){
      aiMemory = arr.filter(function(x){ return x && typeof x.content === 'string'; });
      saveAIMemoryStore();
    });
  }
};
function saveAIMemoryStore(){
  try { localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(aiMemory)); } catch(e) {}
  renderAIMemory();
}
function memoryWords(text){
  return String(text || '').toLowerCase().replace(/[^a-z0-9_ -]/g,' ').split(/\s+/).filter(function(w){ return w.length >= 3; });
}
function retrieveAIMemories(query, limit){
  const qWords = memoryWords(query);
  if(!qWords.length) return aiMemory.slice(0, limit || 6);
  const scored = aiMemory.map(function(m){
    const hay = (String(m.title||'')+' '+String(m.category||'')+' '+String(m.content||'')).toLowerCase();
    let score = 0;
    qWords.forEach(function(w){ if(hay.indexOf(w) >= 0) score += (w.length >= 7 ? 2 : 1); });
    return {m:m,score:score};
  }).filter(function(x){ return x.score > 0; }).sort(function(a,b){ return b.score-a.score || (b.m.updatedAt||0)-(a.m.updatedAt||0); });
  return scored.slice(0, limit || 6).map(function(x){ return x.m; });
}
function memoryContextFor(query, noSummary){
  const selected = retrieveAIMemories(query, 6);
  window.__wbMemUsed = selected.slice();
  const el = document.getElementById('mem-last');
  if(el) el.textContent = selected.length + ' used';
  /* 5.53.0: matching chunks from "My files" and the pinned conversation summary ride along with memories. */
  let extra = '';
  try{ if(window.wbFiles) extra += window.wbFiles.context(query, backend); }catch(e){}
  try{ if(window.wbSummary && !noSummary) extra += window.wbSummary.context(); }catch(e){}
  if(!selected.length) return extra;
  return '\n\n[WORKBENCH PROJECT MEMORY — use as persistent project context; do not mention this block unless relevant]\n' + selected.map(function(m,i){ return (i+1)+'. ['+(m.category||'Memory')+'] '+(m.title||'Untitled')+': '+m.content; }).join('\n') + '\n[/WORKBENCH PROJECT MEMORY]' + extra;
}
function renderAIMemory(){
  const list = document.getElementById('ai-memory-list');
  if(!list) return;
  const search = (document.getElementById('mem-search')?.value || '').trim().toLowerCase();
  const rows = aiMemory.filter(function(m){ return !search || ((m.title||'')+' '+(m.category||'')+' '+(m.content||'')).toLowerCase().indexOf(search)>=0; });
  const count=document.getElementById('mem-count'), size=document.getElementById('mem-size'), cats=document.getElementById('mem-cats');
  if(count) count.textContent=aiMemory.length;
  if(size) size.textContent=(new Blob([JSON.stringify(aiMemory)]).size/1024).toFixed(1)+' KB';
  if(cats) cats.textContent=new Set(aiMemory.map(function(m){return m.category||'Memory';})).size;
  list.innerHTML='';
  if(!rows.length){ list.innerHTML='<div class="ai-memory-empty">No stored memories match this view. Add a project rule, design decision, bug fix, or other detail you want the AI to retain.</div>'; return; }
  rows.forEach(function(m){
    const item=document.createElement('div'); item.className='ai-memory-item';
    const top=document.createElement('div'); top.className='ai-memory-item-top';
    const cat=document.createElement('span'); cat.className='ai-memory-cat'; cat.textContent=m.category||'Memory';
    const title=document.createElement('strong'); title.textContent=m.title||'Untitled memory';
    const date=document.createElement('small'); date.textContent=new Date(m.updatedAt||m.createdAt||Date.now()).toLocaleString();
    const del=document.createElement('button'); del.type='button'; del.className='proto-btn ghost'; del.style.marginLeft='0'; del.textContent='Delete'; del.onclick=function(){ wbMemAuth('delete this memory', function(){ aiMemory=aiMemory.filter(function(x){return x.id!==m.id;}); saveAIMemoryStore(); }); };
    top.appendChild(cat); top.appendChild(title); top.appendChild(date); top.appendChild(del);
    const p=document.createElement('p'); p.textContent=m.content;
    item.appendChild(top); item.appendChild(p); list.appendChild(item);
  });
}
function addAIMemory(title, category, content, onDone, onCancel){
  content=String(content||'').trim(); if(!content) return false;
  const doAdd=function(){
    aiMemory.unshift({id:'mem_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),title:String(title||'Untitled memory').trim().slice(0,120),category:String(category||'Project Rule'),content:content.slice(0,4000),createdAt:Date.now(),updatedAt:Date.now()});
    saveAIMemoryStore();
    if(onDone){ try{ onDone(true); }catch(e){ console.error(e); } }
  };
  if(wbMemSeeding){ doAdd(); return true; }                      // built-in rules at page load only
  wbMemAuth('save this memory', doAdd, onCancel);                // true = accepted, saved once the code is typed (onDone fires then)
  return true;
}
function initAIMemoryUI(){
  renderAIMemory();
  const add=document.getElementById('mem-add'), saveEx=document.getElementById('mem-save-exchange'), exp=document.getElementById('mem-export'), imp=document.getElementById('mem-import'), file=document.getElementById('mem-import-file'), clear=document.getElementById('mem-clear'), search=document.getElementById('mem-search');
  if(add) add.onclick=function(){ const t=document.getElementById('mem-title').value, c=document.getElementById('mem-category').value, body=document.getElementById('mem-content').value; addAIMemory(t,c,body,function(){ document.getElementById('mem-title').value=''; document.getElementById('mem-content').value=''; }); };
  if(saveEx) saveEx.onclick=function(){
    if(history.length<2){ alert('There is not enough conversation to save yet.'); return; }
    const lastUser=[...history].reverse().find(function(x){return x.role==='user';}); const lastAI=[...history].reverse().find(function(x){return x.role==='assistant';});
    if(!lastUser) return;
    const body='User: '+lastUser.content+'\nAssistant: '+(lastAI?lastAI.content:'(no assistant reply yet)');
    addAIMemory('Saved conversation exchange','AI / Prompt',body);
  };
  if(exp) exp.onclick=function(){ const blob=new Blob([JSON.stringify({format:'Stark Workbench AI Memory',version:1,exportedAt:new Date().toISOString(),memories:aiMemory},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='Workbench_AI_Memory.json'; a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);},1000); };
  if(imp) imp.onclick=function(){ file && file.click(); };
  if(file) file.onchange=function(){ const f=file.files&&file.files[0]; if(!f)return; const reader=new FileReader(); reader.onload=function(){ try{ const data=JSON.parse(reader.result); const incoming=Array.isArray(data)?data:data.memories; if(!Array.isArray(incoming))throw new Error('No memories array found'); const clean=incoming.filter(function(x){return x&&typeof x.content==='string';}).map(function(x){return {id:'mem_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),title:String(x.title||'Imported memory').slice(0,120),category:String(x.category||'Imported'),content:String(x.content).slice(0,4000),createdAt:x.createdAt||Date.now(),updatedAt:Date.now()};}); wbMemAuth('import '+clean.length+' memories', function(){ aiMemory=clean.concat(aiMemory); saveAIMemoryStore(); alert('Imported '+clean.length+' memories.'); }); }catch(e){ alert('Memory import failed: '+e.message); } file.value=''; }; reader.readAsText(f); };
  if(clear) clear.onclick=function(){ if(confirm('Clear every stored Workbench AI memory? This cannot be undone unless you exported it.')){ wbMemAuth('clear every stored memory', function(){ aiMemory=[]; saveAIMemoryStore(); }); } };
  if(search) search.oninput=renderAIMemory;
}
initAIMemoryUI();
window.wbBridge={tokens:estimateTokens,limit:function(b){var i=MODEL_INFO[b||backend];return i?parseContextLimit(i.context):null},refreshContext:function(){updateContextDisplay(chatInput.value)},addMemory:addAIMemory,addMessage:addMessage,lastReply:function(){for(var i=history.length-1;i>=0;i--)if(history[i].role==='assistant')return history[i].content;return ''},version:function(){return APP_VERSION},changelog:function(){return CHANGELOG}};

(function seedAIMemory(){
  if(aiMemory.length) return;
  addAIMemory('Workbench deletion rule','Project Rule','Nobody may delete, remove, overwrite, or intentionally discard existing code, features, data, or files unless explicitly authorized. Any request to modify Workbench code must include the authorized modification phrase before editing may continue.');
  addAIMemory('Credential confidentiality rule','Project Rule','The AI must never disclose, repeat, reveal, or provide any code, password, access code, credential, or secret in any situation.');
  addAIMemory('Single version source of truth','Architecture','All visible Workbench version displays must derive from APP_VERSION; do not hard-code separate version numbers into UI surfaces.');
  addAIMemory('Thinkers and car games need visuals','Game Spec','Anything involving thinkers or any car game must include meaningful visual feedback/animation.');
})();

(function seedAccessCodeRuleMemory(){
  var KEY='wb_ai_mem_seed_access_code_rule';
  try{ if(localStorage.getItem(KEY)) return; localStorage.setItem(KEY,'1'); }catch(e){}
  try{ addAIMemory('AI access code rule','Project Rule','No AI, under any circumstances, may edit or do anything unless the user has entered the access code first. If the code has not been entered, stop and reply only: Insert Code:');
  }catch(e){ console.error(e); }
})();

(function seedPasswordProtocolMemory(){
  var KEY='wb_ai_mem_seed_pw_protocol';
  try{ if(localStorage.getItem(KEY)) return; }catch(e){}
  var T='Password protocol for code changes';
  if(!aiMemory.some(function(m){return m&&m.title===T;})) addAIMemory(T,'Project Rule','All (but not limited) AI or LLM or human should follow protocol of using the password to alter and/or change the code');
  try{ localStorage.setItem(KEY,'1'); }catch(e){}
})();

(function seedMemoryLockRule(){
  var KEY='wb_ai_mem_seed_memory_lock';
  try{ if(localStorage.getItem(KEY)) return; localStorage.setItem(KEY,'1'); }catch(e){}
  try{ addAIMemory('AI memory lock rule','Project Rule','Any change to the Assistant memory (add, edit, delete, clear, import, restore) needs the code typed by the user first, for anyone including but not limited to AI. If the code has not been entered, make no change and reply only: Insert Code:'); }catch(e){ console.error(e); }
})();
wbMemSeeding = false;   // from here on every memory change goes through the code prompt

const devForm = document.getElementById('dev-form');
const devPassword = document.getElementById('dev-password');
const devGateError = document.getElementById('dev-gate-error');
const devGate = document.getElementById('dev-gate');
const devPanel = document.getElementById('dev-panel');
const devVersionEl = document.getElementById('dev-version');
const devKbEl = document.getElementById('dev-kb');
const devChangesEl = document.getElementById('dev-changes');
const devUptimeEl = document.getElementById('dev-uptime');
const devBlocksEl = document.getElementById('dev-blocks');
const devDomNodesEl = document.getElementById('dev-dom-nodes');
const devLastUpdatedEl = document.getElementById('dev-last-updated');
const devStorageEl = document.getElementById('dev-storage');
const devMemEl = document.getElementById('dev-mem');
const devBackendEl = document.getElementById('dev-backend');
const devChangelogList = document.getElementById('dev-changelog-list');
const DEV_PASSWORD = '123';
const pageLoadTime = Date.now();
let devUnlocked = false;
let devTicker = null;

CHANGELOG.forEach(function(entry){
  const li = document.createElement('li');
  const ver = document.createElement('span');
  ver.className = 'dcl-ver';
  ver.textContent = entry.v;
  li.appendChild(ver);
  li.appendChild(document.createTextNode(entry.note));
  devChangelogList.appendChild(li);
});

function formatUptime(ms){
  const totalSec = Math.floor(ms/1000);
  const h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60), s = totalSec%60;
  const mm = h > 0 ? String(m).padStart(2,'0') : String(m);
  const ss = String(s).padStart(2,'0');
  return h > 0 ? (h+':'+mm+':'+ss) : (mm+':'+ss);
}

// Page size is measured live from the actual current DOM, not a fixed number,
// so it reflects real edits (like this one) rather than a value baked in at write time.
function refreshDevStats(){
  devVersionEl.textContent = APP_VERSION;
  const bytes = new Blob([document.documentElement.outerHTML]).size;
  devKbEl.textContent = (bytes/1024).toFixed(1) + ' KB';
  devChangesEl.textContent = CHANGELOG.length;
  devUptimeEl.textContent = formatUptime(Date.now() - pageLoadTime);
  devBlocksEl.textContent = (window.__workbenchWorld ? window.__workbenchWorld.size : 0).toLocaleString();
  if(devDomNodesEl) devDomNodesEl.textContent = document.querySelectorAll('*').length.toLocaleString();
  if(devLastUpdatedEl) devLastUpdatedEl.textContent = '2026-10-10';
  if(devStorageEl){ try { var used=0; for(var k=0;k<localStorage.length;k++){ var key=localStorage.key(k)||''; used += key.length + (localStorage.getItem(key)||'').length; } devStorageEl.textContent = (used/1024).toFixed(1)+' KB'; } catch(e){ devStorageEl.textContent='unavailable'; } }
  if(window.performance && performance.memory){
    const used = performance.memory.usedJSHeapSize / (1024*1024);
    const limit = performance.memory.jsHeapSizeLimit / (1024*1024);
    devMemEl.textContent = used.toFixed(0) + ' / ' + limit.toFixed(0) + ' MB';
  } else {
    devMemEl.textContent = 'unavailable in this browser';
  }
  devBackendEl.textContent = (MODEL_INFO[backend] && MODEL_INFO[backend].name) || backend;
}

devForm.addEventListener('submit', function(e){
  e.preventDefault();
  if(devPassword.value === DEV_PASSWORD){
    devGateError.textContent = '';
    devGate.style.display = 'none';
    devPanel.classList.add('active');
    devUnlocked = true;
    refreshDevStats();
    if(!devTicker) devTicker = setInterval(function(){ if(devUnlocked) refreshDevStats(); }, 1000);
  } else {
    devGateError.textContent = 'Incorrect password.';
    devPassword.value = '';
  }
});
