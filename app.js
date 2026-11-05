'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image = (p, size = 'w500') => /^\/[a-zA-Z0-9_.-]+$/.test(p || '') ? `https://image.tmdb.org/t/p/${size}${p}` : '';
const placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#dddcd1"/><text x="150" y="215" fill="#9a9d88" font-size="65" text-anchor="middle">✳</text><text x="150" y="255" fill="#777b6b" font-size="14" text-anchor="middle">AFFICHE À VENIR</text></svg>');
const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
const genreNames = {878:'Science-fiction',18:'Drame',53:'Thriller',35:'Comédie',16:'Animation',28:'Action',12:'Aventure',14:'Fantastique',80:'Crime',10749:'Romance',9648:'Mystère',27:'Horreur',10751:'Famille'};
const seed=[
[157336,'Interstellar','2014-11-05',8.4,'/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',[878,18],'Un groupe d’explorateurs traverse un trou de ver pour chercher une nouvelle planète habitable.','Christopher Nolan','Matthew McConaughey,Anne Hathaway,Jessica Chastain'],
[27205,'Inception','2010-07-16',8.4,'/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',[878,53],'Un spécialiste des rêves se voit confier une mission : implanter une idée dans un esprit.','Christopher Nolan','Leonardo DiCaprio,Joseph Gordon-Levitt,Elliot Page'],
[313369,'La La Land','2016-11-29',7.9,'/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',[18,35],'À Los Angeles, une actrice et un musicien tentent de concilier leur amour et leurs ambitions.','Damien Chazelle','Emma Stone,Ryan Gosling'],
[693134,'Dune : Deuxième Partie','2024-02-27',8.1,'/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',[878,18],'Paul Atréides rejoint les Fremen et doit choisir entre son amour et le destin de l’univers.','Denis Villeneuve','Timothée Chalamet,Zendaya,Rebecca Ferguson'],
[129,'Le Voyage de Chihiro','2001-07-20',8.5,'/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',[16],'Une jeune fille découvre un monde peuplé d’esprits et cherche à sauver ses parents.','Hayao Miyazaki','Rumi Hiiragi,Miyu Irino'],
[120,'Le Seigneur des anneaux : La Communauté de l’Anneau','2001-12-18',8.4,'/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg',[14,18],'Frodon quitte la Comté pour une quête qui décidera du sort de la Terre du Milieu.','Peter Jackson','Elijah Wood,Ian McKellen,Viggo Mortensen'],
[238,'Le Parrain','1972-03-14',8.7,'/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',[18,53],'La famille Corleone voit son équilibre bouleversé lorsque le fils cadet entre dans ses affaires.','Francis Ford Coppola','Marlon Brando,Al Pacino,Diane Keaton'],
[680,'Pulp Fiction','1994-09-10',8.5,'/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',[53,18],'À Los Angeles, les destins de gangsters, d’un boxeur et d’un couple se croisent.','Quentin Tarantino','John Travolta,Uma Thurman,Samuel L. Jackson']
].map((r,i)=>({id:r[0],title:r[1],release_date:r[2],vote_average:r[3],poster_path:r[4],genre_ids:r[5],overview:r[6],director:r[7],castNames:r[8].split(','),popularity:100-i}));
let key = window.CINEATLAS_CONFIG?.apiKey || '';
let movies = [], mode = 'explore', genre = '', page = 1, totalPages = 1, currentQuery = '', requestId = 0, detailRequest = 0, loading = false;
let featuredIndex = 0, featureRequest = 0, activeMovie = null, toastTimer;
const movieCache = new Map();
const features = [
  {id:157336,title:'Interstellar',meta:'Christopher Nolan · 2014',backdrop:'/pbrkL804c8yAv3zBZR4QPEafpAR.jpg'},
  {id:693134,title:'Dune : Deuxième Partie',meta:'Denis Villeneuve · 2024',backdrop:''},
  {id:313369,title:'La La Land',meta:'Damien Chazelle · 2016',backdrop:''}
];
let saved = {};
try { const data=JSON.parse(localStorage.getItem('cineatlas-favorites') || '{}'); if(data && !Array.isArray(data) && typeof data==='object') for(const m of Object.values(data)) if(Number.isInteger(m?.id)&&typeof m.title==='string') saved[m.id]=m; } catch {}
function toast(text) { $('#toast').textContent=text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200); }
function setStatus(text) { $('#status').textContent=text; }
function year(m) { return m.release_date?.slice(0,4) || 'Date à venir'; }
function rating(m) { return m.vote_average ? Number(m.vote_average).toFixed(1) : '—'; }
function unique(list) { return [...new Map(list.filter(m=>Number.isInteger(m.id)&&typeof m.title==='string'&&!m.adult).map(m=>[m.id,m])).values()]; }
async function api(path, params={}, credential=key) {
  const url=new URL('https://api.themoviedb.org/3/'+path);
  url.search=new URLSearchParams({language:'fr-FR',...params});
  const headers={};
  if(/^[a-f0-9]{32}$/i.test(credential)) url.searchParams.set('api_key',credential); else headers.Authorization='Bearer '+credential;
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(18000)});
  if(!response.ok) throw new Error(response.status===401?'La connexion TMDB a expiré ou la clé est invalide.':response.status===429?'Beaucoup de curieux en ce moment. Réessayez dans un instant.':'Le catalogue est momentanément indisponible. Réessayez.');
  return response.json();
}
async function movieDetails(id) {
  if(movieCache.has(id)) return movieCache.get(id);
  const movie=key ? await api(`movie/${id}`,{append_to_response:'credits,images',include_image_language:'fr,en,null'}) : seed.find(m=>m.id===id)||movies.find(m=>m.id===id)||saved[id];
  if(!movie) throw new Error('Cette fiche n’est pas disponible en démonstration.');
  if(key) movieCache.set(id,movie);
  return movie;
}
function imageFallback(root=document) { root.querySelectorAll('img').forEach(img=>{img.onerror=()=>{img.onerror=null;img.src=placeholder;};}); }
const observer = new IntersectionObserver(entries => entries.forEach(entry=>{ if(entry.isIntersecting){entry.target.classList.add('reveal');observer.unobserve(entry.target);} }),{threshold:.05});
function updateNav() {
  $('#explore').classList.toggle('active',mode==='explore'); $('#favorites').classList.toggle('active',mode==='favorites');
  $('#count').textContent=Object.keys(saved).length;
}
function render(animate=true) {
  observer.disconnect();
  let list=mode==='favorites' ? Object.values(saved) : [...movies];
  if(genre) list=list.filter(m=>(m.genre_ids||m.genres?.map(g=>g.id)||[]).includes(Number(genre)));
  const sort=$('#sort').value;
  if(sort==='rating') list.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0));
  if(sort==='recent') list.sort((a,b)=>(b.release_date||'').localeCompare(a.release_date||''));
  if(sort==='title') list.sort((a,b)=>a.title.localeCompare(b.title,'fr'));
  if(sort==='popular') list.sort((a,b)=>(b.popularity||0)-(a.popularity||0));
  $('#grid').innerHTML=list.map((m,i)=>`<article class="card" style="--delay:${Math.min(i%5,4)*45}ms"><div class="poster-wrap"><button class="poster" data-film="${m.id}" aria-label="Voir ${esc(m.title)}"><img loading="lazy" src="${esc(image(m.poster_path)||placeholder)}" alt="Affiche de ${esc(m.title)}"><span class="poster-overlay"></span><span class="poster-open">Découvrir le film <span>↗</span></span></button><button class="save ${saved[m.id]?'saved':''}" data-save="${m.id}" aria-label="${saved[m.id]?'Retirer':'Ajouter'} ${esc(m.title)} ${saved[m.id]?'de':'à'} ma collection" aria-pressed="${!!saved[m.id]}">${heart}</button></div><div class="card-info"><div><button class="title-button" data-film="${m.id}"><h3>${esc(m.title)}</h3></button><span class="card-year">${esc(year(m))}</span></div><span class="rating" aria-label="Note ${rating(m)} sur 10"><span aria-hidden="true">★</span> ${rating(m)}</span></div></article>`).join('');
  if(animate) $('#grid').querySelectorAll('.card').forEach(card=>observer.observe(card));
  imageFallback($('#grid')); updateNav();
  $('#heading').innerHTML=mode==='favorites'?'Vos coups de cœur<span class="orange">.</span>':currentQuery?`${esc(currentQuery)}<span class="orange">.</span>`:'À découvrir<span class="orange">.</span>';
  $('#result-count').textContent=`${list.length} film${list.length>1?'s':''} à explorer`;
  $('#more').classList.toggle('hidden',!(key&&mode==='explore'&&page<totalPages));
  $('#empty').classList.toggle('hidden',list.length>0||loading);
  $('#empty-title').textContent=mode==='favorites'?'Votre collection commence ici.':'Pas encore le bon film.';
  $('#empty-copy').textContent=mode==='favorites'?'Touchez le cœur d’un film pour le garder tout près.':'Essayez un autre nom, ou changez de genre pour continuer le voyage.';
}
function skeleton() { $('#grid').innerHTML=Array.from({length:10},()=>'<div class="skeleton" aria-hidden="true"><div class="poster-wrap"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>').join(''); $('#empty').classList.add('hidden'); }
async function load(append=false) {
  const seq=++requestId, wantedPage=page;
  loading=true; $('#grid').setAttribute('aria-busy','true'); $('#more').disabled=true; setStatus(append?'La suite arrive…':'Le projecteur s’allume…');
  if(!append) skeleton();
  try {
    let results, pages=1;
    if(!key) {
      const q=currentQuery.toLocaleLowerCase('fr');
      results=seed.filter(m=>[m.title,m.director,...m.castNames].some(v=>v.toLocaleLowerCase('fr').includes(q)));
    } else if(currentQuery) {
      const data=await api('search/multi',{query:currentQuery,include_adult:false,page:wantedPage});
      pages=Math.min(data.total_pages,500);
      const people=data.results.filter(m=>m.media_type==='person'&&!m.adult).slice(0,4);
      const filmographies=await Promise.allSettled(people.map(p=>api(`person/${p.id}/movie_credits`)));
      results=unique([...data.results.filter(m=>m.media_type==='movie'),...filmographies.flatMap(r=>r.status==='fulfilled'?[...r.value.cast,...r.value.crew.filter(m=>m.job==='Director')]:[])]);
    } else {
      const data=await api('movie/popular',{page:wantedPage}); results=data.results; pages=Math.min(data.total_pages,500);
    }
    if(seq!==requestId) return;
    totalPages=pages; movies=unique(append?[...movies,...results]:results); loading=false;
    setStatus(key ? currentQuery?'Films & filmographies · Cliquez sur un visage pour poursuivre la découverte.':'Le catalogue TMDB · Des histoires à découvrir, des affiches à collectionner.' : 'Mode découverte · 8 films sélectionnés. Connectez TMDB pour aller plus loin.');
    render();
  } catch(error) {
    if(seq!==requestId) return;
    if(append) page=Math.max(1,page-1); else movies=[];
    loading=false; render(); setStatus(error.name==='TimeoutError'?'Le catalogue met du temps à répondre. Relancez la recherche.':error.message);
    $('#empty-title').textContent='Une petite pause dans la séance.';
    $('#empty-copy').textContent='Vérifiez votre connexion puis relancez la recherche.';
  } finally { if(seq===requestId){loading=false;$('#more').disabled=false;$('#grid').setAttribute('aria-busy','false');} }
}
function resetGenres() { genre=''; document.querySelectorAll('[data-genre]').forEach(b=>{b.classList.toggle('selected',!b.dataset.genre);b.setAttribute('aria-pressed',String(!b.dataset.genre));}); }
function search(query,scroll=true) { mode='explore';currentQuery=query.trim();page=1;resetGenres();updateNav();load();if(scroll) $('#catalog').scrollIntoView({behavior:'smooth'}); }
function collection() { ++requestId;loading=false;$('#grid').setAttribute('aria-busy','false');mode='favorites';resetGenres();setStatus('Vos coups de cœur, enregistrés sur cet appareil.');render();$('#catalog').scrollIntoView({behavior:'smooth'}); }
function toggleSave(id) {
  const movie=movies.find(m=>m.id===id)||saved[id]||movieCache.get(id)||seed.find(m=>m.id===id);
  if(!movie) return;
  const removing=!!saved[id];
  if(removing) delete saved[id]; else saved[id]={id:movie.id,title:movie.title,release_date:movie.release_date,vote_average:movie.vote_average,poster_path:movie.poster_path,genre_ids:movie.genre_ids||movie.genres?.map(g=>g.id),popularity:movie.popularity,overview:movie.overview,director:movie.director,castNames:movie.castNames};
  try {localStorage.setItem('cineatlas-favorites',JSON.stringify(saved));}catch{toast('Stockage indisponible : collection conservée pour cet onglet.');}
  render(false); updateSheetSave(); toast(removing?'Retiré de votre collection.':'Un nouveau coup de cœur dans votre collection.');
}
function updateSheetSave() { const b=$('#sheet-save');if(!b||!activeMovie)return;b.textContent=saved[activeMovie.id]?'♥ Dans ma collection':'♡ Ajouter à ma collection';b.setAttribute('aria-pressed',String(!!saved[activeMovie.id])); }
async function download(path,title,button) {
  if(!path) return;
  const previous=button.innerHTML;button.disabled=true;button.textContent='Téléchargement…';
  try {
    const response=await fetch(image(path,'original'),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error();
    const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
    link.href=url;link.download=title.replace(/[^a-z0-9à-ÿ_-]/gi,'_')+'-affiche.jpg';link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Votre affiche originale est téléchargée.');
  } catch {
    toast('Téléchargement indisponible. Le lien original est affiché sous le bouton.');
    if(!button.parentElement.querySelector('.download-fallback')) {const a=document.createElement('a');a.className='download-fallback text-link';a.href=image(path,'original');a.target='_blank';a.rel='noopener';a.textContent='Ouvrir l’original ↗';button.after(a);}
  } finally {button.disabled=false;button.innerHTML=previous;}
}
function personHTML(person) {
  const name=person.name||'Nom indisponible',initials=name.split(' ').slice(0,2).map(n=>n[0]).join('');
  return `<button class="person" data-person="${esc(name)}" aria-label="Voir les films de ${esc(name)}"><span class="person-photo">${person.profile_path?`<img src="${esc(image(person.profile_path,'w185'))}" loading="lazy" alt="">`:`<span class="person-initials">${esc(initials)}</span>`}</span><span class="person-name">${esc(name)}</span><span class="person-character">${esc(person.character||'Voir sa filmographie')}</span></button>`;
}
function selectTab(name,focus=false) {
  $('#detail').querySelectorAll('[role=tab]').forEach(tab=>{const selected=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;if(selected&&focus)tab.focus();});
  $('#detail').querySelectorAll('[role=tabpanel]').forEach(panel=>panel.hidden=panel.id!=='panel-'+name);
}
async function details(id) {
  const seq=++detailRequest,dialog=$('#detail'); activeMovie=null;
  $('#detail-content').innerHTML='<div class="sheet-loading" role="status"><span class="spinner" aria-hidden="true"></span>Le film commence…</div>';
  if(!dialog.open)dialog.showModal();$('#detail-content').scrollTop=0;
  try {
    const m=await movieDetails(id);if(seq!==detailRequest||!dialog.open)return;activeMovie=m;
    const cast=m.credits?.cast||m.castNames?.map(name=>({name}))||[];
    const director=m.credits?.crew.filter(p=>p.job==='Director').map(p=>p.name).join(', ')||m.director||'Non renseigné';
    const genres=m.genres?.map(g=>g.name)||m.genre_ids?.map(id=>genreNames[id]).filter(Boolean)||[];
    const posters=m.images?.posters?.length?m.images.posters.slice(0,40):m.poster_path?[{file_path:m.poster_path,iso_639_1:null}]:[];
    const backdrop=image(m.backdrop_path,'w1280')||image(m.poster_path,'w780');
    $('#detail-content').innerHTML=`<div class="sheet-backdrop">${backdrop?`<img src="${esc(backdrop)}" alt="">`:''}<div class="sheet-gradient"></div><span class="sheet-label">LA FICHE CINÉATLAS</span><div class="sheet-title-block"><div class="sheet-eyebrow"><span>${esc(year(m))}</span>${m.runtime?`<span>${Math.floor(m.runtime/60)} h ${String(m.runtime%60).padStart(2,'0')}</span>`:''}<span class="sheet-rating">★ ${rating(m)} / 10</span></div><h2 id="sheet-title">${esc(m.title)}</h2><p>Un film de ${esc(director)}</p></div></div><div class="sheet-body"><aside class="sheet-sidebar"><img class="sheet-poster" src="${esc(image(m.poster_path)||placeholder)}" alt="Affiche de ${esc(m.title)}"><button id="download" class="button button-orange" ${m.poster_path?'':'disabled'}>L’affiche originale <span aria-hidden="true">↓</span></button><dl class="sheet-facts"><div><dt>Genres</dt><dd>${esc(genres.join(' · ')||'Non renseignés')}</dd></div><div><dt>Titre original</dt><dd>${esc(m.original_title||m.title)}</dd></div><div><dt>Pour aller plus loin</dt><dd><a href="https://www.themoviedb.org/movie/${m.id}" target="_blank" rel="noopener">Voir sur TMDB ↗</a></dd></div></dl></aside><div class="sheet-main"><div class="sheet-tabs" role="tablist" aria-label="Explorer la fiche"><button role="tab" id="tab-story" data-tab="story" aria-controls="panel-story" aria-selected="true" tabindex="0">L’histoire</button><button role="tab" id="tab-cast" data-tab="cast" aria-controls="panel-cast" aria-selected="false" tabindex="-1">Le casting <span class="tab-count">${cast.length}</span></button><button role="tab" id="tab-posters" data-tab="posters" aria-controls="panel-posters" aria-selected="false" tabindex="-1">Les affiches <span class="tab-count">${posters.length}</span></button></div><section id="panel-story" class="tab-panel" role="tabpanel" aria-labelledby="tab-story">${m.tagline?`<p class="sheet-tagline">${esc(m.tagline)}</p>`:''}<p class="sheet-overview">${esc(m.overview||'Cette histoire garde encore un peu de mystère : le synopsis français n’est pas disponible.')}</p><button id="sheet-save" class="button button-outline" aria-pressed="false">♡ Ajouter à ma collection</button><div class="panel-heading"><h3>Les visages du film</h3><button data-open-tab="cast">Tout le casting ↗</button></div><div class="cast-preview">${cast.slice(0,5).map(personHTML).join('')||'<p class="gallery-intro">Le casting n’est pas disponible.</p>'}</div></section><section id="panel-cast" class="tab-panel" role="tabpanel" aria-labelledby="tab-cast" hidden><p class="gallery-intro">Les visages derrière l’histoire. Sélectionnez un artiste pour découvrir ses autres films.</p><div class="cast-grid">${cast.slice(0,60).map(personHTML).join('')||'<p>Le casting n’est pas disponible.</p>'}</div></section><section id="panel-posters" class="tab-panel" role="tabpanel" aria-labelledby="tab-posters" hidden><p class="gallery-intro">Une autre façon de voir le film. Téléchargez les affiches dans leur résolution originale.</p><div class="poster-grid">${posters.map((p,i)=>`<article class="poster-tile"><img src="${esc(image(p.file_path,'w342'))}" loading="lazy" alt="Affiche ${i+1} de ${esc(m.title)}"><button data-poster="${esc(p.file_path)}"><span>${esc(p.iso_639_1?.toUpperCase()||'Sans texte / autre')}${p.width?`<small>${p.width} × ${p.height} px</small>`:''}</span><span aria-hidden="true">↓</span><span class="sr">Télécharger l’affiche ${i+1}</span></button></article>`).join('')||'<p class="gallery-intro">Aucune affiche disponible.</p>'}</div><p class="sheet-disclaimer">Les affiches sont la propriété de leurs ayants droit. Leur téléchargement ne confère aucun droit d’exploitation.</p></section></div></div>`;
    dialog.setAttribute('aria-labelledby','sheet-title');imageFallback(dialog);updateSheetSave();
    $('#download').onclick=e=>download(m.poster_path,m.title,e.currentTarget);$('#sheet-save').onclick=()=>toggleSave(m.id);
    dialog.querySelectorAll('[data-poster]').forEach(b=>b.onclick=()=>download(b.dataset.poster,m.title,b));
    dialog.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{dialog.close();$('#query').value=b.dataset.person;search(b.dataset.person);});
    dialog.querySelectorAll('[data-tab]').forEach(b=>{b.onclick=()=>selectTab(b.dataset.tab);b.onkeydown=e=>{const tabs=[...dialog.querySelectorAll('[role=tab]')],index=tabs.indexOf(b);let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();selectTab(tabs[next].dataset.tab,true);}};});
    dialog.querySelectorAll('[data-open-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.openTab,true));
  }catch(error){if(seq!==detailRequest||!dialog.open)return;dialog.removeAttribute('aria-labelledby');$('#detail-content').innerHTML=`<div class="sheet-error"><span class="micro">ENTRACTE</span><h2>La fiche se fait attendre.</h2><p>${esc(error.message)}</p><button id="retry-details" class="button button-dark">Réessayer ↗</button></div>`;$('#retry-details').onclick=()=>details(id);}
}
async function feature(index) {
  featuredIndex=index;const seq=++featureRequest,f=features[index];
  document.querySelectorAll('[data-feature]').forEach(b=>{const active=Number(b.dataset.feature)===index;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#featured-title').textContent=f.title;$('#featured-meta').textContent=f.meta;$('.featured-number').textContent=`0${index+1} / 03`;
  try {let path=f.backdrop||seed.find(m=>m.id===f.id)?.poster_path;if(key){const movie=await movieDetails(f.id);path=movie.backdrop_path||path;}if(seq!==featureRequest||!path)return;const src=image(path,'w1280');if($('#hero-image').getAttribute('src')===src)return;const preload=new Image();preload.src=src;await preload.decode();if(seq!==featureRequest)return;$('.hero-backdrop').classList.add('changing');setTimeout(()=>{if(seq!==featureRequest)return;$('#hero-image').src=src;$('.hero-backdrop').classList.remove('changing');},350);}catch{/* Keep the current background when imagery is unavailable. */}
}
$('#search').onsubmit=e=>{e.preventDefault();search($('#query').value);};
document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('#query').value=b.dataset.query;search(b.dataset.query);});
document.querySelectorAll('[data-genre]').forEach(b=>b.onclick=()=>{genre=b.dataset.genre;document.querySelectorAll('[data-genre]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});render();});
$('#sort').onchange=()=>render();
$('#grid').onclick=e=>{const save=e.target.closest('[data-save]'),film=e.target.closest('[data-film]');if(save)toggleSave(Number(save.dataset.save));else if(film)details(Number(film.dataset.film));};
$('#favorites').onclick=collection;$('#collection-cta').onclick=collection;
$('#explore').onclick=()=>{$('#query').value='';search('');};$('#reset').onclick=()=>{$('#query').value='';search('');};
$('#more').onclick=()=>{if(loading)return;page++;load(true);};
$('#featured').onclick=()=>details(features[featuredIndex].id);
document.querySelectorAll('[data-feature]').forEach(b=>b.onclick=()=>feature(Number(b.dataset.feature)));
$('#settings').onclick=()=>$('#configuration').showModal();
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
$('#detail').addEventListener('close',()=>{++detailRequest;$('#detail').removeAttribute('aria-labelledby');activeMovie=null;});
$('#credentials').onsubmit=async e=>{e.preventDefault();const candidate=$('#token').value.trim(),button=e.submitter;button.disabled=true;$('#config-status').textContent='Vérification…';try{await api('movie/popular',{page:1},candidate);key=candidate;movieCache.clear();$('#token').value='';$('#configuration').close();$('#config-status').textContent='';feature(featuredIndex);search($('#query').value);toast('Connexion au catalogue établie.');}catch(error){$('#config-status').textContent=error.message;}finally{button.disabled=false;}};
$('#demo').onclick=()=>{key='';movieCache.clear();$('#token').value='';$('#configuration').close();search('');toast('Le mode découverte est activé.');};
updateNav();load();feature(0);
