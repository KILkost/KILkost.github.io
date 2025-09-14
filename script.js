function makePattern() {
  let svg='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">';
  for(let i=0;i<50;i++) {
    let x=Math.random()*200,y=Math.random()*200,r=10+Math.random()*40;
    svg+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${randomBlue()}" fill-opacity="0.3"/>`;
  }
  svg+='</svg>';
  return `url('data:image/svg+xml;base64,${btoa(svg)}')`;
}
document.body.style.backgroundImage=makePattern();

/* === Автосохранение текста === */
const editable=document.getElementById('editable');
editable.innerHTML=localStorage.getItem('editableText')||editable.innerHTML;
editable.addEventListener('input',()=>{localStorage.setItem('editableText',editable.innerHTML);});

/* === Переключение плееров === */
function togglePlayers(){
  const box=document.getElementById('players');
  const arrow=document.getElementById('arrow');
  box.classList.toggle('open');
  arrow.textContent=box.classList.contains('open')?'▲':'▼';
}

/* === YouTube embed === */
const ytIframe=document.getElementById('ytIframe');
document.getElementById('loadPlaylist').addEventListener('click',()=>{
  let input=document.getElementById('playlist').value.trim();
  if(!input){return;}
  let url;try{url=new URL(input);}catch{url=null;}
  if(url){
    const list=url.searchParams.get('list');
    const video=url.searchParams.get('v');
    if(list){ytIframe.src=`https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(list)}&rel=0`;return;}
    if(video){ytIframe.src=`https://www.youtube.com/embed/${encodeURIComponent(video)}?rel=0`;return;}
  }
  if(input.toUpperCase().startsWith('PL')){
    ytIframe.src=`https://www.youtube.com/embed?listType=playlist&list=${encodeURIComponent(input)}&rel=0`;
  } else {
    ytIframe.src=`https://www.youtube.com/embed/${encodeURIComponent(input)}?rel=0`;
  }
});

/* === Local audio IndexedDB === */
const dbName='localTracksDB_v3'; let db;
function openDB(){return new Promise((res,rej)=>{const req=indexedDB.open(dbName,1);req.onupgradeneeded=e=>{const idb=e.target.result;if(!idb.objectStoreNames.contains('tracks'))idb.createObjectStore('tracks',{keyPath:'id',autoIncrement:true});};req.onsuccess=e=>{db=e.target.result;res(db);};req.onerror=rej;});}
async function addFiles(files){await openDB();const tx=db.transaction('tracks','readwrite');const store=tx.objectStore('tracks');for(const f of files){await new Promise((r,rej)=>{const reader=new FileReader();reader.onload=()=>{store.add({name:f.name,type:f.type,blob:new Blob([reader.result],{type:f.type}),date:Date.now()});r();};reader.onerror=rej;reader.readAsArrayBuffer(f);});}await tx.complete;await refreshList();}
async function listTracks(){await openDB();return new Promise((res,rej)=>{const tx=db.transaction('tracks','readonly');const store=tx.objectStore('tracks');const req=store.getAll();req.onsuccess=e=>res(e.target.result||[]);req.onerror=rej;});}
async function deleteAll(){await openDB();return new Promise((res,rej)=>{const tx=db.transaction('tracks','readwrite');const store=tx.objectStore('tracks');const req=store.clear();req.onsuccess=()=>{refreshList();res();};req.onerror=rej;});}
async function refreshList(){const list=await listTracks();const container=document.getElementById('tracksList');container.innerHTML='';if(list.length===0){container.innerHTML='<div style="font-size:12px;color:#ccc">Нет треков</div>';return;}list.forEach(item=>{const el=document.createElement('div');el.className='track';el.innerHTML=`<span>${escapeHtml(item.name)}</span>`;const btn=document.createElement('button');btn.textContent='▶';btn.onclick=()=>{const url=URL.createObjectURL(item.blob);const player=document.getElementById('player');player.src=url;player.play().catch(()=>{});};el.appendChild(btn);container.appendChild(el);});}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
document.getElementById('saveFiles').addEventListener('click',async()=>{const input=document.getElementById('audioUpload');if(!input.files.length){return;}await addFiles(input.files);input.value='';});
document.getElementById('clearFiles').addEventListener('click',async()=>{await deleteAll();});
refreshList();
