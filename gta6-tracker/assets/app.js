const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=u=>/^https?:\/\//i.test(u||'')?esc(u):'';
const ST={active:'В работе',early:'Ранняя стадия',stalled:'Заморожен',playable:'Запускается'};
const NAV=[['race','Гонка'],['news','Новости'],['watchlist','Watchlist'],['toolkit','Инструменты'],['method','Методология'],['safety','Безопасность']];
let D=null,timer=null;
const fmt=d=>d?new Date(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'—';
const link=(u,t='Источник →')=>url(u)?`<a href="${url(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`:'';
function media(u){u=url(u);if(!u)return'';return /\.(mp4|webm)(\?|$)/i.test(u)?`<video src="${u}" controls preload="none"></video>`:`<img src="${u}" alt="" loading="lazy">`}
function render(d){
  D=d;const s=d.stats||{},sec=d.sections||{},P=d.projects||[];
  $('#demo').hidden=!(d.meta&&d.meta.demo);
  $('#h1').textContent=s.headline||'';$('#sub').textContent=s.subline||'';
  $('#cdl').textContent=s.countdownLabel||'';$('#cd').hidden=!s.countdownTarget;
  $('#ov').textContent=(+s.overall||0)+'%';$('#ring').style.setProperty('--p',+s.overall||0);
  const top=[...P].sort((a,b)=>b.progress-a.progress).slice(0,3);
  const avg=top.length?Math.round(top.reduce((a,p)=>a+(+p.progress||0),0)/top.length):0;
  $('#tiles').innerHTML=[[s.furthest||'—','Дальняя веха'],[avg+'%','Среднее по топ-3'],[s.boot||'—','Запуск GTA VI'],[P.length,'Проектов отслеживается']].map(t=>`<div class="tile"><b>${esc(t[0])}</b><span>${t[1]}</span></div>`).join('');
  $('#upd').textContent=fmt(d.meta&&d.meta.updated);
  document.querySelectorAll('[data-s]').forEach(e=>e.hidden=sec[e.dataset.s]===false);
  $('#nav').innerHTML=NAV.filter(n=>sec[n[0]]!==false).map(n=>`<a href="#${n[0]}">${n[1]}</a>`).join('');
  table();
  const pub=(d.news||[]).filter(n=>n.status==='published').sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  $('#newsg').innerHTML=pub.map(n=>`<article class="card reveal">${media(n.media)}<span class="badge">${fmt(n.date)}</span><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p>${link(n.url)}</article>`).join('')||'<p class="sub">Пока нет новостей.</p>';
  $('#wl').innerHTML=(d.watchlist||[]).map(w=>`<div class="card reveal"><span class="badge b-${esc(w.status)}">${ST[w.status]||esc(w.status)}</span><h3>${esc(w.name)}</h3><p>${esc(w.description)}</p>${w.comment?`<p><i>${esc(w.comment)}</i></p>`:''}${link(w.url)}</div>`).join('');
  $('#tk').innerHTML=(d.toolkit||[]).map(t=>`<div class="card reveal"><h3>${esc(t.name)}</h3><p>${esc(t.description)}</p>${link(t.url,'Открыть →')}</div>`).join('');
  clearInterval(timer);tick();timer=setInterval(tick,1000);observe();
}
function table(){
  const f=$('#flt').value,k=$('#srt').value;
  let L=(D.projects||[]).filter(p=>f==='all'||p.category===f);
  L.sort((a,b)=>k==='updated'?(b.updated||'').localeCompare(a.updated||''):(+b[k]||0)-(+a[k]||0));
  $('#tb').innerHTML=L.map((p,i)=>`<tr><td>${i+1}</td><td><b>${esc(p.name)}</b><br><small style="color:var(--mu)">${esc(p.developer)}</small>${p.description?`<br><small style="color:var(--mu)">${esc(p.description)}</small>`:''}<br>${link(p.url)}</td><td style="min-width:130px"><div class="bar"><i data-w="${+p.progress||0}"></i></div> ${+p.progress||0}%</td><td><span class="badge b-${esc(p.status)}">${ST[p.status]||esc(p.status)}</span></td><td>${(+p.rating||0).toFixed(1)}</td><td>${+p.stars||0}</td><td>${fmt(p.updated)}</td></tr>`).join('');
  $('#chart').innerHTML=L.map(p=>`<div class="row"><span>${esc(p.name)}</span><div class="bar"><i data-w="${+p.progress||0}"></i></div><b>${+p.progress||0}%</b></div>`).join('');
  requestAnimationFrame(()=>setTimeout(()=>document.querySelectorAll('.bar i').forEach(i=>i.style.width=i.dataset.w+'%'),30));
}
function tick(){
  const t=D&&D.stats&&D.stats.countdownTarget;if(!t)return;
  let ms=Math.max(0,new Date(t)-Date.now())/1000|0;
  const v=[ms/86400|0,ms%86400/3600|0,ms%3600/60|0,ms%60];
  ['d','h','m','s'].forEach((k,i)=>$('#cd-'+k).textContent=String(v[i]).padStart(k==='d'?1:2,'0'));
}
function observe(){const io=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.1});document.querySelectorAll('.reveal').forEach(e=>io.observe(e));}
$('#flt').onchange=$('#srt').onchange=()=>D&&table();
if(new URLSearchParams(location.search).has('preview')){
  addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&e.data.type==='preview')render(e.data.data)});
}else{
  fetch('data/tracker.json?'+Date.now()).then(r=>r.json()).then(render).catch(()=>{$('#h1').textContent='Не удалось загрузить данные'});
}
