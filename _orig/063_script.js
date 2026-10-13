
(function(){
'use strict';
var tab = document.getElementById('tab-world'), cv = document.getElementById('gamecanvas');
if(!tab || !cv) return;
var col = document.getElementById('bw-left-col');
var MAX_MS = 5 * 60 * 1000, rec = null, toastT = 0;

var btn = document.createElement('button'); btn.type = 'button'; btn.id = 'bw-rec-btn';
btn.title = 'Record the game screen and save it to Media > Video > Library';
if(col) col.appendChild(btn); else { btn.className = 'nocol'; cv.parentNode.appendChild(btn); }
var toastEl = document.createElement('div'); toastEl.id = 'bw-rec-toast'; toastEl.setAttribute('role', 'status');
cv.parentNode.appendChild(toastEl);

function toast(msg, bad){
  toastEl.textContent = msg; toastEl.className = (bad ? 'bad ' : '') + 'show';
  clearTimeout(toastT); toastT = setTimeout(function(){ toastEl.className = bad ? 'bad' : ''; }, 4500);
}
function fmt(ms){ var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s = s % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function paint(){
  if(rec){ btn.classList.add('rec'); btn.textContent = 'Stop \u00b7 ' + fmt(Date.now() - rec.t0); }
  else { btn.classList.remove('rec'); btn.textContent = 'Record clip'; }
}
function pickMime(){
  var c = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  if(!(window.MediaRecorder && MediaRecorder.isTypeSupported)) return '';
  for(var i = 0; i < c.length; i++){ if(MediaRecorder.isTypeSupported(c[i])) return c[i]; }
  return '';
}
function start(){
  if(rec) return;
  if(!window.MediaRecorder || !cv.captureStream){ toast('This browser cannot record the game screen.', true); return; }
  var stream;
  try{ stream = cv.captureStream(30); }catch(e){ toast('Could not capture the game screen.', true); return; }
  var mime = pickMime(), opts = { videoBitsPerSecond:3000000 }; if(mime) opts.mimeType = mime;
  var mr;
  try{ mr = new MediaRecorder(stream, opts); }
  catch(e){ try{ mr = new MediaRecorder(stream); }catch(e2){ toast('Could not start recording on this device.', true); return; } }
  var r = { mr:mr, stream:stream, chunks:[], t0:Date.now(), timer:0, why:'', stopping:false, mime:mr.mimeType || mime || 'video/webm' };
  mr.ondataavailable = function(e){ if(e.data && e.data.size) r.chunks.push(e.data); };
  mr.onstop = function(){ finish(r); };
  mr.onerror = function(){ toast('Recording stopped because of an error.', true); stop('error'); };
  try{ mr.start(1000); }catch(e){ toast('Could not start recording on this device.', true); return; }
  rec = r; paint();
  r.timer = setInterval(function(){
    if(!tab.classList.contains('active')){ stop('left'); return; }
    if(Date.now() - r.t0 >= MAX_MS){ stop('limit'); return; }
    paint();
  }, 250);
  toast('Recording. Press Stop when you are done (it stops by itself after 5 minutes).');
}
function stop(why){
  var r = rec; if(!r || r.stopping) return;
  r.stopping = true; r.why = why || ''; clearInterval(r.timer);
  try{ if(r.mr.state !== 'inactive') r.mr.stop(); else finish(r); }catch(e){ finish(r); }
  try{ r.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){}
}
function finish(r){
  if(rec !== r) return;
  rec = null; paint();
  var ms = Date.now() - r.t0, type = String(r.mime).split(';')[0] || 'video/webm';
  var blob = new Blob(r.chunks, { type:type });
  r.chunks = [];
  if(!blob.size || ms < 1000){ toast('That clip was too short, so nothing was saved.', true); return; }
  save(blob, type, ms, r.why);
}
function pad(n){ return (n < 10 ? '0' : '') + n; }
function clipName(type){
  var d = new Date();
  return 'Block World clip ' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + '.' + pad(d.getMinutes()) + '.' + pad(d.getSeconds()) + (/mp4/.test(type) ? '.mp4' : '.webm');
}
function download(blob, name){
  try{
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(u); }, 30000);
  }catch(e){}
}
function openDB(){
  return new Promise(function(res, rej){
    var q = indexedDB.open('wbVideos', 1);
    q.onupgradeneeded = function(e){
      var d = e.target.result;
      if(!d.objectStoreNames.contains('videos')) d.createObjectStore('videos', { keyPath:'id', autoIncrement:true });
    };
    q.onsuccess = function(e){ res(e.target.result); };
    q.onerror = function(e){ rej(e.target.error); };
  });
}
function enoughRoom(size){
  try{
    if(navigator.storage && navigator.storage.estimate){
      return navigator.storage.estimate().then(function(e){ return !e.quota || (e.quota - (e.usage || 0)) > size * 1.2; }, function(){ return true; });
    }
  }catch(e){}
  return Promise.resolve(true);
}
function save(blob, type, ms, why){
  var name = clipName(type);
  var tail = why === 'limit' ? ' (5 minute limit reached)' : why === 'left' ? ' (you left Block World)' : '';
  function fallback(){ download(blob, name); toast('Not enough browser storage for the clip, so it was downloaded instead.', true); }
  enoughRoom(blob.size).then(function(ok){
    if(!ok){ fallback(); return; }
    return openDB().then(function(d){
      return new Promise(function(res, rej){
        var tx = d.transaction('videos', 'readwrite');
        tx.objectStore('videos').add({ name:name, size:blob.size, type:type, blob:blob, added:Date.now(), source:'block-world', duration:ms });
        tx.oncomplete = function(){ res(); };
        tx.onerror = tx.onabort = function(){ rej(tx.error); };
      });
    }).then(function(){
      toast('Clip saved (' + fmt(ms) + ')' + tail + '. Find it in Media > Video > Library.');
      if(window.wbRefreshVideoLibrary) try{ window.wbRefreshVideoLibrary(); }catch(e){}
    }, fallback);
  });
}
btn.addEventListener('click', function(){ if(rec) stop('user'); else start(); btn.blur(); });
if('MutationObserver' in window) new MutationObserver(function(){ if(rec && !tab.classList.contains('active')) stop('left'); }).observe(tab, { attributes:true, attributeFilter:['class'] });
paint();
})();
