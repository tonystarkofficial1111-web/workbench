
(function(){
'use strict';
var $ = function(id){ return document.getElementById(id); };
var view = $('vid-online-view'); if(!view) return;
var KEY_LS = 'wb_yt_api_key';
// Public Invidious servers (keyless search + alternate player). They come and go, so they are best-effort only.
var INV = ['https://inv.nadeko.net','https://invidious.nerdvpn.de','https://yt.chocolatemoo53.com','https://invidious.tiekoetter.com','https://invidious.f5.si'];
var st = { q:'', mode:'', next:null, busy:false, altIdx:0, curId:null, alt:false, pending:null, hiddenPaused:false, pmode:'', token:0, bad:{}, goodInst:'', autoSwitched:false };
var elQ = $('yt-q'), elGo = $('yt-go'), elNet = $('yt-net'), elNetTxt = $('yt-net-txt'), elStatus = $('yt-status'),
    elRes = $('yt-results'), elMore = $('yt-more'), box = $('yt-player-box'), frame = $('yt-frame'),
    elTitle = $('yt-now-title'), elErr = $('yt-err'), elSet = $('yt-settings'), elKey = $('yt-key'), elKeyNote = $('yt-keynote');
var isHttp = /^https?:$/.test(location.protocol);
// Refresh the server list from the official Invidious directory (best effort; the built-in list is the fallback).
fetch('https://api.invidious.io/instances.json?sort_by=type,health').then(function(r){ return r.json(); }).then(function(a){
  (a || []).forEach(function(e){
    var m = e && e[1];
    if(m && m.api === true && m.type === 'https' && m.cors !== false && /^https:\/\/[\w.-]+$/.test(m.uri || '') && INV.indexOf(m.uri) < 0 && INV.length < 14) INV.push(m.uri);
  });
}).catch(function(){});

function getKey(){ try{ return (localStorage.getItem(KEY_LS) || '').trim(); }catch(e){ return ''; } }
function setStatus(msg, bad){ elStatus.textContent = msg || ''; elStatus.className = 'yt-status' + (bad ? ' bad' : ''); }
function decode(s){ try{ return new DOMParser().parseFromString(String(s || ''), 'text/html').documentElement.textContent; }catch(e){ return String(s || ''); } }
function ago(iso){
  var t = Date.parse(iso); if(!t) return '';
  var s = Math.max(0, (Date.now() - t) / 1000), u = [[31536000,'year'],[2592000,'month'],[604800,'week'],[86400,'day'],[3600,'hour'],[60,'minute']];
  for(var i = 0; i < u.length; i++){ if(s >= u[i][0]){ var n = Math.floor(s / u[i][0]); return n + ' ' + u[i][1] + (n > 1 ? 's' : '') + ' ago'; } }
  return 'just now';
}
function dur(sec){ sec = +sec || 0; if(!sec) return ''; var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s; }
function parseId(s){
  var m = String(s || '').trim().match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/i);
  return m ? m[1] : null;
}

/* ---------- connection banner ---------- */
function setNet(){
  var on = navigator.onLine;
  elNet.className = 'yt-net' + (on ? ' on' : '');
  elNetTxt.textContent = on ? 'Online \u2014 videos stream straight from YouTube' : 'Offline \u2014 connect to a Wi-Fi network to load videos';
}
window.addEventListener('online', function(){
  setNet();
  if(st.pending){ var p = st.pending; st.pending = null; elQ.value = p; doSearch(p); } else setStatus('');
});
window.addEventListener('offline', setNet);

/* ---------- search backends ---------- */
function apiSearch(q, token){
  var u = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=24&videoEmbeddable=true&q=' + encodeURIComponent(q) +
          (token ? '&pageToken=' + encodeURIComponent(token) : '') + '&key=' + encodeURIComponent(getKey());
  return fetch(u).then(function(r){ return r.json().then(function(j){ return { ok:r.ok, j:j }; }); }).then(function(o){
    if(!o.ok){
      var er = o.j && o.j.error, reason = (er && er.errors && er.errors[0] && er.errors[0].reason) || (er && er.status) || 'error';
      var e = new Error(reason); e.reason = reason; throw e;
    }
    return {
      items: (o.j.items || []).filter(function(i){ return i.id && /^[\w-]{11}$/.test(i.id.videoId || ''); }).map(function(i){
        return { id:i.id.videoId, title:decode(i.snippet.title), by:decode(i.snippet.channelTitle), meta:ago(i.snippet.publishedAt) };
      }),
      next: o.j.nextPageToken || null
    };
  });
}
function invSearch(q, page, i){
  i = i || 0;
  if(i >= Math.min(INV.length, 8)) return Promise.reject(new Error('inv'));
  var c = new AbortController(), t = setTimeout(function(){ c.abort(); }, 6000);
  return fetch(INV[i] + '/api/v1/search?type=video&q=' + encodeURIComponent(q) + '&page=' + page, { signal:c.signal })
    .then(function(r){ clearTimeout(t); if(!r.ok) throw 0; return r.json(); })
    .then(function(a){
      if(!Array.isArray(a) || !a.length) throw 0;
      var items = a.filter(function(v){ return v && v.type === 'video' && /^[\w-]{11}$/.test(v.videoId || ''); }).map(function(v){
        return { id:v.videoId, title:String(v.title || ''), by:String(v.author || ''), meta:[v.viewCountText, v.publishedText].filter(Boolean).join(' \u00b7 '), dur:dur(v.lengthSeconds) };
      });
      if(!items.length) throw 0;
      st.goodInst = INV[i];
      return { items:items, next:page + 1 };
    })
    .catch(function(){ clearTimeout(t); return invSearch(q, page, i + 1); });
}
function apiMessage(reason){
  if(reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded') return "Today's free YouTube search quota is used up (it resets daily).";
  if(reason === 'keyInvalid' || reason === 'INVALID_ARGUMENT') return 'YouTube rejected that API key. Check it in Search settings.';
  if(reason === 'accessNotConfigured' || reason === 'forbidden' || reason === 'PERMISSION_DENIED' || reason === 'ipRefererBlocked') return "That key isn't allowed to use YouTube Data API v3. Enable it for the key in Google Cloud (and remove any website restrictions).";
  return 'YouTube search failed (' + reason + ').';
}

/* ---------- Watch later + history (saved in this browser) ---------- */
var LATER_LS = 'wb_yt_later', HIST_LS = 'wb_yt_hist', LATER_MAX = 200, HIST_MAX = 60;
var elSearchPane = $('yt-search-pane'), elSavedPane = $('yt-saved-pane'), elSavedGrid = $('yt-saved-grid'),
    elSavedTitle = $('yt-saved-title'), elSavedNote = $('yt-saved-note'), elSavedClear = $('yt-saved-clear'),
    elChips = $('yt-chips'), elPanes = $('yt-panes'), btnLater = $('yt-later');
st.pane = 'search'; st.curTitle = ''; st.curBy = '';
function loadList(k){
  try{
    var a = JSON.parse(localStorage.getItem(k) || '[]');
    return Array.isArray(a) ? a.filter(function(v){ return v && /^[\w-]{11}$/.test(v.id || ''); }) : [];
  }catch(e){ return []; }
}
function saveList(k, a){ try{ localStorage.setItem(k, JSON.stringify(a)); return true; }catch(e){ return false; } }
function inList(k, id){ return loadList(k).some(function(v){ return v.id === id; }); }
function addLater(v){
  var a = loadList(LATER_LS).filter(function(x){ return x.id !== v.id; });
  a.unshift({ id:v.id, title:v.title || '', by:v.by || '', t:Date.now() });
  return saveList(LATER_LS, a.slice(0, LATER_MAX));
}
function delFrom(k, id){ saveList(k, loadList(k).filter(function(x){ return x.id !== id; })); }
function touchHist(id, title, by){
  var old = null, a = loadList(HIST_LS).filter(function(x){ if(x.id === id){ old = x; return false; } return true; });
  a.unshift({ id:id, title:title || (old && old.title) || '', by:by || (old && old.by) || '', t:Date.now() });
  saveList(HIST_LS, a.slice(0, HIST_MAX));
}
// a pasted link has no title at first; when it turns up, fill it in on the saved copies
function fillTitle(id, title, by){
  if(!title) return;
  [LATER_LS, HIST_LS].forEach(function(k){
    var a = loadList(k), ch = false;
    a.forEach(function(x){ if(x.id === id && !x.title){ x.title = title; x.by = by || ''; ch = true; } });
    if(ch) saveList(k, a);
  });
  if(st.pane !== 'search') renderSaved();
}
function agoMs(t){ try{ return ago(new Date(t).toISOString()); }catch(e){ return ''; } }
function refreshStars(){
  [].forEach.call(document.querySelectorAll('#vid-online-view .yt-ctl button'), function(b){ if(b._paint) b._paint(); });
}
function updateLaterBtn(){
  var on = !!(st.curId && inList(LATER_LS, st.curId));
  btnLater.textContent = on ? '\u2713 Saved to Watch later' : '\u23f0 Watch later';
  btnLater.classList.toggle('yt-on', on);
}
function updateCounts(){
  var nl = loadList(LATER_LS).length, nh = loadList(HIST_LS).length;
  $('yt-n-later').textContent = nl ? '(' + nl + ')' : '';
  $('yt-n-hist').textContent = nh ? '(' + nh + ')' : '';
  refreshStars();
}
function setPane(p){
  st.pane = p;
  [].forEach.call(elPanes.querySelectorAll('button'), function(b){ b.classList.toggle('on', b.getAttribute('data-pane') === p); });
  var s = p === 'search';
  elSearchPane.style.display = s ? '' : 'none';
  elChips.style.display = s ? '' : 'none';
  elStatus.style.display = s ? '' : 'none';
  elSavedPane.style.display = s ? 'none' : '';
  elSavedClear.textContent = 'Clear history';
  if(s) refreshStars(); else renderSaved();
}
function renderSaved(){
  var later = st.pane === 'later', k = later ? LATER_LS : HIST_LS, a = loadList(k);
  elSavedTitle.textContent = later ? 'Watch later' : 'Recently watched';
  elSavedClear.style.display = (!later && a.length) ? '' : 'none';
  elSavedNote.textContent = a.length ? '' : (later
    ? 'Nothing saved yet. Tap the \u23f0 on any video, or press Watch later while one is playing.'
    : 'Videos you play show up here so you can replay them in one tap.');
  elSavedGrid.textContent = '';
  a.forEach(function(v){
    elSavedGrid.appendChild(card({ id:v.id, title:v.title, by:v.by, meta:(later ? 'Saved ' : 'Watched ') + agoMs(v.t) }, later ? 'later' : 'hist'));
  });
}

/* ---------- results ---------- */
// mode: 'search' (clock button), 'later' (remove button), 'hist' (clock + remove buttons)
function card(v, mode){
  var w = document.createElement('div'); w.className = 'yt-cardw';
  var b = document.createElement('button'); b.type = 'button'; b.className = 'yt-card';
  var th = document.createElement('div'); th.className = 'th';
  var im = document.createElement('img'); im.loading = 'lazy'; im.alt = ''; im.src = 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg'; th.appendChild(im);
  if(v.dur){ var d = document.createElement('span'); d.className = 'dur'; d.textContent = v.dur; th.appendChild(d); }
  var t = document.createElement('div'); t.className = 't'; t.textContent = v.title || 'YouTube video';
  var m = document.createElement('div'); m.className = 'm'; m.textContent = [v.by, v.meta].filter(Boolean).join(' \u00b7 ');
  b.appendChild(th); b.appendChild(t); b.appendChild(m);
  b.onclick = function(){ playId(v.id, v.title, v.by); };
  w.appendChild(b);
  var ctl = document.createElement('div'); ctl.className = 'yt-ctl';
  if(mode !== 'later'){
    var sv = document.createElement('button'); sv.type = 'button';
    sv._paint = function(){
      var on = inList(LATER_LS, v.id);
      sv.textContent = on ? '\u2713' : '\u23f0'; sv.classList.toggle('on', on);
      sv.title = on ? 'Saved to Watch later. Tap to remove.' : 'Watch later';
      sv.setAttribute('aria-label', sv.title);
    };
    sv._paint();
    sv.onclick = function(e){
      e.stopPropagation();
      if(inList(LATER_LS, v.id)) delFrom(LATER_LS, v.id); else addLater(v);
      updateCounts(); updateLaterBtn();
    };
    ctl.appendChild(sv);
  }
  if(mode !== 'search'){
    var rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '\u2715'; rm.title = 'Remove'; rm.setAttribute('aria-label', 'Remove');
    rm.onclick = function(e){
      e.stopPropagation();
      delFrom(mode === 'later' ? LATER_LS : HIST_LS, v.id);
      updateCounts(); updateLaterBtn(); renderSaved();
    };
    ctl.appendChild(rm);
  }
  w.appendChild(ctl);
  return w;
}
function render(items, append){
  if(!append) elRes.textContent = '';
  items.forEach(function(v){ elRes.appendChild(card(v, 'search')); });
}
function doSearch(q, more){
  q = (q || '').trim(); if(!q || st.busy) return;
  var id = !more && parseId(q); if(id){ playId(id); return; }
  if(!navigator.onLine){ st.pending = q; setNet(); setStatus('\ud83d\udcf6 No Wi-Fi or internet yet. Connect to a network and this search will run automatically.', true); return; }
  st.busy = true; elGo.disabled = true; elMore.disabled = true;
  setStatus(more ? 'Loading more\u2026' : 'Searching\u2026');
  var useKey = !!getKey(), note = '';
  var run = (more && st.mode === 'api') ? apiSearch(q, st.next).then(function(r){ return { r:r, mode:'api' }; })
          : (more && st.mode === 'inv') ? invSearch(q, st.next).then(function(r){ return { r:r, mode:'inv' }; })
          : useKey ? apiSearch(q, null).then(function(r){ return { r:r, mode:'api' }; }).catch(function(e){
                note = (e.reason ? apiMessage(e.reason) : 'Could not reach YouTube.') + ' Trying free servers instead. ';
                return invSearch(q, 1).then(function(r){ return { r:r, mode:'inv' }; });
            })
          : invSearch(q, 1).then(function(r){ return { r:r, mode:'inv' }; });
  run.then(function(o){
    st.q = q; st.mode = o.mode; st.next = o.r.next;
    if(!more && !o.r.items.length){ setStatus('No videos found for \u201c' + q + '\u201d.'); render([], false); elMore.style.display = 'none'; return; }
    render(o.r.items, !!more);
    setStatus(note.trim());
    elMore.style.display = o.r.next ? '' : 'none';
  }).catch(function(e){
    elMore.style.display = 'none';
    if(!navigator.onLine) setStatus('\ud83d\udcf6 You went offline. Reconnect to Wi-Fi and try again.', true);
    else if(e && e.reason) setStatus(apiMessage(e.reason), true);
    else if(e && e.message === 'inv'){
      if(useKey) setStatus(note + 'The free search servers did not respond either. You can still paste a video link to play it.', true);
      else { setStatus('Could not search right now: the free public search servers are busy or blocked on this network. Add a YouTube API key in Search settings below for reliable results, or paste a video link to play it directly.', true); elSet.open = true; }
    } else setStatus('Could not reach YouTube. Your Wi-Fi may be connected without internet, or this network blocks YouTube.', true);
  }).then(function(){ st.busy = false; elGo.disabled = false; elMore.disabled = false; });
}

/* ---------- player ---------- */
// Three players: 'stream' (plain video file from a public server, works from a local file), 'yt' (YouTube embed, needs an http/https page), 'inv' (embedded server page)
var MODES = ['stream','yt','inv'], MODE_NAME = { stream:'direct stream', yt:'YouTube embed', inv:'alternate embed' };
var qualSel = $('yt-qual'), btnAlt = $('yt-alt');
var apiP = null;
function loadApi(){
  if(window.YT && window.YT.Player) return Promise.resolve();
  if(apiP) return apiP;
  apiP = new Promise(function(res, rej){
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function(){ try{ if(prev) prev(); }catch(e){} res(); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function(){ apiP = null; rej(new Error('api')); };
    document.head.appendChild(s);
    setTimeout(function(){ if(!(window.YT && window.YT.Player)){ apiP = null; rej(new Error('timeout')); } }, 12000);
  });
  return apiP;
}
function say(m){ elErr.textContent = m || ''; elErr.style.display = m ? 'block' : 'none'; }
function host(u){ return String(u).replace(/^https:\/\//, '').replace(/\/.*$/, ''); }
function clearFrame(){
  var v = frame.querySelector('video');
  if(v){ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} }
  frame.textContent = ''; qualSel.style.display = 'none'; qualSel.textContent = '';
}
function mountYT(id){
  var f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1&enablejsapi=1' + (isHttp ? '&origin=' + encodeURIComponent(location.origin) : '');
  f.title = 'YouTube video player';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  frame.appendChild(f);
  loadApi().then(function(){
    if(frame.firstChild !== f) return;
    new window.YT.Player(f, { events:{ onError:function(e){ if(frame.firstChild === f) ytError(e.data); } } });
  }).catch(function(){});
}
function ytError(code){
  if((code === 153 || code === 152) && !st.autoSwitched){
    st.autoSwitched = true; say('YouTube blocks its embedded player on pages opened as a local file (error ' + code + '). Switching to the direct stream\u2026');
    startPlayer(st.curId, 'stream'); return;
  }
  if(code === 101 || code === 150) say("The video's owner doesn't allow playing it outside YouTube. Try Switch player or Open on YouTube.");
  else if(code === 100) say('This video was removed or is private.');
  else say('YouTube player problem (error ' + code + '). Try Switch player or Open on YouTube.');
}
function mountInv(id){
  var inst = INV[st.altIdx % INV.length]; st.altIdx++;
  var f = document.createElement('iframe');
  f.src = inst + '/embed/' + id + '?autoplay=1';
  f.title = 'Alternate video player';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  f.setAttribute('referrerpolicy', 'no-referrer');
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
  frame.appendChild(f);
  say('Alternate embed via ' + host(inst) + '. If it does not load, press Switch player until it comes back around, then it tries the next server.');
}
function fetchInfo(inst, id){
  var c = new AbortController(), t = setTimeout(function(){ c.abort(); }, 9000);
  return fetch(inst + '/api/v1/videos/' + id + '?local=true&fields=title,author,hlsUrl,formatStreams', { signal:c.signal })
    .then(function(r){ clearTimeout(t); if(!r.ok) throw new Error('http'); return r.json(); })
    .then(function(j){
      var out = [];
      (j.formatStreams || []).forEach(function(f){
        var u = String(f.url || ''); if(u.charAt(0) === '/') u = inst + u;
        if(!/^https:\/\//i.test(u)) return;
        var ct = String(f.container || f.type || ''); if(ct && !/mp4|webm/i.test(ct)) return;
        out.push({ url:u, h:parseInt(f.qualityLabel || f.quality || '', 10) || 0, label:String(f.qualityLabel || f.quality || 'video') });
      });
      out.sort(function(a, b){ return b.h - a.h; });
      var hls = String(j.hlsUrl || ''); if(hls.charAt(0) === '/') hls = inst + hls;
      if(!/^https:\/\//i.test(hls)) hls = '';
      if(!out.length && !hls) throw new Error('nostreams');
      return { inst:inst, title:decode(j.title || ''), by:decode(j.author || ''), streams:out, hls:hls };
    })
    .catch(function(e){ clearTimeout(t); st.bad[inst] = 1; throw e; });
}
function instOrder(){
  var l = INV.slice();
  if(st.goodInst && l.indexOf(st.goodInst) > -1) l = [st.goodInst].concat(l.filter(function(x){ return x !== st.goodInst; }));
  var ok = l.filter(function(x){ return !st.bad[x]; });
  if(!ok.length){ st.bad = {}; ok = l; }
  return ok;
}
function mountStream(id, tk){
  say('Loading direct stream\u2026');
  var v = document.createElement('video');
  v.controls = true; v.autoplay = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
  v.poster = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
  v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#000';
  frame.appendChild(v);
  var rounds = 0, info = null;
  function fail(){
    if(tk !== st.token) return;
    say('Could not stream this video: the public servers are busy or blocked on this network. Press Switch player to try the YouTube embed, or Open on YouTube.');
  }
  function playUrl(idx, resume){
    if(tk !== st.token) return;
    var s = info.streams[idx] || (info.hls ? { url:info.hls, label:'live' } : null);
    if(!s){ st.bad[info.inst] = 1; attempt(); return; }
    var settled = false;
    var tmo = setTimeout(function(){ if(!settled){ settled = true; next(); } }, 20000);
    function next(){ if(tk !== st.token) return; if(idx + 1 < info.streams.length) playUrl(idx + 1, resume); else { st.bad[info.inst] = 1; attempt(); } }
    v.onloadeddata = function(){ if(settled) return; settled = true; clearTimeout(tmo); st.goodInst = info.inst; say('Playing via ' + host(info.inst) + ' (' + s.label + '). If it stalls, press Switch player.'); };
    v.onerror = function(){ if(settled) return; settled = true; clearTimeout(tmo); next(); };
    if(resume){ var f = function(){ v.removeEventListener('loadedmetadata', f); try{ v.currentTime = resume; }catch(e){} }; v.addEventListener('loadedmetadata', f); }
    v.src = s.url;
    qualSel.value = String(idx);
    var pr = v.play(); if(pr && pr.catch) pr.catch(function(){});
  }
  function attempt(){
    if(tk !== st.token) return;
    if(rounds++ >= 3){ fail(); return; }
    var batch = instOrder().slice(0, 4);
    Promise.any(batch.map(function(i){ return fetchInfo(i, id); })).then(function(r){
      if(tk !== st.token) return;
      info = r;
      if(r.title && /^YouTube video/.test(elTitle.textContent)){ elTitle.textContent = r.title + (r.by ? ' \u2014 ' + r.by : ''); st.curTitle = r.title; st.curBy = r.by || ''; fillTitle(id, r.title, r.by); }
      qualSel.textContent = '';
      r.streams.forEach(function(s, k){ var o = document.createElement('option'); o.value = String(k); o.textContent = s.label; qualSel.appendChild(o); });
      qualSel.style.display = r.streams.length > 1 ? '' : 'none';
      playUrl(0, 0);
    }).catch(function(){ attempt(); });
  }
  qualSel.onchange = function(){ if(info) playUrl(+qualSel.value, v.currentTime || 0); };
  attempt();
}
function startPlayer(id, mode){
  st.pmode = mode; var tk = ++st.token;
  clearFrame(); say('');
  btnAlt.textContent = 'Switch player (' + MODE_NAME[mode] + ')';
  if(mode === 'yt') mountYT(id); else if(mode === 'inv') mountInv(id); else mountStream(id, tk);
}
function playId(id, title, by){
  if(!/^[\w-]{11}$/.test(id)) return;
  if(!navigator.onLine){ setNet(); setStatus('\ud83d\udcf6 Connect to a Wi-Fi network first, then pick the video again.', true); if(st.pane !== 'search') elSavedNote.textContent = '\ud83d\udcf6 Connect to a Wi-Fi network first, then pick the video again.'; return; }
  st.curId = id; st.hiddenPaused = false; st.autoSwitched = false;
  st.curTitle = title || ''; st.curBy = by || '';
  touchHist(id, st.curTitle, st.curBy); updateCounts(); updateLaterBtn();
  box.style.display = 'block';
  elTitle.textContent = title ? title + (by ? ' \u2014 ' + by : '') : 'YouTube video';
  startPlayer(id, isHttp ? 'yt' : 'stream');
  try{ box.scrollIntoView({ behavior:'smooth', block:'start' }); }catch(e){}
  if(!title){
    fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id))
      .then(function(r){ return r.json(); })
      .then(function(j){ if(st.curId === id && j && j.title){ elTitle.textContent = decode(j.title) + (j.author_name ? ' \u2014 ' + decode(j.author_name) : ''); st.curTitle = decode(j.title); st.curBy = decode(j.author_name || ''); fillTitle(id, st.curTitle, st.curBy); } })
      .catch(function(){});
  }
}
function closePlayer(){ st.token++; clearFrame(); box.style.display = 'none'; st.curId = null; say(''); }
function pauseNow(){
  var v = frame.querySelector('video'); if(v){ try{ v.pause(); }catch(e){} return; }
  var f = frame.firstChild;
  try{ if(f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event:'command', func:'pauseVideo', args:[] }), '*'); }catch(e){}
}
$('yt-close').onclick = closePlayer;
$('yt-open').onclick = function(){ if(st.curId) window.open('https://www.youtube.com/watch?v=' + st.curId, '_blank', 'noopener'); };
btnAlt.onclick = function(){ if(st.curId) startPlayer(st.curId, MODES[(MODES.indexOf(st.pmode) + 1) % MODES.length]); };
// stop the sound when you leave the page (switch subtab, Back to Media, or another tab)
setInterval(function(){
  if(!st.curId) return;
  if(view.offsetParent === null){
    if(st.hiddenPaused) return;
    st.hiddenPaused = true;
    if(st.pmode === 'inv') closePlayer(); else pauseNow();
  } else st.hiddenPaused = false;
}, 1000);

/* ---------- wiring ---------- */
elGo.onclick = function(){ doSearch(elQ.value); };
elQ.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); doSearch(elQ.value); } });
elMore.onclick = function(){ doSearch(st.q, true); };
['Music','Gaming','Science','Tech reviews','How-to','Comedy','News'].forEach(function(c){
  var b = document.createElement('button'); b.type = 'button'; b.textContent = c;
  b.onclick = function(){ elQ.value = c; doSearch(c); };
  $('yt-chips').appendChild(b);
});
function keyNote(){ elKeyNote.textContent = getKey() ? 'API key saved in this browser.' : 'No key saved. Using free public servers.'; elKey.placeholder = getKey() ? 'Key saved (hidden). Paste a new one to replace it.' : 'YouTube API key'; }
$('yt-key-save').onclick = function(){
  var v = elKey.value.trim(); if(!v){ elKeyNote.textContent = 'Paste a key first.'; return; }
  try{ localStorage.setItem(KEY_LS, v); }catch(e){ elKeyNote.textContent = 'Could not save the key in this browser.'; return; }
  elKey.value = ''; keyNote(); elKeyNote.textContent = 'Saved. Searches now use your key.';
};
$('yt-key-clear').onclick = function(){ try{ localStorage.removeItem(KEY_LS); }catch(e){} elKey.value = ''; keyNote(); };
keyNote(); setNet(); setStatus('Search for a video, or paste a YouTube link, to start watching.');
[].forEach.call(elPanes.querySelectorAll('button'), function(b){ b.onclick = function(){ setPane(this.getAttribute('data-pane')); }; });
btnLater.onclick = function(){
  if(!st.curId) return;
  if(inList(LATER_LS, st.curId)) delFrom(LATER_LS, st.curId);
  else addLater({ id:st.curId, title:st.curTitle, by:st.curBy });
  updateLaterBtn(); updateCounts(); if(st.pane === 'later') renderSaved();
};
var clrT = 0;
elSavedClear.onclick = function(){
  if(!clrT){ elSavedClear.textContent = 'Tap again to clear'; clrT = setTimeout(function(){ clrT = 0; elSavedClear.textContent = 'Clear history'; }, 3000); return; }
  clearTimeout(clrT); clrT = 0; saveList(HIST_LS, []); elSavedClear.textContent = 'Clear history'; updateCounts(); renderSaved();
};
updateCounts(); updateLaterBtn();

// the Online subtab: show this view, hide the old ones (Library, Sync and Share are all still there)
var subs = document.querySelectorAll('.vid-subtab');
[].forEach.call(subs, function(b){
  b.addEventListener('click', function(){
    var t = this.getAttribute('data-vidtab');
    if(t === 'online'){
      ['vid-library-view','vid-sync-view','vid-share-view','vid-player-view'].forEach(function(id){ var e = $(id); if(e) e.style.display = 'none'; });
      [].forEach.call(subs, function(s){ s.classList.remove('active'); });
      this.classList.add('active');
      view.style.display = 'block';
    } else view.style.display = 'none';
  });
});
var tb = document.querySelector('.vid-subtab[data-vidtab="online"]'); if(tb) tb.click();   // Online is the default Video page
})();
