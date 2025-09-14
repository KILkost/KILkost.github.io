/* === Автосохранение текста === */
const editable = document.getElementById('editable');
if (editable) {
  editable.innerHTML = localStorage.getItem('editableText') || editable.innerHTML;
  editable.addEventListener('input', () => {
    localStorage.setItem('editableText', editable.innerHTML);
  });
}

/* === Toggle players panel === */
function togglePlayers(){
  const box = document.getElementById('players');
  const body = document.getElementById('playersBody');
  const arrow = document.getElementById('arrow');
  if(!box) return;
  box.classList.toggle('open');
  const open = box.classList.contains('open');
  const header = box.querySelector('.players-header');
  if(header) header.setAttribute('aria-expanded', open);
  if(body) body.setAttribute('aria-hidden', !open);
  if(arrow) arrow.textContent = open ? '▲' : '▼';
}

/* === YouTube embed (accepts full URL or plain ID) === */
const ytIframe = document.getElementById('ytIframe');
const loadBtn = document.getElementById('loadPlaylist');
if(loadBtn){
  loadBtn.addEventListener('click', () => {
    const input = document.getElementById('playlist').value.trim();
    if(!input) return;
    let url = null;
    try { url = new URL(input); } catch (e) { url = null; }
    if(url){
      const list = url.searchParams.get('list');
      const video = url.searchParams.get('v');
      if(list){ ytIframe.src = `https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(list)}&rel=0`; return; }
      if(video){ ytIframe.src = `https://www.youtube.com/embed/${encodeURIComponent(video)}?rel=0`; return; }
    }
    if(input.toUpperCase().startsWith('PL')){
      ytIframe.src = `https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(input)}&rel=0`;
    } else {
      ytIframe.src = `https://www.youtube.com/embed/${encodeURIComponent(input)}?rel=0`;
    }
  });
}

/* === Local audio storage (IndexedDB) === */
const dbName = 'localTracksDB_v4';
let db;

function openDB(){
  return new Promise((res,rej) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = e => {
      const idb = e.target.result;
      if(!idb.objectStoreNames.contains('tracks')) idb.createObjectStore('tracks', {keyPath:'id', autoIncrement:true});
    };
    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror = rej;
  });
}

async function addFiles(files){
  await openDB();
  const tx = db.transaction('tracks','readwrite');
  const store = tx.objectStore('tracks');
  for(const f of files){
    await new Promise((r,rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        const blob = new Blob([reader.result], {type: f.type});
        store.add({name: f.name, type: f.type, blob, date: Date.now()});
        r();
      };
      reader.onerror = rej;
      reader.readAsArrayBuffer(f);
    });
  }
  await tx.complete;
  await refreshList();
}

async function listTracks(){
  await openDB();
  return new Promise((res,rej) => {
    const tx = db.transaction('tracks','readonly');
    const store = tx.objectStore('tracks');
    const req = store.getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror = rej;
  });
}

async function deleteAll(){
  await openDB();
  return new Promise((res,rej) => {
    const tx = db.transaction('tracks','readwrite');
    const store = tx.objectStore('tracks');
    const req = store.clear();
    req.onsuccess = () => { refreshList(); res(); };
    req.onerror = rej;
  });
}

async function refreshList(){
  const list = await listTracks();
  const container = document.getElementById('tracksList');
  if(!container) return;
  container.innerHTML = '';
  if(list.length === 0){ container.innerHTML = '<div style="font-size:12px;color:#ccc">Нет треков</div>'; return; }
  list.forEach(item => {
    const el = document.createElement('div');
    el.className = 'track';
    const name = document.createElement('div');
    name.textContent = item.name;
    const btn = document.createElement('button');
    btn.textContent = '▶';
    btn.addEventListener('click', () => {
      const url = URL.createObjectURL(item.blob);
      const player = document.getElementById('player');
      player.src = url;
      player.play().catch(()=>{});
    });
    el.appendChild(name);
    el.appendChild(btn);
    container.appendChild(el);
  });
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const saveBtn = document.getElementById('saveFiles');
if(saveBtn){
  saveBtn.addEventListener('click', async () => {
    const input = document.getElementById('audioUpload');
    if(!input || !input.files.length) return;
    await addFiles(input.files);
    input.value = '';
  });
}

const clearBtn = document.getElementById('clearFiles');
if(clearBtn){
  clearBtn.addEventListener('click', async () => {
    await deleteAll();
  });
}

refreshList();
